import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database.database import init_db, get_db_connection
from app.process_manager.process_controller import process_controller
from app.process_manager.process_monitor import process_monitor
from app.scheduler.scheduler_engine import scheduler_engine
from app.main import app

def run_tests():
    print("[TEST 1] Initializing SQLite database...")
    init_db()
    conn = get_db_connection()
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    conn.close()
    print("Tables found:", tables)
    assert "jobs" in tables
    assert "scheduling_runs" in tables
    assert "dispatch_events" in tables
    print("[TEST 1 PASSED]")

    print("\n[TEST 2] Testing real Linux process spawning (CPU workload)...")
    workloads_dir = os.path.join(os.path.dirname(__file__), "backend", "app", "workloads")
    succ, msg, pid = process_controller.spawn_process(
        job_id="test-job-cpu",
        workload_type="cpu",
        burst_time=3.0,
        workloads_dir=workloads_dir
    )
    print("Spawn result:", succ, msg, "PID:", pid)
    assert succ and pid is not None
    assert process_controller.is_alive("test-job-cpu")
    print("[TEST 2 PASSED]")

    print("\n[TEST 3] Testing real process monitoring via psutil...")
    time.sleep(0.5)
    metrics = process_monitor.get_process_metrics("test-job-cpu", pid)
    print("Process metrics:", metrics)
    assert metrics is not None
    assert metrics["pid"] == pid
    print("Actual CPU %:", metrics["cpu_percent"], "Memory RSS MB:", metrics["memory_rss_mb"])
    print("[TEST 3 PASSED]")

    print("\n[TEST 4] Testing real SIGSTOP (pause)...")
    succ, msg = process_controller.pause_process("test-job-cpu")
    print("Pause result:", succ, msg)
    assert succ
    time.sleep(0.3)
    metrics_paused = process_monitor.get_process_metrics("test-job-cpu", pid)
    print("Status after SIGSTOP:", metrics_paused.get("status") if metrics_paused else None)
    print("[TEST 4 PASSED]")

    print("\n[TEST 5] Testing real SIGCONT (resume)...")
    succ, msg = process_controller.resume_process("test-job-cpu")
    print("Resume result:", succ, msg)
    assert succ
    print("[TEST 5 PASSED]")

    print("\n[TEST 6] Testing real SIGTERM / termination...")
    succ, msg = process_controller.terminate_process("test-job-cpu")
    print("Terminate result:", succ, msg)
    assert succ
    assert not process_controller.is_alive("test-job-cpu")
    print("[TEST 6 PASSED]")

    print("\n[TEST 7] Testing System telemetry metrics...")
    sys_metrics = process_monitor.get_system_metrics()
    print("System metrics:", sys_metrics)
    assert sys_metrics["logical_cores"] >= 1
    assert sys_metrics["memory_total_mb"] > 0
    print("[TEST 7 PASSED]")

    print("\nALL BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
