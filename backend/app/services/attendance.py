from datetime import datetime

from ..extensions import db
from ..models import AttendanceEvent


class AttendanceService:
    def record_checkin(self, employee_id, snapshot_path, distance=None, checked_in_at=None):
        checked_in_at = checked_in_at or datetime.utcnow()
        checkin_date = checked_in_at.date().isoformat()
        existing_event = AttendanceEvent.query.filter_by(
            employee_id=employee_id,
            checkin_date=checkin_date,
        ).first()

        if existing_event is not None:
            return existing_event, False

        event = AttendanceEvent(
            employee_id=employee_id,
            checked_in_at=checked_in_at,
            checkin_date=checkin_date,
            snapshot_path=str(snapshot_path),
            distance=distance,
        )
        db.session.add(event)
        db.session.commit()
        return event, True
