#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

echo "Installing frontend dependencies..."
npm install

echo ""
echo "Frontend setup complete."
echo "Run frontend with:"
echo "  cd apps/frontend && npm run dev"

chmod +x apps/frontend/scripts/setup_frontend.sh
