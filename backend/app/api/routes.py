"""
NEXUS REST API Routes (/api/*).
Handles interactive user actions:
- Job CRUD, standard benchmark presets, and randomized scenario generation.
- Scheduler configuration (FCFS, SJF/SRTF, Priority, Round Robin) & lifecycle controls.
- Direct POSIX signals (SIGSTOP, SIGCONT, SIGTERM) and live stdout/stderr log retrieval.
- Host hardware settings (CPU affinity) and Analytics summaries/history.
"""
import os
import random
import psutil
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from ..database.models import JobCreate, JobUpdate, JobResponse, SchedulerConfig, ProcessAction, SystemSettings, RandomBatchRequest
from ..database.database import get_db_connection
from ..scheduler.scheduler_engine import scheduler_engine
from ..process_manager.process_controller import process_controller
from ..process_manager.process_monitor import process_monitor
from ..analytics.metrics import get_analytics_summary, get_gantt_chart_data
from ..analytics.execution_history import execution_history

router = APIRouter(prefix="/api")

# --- JOBS MANAGEMENT ---

@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_jobs():
    jobs = list(scheduler_engine.jobs.values())
    summary = get_analytics_summary(jobs, scheduler_engine.sim_start_time, scheduler_engine.current_run_id)
    return summary["jobs"]

@router.post("/jobs")
async def create_job(payload: JobCreate):
    # Validate custom command if provided
    if payload.workload_type == "custom":
        if not payload.command:
            raise HTTPException(status_code=400, detail="Custom workload requires a command string")
        is_valid, msg, _ = process_controller.validate_command(payload.command)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Command validation failed: {msg}")

    job = await scheduler_engine.create_job(payload.model_dump())
    return job

@router.put("/jobs/{job_id}")
async def update_job(job_id: str, payload: JobUpdate):
    if job_id not in scheduler_engine.jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = scheduler_engine.jobs[job_id]
    if job["status"] not in ("PENDING", "READY"):
        raise HTTPException(status_code=400, detail=f"Cannot edit job in '{job['status']}' state")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    async with scheduler_engine.lock:
        for k, v in update_data.items():
            job[k] = v
            if k == "estimated_burst_time":
                job["remaining_burst_time"] = v

        conn = get_db_connection()
        conn.execute("""
        UPDATE jobs SET name = ?, priority = ?, arrival_time = ?, estimated_burst_time = ?,
                       remaining_burst_time = ?, description = ?
        WHERE id = ?
        """, (
            job["name"], job["priority"], job["arrival_time"], job["estimated_burst_time"],
            job["remaining_burst_time"], job["description"], job_id
        ))
        conn.commit()
        conn.close()

    return job

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    succ = await scheduler_engine.delete_job(job_id)
    if not succ:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": True, "message": f"Job {job_id} deleted"}

@router.post("/jobs/batch-preset")
async def create_preset_workload():
    """Seeds a realistic OS benchmark workload batch."""
    presets = [
        {"name": "Matrix Multiplier (Core 0)", "workload_type": "cpu", "estimated_burst_time": 6.0, "arrival_time": 0.0, "priority": 3, "description": "High CPU matrix arithmetic"},
        {"name": "RAM Cache Filler (80MB)", "workload_type": "memory", "estimated_burst_time": 5.0, "arrival_time": 1.0, "priority": 5, "description": "Memory buffer allocation and sweeping"},
        {"name": "Disk Sync Logger", "workload_type": "io", "estimated_burst_time": 7.0, "arrival_time": 2.0, "priority": 6, "description": "Simulated disk flush and hash compute"},
        {"name": "Fast Prime Check", "workload_type": "cpu", "estimated_burst_time": 3.0, "arrival_time": 3.0, "priority": 1, "description": "Short burst high-priority math task"},
        {"name": "System Status Query", "workload_type": "custom", "command": "python3 -c 'import time; [print(f\"[Query] heartbeat {i+1}/4\", flush=True) or time.sleep(0.5) for i in range(4)]'", "estimated_burst_time": 2.0, "arrival_time": 4.0, "priority": 2, "description": "Custom validated Python command"}
    ]
    created = []
    for p in presets:
        j = await scheduler_engine.create_job(p)
        created.append(j)
    return {"success": True, "created_count": len(created), "jobs": created}

