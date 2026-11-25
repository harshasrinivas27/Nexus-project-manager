"""
NEXUS Entry Point & Unified FastAPI Server.
- Initializes the SQLite database (WAL mode) and loads persisted jobs on startup.
- Starts the 500ms WebSocket telemetry background broadcaster.
- Serves both the REST/WebSocket APIs (/api, /ws/live) and the compiled React SPA (frontend/dist).
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database.database import init_db
from .scheduler.scheduler_engine import scheduler_engine
from .process_manager.process_controller import process_controller
from .api.routes import router as api_router
from .api.websocket import router as ws_router, telemetry_broadcaster_task

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database and Scheduler
    init_db()
    await scheduler_engine.load_jobs_from_db()

    # Launch WebSocket telemetry broadcast worker
    broadcast_task = asyncio.create_task(telemetry_broadcaster_task())

    yield

    # Shutdown: Clean up processes and broadcast task
    broadcast_task.cancel()
    await scheduler_engine.stop()
    process_controller.cleanup_all()

app = FastAPI(
    title="NEXUS Enterprise Process Supervisor",
    description="Linux Process Scheduling and Real-Time Telemetry Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend development and API consumers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "NEXUS Process Manager"}

# Static and SPA routing for unified production deployment
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def serve_spa(full_path: str):
    file_path = os.path.join(FRONTEND_DIST, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {"message": "NEXUS Process Manager API is operational. Run 'npm run build' in frontend to enable UI."}

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
