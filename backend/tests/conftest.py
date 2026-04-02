import sys
from pathlib import Path

import pytest

TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

for path in (REPO_ROOT, BACKEND_DIR):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

try:
    from backend.app import create_app
except ModuleNotFoundError:
    from app import create_app


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