@router.post("/jobs/generate-random")
async def generate_random_workloads(payload: RandomBatchRequest):
    """Generates realistic randomized OS test cases with varied arrival times, burst lengths, and priorities."""
    if payload.clear_existing:
        await scheduler_engine.clear_all_jobs()

    task_templates = [
        ("Prime Sieve Worker", "cpu", "High-frequency prime verification workload"),
        ("Matrix Solver", "cpu", "Dense trigonometric matrix multiplication"),
        ("Page Cache Sweep", "memory", "Active 80MB RAM allocation & page mutation"),
        ("Disk Sync Daemon", "io", "Temporary file write + fsync + SHA-256 check"),
        ("Hash Verifier", "cpu", "Iterative cryptographic arithmetic check"),
        ("Buffer Allocator", "memory", "Resident heap page allocation stress test"),
        ("WAL Flusher", "io", "Sequential disk flush & integrity readback"),
        ("Vector Reducer", "cpu", "Floating-point vector transformation loop"),
        ("Telemetry Probe", "custom", "Direct POSIX Python stdout telemetry emitter"),
        ("Index Compactor", "io", "Block-level write + fsync verification"),
        ("Heap Scanner", "memory", "Memory page dirtying and sweep pass"),
        ("Worker Heartbeat", "custom", "Interactive POSIX diagnostic stream"),
    ]

    def build_custom_cmd(burst: float, label: str) -> str:
        steps = max(2, int(round(burst / 0.5)))
        return (
            f"python3 -c 'import os, time; "
            f"[print(f\"[{label}] PID={{os.getpid()}} tick {{i+1}}/{steps}\", flush=True) or time.sleep(0.5) for i in range({steps})]'"
        )

    jobs_to_create: List[Dict[str, Any]] = []
    shuffled = task_templates[:]
    random.shuffle(shuffled)

    if payload.scenario == "convoy":
        # 1 long heavy CPU job arriving at 0.0s followed by short burst interactive tasks
        jobs_to_create.append({
            "name": "Heavy Matrix Batch (Convoy)",
            "workload_type": "cpu",
            "estimated_burst_time": 7.5,
            "arrival_time": 0.0,
            "priority": 6,
            "description": "Long CPU task demonstrating FCFS convoy effect vs SJF/RR",
        })
        for idx in range(payload.count - 1):
            t_name, t_type, t_desc = shuffled[idx % len(shuffled)]
            burst = round(random.choice([1.5, 2.0, 2.5]), 1)
            arrival = round(0.5 + idx * 0.5, 1)
            item: Dict[str, Any] = {
                "name": f"{t_name} #{idx + 1}",
                "workload_type": t_type,
                "estimated_burst_time": burst,
                "arrival_time": arrival,
                "priority": random.randint(2, 5),
                "description": f"Short interactive task ({t_desc})",
            }
            if t_type == "custom":
                item["command"] = build_custom_cmd(burst, t_name.replace(" ", ""))
            jobs_to_create.append(item)

    elif payload.scenario == "priority_burst":
        # Low priority background jobs arrive first, then urgent Priority 1-2 tasks preempt them
        for idx in range(payload.count):
            t_name, t_type, t_desc = shuffled[idx % len(shuffled)]
            is_urgent = idx >= 2
            burst = round(random.choice([2.0, 2.5, 3.0]), 1) if is_urgent else round(random.choice([6.0, 7.0]), 1)
            arrival = 0.0 if idx < 2 else round(1.0 + (idx - 2) * 0.5, 1)
            prio = random.randint(1, 2) if is_urgent else random.randint(7, 9)
            item = {
                "name": f"{'Urgent ' if is_urgent else 'Batch '}{t_name}",
                "workload_type": t_type,
                "estimated_burst_time": burst,
                "arrival_time": arrival,
                "priority": prio,
                "description": f"{'High-urgency interrupt task' if is_urgent else 'Low-priority background batch'} ({t_desc})",
            }
            if t_type == "custom":
                item["command"] = build_custom_cmd(burst, t_name.replace(" ", ""))
            jobs_to_create.append(item)

    else:
        # 'random' balanced demo mix with staggered arrivals & varied bursts
        for idx in range(payload.count):
            t_name, t_type, t_desc = shuffled[idx % len(shuffled)]
            burst = round(random.randint(3, 13) * 0.5, 1)  # 1.5s .. 6.5s
            arrival = 0.0 if idx == 0 else round(random.randint(1, 10) * 0.5, 1)  # 0.5s .. 5.0s
            prio = random.randint(1, 10)
            suffix = f" #{idx + 1}" if payload.count > len(shuffled) else ""
            item = {
                "name": f"{t_name}{suffix}",
                "workload_type": t_type,
                "estimated_burst_time": burst,
                "arrival_time": arrival,
                "priority": prio,
                "description": t_desc,
            }
            if t_type == "custom":
                item["command"] = build_custom_cmd(burst, t_name.replace(" ", ""))
            jobs_to_create.append(item)

    # Sort visually by arrival time before insertion
    jobs_to_create.sort(key=lambda x: x["arrival_time"])
    created = []
    for item in jobs_to_create:
        created.append(await scheduler_engine.create_job(item))

    return {
        "success": True,
        "scenario": payload.scenario,
        "created_count": len(created),
        "jobs": created,
    }

