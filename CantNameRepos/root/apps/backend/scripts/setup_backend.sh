#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PYTHON_BIN="${PYTHON_BIN:-python3.11}"
MONGO_FORMULA="${MONGO_FORMULA:-mongodb-community@7.0}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Error: $PYTHON_BIN is not installed."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Error: Homebrew is not installed."
  echo "Install Homebrew first, then rerun this script."
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

echo "Checking MongoDB Homebrew tap..."
if ! brew tap | grep -q "^mongodb/brew$"; then
  brew tap mongodb/brew
fi

echo "Checking MongoDB installation..."
if ! brew list "$MONGO_FORMULA" >/dev/null 2>&1; then
  echo "Installing $MONGO_FORMULA..."
  brew install "$MONGO_FORMULA"
else
  echo "$MONGO_FORMULA is already installed."
fi

echo "Starting MongoDB..."
brew services start "mongodb/brew/$MONGO_FORMULA"

if ! command -v mongosh >/dev/null 2>&1; then
  echo "Warning: mongosh is not on PATH yet."
  echo "MongoDB may still be installed correctly, but shell verification is being skipped."
else
  echo "Waiting for MongoDB to accept connections..."
  ATTEMPTS=0
  MAX_ATTEMPTS=30

  until mongosh --quiet --eval "db.adminCommand({ ping: 1 })" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
      echo "Error: MongoDB did not become ready in time."
      echo "Check status with: brew services list"
      exit 1
    fi
    sleep 2
  done

  echo "MongoDB is running."
fi

echo ""
echo "Backend setup complete."
echo ""
echo "Activate with:"
echo "  cd apps/backend && source .venv/bin/activate"
echo ""
echo "Run API with:"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "MongoDB status:"
echo "  brew services list"
echo ""
echo "Open Mongo shell:"
echo "  mongosh"
echo ""
echo "Seed database:"
echo "  python -m scripts.seed_mongo"
