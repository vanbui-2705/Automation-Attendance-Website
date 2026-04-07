import json

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import FaceSample
from ..services.auth import require_manager, serialize_employee
from .helpers import (
    get_employee,
    get_service,
    invalid_request,
    serialize_face_sample,
)


face_enrollment_bp = Blueprint("face_enrollment", __name__)


@face_enrollment_bp.get("/manager/employees/<int:employee_id>/face-samples")
def manager_employee_face_samples(employee_id):
    _, error_response = require_manager()
    if error_response is not None:
        return error_response

    employee, error_response = get_employee(employee_id)
    if error_response is not None:
        return error_response

    face_samples = (
        FaceSample.query.filter_by(employee_id=employee.id)
        .order_by(FaceSample.sample_index.asc())
        .all()
    )
    return jsonify(
        {
            "employee": serialize_employee(employee),
            "face_samples": [serialize_face_sample(fs) for fs in face_samples],
        }
    )


@face_enrollment_bp.post("/manager/employees/<int:employee_id>/face-enrollment")
def manager_employee_face_enrollment(employee_id):
    _, error_response = require_manager()
    if error_response is not None:
        return error_response

    employee, error_response = get_employee(employee_id)
    if error_response is not None:
        return error_response

    existing_face_sample = FaceSample.query.filter_by(employee_id=employee.id).first()
    if existing_face_sample is not None:
        return jsonify({"status": "face_registration_exists"}), 409

    images = request.files.getlist("images")
    if len(images) != 5:
        return invalid_request("exactly 5 images are required")

    storage_service = get_service("storage_service")
    embedding_service = get_service("embedding_service")
    face_index_service = get_service("face_index_service")

    prepared_samples = []
    saved_paths = []

    try:
        for sample_index, image in enumerate(images, start=1):
            if image is None or not image.filename:
                storage_service.remove_employee_face_files(saved_paths)
                return invalid_request("images are required")

            frame_bytes = image.read()
            if not frame_bytes:
                storage_service.remove_employee_face_files(saved_paths)
                return invalid_request("images are required")

            embeddings = embedding_service.extract_embeddings(frame_bytes)
            if len(embeddings) == 0:
                storage_service.remove_employee_face_files(saved_paths)
                return jsonify({"status": "no_face", "image_index": sample_index}), 400
            if len(embeddings) > 1:
                storage_service.remove_employee_face_files(saved_paths)
                return (
                    jsonify(
                        {
                            "status": "multiple_faces",
                            "image_index": sample_index,
                            "faces_detected": len(embeddings),
                        }
                    ),
                    400,
                )

            image_path = storage_service.save_employee_face_sample(
                employee.id,
                sample_index,
                frame_bytes,
                filename=image.filename,
            )
            saved_paths.append(image_path)
            prepared_samples.append(
                FaceSample(
                    employee_id=employee.id,
                    sample_index=sample_index,
                    image_path=str(image_path),
                    embedding_json=json.dumps(embeddings[0]),
                )
            )

        db.session.add_all(prepared_samples)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        storage_service.remove_employee_face_files(saved_paths)
        if FaceSample.query.filter_by(employee_id=employee.id).first() is not None:
            return jsonify({"status": "face_registration_exists"}), 409
        raise
    except Exception:
        db.session.rollback()
        storage_service.remove_employee_face_files(saved_paths)
        raise

    face_index_service.refresh()
    return (
        jsonify(
            {
                "employee": serialize_employee(employee),
                "face_samples": [serialize_face_sample(fs) for fs in prepared_samples],
                "face_sample_count": len(prepared_samples),
            }
        ),
        201,
    )


@face_enrollment_bp.delete("/manager/employees/<int:employee_id>/face-samples")
def manager_employee_face_samples_delete(employee_id):
    _, error_response = require_manager()
    if error_response is not None:
        return error_response

    employee, error_response = get_employee(employee_id)
    if error_response is not None:
        return error_response

    face_samples = (
        FaceSample.query.filter_by(employee_id=employee.id)
        .order_by(FaceSample.sample_index.asc())
        .all()
    )
    deleted_count = len(face_samples)

    for face_sample in face_samples:
        db.session.delete(face_sample)
    db.session.commit()

    storage_service = get_service("storage_service")
    storage_service.remove_employee_face_files([fs.image_path for fs in face_samples])
    get_service("face_index_service").refresh()

    return jsonify({"employee_id": employee.id, "deleted_count": deleted_count})
