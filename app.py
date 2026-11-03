"""Entry point for the Logo Visualizer Flask application.

Vercel (and other WSGI hosts) import the ``app`` object from this module.
"""

from __future__ import annotations

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass

from logo_visualizer import create_app

app = create_app(os.environ.get("APP_ENV") or os.environ.get("FLASK_ENV"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=app.config.get("DEBUG", False))
