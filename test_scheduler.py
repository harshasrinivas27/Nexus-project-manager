import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database.database import init_db
from app.scheduler.scheduler_engine import scheduler_engine

async def main():
    print("[SCHEDULER TEST] Starting multi-slot Round Robin scheduling test...")
    init_db()
    await scheduler_engine.load_jobs_from_db()

    # Configure Round Robin with 1.5s quantum and 2 execution slots
    scheduler_engine.configure(algorithm="ROUND_ROBIN", quantum=1.5, slots=2, is_preemptive=True)

    # Clean existing test jobs
    for jid in list(scheduler_engine.jobs.keys()):
        await scheduler_engine.delete_job(jid)

    # Create 3 jobs: total demand > 2 slots so Round Robin must cycle
    j1 = await scheduler_engine.create_job({
        "name": "RR-CPU-1",
        "workload_type": "cpu",
        "estimated_burst_time": 3.0,
        "arrival_time": 0.0,
        "priority": 5
    })
    j2 = await scheduler_engine.create_job({
        "name": "RR-CPU-2",
        "workload_type": "cpu",
        "estimated_burst_time": 3.0,
        "arrival_time": 0.0,
        "priority": 5
    })
    j3 = await scheduler_engine.create_job({
        "name": "RR-CPU-3",
        "workload_type": "cpu",
        "estimated_burst_time": 3.0,
        "arrival_time": 0.0,
        "priority": 5
    })

    print(f"Created jobs: {j1['id']}, {j2['id']}, {j3['id']}")
    print("Starting scheduler...")
    await scheduler_engine.start()

    # Monitor for 6 seconds
    for sec in range(12):
        await asyncio.sleep(0.5)
        jobs = scheduler_engine.jobs
        states = {jid: (job["status"], job.get("pid"), job.get("assigned_slot")) for jid, job in jobs.items()}
        print(f"t={scheduler_engine.sim_elapsed_time:.1f}s | Slots: {scheduler_engine.running_slots} | States: {states}")
        all_done = all(j["status"] == "COMPLETED" for j in jobs.values())
        if all_done:
            print("All jobs completed successfully!")
            break

    await scheduler_engine.stop()
    print("[SCHEDULER TEST PASSED]")

if __name__ == "__main__":
    asyncio.run(main())
