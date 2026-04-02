def test_health_endpoint_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_app_creates_sqlite_db_file(app):
    db_path = app.config["APP_DB_PATH"]

    assert db_path.exists()
