.PHONY: install install-dev run test lint format clean

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt

run:
	python app.py

test:
	pytest

lint:
	ruff check .

format:
	ruff format .

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache .ruff_cache