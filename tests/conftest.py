"""Shared pytest fixtures."""

from __future__ import annotations

import os
import shutil
import tempfile

import pytest

from logo_visualizer import create_app


@pytest.fixture
def app():
    upload_dir = tempfile.mkdtemp(prefix="logo-visualizer-test-")
    application = create_app("testing")
    application.config["UPLOAD_FOLDER"] = upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    yield application
    shutil.rmtree(upload_dir, ignore_errors=True)


@pytest.fixture
def client(app):
    return app.test_client()