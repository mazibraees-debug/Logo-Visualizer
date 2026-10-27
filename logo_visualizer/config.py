"""Application configuration."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
    DEBUG = False
    TESTING = False

    BASE_DIR = BASE_DIR
    TEMPLATE_FOLDER = BASE_DIR / "templates"
    STATIC_FOLDER = BASE_DIR / "static"

    UPLOAD_FOLDER = Path(os.environ.get("UPLOAD_FOLDER", "/tmp/uploads"))
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}
    PRODUCTS_JSON = BASE_DIR / "static" / "js" / "products.json"

    # Security headers
    SECURITY_HEADERS = True


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    UPLOAD_FOLDER = Path(os.environ.get("UPLOAD_FOLDER", "/tmp/test-uploads"))


_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "dev": DevelopmentConfig,
    "production": ProductionConfig,
    "prod": ProductionConfig,
    "testing": TestingConfig,
    "test": TestingConfig,
}


def get_config(name: str | None = None) -> type[Config]:
    """Resolve a config class from a name or environment."""
    if name is None:
        name = os.environ.get("APP_ENV") or os.environ.get("FLASK_ENV") or "development"
    return _CONFIG_MAP.get(name.lower(), DevelopmentConfig)