from datetime import datetime

from .extensions import db


class ManagerUser(db.Model):
    __tablename__ = "manager_users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    employee_code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class FaceSample(db.Model):
    __tablename__ = "face_samples"
    __table_args__ = (db.UniqueConstraint("employee_id", "sample_index", name="uq_employee_sample_index"),)

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    sample_index = db.Column(db.Integer, nullable=False)
    image_path = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class AttendanceEvent(db.Model):
    __tablename__ = "attendance_events"
    __table_args__ = (db.UniqueConstraint("employee_id", "checkin_date", name="uq_employee_checkin_date"),)

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    checkin_date = db.Column(db.Date, nullable=False)
    checkin_time = db.Column(db.DateTime, nullable=False)
    source = db.Column(db.String(64), nullable=False, default="camera")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
