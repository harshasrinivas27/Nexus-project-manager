# NEXUS Process Manager — Database Schema Specification

NEXUS uses SQLite (`nexus.db`) configured in **WAL mode** (`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`) for high concurrency and zero-lock reader/writer isolation.

---

## 1. Tables Overview

```
+--------------------------------------------------------------+
|                          DATABASE                            |
+--------------------------------------------------------------+
  |-- jobs (Job configurations, live states, PID, metrics)
  |-- scheduling_runs (Historical scheduling sessions)
  |-- dispatch_events (Granular dispatch intervals for Gantt & audit)
  |-- settings (System configuration & persistence)
```

---

## 2. Table Schemas

### 2.1 `jobs`
Stores both predefined and custom user workloads, scheduling metadata, process handles, and measured CPU runtimes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Unique job identifier (e.g., `job-daf47348`) |
| `name` | `TEXT` | `NOT NULL` | Human-readable task designation |
| `workload_type` | `TEXT` | `NOT NULL` | `'cpu'`, `'memory'`, `'io'`, or `'custom'` |
| `command` | `TEXT` | `NULLABLE` | Validated CLI command string for custom workloads |
| `priority` | `INTEGER` | `NOT NULL DEFAULT 5` | Priority integer (1 = Highest, 10 = Lowest) |
| `arrival_time` | `REAL` | `NOT NULL DEFAULT 0.0` | Relative arrival time in seconds from run start |
| `estimated_burst_time` | `REAL` | `NOT NULL DEFAULT 5.0` | User-configured burst time estimate (seconds) |
| `remaining_burst_time` | `REAL` | `NOT NULL DEFAULT 5.0` | Decremented remaining burst time for SRTF |
| `description` | `TEXT` | `NULLABLE` | Workload notes or parameters |
| `status` | `TEXT` | `NOT NULL DEFAULT 'PENDING'` | State: `'PENDING'`, `'READY'`, `'RUNNING'`, `'PAUSED'`, `'COMPLETED'`, `'FAILED'`, `'TERMINATED'` |
| `pid` | `INTEGER` | `NULLABLE` | Real Linux OS Process Identifier |
| `pgid` | `INTEGER` | `NULLABLE` | Process Group ID (for group signal delivery) |
| `exit_code` | `INTEGER` | `NULLABLE` | Process return code upon termination/exit |
| `created_at` | `REAL` | `NOT NULL` | Epoch timestamp of job creation |
| `first_started_at` | `REAL` | `NULLABLE` | Epoch timestamp when first dispatched |
| `last_started_at` | `REAL` | `NULLABLE` | Epoch timestamp of most recent slice dispatch |
| `completed_at` | `REAL` | `NULLABLE` | Epoch timestamp of process termination |
| `elapsed_time` | `REAL` | `NOT NULL DEFAULT 0.0` | Measured elapsed runtime in execution slots |
| `cpu_time_spent` | `REAL` | `NOT NULL DEFAULT 0.0` | Cumulative user+system CPU time from psutil |
| `assigned_slot` | `INTEGER` | `NULLABLE` | Active execution slot index (0 to N-1) |
| `error_message` | `TEXT` | `NULLABLE` | Diagnostic failure logs or exit messages |

---

### 2.2 `scheduling_runs`
Maintains benchmark records and historical metrics for comparative analysis.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Run ID (e.g., `run-7a1b3c9f`) |
| `algorithm` | `TEXT` | `NOT NULL` | Policy: `'FCFS'`, `'SJF'`, `'PRIORITY'`, `'ROUND_ROBIN'` |
| `quantum` | `REAL` | `NOT NULL DEFAULT 2.0` | Time slice quantum in seconds |
| `execution_slots` | `INTEGER` | `NOT NULL DEFAULT 2` | Concurrent slot capacity |
| `is_preemptive` | `INTEGER` | `NOT NULL DEFAULT 0` | Boolean flag (1 = Preemptive, 0 = Non-preemptive) |
| `start_time` | `REAL` | `NOT NULL` | Epoch timestamp when run began |
| `end_time` | `REAL` | `NULLABLE` | Epoch timestamp when all jobs completed |
| `status` | `TEXT` | `NOT NULL DEFAULT 'ACTIVE'` | Status: `'ACTIVE'`, `'COMPLETED'`, `'STOPPED'` |
| `total_jobs` | `INTEGER` | `NOT NULL DEFAULT 0` | Total jobs included in this run |
| `completed_jobs` | `INTEGER` | `NOT NULL DEFAULT 0` | Count of successfully finished jobs |
| `failed_jobs` | `INTEGER` | `NOT NULL DEFAULT 0` | Count of failed/terminated jobs |
| `avg_waiting_time` | `REAL` | `NOT NULL DEFAULT 0.0` | Mean waiting time ($WT$) in seconds |
| `avg_turnaround_time`| `REAL` | `NOT NULL DEFAULT 0.0` | Mean turnaround time ($TAT$) in seconds |
| `avg_response_time` | `REAL` | `NOT NULL DEFAULT 0.0` | Mean response time ($RT$) in seconds |
| `cpu_utilization` | `REAL` | `NOT NULL DEFAULT 0.0` | Slot occupancy percentage |
| `throughput` | `REAL` | `NOT NULL DEFAULT 0.0` | Jobs completed per second |

---

### 2.3 `dispatch_events`
Chronological event ledger used to reconstruct precise Gantt charts and historical state transitions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Event sequence number |
| `run_id` | `TEXT` | `NULLABLE` | Associated scheduling run identifier |
| `job_id` | `TEXT` | `NOT NULL, FK -> jobs(id)` | Associated job identifier |
| `event_type` | `TEXT` | `NOT NULL` | Event: `'DISPATCH'`, `'RESUME'`, `'PAUSE'`, `'PREEMPT'`, `'COMPLETE'`, `'FAIL'`, `'TERMINATE'`, `'USER_PAUSE'`, `'USER_TERMINATE'` |
| `timestamp` | `REAL` | `NOT NULL` | Epoch timestamp of event |
| `duration` | `REAL` | `DEFAULT 0.0` | Duration of the preceding execution slice |
| `cpu_percent` | `REAL` | `DEFAULT 0.0` | Snapshot process CPU utilization |
| `memory_mb` | `REAL` | `DEFAULT 0.0` | Snapshot resident memory (RSS MB) |
| `slot_index` | `INTEGER` | `DEFAULT 0` | Execution slot index where event occurred |
| `details` | `TEXT` | `NULLABLE` | Diagnostic event annotations |

---

### 2.4 `settings`
Persistent key-value storage for system configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | `TEXT` | `PRIMARY KEY` | Configuration key name |
| `value` | `TEXT` | `NOT NULL` | JSON-encoded or scalar string value |
