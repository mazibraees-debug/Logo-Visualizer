"""Route-level tests."""

from __future__ import annotations

import io

from PIL import Image


def test_index(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Logo Visualizer" in resp.data


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"
    assert data["products"] > 0


def test_products(client):
    resp = client.get("/api/products")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "ItemCode" in data[0]


def test_product_found(client):
    products = client.get("/api/products").get_json()
    code = products[0]["ItemCode"]
    resp = client.get(f"/api/product/{code}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ItemCode"] == code


def test_product_not_found(client):
    resp = client.get("/api/product/DOES-NOT-EXIST")
    assert resp.status_code == 404


def test_upload_no_file(client):
    resp = client.post("/upload", data={})
    assert resp.status_code == 400


def test_upload_invalid_type(client):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(buf, format="PNG")
    buf.seek(0)
    data = {"file": (buf, "test.png"), "type": "nope"}
    resp = client.post("/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400


def _png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_upload_product(client):
    buf = _png_bytes()
    data = {"file": (buf, "product.png"), "type": "product"}
    resp = client.post("/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert "url" in payload
    assert payload["url"].startswith("/uploads/")


def test_upload_logo(client):
    buf = _png_bytes()
    data = {"file": (buf, "logo.png"), "type": "logo"}
    resp = client.post("/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["url"].endswith(".png")


def test_upload_invalid_image(client):
    buf = io.BytesIO(b"not an image")
    data = {"file": (buf, "bad.png"), "type": "product"}
    resp = client.post("/upload", data=data, content_type="multipart/form-data")
    assert resp.status_code == 400


def test_security_headers(client):
    resp = client.get("/")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"