from datetime import datetime
from pathlib import Path
from uuid import uuid4


class StorageService:
    def __init__(self, checkin_dir, faces_dir=None):
        self.checkin_dir = Path(checkin_dir)
        self.faces_dir = Path(faces_dir) if faces_dir is not None else self.checkin_dir.parent / "faces"

    def save_guest_frame(self, frame_bytes, filename=None):
        suffix = Path(filename).suffix.lower() if filename else ".bin"
        if not suffix:
            suffix = ".bin"

        date_dir = self.checkin_dir / datetime.now().date().isoformat()
        snapshot_path = date_dir / f"{uuid4().hex}{suffix}"
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        snapshot_path.write_bytes(frame_bytes)
        return snapshot_path

    def save_employee_face_sample(self, employee_id, sample_index, frame_bytes, filename=None):
        suffix = Path(filename).suffix.lower() if filename else ".bin"
        if not suffix:
            suffix = ".bin"

        employee_dir = self.faces_dir / f"employee-{employee_id}"
        sample_path = employee_dir / f"sample-{sample_index}{suffix}"
        sample_path.parent.mkdir(parents=True, exist_ok=True)
        sample_path.write_bytes(frame_bytes)
        return sample_path

    def remove_path(self, path):
        path = Path(path)
        path.unlink(missing_ok=True)

    def remove_employee_face_files(self, image_paths):
        employee_dirs = set()

        for image_path in image_paths:
            path = Path(image_path)
            employee_dirs.add(path.parent)
            path.unlink(missing_ok=True)

        for employee_dir in employee_dirs:
            try:
                employee_dir.rmdir()
            except OSError:
                pass