@router.delete("/jobs")
async def clear_all_jobs():
    """Stops active runs and clears all queued/completed jobs."""
    await scheduler_engine.clear_all_jobs()
    return {"success": True, "message": "All jobs cleared"}

# --- SCHEDULER CONTROLS ---

@router.get("/scheduler/status")
async def get_scheduler_status():
    jobs = list(scheduler_engine.jobs.values())
    counts = {
        "total": len(jobs),
        "pending": sum(1 for j in jobs if j["status"] == "PENDING"),
        "ready": sum(1 for j in jobs if j["status"] == "READY"),
        "running": sum(1 for j in jobs if j["status"] == "RUNNING"),
        "paused": sum(1 for j in jobs if j["status"] == "PAUSED"),
        "completed": sum(1 for j in jobs if j["status"] == "COMPLETED"),
        "failed": sum(1 for j in jobs if j["status"] in ("FAILED", "TERMINATED"))
    }
    return {
        "status": scheduler_engine.status,
        "algorithm": scheduler_engine.algorithm_name,
        "quantum": scheduler_engine.quantum,
        "execution_slots": scheduler_engine.execution_slots,
        "is_preemptive": scheduler_engine.is_preemptive,
        "sim_elapsed_time": round(scheduler_engine.sim_elapsed_time, 2),
        "active_slots": scheduler_engine.running_slots,
        "job_counts": counts
    }

@router.post("/scheduler/config")
async def update_scheduler_config(payload: SchedulerConfig):
    scheduler_engine.configure(
        algorithm=payload.algorithm,
        quantum=payload.quantum,
        slots=payload.execution_slots,
        is_preemptive=payload.is_preemptive
    )
    return {
        "success": True,
        "algorithm": scheduler_engine.algorithm_name,
        "quantum": scheduler_engine.quantum,
        "execution_slots": scheduler_engine.execution_slots,
        "is_preemptive": scheduler_engine.is_preemptive
    }

@router.post("/scheduler/start")
async def start_scheduler():
    await scheduler_engine.start()
    return {"success": True, "status": scheduler_engine.status}

@router.post("/scheduler/pause")
async def pause_scheduler():
    await scheduler_engine.pause()
    return {"success": True, "status": scheduler_engine.status}

@router.post("/scheduler/stop")
async def stop_scheduler():
    await scheduler_engine.stop()
    return {"success": True, "status": scheduler_engine.status}

@router.post("/scheduler/reset")
async def reset_scheduler():
    await scheduler_engine.reset()
    return {"success": True, "status": scheduler_engine.status}

# --- PROCESS MANAGEMENT (SIGNALS) ---

