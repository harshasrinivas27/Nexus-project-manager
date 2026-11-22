#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/frontend"

export PATH="$HOME/.local/bin:$PATH"

echo "=== Starting NEXUS Process Manager Frontend (Vite) ==="
echo "Serving on http://localhost:5173 ..."
exec npm run dev
