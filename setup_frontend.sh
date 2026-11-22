#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

export PATH="$HOME/.local/bin:$PATH"

if [ ! -d "frontend" ]; then
    npx --yes create-vite@latest frontend --template react-ts
fi

cd frontend
npm install
npm install -D tailwindcss@^3.4.17 postcss autoprefixer
npm install recharts lucide-react clsx tailwind-merge
npx tailwindcss init -p
