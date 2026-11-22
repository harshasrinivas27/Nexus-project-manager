# NEXUS Process Manager — Linux Operating Systems Project

**NEXUS Process Manager** is a complete, university-level Operating Systems process management and job scheduling workstation. Unlike simulators or frontend prototypes, NEXUS executes, pauses, resumes, and terminates **actual Linux processes** inside Ubuntu on WSL 2 while providing real-time hardware telemetry, scheduling algorithm controls, interactive Gantt charts, and quantitative performance analytics.

---

## 1. Key Features

- **Genuine Linux Process Execution**:
  - Direct kernel interaction using Python `subprocess.Popen` with dedicated POSIX process groups (`os.setsid`).
  - True PID and PGID capture and tracking.
  - Zero simulated metrics — all CPU %, resident memory (RSS MB), and process statuses are read live via `psutil`.

- **Comprehensive POSIX Signal Control**:
  - `SIGSTOP` (Signal 19): Non-destructive task freezing without address space deletion.
  - `SIGCONT` (Signal 18): Instant task unfreezing and timeslice re-eligibility.
  - `SIGTERM` / `SIGKILL` (Signals 15/9): Clean child process group termination and exit code collection.

- **Four Classical CPU Scheduling Policies**:
  1. **First-Come, First-Served (FCFS)**: Strict arrival-order non-preemptive queue.
  2. **Shortest Job First (SJF)**: Non-preemptive and Preemptive (Shortest Remaining Time First - SRTF).
  3. **Priority Scheduling**: Non-preemptive and Preemptive with 1-10 priority scale.
  4. **Round Robin (RR)**: Fixed-quantum time-sharing with automatic `SIGSTOP` quantum preemption and circular queue re-dispatching.

- **Multi-Core Concurrency & CPU Affinity**:
  - Configurable simultaneous execution slots (1 to 8 concurrent processes).
  - True parallel multi-core execution on WSL 2.
  - Optional CPU affinity pinning (`sched_setaffinity`) to restrict processes to specific logical CPU cores.

- **Workload Generators & Secure Custom Commands**:
  - Predefined CPU-bound tasks (prime calculations and matrix multiplication).
  - Predefined Memory-bound tasks (RAM buffer allocation and page sweep).
  - Predefined I/O-bound tasks (disk flush, fsync, and hash validation).
  - Validated custom Linux commands executed via `shlex` tokens without shell injection risks.

- **Analytical Engine & Visualizations**:
  - Live execution timeline and Gantt charts generated from real dispatch intervals.
  - Exact OS performance metrics:
    - Arrival Time ($A_i$), First Start Time ($S_i$), Completion Time ($C_i$)
    - Turnaround Time ($TAT = C_i - A_i$)
    - Waiting Time ($WT = TAT - \text{ActualRuntime}$)
    - Response Time ($RT = S_i - A_i$)
    - Average TAT, Average WT, Average RT, CPU Utilization %, and Throughput
  - Side-by-side benchmark comparison across algorithms using identical workload suites.

- **Dark Technical Workstation Interface**:
  - Built with React, TypeScript, Tailwind CSS, and Recharts.
  - Live WebSocket telemetry stream (500ms refresh rate).

---

## 2. Technology Stack

- **Operating System Environment**: Ubuntu 24.04 / 22.04 on WSL 2 (Windows 11 / 10)
- **Backend**:
  - Python 3.12+ (tested on Python 3.14)
  - FastAPI
  - Uvicorn (ASGI web server)
  - Pydantic v2
  - psutil (Linux kernel process & system telemetry)
  - SQLite (WAL mode for zero-lock concurrency)
- **Frontend**:
  - React 19 + TypeScript
  - Vite
  - Tailwind CSS v3
  - Recharts (hardware telemetry and benchmark visualizers)
  - Lucide React (technical iconography)
- **Communication Protocol**:
  - RESTful APIs for CRUD operations and configuration
  - WebSocket (`/ws/live`) for high-frequency telemetry broadcasting

---

## 3. Prerequisites

Ensure you have WSL 2 enabled on your Windows system with an active Ubuntu distribution:

