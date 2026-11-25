"""
Real-Time WebSocket Telemetry Server (/ws/live).
Maintains persistent browser connections and broadcasts a JSON telemetry snapshot
every 500ms containing host CPU/RAM stats, live managed PIDs, scheduler state, and Gantt slices.
"""
import asyncio
import json
import psutil
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set
from ..process_manager.process_monitor import process_monitor
from ..process_manager.process_controller import process_controller
from ..scheduler.scheduler_engine import scheduler_engine
from ..analytics.metrics import get_gantt_chart_data

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        payload = json.dumps(message)
        dead = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(payload)
            except Exception:
                dead.add(conn)
        for d in dead:
            self.active_connections.discard(d)

manager = ConnectionManager()

@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and allow client to send pings/commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

async def telemetry_broadcaster_task():
    """Loops every 500ms sending high-fidelity OS and scheduler metrics."""
    while True:
        try:
            if manager.active_connections:
                sys_metrics = process_monitor.get_system_metrics()
                live_procs = process_monitor.poll_all_managed()

                jobs_snapshot = list(scheduler_engine.jobs.values())
                counts = {
                    "total": len(jobs_snapshot),
                    "pending": sum(1 for j in jobs_snapshot if j["status"] == "PENDING"),
                    "ready": sum(1 for j in jobs_snapshot if j["status"] == "READY"),
                    "running": sum(1 for j in jobs_snapshot if j["status"] == "RUNNING"),
                    "paused": sum(1 for j in jobs_snapshot if j["status"] == "PAUSED"),
                    "completed": sum(1 for j in jobs_snapshot if j["status"] == "COMPLETED"),
                    "failed": sum(1 for j in jobs_snapshot if j["status"] in ("FAILED", "TERMINATED"))
                }

                # Construct process items
                proc_items = []
                for jid, job in scheduler_engine.jobs.items():
                    if job.get("pid"):
                        m = live_procs.get(jid) or {}
                        proc_items.append({
                            "job_id": jid,
                            "name": job["name"],
                            "pid": job["pid"],
                            "pgid": job["pgid"],
                            "status": job["status"],
                            "os_status": m.get("status", "TERMINATED" if not process_controller.is_alive(jid) else "RUNNING"),
                            "cpu_percent": m.get("cpu_percent", 0.0),
                            "memory_rss_mb": m.get("memory_rss_mb", 0.0),
                            "memory_percent": m.get("memory_percent", 0.0),
                            "elapsed_time": round(job.get("elapsed_time", 0.0), 1),
                            "slot": job.get("assigned_slot"),
                            "workload_type": job["workload_type"]
                        })

                gantt = get_gantt_chart_data(scheduler_engine.current_run_id)

                packet = {
                    "type": "telemetry",
                    "system": sys_metrics,
                    "scheduler": {
                        "status": scheduler_engine.status,
                        "algorithm": scheduler_engine.algorithm_name,
                        "quantum": scheduler_engine.quantum,
                        "execution_slots": scheduler_engine.execution_slots,
                        "is_preemptive": scheduler_engine.is_preemptive,
                        "sim_elapsed_time": round(scheduler_engine.sim_elapsed_time, 2),
                        "active_slots": scheduler_engine.running_slots,
                        "counts": counts
                    },
                    "processes": proc_items,
                    "gantt": gantt
                }

                await manager.broadcast(packet)
        except Exception as e:
            pass
        await asyncio.sleep(0.5)
