# AI Logo Visualizer

A Flask web app that lets you upload a product image, select an item code from your product catalog, and visually place a logo within the **exact max print area** defined in your Excel data.

## Features

- 🔍 **Search products** by item code or name (from `main.xlsx`)
- 📐 **Exact print area** — the blue dashed rectangle matches `MaxPrintAreaDefault` for each product
- 🖼️ **Logo constrained** to the print area — cannot be dragged outside
- 🎨 **White background removal** from logos automatically
- 🔧 **Logo size & opacity** controls
- 💾 **Download** the final mockup (without print area overlay)
- 📱 **Touch support** for mobile dragging

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the app
python app.py
```

Then open http://localhost:5000 in your browser.

## How It Works

1. **Upload a product image** (e.g. a bag, bottle, t-shirt)
2. **Search & select the item code** from the catalog — the print area rectangle appears automatically
3. **Upload your logo** — white background is stripped
4. **Drag the logo** within the blue print area rectangle
5. **Download** the mockup

## Project Structure

```
logo_visualizer/
├── app.py                  # Flask backend
├── requirements.txt
├── templates/
│   └── index.html          # Main UI
└── static/
    ├── css/style.css       # Styles
    ├── js/
    │   ├── script.js       # Canvas logic
    │   └── products.json   # Product catalog (from Excel)
    └── uploads/            # Uploaded images (auto-created)
```

## Print Area Logic

The `MaxPrintAreaDefault` column in the Excel (e.g. `150 x 150 mm`) is parsed and proportionally scaled to fit on the 600×600 canvas. The print area is centered on the product image. The logo is **hard-constrained** so it cannot be placed outside this rectangle.
