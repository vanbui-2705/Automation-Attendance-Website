from io import BytesIO
from pathlib import Path

from werkzeug.datastructures import MultiDict

try:
    from backend.app.extensions import db
    from backend.app.models import Employee, FaceSample
    from backend.tests.test_manager_api import _create_employee, _create_manager
except ModuleNotFoundError:
    from app.extensions import db
    from app.models import Employee, FaceSample
    from tests.test_manager_api import _create_employee, _create_manager


def _login_manager(client, manager):
    response = client.post(
        "/api/manager/login",
        json={"username": manager["username"], "password": manager["password"]},
    )
    assert response.status_code == 200


def _make_enrollment_payload(prefix="face"):
    return MultiDict(
        [
            ("images", (BytesIO(f"{prefix}-1".encode()), "1.jpg")),
            ("images", (BytesIO(f"{prefix}-2".encode()), "2.jpg")),
            ("images", (BytesIO(f"{prefix}-3".encode()), "3.jpg")),
            ("images", (BytesIO(f"{prefix}-4".encode()), "4.jpg")),
            ("images", (BytesIO(f"{prefix}-5".encode()), "5.jpg")),
        ]
    )


def test_face_samples_list_requires_authentication(client):
    response = client.get("/api/manager/employees/1/face-samples")

    assert response.status_code == 401
    assert response.get_json()["status"] == "unauthorized"


def test_face_samples_list_returns_404_for_missing_employee(app, client):
    manager = _create_manager(app)
    _login_manager(client, manager)

    response = client.get("/api/manager/employees/999/face-samples")

    assert response.status_code == 404
    assert response.get_json()["status"] == "employee_not_found"


