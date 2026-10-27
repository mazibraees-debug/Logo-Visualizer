"""JSON API routes."""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify

from ..services.products import find_product

api_bp = Blueprint("api", __name__)


@api_bp.route("/products")
def get_products():
    """Return the full product catalog."""
    return jsonify(current_app.config["PRODUCTS"])


@api_bp.route("/product/<item_code>")
def get_product(item_code: str):
    """Return a single product with parsed print-area dimensions."""
    product = find_product(current_app.config["PRODUCTS"], item_code)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    response = dict(product)
    from ..services.images import parse_print_area

    print_area = parse_print_area(product.get("MaxPrintAreaDefault", ""))
    if print_area:
        response["printArea"] = print_area
    return jsonify(response)


@api_bp.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "products": len(current_app.config["PRODUCTS"])})