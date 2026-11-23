import os
import sys
import uvicorn

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "false").lower() in ("true", "1")
    print(f"Starting NEXUS Unified Production Server on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload, log_level="info")
