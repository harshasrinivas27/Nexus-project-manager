#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== Starting NEXUS Process Manager Backend ==="
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install --upgrade pip
    backend/venv/bin/pip install -r backend/requirements.txt
fi

export PYTHONPATH="$DIR/backend"
echo "Launching FastAPI on http://0.0.0.0:8000 ..."
exec backend/venv/bin/python backend/run.py
