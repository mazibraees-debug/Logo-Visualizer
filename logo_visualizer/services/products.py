"""Product catalog service."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def load_products(path: str | Path) -> list[dict[str, Any]]:
    """Load the product catalog from a JSON file."""
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, list):
            logger.error("products.json must contain a list")
            return []
        return data
    except FileNotFoundError:
        logger.error("products.json not found at %s", path)
        return []
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Could not load products.json: %s", exc)
        return []


def find_product(products: list[dict[str, Any]], item_code: str) -> dict[str, Any] | None:
    """Find a product by item code."""
    for product in products:
        if product.get("ItemCode") == item_code:
            return product
    return None