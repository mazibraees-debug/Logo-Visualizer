"""Logo Visualizer application package."""

from __future__ import annotations

import logging
import os
from typing import Any

from flask import Flask

from .config import get_config
from .routes import register_blueprints
from .services.products import load_products


def create_app(config_name: str | None = None) -> Flask:
    """Application factory.

    Parameters
    ----------
    config_name:
        Optional config name (``development``, ``production``, ``testing``).
        Defaults to the ``FLASK_ENV`` / ``APP_ENV`` environment variable.
    """
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates"),
        static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)), "static"),
        static_url_path="/static",
    )

    config = get_config(config_name)
    app.config.from_object(config)

    # Ensure the upload folder exists.
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Logging
    logging.basicConfig(
        level=logging.INFO if not app.config.get("DEBUG") else logging.DEBUG,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # Load product catalog once.
    app.config["PRODUCTS"] = load_products(app.config["PRODUCTS_JSON"])
    app.config["PRODUCT_MAP"] = {p["ItemCode"]: p for p in app.config["PRODUCTS"]}

    register_blueprints(app)
    register_error_handlers(app)
    register_security_headers(app)

    return app


def register_security_headers(app: Flask) -> None:
    """Apply a small set of security headers to every response."""

    @app.after_request
    def add_security_headers(response):  # type: ignore[override]
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("X-XSS-Protection", "0")
        return response


def register_error_handlers(app: Flask) -> None:
    """Register JSON-friendly error handlers."""

    @app.errorhandler(400)
    def bad_request(error: Any):  # type: ignore[override]
        return {"error": "Bad request", "detail": str(error)}, 400

    @app.errorhandler(404)
    def not_found(error: Any):  # type: ignore[override]
        return {"error": "Not found"}, 404

    @app.errorhandler(413)
    def request_entity_too_large(error: Any):  # type: ignore[override]
        return {"error": "File too large. Maximum size is 10 MB."}, 413

    @app.errorhandler(500)
    def internal_error(error: Any):  # type: ignore[override]
        app.logger.exception("Unhandled server error")
        return {"error": "Internal server error"}, 500