1. Windows Subsystem for Linux (WSL 2):
   ```powershell
   wsl --status
   ```
2. Python 3.10+ installed inside Ubuntu:
   ```bash
   python3 --version
   ```
3. Node.js (v20+ or v22+) and npm inside Ubuntu or accessible on PATH:
   ```bash
   node -v
   npm -v
   ```

---

## 4. Installation & Setup

### Clone or Navigate to the Workspace:
```bash
cd /home/<username>/nexus-process-manager
```

### 4.1 Backend Setup
1. Create a Python virtual environment:
   ```bash
   python3 -m venv backend/venv
   ```
2. Activate and install dependencies:
   ```bash
   source backend/venv/bin/activate
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

### 4.2 Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## 5. Running the Application

### 5.1 Start the FastAPI Backend
In your first terminal (inside Ubuntu / WSL 2):
```bash
cd /home/<username>/nexus-process-manager
source backend/venv/bin/activate
python backend/run.py
```
The backend API server will start at `http://localhost:8000`. You can inspect the Swagger documentation at `http://localhost:8000/docs`.

### 5.2 Start the Vite Frontend Server
In your second terminal (inside Ubuntu / WSL 2):
```bash
cd /home/<username>/nexus-process-manager/frontend
npm run dev
```
Open your browser on Windows and navigate to:
```
http://localhost:5173
```

---

## 6. Application Modules Guide

1. **Dashboard**:
   - High-density workstation overview displaying total jobs, running slots, waiting tasks, and active Linux processes.
   - Live hardware telemetry gauges (Host CPU % and Resident RAM).
   - Real-time execution slots display showing assigned Linux PIDs.
   - Quick action shortcuts to load standard OS benchmark suites and start scheduling.

2. **Job Manager**:
   - Enqueue jobs with custom names, arrival times, estimated burst durations, and priority levels.
   - Select predefined workloads (CPU matrix, Memory buffer, or I/O sync) or input secure custom commands.
   - Edit job parameters before execution and manage queue entries.

3. **Scheduler**:
   - Select between FCFS, SJF (with Preemptive SRTF toggle), Priority (with Preemptive toggle), and Round Robin.
   - Adjust Round Robin time quantum (0.5s - 10.0s).
   - Configure execution slots (1 to 8 concurrent processes).
   - Visual inspect the Ready Queue and active dispatching slots.

4. **Live Monitor**:
   - Real-time table of all managed Linux processes displaying actual PIDs, PGIDs, CPU %, RSS memory MB, and status.
   - Send POSIX signals directly: `SIGSTOP` (pause), `SIGCONT` (resume), and `SIGTERM` (terminate).
   - Live historical area charts for CPU utilization and RAM consumption.

5. **Analytics**:
   - Full interactive Gantt Chart with precise dispatch and preemption slices.
   - Complete analytical metrics table computing $TAT$, $WT$, and $RT$.
   - Algorithm benchmark comparison graph comparing all 4 policies on identical workload batches.

6. **Settings**:
   - View detected host logical CPU cores.
   - Configure POSIX CPU affinity masks (`sched_setaffinity`).
   - Configure default concurrency slots.

---

## 7. Known Limitations & Technical Details

1. **User-Space vs. Kernel Scheduling**:
   - NEXUS schedules *application-level processes* into *execution slots*. It does not replace the Linux kernel CFS scheduler. Kernel-level hardware thread dispatching and microsecond context switching remain under Linux kernel control.
2. **Burst Time Estimates**:
   - The user-configured burst time is an **estimate** used by scheduling policies (such as SJF and SRTF) for ranking. Real processes vary based on system load, cache misses, and WSL host load. NEXUS measures and reports true elapsed execution time separately.
3. **CPU Affinity on WSL 2**:
   - CPU affinity via `sched_setaffinity` functions within the virtualized logical cores exposed by the WSL 2 Hyper-V kernel layer.
4. **Custom Command Restrictions**:
   - Privileged operations (`sudo`, `su`) and destructive system commands (`rm`, `mkfs`, `dd`, fork bombs) are intentionally blocked for safety.
