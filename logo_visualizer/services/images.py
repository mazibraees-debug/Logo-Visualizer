"""Image processing helpers."""

from __future__ import annotations

import re
from typing import Any

from PIL import Image


def strip_white_background(image: Image.Image, threshold: int = 225) -> Image.Image:
    """Remove near-white pixels from an image, returning a new RGBA image."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > threshold and g > threshold and b > threshold:
                pixels[x, y] = (255, 255, 255, 0)
    return rgba


def parse_print_area(area: str | None) -> dict[str, Any] | None:
    """Parse a ``W x H mm`` (or ``W x H``) string into a structured dict."""
    if not area:
        return None
    match = re.match(r"(\d+)\s*x\s*(\d+)", str(area).strip(), re.IGNORECASE)
    if not match:
        return None
    return {
        "width_mm": int(match.group(1)),
        "height_mm": int(match.group(2)),
        "label": str(area).strip(),
    }


def validate_image(path: str) -> bool:
    """Verify that a file is a valid, openable image."""
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:  # noqa: BLE001
        return False