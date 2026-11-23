#!/usr/bin/env bash
set -e

echo "=================================================="
echo "    NEXUS Enterprise Supervisor - Production Deploy"
echo "=================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 1. Build Production Frontend
echo "--> Step 1/3: Compiling React/TypeScript UI..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm ci || npm install
fi
npm run build

# 2. Setup Python Virtual Environment
echo "--> Step 2/3: Installing Python dependencies..."
cd "$ROOT_DIR"
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
fi
backend/venv/bin/pip install --upgrade pip
backend/venv/bin/pip install -r backend/requirements.txt

# 3. Launch Unified Server
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
echo "--> Step 3/3: Launching Unified Production Server on http://$HOST:$PORT"
echo "    Static UI + REST API + WebSockets served on single port :$PORT"
export HOST PORT
exec backend/venv/bin/python backend/run.py
