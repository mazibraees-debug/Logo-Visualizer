# AI Logo Visualizer

[![CI](https://github.com/mazibraees-debug/Logo-Visualizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/mazibraees-debug/Logo-Visualizer/actions/workflows/deploy.yml)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A Flask web application that lets you upload any product image, upload a logo, and visually place it **with exact size and exact position** while strictly locking it **within the product boundary or custom print area**.

## Features

- 👕 **Universal Product Support** — upload any t-shirt, hoodie, mug, bottle, or packaging with automatic aspect-ratio preservation (zero distortion).
- 📐 **Strict Boundary Protection** — choose between *Full Product* or *Custom Drawn Area* (drag rectangle on product). The logo cannot be dragged or resized outside the boundary.
- 🎯 **Exact Positioning & Sizing** — live numeric inputs for X, Y, Width, and Height (px), plus quick alignment shortcuts (Chest, Center, Top, Fit).
- 🔄 **Interactive Handles & Controls** — 4 corner resize handles, mouse/touch dragging, rotation slider, and opacity slider.
- 🎨 **Automatic White-Background Removal** — uploaded logos are automatically cleaned with transparency.
- ✨ **Realistic Mockup Visualization** — *Multiply* blend mode for realistic fabric/surface print realism, plus one-click *Clean Preview* to hide guides and inspect the final product.
- 💾 **High-Resolution Export** — download the clean, composite mockup at the product's original resolution.
- ✅ **Tested & Linted** — pytest suite and ruff checks.

## Tech stack

- **Backend:** Flask, Pillow, Gunicorn
- **Frontend:** Vanilla JavaScript (Canvas API), CSS
- **Tooling:** pytest, ruff, pre-commit, Docker
- **Deployment:** Vercel / Docker / any WSGI host

## Project structure

`
Logo-Visualizer/
├── app.py                  # WSGI entry point
├── logo_visualizer/        # Application package
│   ├── __init__.py         # App factory
│   ├── config.py           # Environment-based configuration
│   ├── routes/             # Blueprints (main, api, uploads)
│   ├── services/           # Business logic (images)
│   └── utils/              # Helpers (file handling)
├── static/                 # CSS & JS
├── templates/              # Jinja2 templates
├── tests/                  # pytest suite
├── Dockerfile
├── docker-compose.yml
└── requirements*.txt
`

## Getting started


### Prerequisites

- Python 3.11+

### Installation

```bash
git clone https://github.com/mazibraees-debug/Logo-Visualizer.git
cd Logo-Visualizer

python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements-dev.txt
```

### Run

```bash
python app.py
```

Open http://localhost:5000 in your browser.

### Configuration

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | `development` / `production` / `testing` | `development` |
| `SECRET_KEY` | Flask secret key | `change-me-in-production` |
| `UPLOAD_FOLDER` | Writable upload directory | `/tmp/uploads` |
| `MAX_UPLOAD_BYTES` | Max upload size in bytes | `10485760` |

## Testing & linting

```bash
pytest
ruff check .
```

## Docker

```bash
docker compose up --build
```

Then open http://localhost:5000.

## Deployment (Vercel)

The repository includes a `vercel.json`. Set the `VERCEL_TOKEN` secret in
GitHub Actions (or run `vercel --prod` locally) to deploy.

## How it works

1. **Upload a product image** (e.g. a bag, bottle, t-shirt)
2. **Search & select the item code** from the catalog — the print area rectangle appears
3. **Upload your logo** — white background is stripped automatically
4. **Drag the logo** within the blue print area rectangle
5. **Download** the mockup

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Full product catalog |
| GET | `/api/product/<item_code>` | Single product with parsed print area |
| GET | `/api/health` | Health check |
| POST | `/upload` | Upload product/logo image (`multipart/form-data`) |
| GET | `/uploads/<filename>` | Serve uploaded file |

## License

MIT — see [LICENSE](LICENSE).