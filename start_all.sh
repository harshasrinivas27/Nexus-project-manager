#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "          NEXUS PROCESS MANAGER - WSL 2 WORKSTATION     "
echo "========================================================"

# Trap SIGINT to kill background jobs cleanly
trap 'echo -e "\nStopping NEXUS servers..."; kill 0; exit' SIGINT SIGTERM

export PATH="$HOME/.local/bin:$PATH"

# 1. Start Backend in background
echo "Starting Backend on http://localhost:8000 ..."
backend/venv/bin/python backend/run.py &
BACKEND_PID=$!

# Wait 2 seconds for backend to bind port
sleep 2

# 2. Start Frontend in background
echo "Starting Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo ">>> NEXUS Process Manager is running!"
echo ">>> Frontend UI:  http://localhost:5173"
echo ">>> Backend API:  http://localhost:8000"
echo ">>> Swagger Docs: http://localhost:8000/docs"
echo ">>> Press [Ctrl + C] to shutdown all services."
echo ""

wait
