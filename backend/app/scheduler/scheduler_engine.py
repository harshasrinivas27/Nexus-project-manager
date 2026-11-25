import asyncio
import time
import uuid
import sqlite3
from typing import Dict, List, Optional, Any
from ..database.database import get_db_connection
from ..process_manager.process_controller import process_controller
from ..process_manager.process_monitor import process_monitor
from .fcfs import FCFSScheduler
from .sjf import SJFScheduler
from .priority import PriorityScheduler
from .round_robin import RoundRobinScheduler
from ..analytics.metrics import get_analytics_summary

class SchedulerEngine:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.status = "STOPPED" # STOPPED, RUNNING, PAUSED
        self.algorithm_name = "FCFS"
        self.quantum = 2.0
        self.execution_slots = 2
        self.is_preemptive = False
        self.cpu_affinity: List[int] = []

        # Active scheduler policy instance
        self._policy = FCFSScheduler()

        # Engine state
        self.current_run_id: Optional[str] = None
        self.sim_start_time: Optional[float] = None
        self.sim_elapsed_time: float = 0.0

        # Memory state for fast access during ticks
        # Maps job_id -> job dict
        self.jobs: Dict[str, Dict[str, Any]] = {}
        # Running jobs: job_id -> dict with slot, current_slice, slice_start_time, etc.
        self.running_slots: Dict[int, Optional[str]] = {} # slot_idx -> job_id
        self.job_slice_times: Dict[str, float] = {} # job_id -> duration in current slice
        self.job_event_starts: Dict[str, float] = {} # job_id -> start time of current continuous run

        self._tick_task: Optional[asyncio.Task] = None
        self._init_slots()

    def _init_slots(self):
        self.running_slots = {i: None for i in range(self.execution_slots)}

    def configure(self, algorithm: str, quantum: float, slots: int, is_preemptive: bool, affinity: Optional[List[int]] = None):
        self.algorithm_name = algorithm.upper()
        self.quantum = max(0.2, float(quantum))
        self.execution_slots = max(1, int(slots))
        self.is_preemptive = bool(is_preemptive)
        if affinity is not None:
            self.cpu_affinity = affinity

        # Re-initialize slots preserving active ones
        new_slots = {}
        for i in range(self.execution_slots):
            new_slots[i] = self.running_slots.get(i, None)
        self.running_slots = new_slots

        # Instantiate algorithm
        if self.algorithm_name == "FCFS":
            self._policy = FCFSScheduler()
        elif self.algorithm_name == "SJF":
            self._policy = SJFScheduler(is_preemptive=self.is_preemptive)
        elif self.algorithm_name == "PRIORITY":
            self._policy = PriorityScheduler(is_preemptive=self.is_preemptive)
        elif self.algorithm_name == "ROUND_ROBIN":
            self._policy = RoundRobinScheduler(quantum=self.quantum)
        else:
            self._policy = FCFSScheduler()

    async def load_jobs_from_db(self):
        """Loads all jobs from SQLite into memory on startup or reset."""
        async with self.lock:
            conn = get_db_connection()
            rows = conn.execute("SELECT * FROM jobs ORDER BY arrival_time ASC, created_at ASC").fetchall()
            conn.close()

            self.jobs.clear()
            for r in rows:
                d = dict(r)
                # If state was previously running when server crashed, mark as PENDING or FAILED
                if d["status"] in ("RUNNING", "READY"):
                    d["status"] = "PENDING"
                    d["pid"] = None
                    d["assigned_slot"] = None
                self.jobs[d["id"]] = d

    async def create_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self.lock:
            job_id = f"job-{uuid.uuid4().hex[:8]}"
            now = time.time()
            job = {
                "id": job_id,
                "name": job_data["name"],
                "workload_type": job_data["workload_type"],
                "command": job_data.get("command"),
                "priority": job_data.get("priority", 5),
                "arrival_time": float(job_data.get("arrival_time", 0.0)),
                "estimated_burst_time": float(job_data.get("estimated_burst_time", 5.0)),
                "remaining_burst_time": float(job_data.get("estimated_burst_time", 5.0)),
                "description": job_data.get("description", ""),
                "status": "PENDING",
                "pid": None,
                "pgid": None,
                "exit_code": None,
                "created_at": now,
                "first_started_at": None,
                "last_started_at": None,
                "completed_at": None,
                "elapsed_time": 0.0,
                "cpu_time_spent": 0.0,
                "assigned_slot": None,
                "error_message": None,
                "last_ready_at": 0.0
            }

            conn = get_db_connection()
            conn.execute("""
            INSERT INTO jobs (id, name, workload_type, command, priority, arrival_time,
                             estimated_burst_time, remaining_burst_time, description, status,
                             created_at, elapsed_time, cpu_time_spent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0)
            """, (
                job["id"], job["name"], job["workload_type"], job["command"], job["priority"],
                job["arrival_time"], job["estimated_burst_time"], job["remaining_burst_time"],
                job["description"], job["status"], job["created_at"]
            ))
            conn.commit()
            conn.close()

            self.jobs[job_id] = job
            return job

    async def delete_job(self, job_id: str) -> bool:
        async with self.lock:
            if job_id not in self.jobs:
                return False

            job = self.jobs[job_id]
            if job["status"] in ("RUNNING", "PAUSED"):
                process_controller.terminate_process(job_id)

            # Free assigned slot
            for slot, occupant in list(self.running_slots.items()):
                if occupant == job_id:
                    self.running_slots[slot] = None

            conn = get_db_connection()
            conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            conn.execute("DELETE FROM dispatch_events WHERE job_id = ?", (job_id,))
            conn.commit()
            conn.close()

            del self.jobs[job_id]
            return True

    async def start(self):
        async with self.lock:
            if self.status == "RUNNING":
                return

            if self.status == "STOPPED":
                # Start a new scheduling run
                self.current_run_id = f"run-{uuid.uuid4().hex[:8]}"
                self.sim_start_time = time.time()
                self.sim_elapsed_time = 0.0

                conn = get_db_connection()
                conn.execute("""
                INSERT INTO scheduling_runs (id, algorithm, quantum, execution_slots, is_preemptive, start_time, status)
                VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
                """, (self.current_run_id, self.algorithm_name, self.quantum, self.execution_slots, int(self.is_preemptive), time.time()))
                conn.commit()
                conn.close()
            elif self.status == "PAUSED":
                # Resume all paused running processes
                for slot, job_id in self.running_slots.items():
                    if job_id and self.jobs.get(job_id):
                        process_controller.resume_process(job_id)

            self.status = "RUNNING"
            if self._tick_task is None or self._tick_task.done():
                self._tick_task = asyncio.create_task(self._scheduler_loop())

    async def pause(self):
        async with self.lock:
            if self.status != "RUNNING":
                return
            self.status = "PAUSED"
            # Pause all actively executing processes
            for slot, job_id in self.running_slots.items():
                if job_id and self.jobs.get(job_id):
                    process_controller.pause_process(job_id)
                    now_ts = time.time()
                    start_ts = self.job_event_starts.get(job_id, now_ts)
                    dur = max(0.0, now_ts - start_ts)
                    self._record_event(job_id, "PAUSE", now_ts, dur, slot)

    async def stop(self):
        async with self.lock:
            self.status = "STOPPED"
            # Terminate all active processes
            for slot, job_id in list(self.running_slots.items()):
                if job_id:
                    process_controller.terminate_process(job_id)
                    now_ts = time.time()
                    start_ts = self.job_event_starts.get(job_id, now_ts)
                    dur = max(0.0, now_ts - start_ts)
                    self._record_event(job_id, "TERMINATE", now_ts, dur, slot)
                    self.running_slots[slot] = None
                    if job_id in self.jobs:
                        self.jobs[job_id]["status"] = "TERMINATED"
                        self._sync_job_to_db(self.jobs[job_id])

            if self.current_run_id:
                conn = get_db_connection()
                conn.execute("UPDATE scheduling_runs SET status = 'STOPPED', end_time = ? WHERE id = ?", (time.time(), self.current_run_id))
                conn.commit()
                conn.close()

    async def reset(self):
        await self.stop()
        async with self.lock:
            process_controller.cleanup_all()
            for job in self.jobs.values():
                job["status"] = "PENDING"
                job["pid"] = None
                job["pgid"] = None
                job["exit_code"] = None
                job["first_started_at"] = None
                job["last_started_at"] = None
                job["completed_at"] = None
                job["elapsed_time"] = 0.0
                job["cpu_time_spent"] = 0.0
                job["remaining_burst_time"] = job["estimated_burst_time"]
                job["assigned_slot"] = None
                job["error_message"] = None
                self._sync_job_to_db(job)

            self.running_slots = {i: None for i in range(self.execution_slots)}
            self.job_slice_times.clear()
            self.job_event_starts.clear()
            self.current_run_id = None
            self.sim_start_time = None
            self.sim_elapsed_time = 0.0

    async def clear_all_jobs(self):
        """Stops execution, terminates managed process groups, and clears all jobs."""
        await self.stop()
        async with self.lock:
            process_controller.cleanup_all()
            conn = get_db_connection()
            conn.execute("DELETE FROM dispatch_events")
            conn.execute("DELETE FROM jobs")
            conn.commit()
            conn.close()

            self.jobs.clear()
            self.running_slots = {i: None for i in range(self.execution_slots)}
            self.job_slice_times.clear()
            self.job_event_starts.clear()
            self.current_run_id = None
            self.sim_start_time = None
            self.sim_elapsed_time = 0.0

    async def _scheduler_loop(self):
        """High-resolution tick loop running at ~250ms interval for precise scheduling."""
        tick_interval = 0.25
        last_tick = time.monotonic()

        while self.status in ("RUNNING", "PAUSED"):
            await asyncio.sleep(tick_interval)
            now = time.monotonic()
            dt = now - last_tick
            last_tick = now

            if self.status != "RUNNING":
                continue

            async with self.lock:
                self.sim_elapsed_time += dt
                await self._tick(dt)

    async def _tick(self, dt: float):
        """
        Core 250ms scheduler cycle:
        1) Admit PENDING jobs whose arrival_time has elapsed into READY.
        2) Check active RUNNING slots for completion or preemption (Round Robin / SRTF / Priority).
        3) Dispatch eligible READY jobs into any free execution slots.
        4) Persist completed run averages when all jobs finish.
        """
        current_time = self.sim_elapsed_time

        # Step 1: Admit PENDING jobs whose simulated arrival_time has been reached
        for job in self.jobs.values():
            if job["status"] == "PENDING" and job["arrival_time"] <= current_time:
                job["status"] = "READY"
                job["last_ready_at"] = current_time
                self._sync_job_to_db(job)

        # Step 2: Inspect currently RUNNING jobs across all execution slots
        for slot in range(self.execution_slots):
            job_id = self.running_slots.get(slot)
            if not job_id:
                continue

            job = self.jobs.get(job_id)
            if not job:
                self.running_slots[slot] = None
                continue

            # Update elapsed CPU wall time and estimated remaining burst time
            job["elapsed_time"] += dt
            job["remaining_burst_time"] = max(0.0, job["remaining_burst_time"] - dt)
            self.job_slice_times[job_id] = self.job_slice_times.get(job_id, 0.0) + dt

            # Check if the underlying Linux child process exited on its own
            if not process_controller.is_alive(job_id):
                exit_code = process_controller.get_exit_code(job_id) or 0
                now_ts = time.time()
                dur = max(0.0, now_ts - self.job_event_starts.get(job_id, now_ts))

                job["completed_at"] = now_ts
                job["exit_code"] = exit_code
                job["assigned_slot"] = None

                if exit_code == 0:
                    job["status"] = "COMPLETED"
                    self._record_event(job_id, "COMPLETE", now_ts, dur, slot)
                else:
                    job["status"] = "FAILED"
                    job["error_message"] = f"Process exited with non-zero code {exit_code}"
                    self._record_event(job_id, "FAIL", now_ts, dur, slot)

                self._sync_job_to_db(job)
                self.running_slots[slot] = None
                del self.job_slice_times[job_id]
                continue

            # Step 3: Policy-based Preemption
            # Round Robin: freeze process via SIGSTOP once its time quantum expires
            if self.algorithm_name == "ROUND_ROBIN":
                ready_count = sum(1 for j in self.jobs.values() if j["status"] == "READY")
                if self.job_slice_times[job_id] >= self.quantum and (ready_count > 0 or self._has_other_runnable(job_id)):
                    process_controller.pause_process(job_id)
                    now_ts = time.time()
                    dur = max(0.0, now_ts - self.job_event_starts.get(job_id, now_ts))
                    self._record_event(job_id, "PREEMPT", now_ts, dur, slot)

                    # Move to tail of READY queue using monotonic time so rotation is strictly cyclic
                    job["status"] = "READY"
                    job["last_ready_at"] = time.monotonic()
                    job["assigned_slot"] = None
                    self._sync_job_to_db(job)
                    self.running_slots[slot] = None
                    self.job_slice_times[job_id] = 0.0

            # Preemptive SJF (SRTF) or Preemptive Priority: freeze if a better READY job arrived
            elif self.is_preemptive and self.algorithm_name in ("SJF", "PRIORITY"):
                running_list = [self.jobs[jid] for jid in self.running_slots.values() if jid and jid in self.jobs]
                ready_list = [j for j in self.jobs.values() if j["status"] == "READY"]

                preempt_info = self._policy.should_preempt(running_list, ready_list)
                if preempt_info and preempt_info.get("preempt_job_id") == job_id:
                    process_controller.pause_process(job_id)
                    now_ts = time.time()
                    dur = max(0.0, now_ts - self.job_event_starts.get(job_id, now_ts))
                    self._record_event(job_id, "PREEMPT", now_ts, dur, slot)

                    job["status"] = "READY"
                    job["last_ready_at"] = time.monotonic()
                    job["assigned_slot"] = None
                    self._sync_job_to_db(job)
                    self.running_slots[slot] = None

        # 4. Fill free execution slots with eligible READY jobs
        ready_jobs = [j for j in self.jobs.values() if j["status"] == "READY"]
        for slot in range(self.execution_slots):
            if self.running_slots.get(slot) is not None:
                continue

            if not ready_jobs:
                break

            next_job = self._policy.select_next_job(ready_jobs)
            if not next_job:
                break

            ready_jobs.remove(next_job)
            await self._dispatch_job(next_job["id"], slot)

        # 5. Check if all jobs are done
        all_finished = len(self.jobs) > 0 and all(j["status"] in ("COMPLETED", "FAILED", "TERMINATED") for j in self.jobs.values())
        if all_finished and self.status == "RUNNING":
            self.status = "COMPLETED"
            if self.current_run_id:
                summary = get_analytics_summary(list(self.jobs.values()), self.sim_start_time, self.current_run_id)
                conn = get_db_connection()
                conn.execute("""
                UPDATE scheduling_runs
                SET status = 'COMPLETED', end_time = ?, total_jobs = ?, completed_jobs = ?, failed_jobs = ?,
                    avg_waiting_time = ?, avg_turnaround_time = ?, avg_response_time = ?,
                    cpu_utilization = ?, throughput = ?
                WHERE id = ?
                """, (
                    time.time(),
                    summary["total_jobs"],
                    summary["completed_jobs"],
                    summary["failed_jobs"],
                    summary["avg_waiting_time"],
                    summary["avg_turnaround_time"],
                    summary["avg_response_time"],
                    summary["cpu_utilization"],
                    summary["throughput"],
                    self.current_run_id
                ))
                conn.commit()
                conn.close()

    def _has_other_runnable(self, current_job_id: str) -> bool:
        return any(j["id"] != current_job_id and j["status"] == "READY" for j in self.jobs.values())

    async def _dispatch_job(self, job_id: str, slot: int):
        job = self.jobs.get(job_id)
        if not job:
            return

        now_ts = time.time()

        # Check if process was already spawned and just needs resumption (SIGCONT)
        if job["pid"] and process_controller.is_alive(job_id):
            succ, msg = process_controller.resume_process(job_id)
            event_type = "RESUME"
        else:
            # Spawn fresh Linux process
            succ, msg, pid = process_controller.spawn_process(
                job_id=job["id"],
                workload_type=job["workload_type"],
                burst_time=job["estimated_burst_time"],
                custom_command=job["command"],
                cpu_affinity=self.cpu_affinity
            )
            if succ and pid:
                job["pid"] = pid
                job["pgid"] = pid
                event_type = "DISPATCH"
            else:
                job["status"] = "FAILED"
                job["error_message"] = msg
                self._sync_job_to_db(job)
                return

        if job["first_started_at"] is None:
            job["first_started_at"] = now_ts
        job["last_started_at"] = now_ts
        job["status"] = "RUNNING"
        job["assigned_slot"] = slot
        self.running_slots[slot] = job_id
        self.job_slice_times[job_id] = 0.0
        self.job_event_starts[job_id] = now_ts

        self._record_event(job_id, event_type, now_ts, 0.0, slot)
        self._sync_job_to_db(job)

    def _record_event(self, job_id: str, event_type: str, ts: float, dur: float, slot: int):
        conn = get_db_connection()
        conn.execute("""
        INSERT INTO dispatch_events (run_id, job_id, event_type, timestamp, duration, slot_index)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (self.current_run_id, job_id, event_type, ts, dur, slot))
        conn.commit()
        conn.close()

    def _sync_job_to_db(self, job: Dict[str, Any]):
        conn = get_db_connection()
        conn.execute("""
        UPDATE jobs SET status = ?, pid = ?, pgid = ?, exit_code = ?,
                       first_started_at = ?, last_started_at = ?, completed_at = ?,
                       elapsed_time = ?, remaining_burst_time = ?, assigned_slot = ?,
                       error_message = ?
        WHERE id = ?
        """, (
            job["status"], job["pid"], job["pgid"], job["exit_code"],
            job["first_started_at"], job["last_started_at"], job["completed_at"],
            job["elapsed_time"], job["remaining_burst_time"], job["assigned_slot"],
            job["error_message"], job["id"]
        ))
        conn.commit()
        conn.close()

    # Manual user action handlers for Live Process Monitor
    async def user_pause_job(self, job_id: str) -> bool:
        async with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["status"] != "RUNNING":
                return False

            succ, msg = process_controller.pause_process(job_id)
            if succ:
                now_ts = time.time()
                dur = max(0.0, now_ts - self.job_event_starts.get(job_id, now_ts))
                slot = job.get("assigned_slot") or 0
                self._record_event(job_id, "USER_PAUSE", now_ts, dur, slot)

                job["status"] = "PAUSED"
                # Free the execution slot so scheduler can allocate or hold
                if slot in self.running_slots and self.running_slots[slot] == job_id:
                    self.running_slots[slot] = None
                job["assigned_slot"] = None
                self._sync_job_to_db(job)
                return True
            return False

    async def user_resume_job(self, job_id: str) -> bool:
        async with self.lock:
            job = self.jobs.get(job_id)
            if not job or job["status"] != "PAUSED":
                return False

            # Put back into READY queue so scheduler dispatches it in an available slot
            job["status"] = "READY"
            job["last_ready_at"] = time.monotonic()
            self._sync_job_to_db(job)
            return True

    async def user_terminate_job(self, job_id: str) -> bool:
        async with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return False

            process_controller.terminate_process(job_id)
            now_ts = time.time()
            dur = max(0.0, now_ts - self.job_event_starts.get(job_id, now_ts))
            slot = job.get("assigned_slot") or 0
            self._record_event(job_id, "USER_TERMINATE", now_ts, dur, slot)

            job["status"] = "TERMINATED"
            job["exit_code"] = -9
            if slot in self.running_slots and self.running_slots[slot] == job_id:
                self.running_slots[slot] = None
            job["assigned_slot"] = None
            self._sync_job_to_db(job)
            return True

scheduler_engine = SchedulerEngine()
