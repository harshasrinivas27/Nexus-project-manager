"""
Scheduling Analytics & Gantt Reconstruction Module.
Computes classical Operating System metrics from real Linux process timestamps:
- Response Time (RT) = First Start Time - Arrival Time
- Turnaround Time (TAT) = Completion Time - Arrival Time
- Waiting Time (WT) = Turnaround Time - Actual Measured Runtime
Also stitches DISPATCH/PREEMPT/RESUME/COMPLETE events into Gantt timeline bars.
"""
import time
from typing import List, Dict, Any, Optional
from ..database.database import get_db_connection

def calculate_job_metrics(job: Dict[str, Any], sim_start_epoch: Optional[float] = None) -> Dict[str, Any]:
    """
    Computes standard operating systems scheduling metrics for a job:
    TAT = Completion Time - Arrival Time
    WT = Turnaround Time - Actual Burst/Elapsed Time
    RT = First Start Time - Arrival Time
    """
    arrival_rel = float(job.get("arrival_time", 0.0))
    burst_est = float(job.get("estimated_burst_time", 0.0))
    elapsed = float(job.get("elapsed_time", 0.0))

    first_start_epoch = job.get("first_started_at")
    completed_epoch = job.get("completed_at")

    rt = None
    tat = None
    wt = None

    if sim_start_epoch and first_start_epoch:
        start_rel = max(0.0, first_start_epoch - sim_start_epoch)
        rt = max(0.0, start_rel - arrival_rel)

    if sim_start_epoch and completed_epoch:
        comp_rel = max(0.0, completed_epoch - sim_start_epoch)
        tat = max(0.0, comp_rel - arrival_rel)
        # Using actual elapsed CPU execution time for genuine waiting time computation
        actual_runtime = elapsed if elapsed > 0 else burst_est
        wt = max(0.0, tat - actual_runtime)

    return {
        "response_time": round(rt, 2) if rt is not None else None,
        "turnaround_time": round(tat, 2) if tat is not None else None,
        "waiting_time": round(wt, 2) if wt is not None else None
    }

def get_gantt_chart_data(run_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Reconstructs continuous execution slices for the Gantt chart from dispatch_events.
    """
    conn = get_db_connection()
    query = """
    SELECT e.*, j.name as job_name
    FROM dispatch_events e
    JOIN jobs j ON e.job_id = j.id
    """
    params = []
    if run_id:
        query += " WHERE e.run_id = ?"
        params.append(run_id)

    query += " ORDER BY e.timestamp ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    events = [dict(r) for r in rows]
    if not events:
        return []

    # Map events into intervals [start_time, end_time]
    slices = []
    # Track open intervals per job_id
    active_intervals = {} # job_id -> {start_ts, slot, job_name}

    for ev in events:
        jid = ev["job_id"]
        etype = ev["event_type"]
        ts = ev["timestamp"]
        slot = ev.get("slot_index", 0)
        name = ev["job_name"]

        if etype in ("DISPATCH", "RESUME"):
            active_intervals[jid] = {
                "job_id": jid,
                "job_name": name,
                "slot": slot,
                "start_time": ts
            }
        elif etype in ("PAUSE", "PREEMPT", "COMPLETE", "FAIL", "TERMINATE", "USER_PAUSE", "USER_TERMINATE"):
            if jid in active_intervals:
                opened = active_intervals.pop(jid)
                dur = max(0.1, ts - opened["start_time"])
                slices.append({
                    "job_id": jid,
                    "job_name": name,
                    "slot": opened["slot"],
                    "start_time": opened["start_time"],
                    "end_time": ts,
                    "duration": round(dur, 2),
                    "event_type": "RUNNING"
                })

    # Close any still-open intervals with current timestamp
    now = time.time()
    for jid, opened in active_intervals.items():
        dur = max(0.1, now - opened["start_time"])
        slices.append({
            "job_id": jid,
            "job_name": opened["job_name"],
            "slot": opened["slot"],
            "start_time": opened["start_time"],
            "end_time": now,
            "duration": round(dur, 2),
            "event_type": "RUNNING"
        })

    return slices

def get_analytics_summary(jobs: List[Dict[str, Any]], sim_start_epoch: Optional[float] = None, run_id: Optional[str] = None) -> Dict[str, Any]:
    total_jobs = len(jobs)
    completed_jobs = [j for j in jobs if j.get("status") == "COMPLETED"]
    failed_jobs = [j for j in jobs if j.get("status") in ("FAILED", "TERMINATED")]

    tats = []
    wts = []
    rts = []
    total_cpu_time = 0.0

    enhanced_jobs = []
    for j in jobs:
        m = calculate_job_metrics(j, sim_start_epoch)
        ej = dict(j)
        ej["waiting_time"] = m["waiting_time"]
        ej["turnaround_time"] = m["turnaround_time"]
        ej["response_time"] = m["response_time"]
        enhanced_jobs.append(ej)

        if m["turnaround_time"] is not None:
            tats.append(m["turnaround_time"])
        if m["waiting_time"] is not None:
            wts.append(m["waiting_time"])
        if m["response_time"] is not None:
            rts.append(m["response_time"])

        total_cpu_time += float(j.get("elapsed_time", 0.0))

    avg_tat = round(sum(tats) / len(tats), 2) if tats else 0.0
    avg_wt = round(sum(wts) / len(wts), 2) if wts else 0.0
    avg_rt = round(sum(rts) / len(rts), 2) if rts else 0.0

    # Total makespan (elapsed simulation duration)
    makespan = 1.0
    if sim_start_epoch and completed_jobs:
        max_comp = max((j.get("completed_at") or time.time()) for j in completed_jobs)
        makespan = max(1.0, max_comp - sim_start_epoch)

    throughput = round(len(completed_jobs) / makespan, 3)
    cpu_util = round(min(100.0, (total_cpu_time / makespan) * 100.0), 1) if makespan > 0 else 0.0

    gantt_events = get_gantt_chart_data(run_id)

    return {
        "total_jobs": total_jobs,
        "completed_jobs": len(completed_jobs),
        "failed_jobs": len(failed_jobs),
        "avg_waiting_time": avg_wt,
        "avg_turnaround_time": avg_tat,
        "avg_response_time": avg_rt,
        "cpu_utilization": cpu_util,
        "throughput": throughput,
        "jobs": enhanced_jobs,
        "gantt_events": gantt_events
    }