def test_face_samples_list_returns_employee_and_samples(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-201", full_name="Ada Lovelace")

    with app.app_context():
        sample = FaceSample(
            employee_id=employee["id"],
            sample_index=1,
            image_path="/tmp/faces/EMP-201/1.jpg",
            embedding_json="[0.1, 0.2, 0.3]",
        )
        db.session.add(sample)
        db.session.commit()
        sample_id = sample.id
        created_at = sample.created_at.isoformat()

    _login_manager(client, manager)

    response = client.get(f"/api/manager/employees/{employee['id']}/face-samples")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["employee"]["id"] == employee["id"]
    assert payload["employee"]["employee_code"] == "EMP-201"
    assert payload["employee"]["full_name"] == "Ada Lovelace"
    assert payload["employee"]["is_active"] is True
    assert "created_at" in payload["employee"]
    assert payload["face_samples"] == [
        {
            "id": sample_id,
            "sample_index": 1,
            "image_path": "/tmp/faces/EMP-201/1.jpg",
            "created_at": created_at,
        }
    ]


def test_face_enrollment_requires_authentication(client):
    response = client.post(
        "/api/manager/employees/1/face-enrollment",
        data={},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401
    assert response.get_json()["status"] == "unauthorized"


def test_face_enrollment_rejects_missing_employee(app, client):
    manager = _create_manager(app)
    _login_manager(client, manager)

    response = client.post(
        "/api/manager/employees/999/face-enrollment",
        data={"images": (BytesIO(b"face-1"), "1.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 404
    assert response.get_json()["status"] == "employee_not_found"


def test_face_enrollment_rejects_non_five_image_batches(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-301", full_name="Grace Hopper")
    _login_manager(client, manager)

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=MultiDict(
            [
                ("images", (BytesIO(b"face-1"), "1.jpg")),
                ("images", (BytesIO(b"face-2"), "2.jpg")),
                ("images", (BytesIO(b"face-3"), "3.jpg")),
                ("images", (BytesIO(b"face-4"), "4.jpg")),
            ]
        ),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["status"] == "invalid_request"


def test_face_enrollment_rejects_existing_registration(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-302", full_name="Ada Lovelace")

    with app.app_context():
        db.session.add(
            FaceSample(
                employee_id=employee["id"],
                sample_index=1,
                image_path="/tmp/faces/EMP-302/1.jpg",
                embedding_json="[0.1, 0.2, 0.3]",
            )
        )
        db.session.commit()

    _login_manager(client, manager)

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=_make_enrollment_payload("existing"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 409
    assert response.get_json()["status"] == "face_registration_exists"


def test_face_enrollment_rejects_no_face_and_cleans_files(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-303", full_name="No Face")
    _login_manager(client, manager)

    class FakeEmbeddingService:
        def extract_embeddings(self, frame_bytes):
            return [] if frame_bytes == b"face-3" else [[0.1, 0.2, 0.3]]

    class FakeFaceIndexService:
        def refresh(self):
            raise AssertionError("refresh should not be called on failure")

    app.extensions["embedding_service"] = FakeEmbeddingService()
    app.extensions["face_index_service"] = FakeFaceIndexService()

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=_make_enrollment_payload("face"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["status"] == "no_face"
    assert list(Path(app.config["FACES_DIR"]).rglob("*")) == []


def test_face_enrollment_rejects_multiple_faces_and_cleans_files(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-304", full_name="Multiple Faces")
    _login_manager(client, manager)

    class FakeEmbeddingService:
        def extract_embeddings(self, frame_bytes):
            if frame_bytes == b"face-2":
                return [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
            return [[0.1, 0.2, 0.3]]

    class FakeFaceIndexService:
        def refresh(self):
            raise AssertionError("refresh should not be called on failure")

    app.extensions["embedding_service"] = FakeEmbeddingService()
    app.extensions["face_index_service"] = FakeFaceIndexService()

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=_make_enrollment_payload("face"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["status"] == "multiple_faces"
    assert list(Path(app.config["FACES_DIR"]).rglob("*")) == []


def test_face_enrollment_persists_five_samples_and_refreshes_index(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-305", full_name="Grace Hopper")
    _login_manager(client, manager)

    refresh_calls = {"count": 0}

    class FakeEmbeddingService:
        def extract_embeddings(self, frame_bytes):
            suffix = frame_bytes.decode()
            return [[float(ord(suffix[-1])) / 100.0, 0.2, 0.3]]

    class FakeFaceIndexService:
        def refresh(self):
            refresh_calls["count"] += 1

    app.extensions["embedding_service"] = FakeEmbeddingService()
    app.extensions["face_index_service"] = FakeFaceIndexService()

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=_make_enrollment_payload("sample"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["employee"]["employee_code"] == "EMP-305"
    assert payload["face_sample_count"] == 5
    assert [sample["sample_index"] for sample in payload["face_samples"]] == [1, 2, 3, 4, 5]
    assert refresh_calls["count"] == 1

    with app.app_context():
        rows = FaceSample.query.filter_by(employee_id=employee["id"]).order_by(FaceSample.sample_index.asc()).all()
        assert len(rows) == 5
        assert [row.sample_index for row in rows] == [1, 2, 3, 4, 5]
        for row in rows:
            assert Path(row.image_path).exists()


def test_face_enrollment_all_or_nothing_cleans_partial_rows_and_files(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-306", full_name="Partial Fail")
    _login_manager(client, manager)

    class FakeEmbeddingService:
        def extract_embeddings(self, frame_bytes):
            if frame_bytes == b"face-4":
                return []
            return [[0.1, 0.2, 0.3]]

    class FakeFaceIndexService:
        def refresh(self):
            raise AssertionError("refresh should not be called on failure")

    app.extensions["embedding_service"] = FakeEmbeddingService()
    app.extensions["face_index_service"] = FakeFaceIndexService()

    response = client.post(
        f"/api/manager/employees/{employee['id']}/face-enrollment",
        data=_make_enrollment_payload("face"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["status"] == "no_face"

    with app.app_context():
        assert FaceSample.query.filter_by(employee_id=employee["id"]).count() == 0


def test_face_deletion_requires_authentication(client):
    response = client.delete("/api/manager/employees/1/face-samples")

    assert response.status_code == 401
    assert response.get_json()["status"] == "unauthorized"


def test_face_deletion_returns_404_for_missing_employee(app, client):
    manager = _create_manager(app)
    _login_manager(client, manager)

    response = client.delete("/api/manager/employees/999/face-samples")

    assert response.status_code == 404
    assert response.get_json()["status"] == "employee_not_found"


def test_face_deletion_allows_zero_samples_and_refreshes_index(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-307", full_name="Empty Face")
    _login_manager(client, manager)

    refresh_calls = {"count": 0}

    class FakeFaceIndexService:
        def refresh(self):
            refresh_calls["count"] += 1

    app.extensions["face_index_service"] = FakeFaceIndexService()

    response = client.delete(f"/api/manager/employees/{employee['id']}/face-samples")

    assert response.status_code == 200
    assert response.get_json() == {"employee_id": employee["id"], "deleted_count": 0}
    assert refresh_calls["count"] == 1


def test_face_deletion_removes_all_samples_and_files(app, client):
    manager = _create_manager(app)
    employee = _create_employee(app, employee_code="EMP-308", full_name="Delete Me")
    _login_manager(client, manager)

    refresh_calls = {"count": 0}

    class FakeFaceIndexService:
        def refresh(self):
            refresh_calls["count"] += 1

    app.extensions["face_index_service"] = FakeFaceIndexService()

    with app.app_context():
        rows = []
        for sample_index in range(1, 6):
            image_path = tmp_path_sample_path(app, employee["id"], sample_index)
            image_path.parent.mkdir(parents=True, exist_ok=True)
            image_path.write_bytes(f"sample-{sample_index}".encode())
            row = FaceSample(
                employee_id=employee["id"],
                sample_index=sample_index,
                image_path=str(image_path),
                embedding_json="[0.1, 0.2, 0.3]",
            )
            db.session.add(row)
            rows.append(row)
        db.session.commit()

    response = client.delete(f"/api/manager/employees/{employee['id']}/face-samples")

    assert response.status_code == 200
    assert response.get_json() == {"employee_id": employee["id"], "deleted_count": 5}
    assert refresh_calls["count"] == 1

    with app.app_context():
        assert FaceSample.query.filter_by(employee_id=employee["id"]).count() == 0
        for sample_index in range(1, 6):
            assert tmp_path_sample_path(app, employee["id"], sample_index).exists() is False


def tmp_path_sample_path(app, employee_id, sample_index):
    faces_dir = Path(app.config["FACES_DIR"])
    return faces_dir / f"employee-{employee_id}" / f"sample-{sample_index}.jpg"
