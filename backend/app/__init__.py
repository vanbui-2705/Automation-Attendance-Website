from pathlib import Path

from flask import Flask

from .config import Config
from .extensions import db
from .routes.health import health_bp


def _resolve_paths(app):
    app.config["APP_DB_PATH"] = Path(app.config["APP_DB_PATH"])
    app.config["CHECKIN_DIR"] = Path(app.config["CHECKIN_DIR"])
    app.config["FACES_DIR"] = Path(app.config["FACES_DIR"])


def _configure_storage(app):
    db_path = app.config["APP_DB_PATH"]
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path.as_posix()}"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    app.config["CHECKIN_DIR"].mkdir(parents=True, exist_ok=True)
    app.config["FACES_DIR"].mkdir(parents=True, exist_ok=True)


def _initialize_database(app):
    db.init_app(app)

    from . import models  # noqa: F401

    with app.app_context():
        db.create_all()


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    _resolve_paths(app)
    _configure_storage(app)
    _initialize_database(app)
    app.register_blueprint(health_bp, url_prefix="/api")

    return app
