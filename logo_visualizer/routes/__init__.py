"""Route registration."""

from __future__ import annotations

from flask import Flask

from .api import api_bp
from .main import main_bp
from .uploads import uploads_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(uploads_bp)