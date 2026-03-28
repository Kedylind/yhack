#!/usr/bin/env bash
set -euo pipefail

echo "Setting up backend..."
bash apps/backend/scripts/setup_backend.sh

echo ""
echo "Setting up frontend..."
bash apps/frontend/scripts/setup_frontend.sh

echo ""
echo "All dependencies installed."

chmod +x scripts/bootstrap_all.sh
