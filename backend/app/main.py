import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    title="NEXUS Process Manager API",
    description="Real Linux Process Scheduling and Resource Management Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite development server
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
