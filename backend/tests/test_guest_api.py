import sys
import types
from datetime import datetime
from io import BytesIO


def test_guest_checkin_requires_frame_file(client):
    response = client.post("/api/guest/checkin", data={}, content_type="multipart/form-data")

    assert response.status_code == 400
    assert response.get_json()["status"] == "invalid_request"


def test_guest_checkin_returns_payload_from_recognition_service(app, client):
    expected_payload = {
        "status": "recognized",
        "employee_id": 7,
        "employee_code": "EMP-007",
        "full_name": "Ada Lovelace",
    }

    class FakeRecognitionService:
        def __init__(self):
            self.calls = []

        def process_guest_image(self, frame_bytes, filename=None, content_type=None):
            self.calls.append(
                {
                    "frame_bytes": frame_bytes,
                    "filename": filename,
                    "content_type": content_type,
                }
            )
            return expected_payload

    fake_service = FakeRecognitionService()
    app.extensions["recognition_service"] = fake_service

    response = client.post(
        "/api/guest/checkin",
        data={"frame": (BytesIO(b"frame-bytes"), "guest.jpg")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 200
    assert response.get_json() == expected_payload
    assert fake_service.calls == [
        {
            "frame_bytes": b"frame-bytes",
            "filename": "guest.jpg",
            "content_type": "image/jpeg",
        }
    ]


def test_embedding_service_uses_deepface_arcface_wrapper(monkeypatch):
    captured = {}

    class FakeDeepFace:
        @staticmethod
        def represent(img_path, model_name, enforce_detection):
            captured["img_path"] = img_path
            captured["model_name"] = model_name
            captured["enforce_detection"] = enforce_detection
            return [{"embedding": [0.1, 0.2, 0.3]}]

    fake_module = types.ModuleType("deepface")
    fake_module.DeepFace = FakeDeepFace
    monkeypatch.setitem(sys.modules, "deepface", fake_module)

    try:
        from backend.app.services.embedding import EmbeddingService
    except ModuleNotFoundError:
        from app.services.embedding import EmbeddingService

    embedding = EmbeddingService().extract_embeddings(b"frame-bytes")

    assert embedding == [0.1, 0.2, 0.3]
    assert captured == {
        "img_path": b"frame-bytes",
        "model_name": "ArcFace",
        "enforce_detection": False,
    }


def test_storage_service_saves_guest_frame_under_dated_subdirectory(tmp_path, monkeypatch):
    try:
        from backend.app.services import storage as storage_module
    except ModuleNotFoundError:
        from app.services import storage as storage_module

    class FixedDateTime:
        @classmethod
        def utcnow(cls):
            return datetime(2026, 4, 2, 9, 30, 0)

    monkeypatch.setattr(storage_module, "datetime", FixedDateTime)
    service = storage_module.StorageService(tmp_path)

    snapshot_path = service.save_guest_frame(b"frame-bytes", filename="guest.JPG")

    assert snapshot_path.parent == tmp_path / "2026-04-02"
    assert snapshot_path.suffix == ".jpg"
    assert snapshot_path.read_bytes() == b"frame-bytes"


def test_face_index_service_uses_cosine_distance_for_thresholding():
    try:
        from backend.app.services.face_index import FaceIndexService
    except ModuleNotFoundError:
        from app.services.face_index import FaceIndexService

    service = FaceIndexService(threshold=0.01)
    service._entries = [
        {
            "employee_id": 7,
            "employee_code": "EMP-007",
            "full_name": "Ada Lovelace",
            "embedding": [1.0, 0.0],
        }
    ]

    match = service.find_match([10.0, 0.0])

    assert match is not None
    assert match["employee_id"] == 7
    assert match["distance"] == 0.0
