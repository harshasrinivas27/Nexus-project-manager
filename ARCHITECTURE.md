# NEXUS Process Manager — Architecture & Systems Design

NEXUS Process Manager is a full-stack, university-grade operating systems workstation that bridges theoretical CPU scheduling models with genuine Linux kernel process management on Ubuntu (WSL 2).

---

## 1. High-Level Architecture

```
+-----------------------------------------------------------------------------------+
|                           NEXUS FRONTEND (Vite + React + TS)                      |
|                                                                                   |
|  [ Dashboard ]  [ Job Manager ]  [ Scheduler ]  [ Live Monitor ]  [ Analytics ]   |
+-----------------------------------------------------------------------------------+
       ▲                                         ▲                         ▲
       │ REST Calls (Axios/Fetch)                │ WebSocket Telemetry     │
       ▼                                         ▼ (every 500ms)           │
+-----------------------------------------------------------------------------------+
|                            FASTAPI BACKEND RUNTIME                                |
|                                                                                   |
|  ┌─────────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐  |
|  │   API & WS Router   │   │  Scheduler Engine    │   │   Analytics & Metrics  │  |
|  │ routes.py / ws.py   │◄──┤ scheduler_engine.py  ├──►│ metrics.py / hist.py   │  |
|  └─────────────────────┘   └──────────┬───────────┘   └────────────────────────┘  |
|                                       │                                           |
|       ┌───────────────────────────────┴───────────────────────────────┐           |
|       ▼                                                               ▼           |
|  ┌──────────────────────────────┐                       ┌──────────────────────┐  |
|  │  Scheduling Policy Matrix    │                       │  Process Controller  │  |
|  │  FCFS / SJF / Priority / RR  │                       │ process_controller.py│  |
|  └──────────────────────────────┘                       └──────────┬───────────┘  |
|                                                                    │              |
|                                                                    ▼              |
|                                                        ┌───────────────────────┐  |
|                                                        │    Process Monitor    │  |
|                                                        │  process_monitor.py   │  |
|                                                        └───────────┬───────────┘  |
+--------------------------------------------------------------------┼--------------+
                                                                     │
                                     Linux Syscalls (POSIX Signals)  │
                                                                     ▼
+-----------------------------------------------------------------------------------+
|                        UBUNTU LINUX KERNEL (WSL 2)                                |
|                                                                                   |
|    PID 2041 (PGID 2041)       PID 2042 (PGID 2042)        PID 2043 (PGID 2043)    |
|   ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐    |
|   │ CPU Matrix Task    │     │ RAM Buffer Sweep   │     │ Disk Sync Logger   │    |
|   │ (SIGSTOP / SIGCONT)│     │ (SIGSTOP / SIGCONT)│     │ (SIGSTOP / SIGCONT)│    |
|   └────────────────────┘     └────────────────────┘     └────────────────────┘    |
|             │                          │                          │               |
|             ▼                          ▼                          ▼               |
|       [ CPU Core 0 ]             [ CPU Core 1 ]             [ CPU Core 2 ]        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Fundamental Architectural Principle

### User-Space Job Scheduler vs. Linux Kernel Dispatcher
NEXUS implements an **application-level job scheduling system**. It explicitly does **not** replace or patch the Linux kernel CFS (Completely Fair Scheduler):
- **NEXUS Job Scheduler**: Governs high-level task eligibility, execution slot allocation, arrival queues, and time-sharing quantum expiration.
- **Linux Kernel**: Manages low-level hardware thread execution, microsecond context switches, TLB flushes, cache lines, and multi-core thread migration.

When NEXUS dispatches a job, it creates a true Linux process (`subprocess.Popen` with `preexec_fn=os.setsid`). When a time slice expires in Round Robin, NEXUS issues `SIGSTOP` via `os.killpg()`, causing the Linux kernel to transition the task to `TASK_STOPPED`. When resuming, NEXUS issues `SIGCONT`, placing the task back into `TASK_RUNNING`.

---

## 3. Subsystem Breakdown

### 3.1 Process Controller (`process_controller.py`)
- **Process Group Isolation**: Each process is spawned with `os.setsid` to establish its own process group (PGID = PID). Any sub-processes spawned by user commands are tracked and signaled together.
- **Signal Dispatch**:
  - `SIGSTOP` (19): Freezes thread execution without terminating the address space. Memory buffers stay pinned in RAM.
  - `SIGCONT` (18): Wakes the process group, making it runnable on the next CPU tick.
  - `SIGTERM` (15): Signals graceful shutdown.
  - `SIGKILL` (9): Immediate kernel-level release if a process ignores SIGTERM after 1.5 seconds.
- **Command Security**:
  - Custom commands are tokenized using `shlex.split`.
  - Commands run directly without `shell=True` to prevent command chaining (`&&`, `;`, `|`), injection, and privilege escalation (`sudo`, `su`, `rm`, `mkfs` are rejected).
- **CPU Affinity**:
  - Configures CPU core masks using `sched_setaffinity(pid, mask)` via `psutil`.

### 3.2 Process Monitor (`process_monitor.py`)
- Continuous telemetry provider utilizing `psutil.Process(pid).oneshot()`:
  - Real CPU utilization percentage per PID.
  - Real Resident Set Size (RSS MB) and virtual memory footprint.
  - Direct kernel status mapping (`RUNNING`, `SLEEPING`, `STOPPED`, `ZOMBIE`, `DEAD`).
  - Detection of natural process completion and collection of exit codes (`proc.poll()`).

### 3.3 Scheduling Policy Matrix
- **First-Come, First-Served (FCFS)**: Non-preemptive. Orders strictly by $A_i$ (arrival time) and creation timestamp.
- **Shortest Job First (SJF)**:
  - Non-preemptive mode: Shortest estimated burst time scheduled first.
  - Preemptive mode (SRTF): Re-evaluates remaining burst time on every tick. If an arriving job has shorter remaining burst time than an executing job, the executing job is preempted.
- **Priority Scheduling**:
  - Priorities 1 (highest) to 10 (lowest).
  - Preemptive and non-preemptive modes supported.
- **Round Robin (RR)**:
  - Maintains cyclic FIFO queue.
  - User-configurable time quantum (default 2.0s).
  - High-precision tick loop tracks running duration in current slice. When $t_{\text{slice}} \ge Q$, the process is suspended with `SIGSTOP`, returned to the ready queue, and the next eligible task is dispatched or resumed.

### 3.4 Concurrency and Multi-Core Model
- **Execution Slots**: Configurable between 1 and 8.
- Multiple execution slots allow multiple genuine Linux processes to run concurrently.
- On multi-core WSL 2 systems, the Linux kernel distributes these runnable processes across physical cores, producing genuine simultaneous parallel CPU execution.

### 3.5 Real-Time Communication & Telemetry
- **FastAPI WebSocket (`/ws/live`)**:
  - Broadcasts full system snapshot every 500ms to all connected UI clients.
  - Contains host CPU utilization (per-core and overall), host RAM, active PIDs with real-time CPU% and memory MB, queue state, and live Gantt chart intervals.

---

## 4. Analytical Metrics Formulation

All analytical metrics calculated by NEXUS follow standard Operating Systems theory:

$$TAT_i = C_i - A_i$$
$$\text{Where } C_i \text{ is the process completion time, and } A_i \text{ is the arrival time.}$$

$$WT_i = TAT_i - \text{ActualExecutionTime}_i$$
$$\text{Where ActualExecutionTime is the cumulative CPU time measured by psutil.}$$

$$RT_i = S_i - A_i$$
$$\text{Where } S_i \text{ is the timestamp when the job was first dispatched into a slot.}$$

$$\text{Throughput} = \frac{\sum \text{Completed Jobs}}{\text{Makespan}}$$

$$\text{CPU Utilization} = \frac{\sum \text{Active Slot Time}}{\text{Makespan} \times \text{Slots}} \times 100\%$$
