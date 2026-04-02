class RecognitionService:
    def __init__(self, storage_service, embedding_service, face_index_service, attendance_service):
        self.storage_service = storage_service
        self.embedding_service = embedding_service
        self.face_index_service = face_index_service
        self.attendance_service = attendance_service

    def process_guest_image(self, frame_bytes, filename=None, content_type=None):
        embedding = self.embedding_service.extract_embeddings(frame_bytes)

        if not embedding:
            return {"status": "no_face"}

        match = self.face_index_service.find_match(embedding)
        if match is None:
            return {"status": "unknown"}

        snapshot_path = self.storage_service.save_guest_frame(frame_bytes, filename=filename)
        event, created = self.attendance_service.record_checkin(
            employee_id=match["employee_id"],
            snapshot_path=snapshot_path,
            distance=match["distance"],
        )

        return {
            "status": "recognized" if created else "already_checked_in",
            "employee_id": match["employee_id"],
            "employee_code": match["employee_code"],
            "full_name": match["full_name"],
            "distance": match["distance"],
            "checked_in_at": event.checked_in_at.isoformat(),
            "snapshot_path": event.snapshot_path,
        }
