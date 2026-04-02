from flask import Blueprint, current_app, jsonify, request


guest_bp = Blueprint("guest", __name__)


def _invalid_request(message):
    return jsonify({"status": "invalid_request", "message": message}), 400


@guest_bp.post("/guest/checkin")
def guest_checkin():
    frame = request.files.get("frame")
    if frame is None or not frame.filename:
        return _invalid_request("frame is required")

    frame_bytes = frame.read()
    if not frame_bytes:
        return _invalid_request("frame is required")

    recognition_service = current_app.extensions["recognition_service"]
    payload = recognition_service.process_guest_image(
        frame_bytes,
        filename=frame.filename,
        content_type=frame.content_type,
    )

    return jsonify(payload)
