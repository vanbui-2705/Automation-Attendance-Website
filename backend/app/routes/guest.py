from flask import Blueprint, current_app, jsonify, request

from ..services.rate_limiter import RateLimiter
from .helpers import invalid_request


guest_bp = Blueprint("guest", __name__)

_guest_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


@guest_bp.post("/guest/checkin")
def guest_checkin():
    if _guest_rate_limiter.is_limited(request.remote_addr):
        return jsonify({"status": "rate_limited", "message": "Too many requests. Please wait."}), 429

    frame = request.files.get("frame")
    if frame is None or not frame.filename:
        return invalid_request("frame is required")

    frame_bytes = frame.read()
    if not frame_bytes:
        return invalid_request("frame is required")

    recognition_service = current_app.extensions["recognition_service"]
    payload = recognition_service.process_guest_image(
        frame_bytes,
        filename=frame.filename,
        content_type=frame.content_type,
    )

    return jsonify(payload)
