import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database.database import init_db, get_db_connection
from app.scheduler.scheduler_engine import scheduler_engine
from app.process_manager.process_controller import process_controller
from app.process_manager.process_monitor import process_monitor
from app.analytics.metrics import get_analytics_summary, get_gantt_chart_data

async def run_integration_test():
    print("==================================================")
    print("     NEXUS PROCESS MANAGER INTEGRATION TEST       ")
    print("==================================================")

    init_db()
    await scheduler_engine.load_jobs_from_db()

    # Clear previous test data
    for jid in list(scheduler_engine.jobs.keys()):
        await scheduler_engine.delete_job(jid)

    print("\n[STEP 1] Testing Job Creation...")
    cpu_job = await scheduler_engine.create_job({
        "name": "Integration-CPU-Prime",
        "workload_type": "cpu",
        "estimated_burst_time": 4.0,
        "arrival_time": 0.0,
        "priority": 2,
        "description": "Calculates prime numbers on CPU core"
    })
    mem_job = await scheduler_engine.create_job({
        "name": "Integration-RAM-Alloc",
        "workload_type": "memory",
        "estimated_burst_time": 4.0,
        "arrival_time": 0.5,
        "priority": 4,
        "description": "Allocates and touches RAM pages"
    })
    custom_job = await scheduler_engine.create_job({
        "name": "Integration-Custom-CLI",
        "workload_type": "custom",
        "command": "python3 -c 'import time; time.sleep(2); print(\"Done\")'",
        "estimated_burst_time": 2.0,
        "arrival_time": 1.0,
        "priority": 1,
        "description": "Safe custom python command"
    })
    print(f"Created 3 jobs: {cpu_job['id']}, {mem_job['id']}, {custom_job['id']}")

    print("\n[STEP 2] Configuring Scheduler (Priority Preemptive, 2 Execution Slots)...")
    scheduler_engine.configure(algorithm="PRIORITY", quantum=2.0, slots=2, is_preemptive=True)

    print("\n[STEP 3] Starting Scheduler Dispatch Loop...")
    await scheduler_engine.start()

    # Wait 1.5 seconds for dispatch
    await asyncio.sleep(1.5)

    print(f"Scheduler state: {scheduler_engine.status}")
    print(f"Running slots: {scheduler_engine.running_slots}")

    # Verify real Linux processes are running
    active_pids = []
    for slot, jid in scheduler_engine.running_slots.items():
        if jid:
            job = scheduler_engine.jobs[jid]
            pid = job.get("pid")
            print(f"Slot {slot}: Job {job['name']} -> Real Linux PID: {pid}")
            assert pid is not None, f"Expected real PID for {job['name']}"
            assert process_controller.is_alive(jid), f"Process {pid} should be alive"
            active_pids.append((jid, pid))

    print("\n[STEP 4] Verifying Real psutil Hardware Telemetry...")
    live_procs = process_monitor.poll_all_managed()
    for jid, pid in active_pids:
        metrics = live_procs.get(jid)
        print(f"Telemetry for PID {pid}:", metrics)
        assert metrics is not None
        assert metrics["pid"] == pid
        print(f"  -> Real CPU: {metrics['cpu_percent']}%, Real RSS: {metrics['memory_rss_mb']} MB, State: {metrics['status']}")

    print("\n[STEP 5] Testing Manual User Pause (SIGSTOP) and Resume (SIGCONT)...")
    target_jid, target_pid = active_pids[0]
    print(f"Sending SIGSTOP to job {target_jid} (PID {target_pid})...")
    pause_ok = await scheduler_engine.user_pause_job(target_jid)
    assert pause_ok, "User pause should succeed"
    await asyncio.sleep(0.5)

    paused_metrics = process_monitor.get_process_metrics(target_jid, target_pid)
    print("Status after SIGSTOP:", paused_metrics.get("status") if paused_metrics else "None")
    assert paused_metrics and paused_metrics["status"] == "PAUSED"

    print(f"Sending SIGCONT to job {target_jid} (PID {target_pid})...")
    resume_ok = await scheduler_engine.user_resume_job(target_jid)
    assert resume_ok, "User resume should succeed"

    print("\n[STEP 6] Waiting for Workloads to Complete...")
    for _ in range(12):
        await asyncio.sleep(0.8)
        all_done = all(j["status"] in ("COMPLETED", "FAILED") for j in scheduler_engine.jobs.values())
        if all_done:
            break

    states = {j["name"]: (j["status"], j.get("exit_code"), f"elapsed: {j['elapsed_time']:.1f}s") for j in scheduler_engine.jobs.values()}
    print("Final Job States:", states)

    print("\n[STEP 7] Verifying Mathematical Analytics & Gantt Events...")
    jobs_list = list(scheduler_engine.jobs.values())
    summary = get_analytics_summary(jobs_list, scheduler_engine.sim_start_time, scheduler_engine.current_run_id)
    print(f"Analytics Summary:")
    print(f"  Total Jobs: {summary['total_jobs']}")
    print(f"  Completed Jobs: {summary['completed_jobs']}")
    print(f"  Avg Turnaround Time (TAT): {summary['avg_turnaround_time']}s")
    print(f"  Avg Waiting Time (WT): {summary['avg_waiting_time']}s")
    print(f"  Avg Response Time (RT): {summary['avg_response_time']}s")
    print(f"  CPU Slot Utilization: {summary['cpu_utilization']}%")
    print(f"  Recorded Gantt Slices: {len(summary['gantt_events'])}")

    assert summary["completed_jobs"] >= 2, "Expected completed jobs"
    assert len(summary["gantt_events"]) > 0, "Expected Gantt events recorded"

    await scheduler_engine.stop()
    print("\n>>> ALL INTEGRATION VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(run_integration_test())
