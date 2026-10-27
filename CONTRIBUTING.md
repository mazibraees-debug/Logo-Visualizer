# Contributing

1. Fork and clone the repository.
2. Create a virtual environment and install dev dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```
3. Run the test suite before submitting:
   ```bash
   pytest
   ```
4. Lint and format:
   ```bash
   ruff check .
   ruff format .
   ```
5. Open a pull request against `main`.

Please keep changes focused and add tests for new behaviour.