@router.get("/processes")
async def list_processes():
    live_map = process_monitor.poll_all_managed()
    items = []
    for job_id, job in scheduler_engine.jobs.items():
        if job["pid"]:
            metrics = live_map.get(job_id) or {}
            items.append({
                "job_id": job_id,
                "name": job["name"],
                "pid": job["pid"],
                "pgid": job["pgid"],
                "status": job["status"],
                "os_status": metrics.get("status", "TERMINATED" if not process_controller.is_alive(job_id) else "RUNNING"),
                "cpu_percent": metrics.get("cpu_percent", 0.0),
                "memory_rss_mb": metrics.get("memory_rss_mb", 0.0),
                "memory_percent": metrics.get("memory_percent", 0.0),
                "elapsed_time": round(job["elapsed_time"], 1),
                "slot": job["assigned_slot"],
                "workload_type": job["workload_type"]
            })
    return items

@router.post("/processes/{job_id}/pause")
async def pause_process_endpoint(job_id: str):
    succ = await scheduler_engine.user_pause_job(job_id)
    if not succ:
        raise HTTPException(status_code=400, detail="Could not pause process (not running or signal failed)")
    return {"success": True, "message": f"SIGSTOP sent to job {job_id}"}

@router.post("/processes/{job_id}/resume")
async def resume_process_endpoint(job_id: str):
    succ = await scheduler_engine.user_resume_job(job_id)
    if not succ:
        raise HTTPException(status_code=400, detail="Could not resume process (not in paused state)")
    return {"success": True, "message": f"Job {job_id} requeued to READY for resumption"}

@router.post("/processes/{job_id}/terminate")
async def terminate_process_endpoint(job_id: str):
    succ = await scheduler_engine.user_terminate_job(job_id)
    if not succ:
        raise HTTPException(status_code=400, detail="Could not terminate process")
    return {"success": True, "message": f"SIGTERM/SIGKILL sent to job {job_id}"}

@router.get("/processes/{job_id}/logs")
async def get_process_logs(job_id: str):
    if job_id not in scheduler_engine.jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = scheduler_engine.jobs[job_id]
    log_data = process_controller.get_logs(job_id)
    log_data["job_name"] = job["name"]
    log_data["job_status"] = job["status"]
    log_data["workload_type"] = job["workload_type"]
    log_data["elapsed_time"] = round(job.get("elapsed_time", 0.0), 2)
    return log_data

# --- SYSTEM & SETTINGS ---

@router.get("/system/metrics")
async def get_system_metrics():
    return process_monitor.get_system_metrics()

@router.get("/system/settings")
async def get_system_settings():
    logical_cores = psutil.cpu_count(logical=True) or 1
    return {
        "execution_slots": scheduler_engine.execution_slots,
        "available_cores": list(range(logical_cores)),
        "cpu_affinity": scheduler_engine.cpu_affinity,
        "algorithm": scheduler_engine.algorithm_name,
        "quantum": scheduler_engine.quantum,
        "is_preemptive": scheduler_engine.is_preemptive
    }

@router.post("/system/settings")
async def update_system_settings(settings: SystemSettings):
    logical_cores = psutil.cpu_count(logical=True) or 1
    valid_affinity = [c for c in settings.cpu_affinity if 0 <= c < logical_cores]

    scheduler_engine.configure(
        algorithm=settings.algorithm,
        quantum=settings.quantum,
        slots=settings.execution_slots,
        is_preemptive=settings.is_preemptive,
        affinity=valid_affinity
    )
    return {"success": True, "message": "Settings updated"}

# --- ANALYTICS ---

@router.get("/analytics/summary")
async def get_analytics():
    jobs = list(scheduler_engine.jobs.values())
    summary = get_analytics_summary(jobs, scheduler_engine.sim_start_time, scheduler_engine.current_run_id)
    summary["algorithm"] = scheduler_engine.algorithm_name
    summary["is_preemptive"] = scheduler_engine.is_preemptive
    summary["quantum"] = scheduler_engine.quantum
    summary["execution_slots"] = scheduler_engine.execution_slots
    return summary

@router.get("/analytics/gantt")
async def get_gantt(run_id: Optional[str] = None):
    rid = run_id or scheduler_engine.current_run_id
    return get_gantt_chart_data(rid)

@router.get("/analytics/history")
async def get_history():
    return execution_history.get_all_runs()
