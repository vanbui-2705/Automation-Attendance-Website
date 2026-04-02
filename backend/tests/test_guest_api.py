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
