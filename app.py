from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
from PIL import Image
import uuid
import re

# ===== VERCEL-COMPATIBLE PATHS =====
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
PRODUCTS_JSON = os.path.join(BASE_DIR, 'static', 'js', 'products.json')

# Vercel filesystem is read-only except /tmp
UPLOAD_FOLDER = '/tmp/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__,
            template_folder=TEMPLATE_DIR,
            static_folder=STATIC_DIR)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load product data
with open(PRODUCTS_JSON, 'r') as f:
    PRODUCTS = json.load(f)

PRODUCT_MAP = {p['ItemCode']: p for p in PRODUCTS}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/products')
def get_products():
    return jsonify(PRODUCTS)


@app.route('/api/product/<item_code>')
def get_product(item_code):
    product = PRODUCT_MAP.get(item_code)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    area = product.get('MaxPrintAreaDefault', '')
    match = re.match(r'(\d+)\s*x\s*(\d+)', area)
    if match:
        product = dict(product)
        product['printArea'] = {
            'width_mm': int(match.group(1)),
            'height_mm': int(match.group(2)),
            'label': area.strip()
        }

    return jsonify(product)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    file_type = request.form.get('type')

    ext = file.filename.rsplit('.', 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)

    # Remove white background from logo
    if file_type == 'logo':
        img = Image.open(save_path).convert('RGBA')
        datas = img.getdata()
        newData = []
        for item in datas:
            if item[0] > 225 and item[1] > 225 and item[2] > 225:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)
        new_filename = f"proc_{uuid.uuid4().hex}.png"
        save_path = os.path.join(UPLOAD_FOLDER, new_filename)
        img.save(save_path, 'PNG')
        filename = new_filename

    return jsonify({'url': f'/uploads/{filename}'})


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == '__main__':
    app.run(debug=True)
