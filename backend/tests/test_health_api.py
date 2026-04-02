try:
    from backend.app.extensions import db
except ModuleNotFoundError:
    from app.extensions import db


def test_health_endpoint_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_app_creates_sqlite_db_file(app):
    db_path = app.config["APP_DB_PATH"]

    assert db_path.exists()


def test_database_tables_are_created(app):
    expected_tables = {
        "manager_users",
        "employees",
        "face_samples",
        "attendance_events",
    }

    with app.app_context():
        assert expected_tables.issubset(db.metadata.tables.keys())
