from pathlib import Path

import pytest

from backend.app import create_app


@pytest.fixture
def app(tmp_path):
    data_dir = tmp_path / "data"
    app = create_app(
        {
            "TESTING": True,
            "APP_DB_PATH": data_dir / "app.db",
            "CHECKIN_DIR": data_dir / "checkins",
            "FACES_DIR": data_dir / "faces",
        }
    )

    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    return app.test_client()
