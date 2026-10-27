"""File handling helpers."""

from __future__ import annotations

import uuid
from pathlib import Path

from werkzeug.utils import secure_filename


def allowed_file(filename: str, allowed: set[str]) -> bool:
    """Return True when ``filename`` has an allowed extension."""
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[-1].lower() in allowed


def safe_extension(filename: str) -> str:
    """Extract and normalize the file extension."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def unique_filename(ext: str, prefix: str = "") -> str:
    """Generate a unique filename with the given extension."""
    base = uuid.uuid4().hex
    if prefix:
        base = f"{prefix}_{base}"
    if ext and not ext.startswith("."):
        ext = f".{ext}"
    return f"{base}{ext}"


def safe_join(base: str | Path, filename: str) -> Path | None:
    """Safely join ``filename`` to ``base`` preventing path traversal."""
    base_path = Path(base).resolve()
    target = (base_path / secure_filename(filename)).resolve()
    try:
        target.relative_to(base_path)
    except ValueError:
        return None
    return target