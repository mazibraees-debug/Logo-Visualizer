"""Image processing helpers."""

from __future__ import annotations

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


def validate_image(path: str) -> bool:
    """Verify that a file is a valid, openable image."""
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:  # noqa: BLE001
        return False
