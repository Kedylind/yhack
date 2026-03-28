#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PYTHON_BIN="${PYTHON_BIN:-python3.11}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: $PYTHON_BIN is not installed."
  exit 1
fi

echo "Creating virtual environment..."
"$PYTHON_BIN" -m venv .venv

echo "Activating virtual environment..."
# shellcheck disable=SC1091
source .venv/bin/activate

echo "Upgrading pip/setuptools/wheel..."
python -m pip install --upgrade pip setuptools wheel

echo "Installing backend dependencies..."
pip install -e ".[dev]"

echo ""
echo "Backend setup complete."
echo "Activate with:"
echo "  cd apps/backend && source .venv/bin/activate"
echo ""
echo "Run API with:"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

chmod +x apps/backend/scripts/setup_backend.sh
