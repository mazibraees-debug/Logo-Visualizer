"""Upload handling routes."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from PIL import Image

from ..services.images import strip_white_background, validate_image
from ..utils.files import allowed_file, unique_filename

logger = logging.getLogger(__name__)

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.route("/upload", methods=["POST"])
def upload_file():
    """Accept an uploaded image and return a URL to the processed file."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    allowed = current_app.config["ALLOWED_EXTENSIONS"]
    if not allowed_file(file.filename, allowed):
        return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(sorted(allowed))}"}), 400

    file_type = request.form.get("type", "product")
    if file_type not in {"product", "logo"}:
        return jsonify({"error": "Invalid upload type"}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = unique_filename(ext)
    save_path = Path(upload_folder) / filename

    try:
        file.save(save_path)
    except OSError as exc:
        logger.error("Failed to save upload: %s", exc)
        return jsonify({"error": "Could not save file"}), 500

    if not validate_image(str(save_path)):
        try:
            save_path.unlink(missing_ok=True)
        except OSError:
            pass
        return jsonify({"error": "Uploaded file is not a valid image"}), 400

    # Remove white background from logos
    if file_type == "logo":
        try:
            with Image.open(save_path) as img:
                processed = strip_white_background(img)
            new_filename = unique_filename("png", prefix="proc")
            new_path = Path(upload_folder) / new_filename
            processed.save(new_path, "PNG")
            save_path.unlink(missing_ok=True)
            filename = new_filename
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to process logo image: %s", exc)
            try:
                save_path.unlink(missing_ok=True)
            except OSError:
                pass
            return jsonify({"error": "Could not process image"}), 500

    return jsonify({"url": f"/uploads/{filename}"})


@uploads_bp.route("/uploads/<path:filename>")
def uploaded_file(filename: str):
    """Serve an uploaded file from the writable upload folder."""
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    return send_from_directory(upload_folder, filename)