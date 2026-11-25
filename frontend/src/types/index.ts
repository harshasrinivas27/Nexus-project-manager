/**
 * Shared TypeScript Interfaces matching FastAPI Pydantic response schemas.
 */
export interface Job {
  id: string;
  name: string;
  workload_type: 'cpu' | 'memory' | 'io' | 'custom';
  command?: string;
  priority: number;
  arrival_time: number;
  estimated_burst_time: number;
  remaining_burst_time: number;
  description?: string;
  status: 'PENDING' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'TERMINATED';
  pid?: number | null;
  pgid?: number | null;
  exit_code?: number | null;
  created_at: number;
  first_started_at?: number | null;
  last_started_at?: number | null;
  completed_at?: number | null;
  elapsed_time: number;
  cpu_time_spent?: number;
  assigned_slot?: number | null;
  error_message?: string | null;
  waiting_time?: number | null;
  turnaround_time?: number | null;
  response_time?: number | null;
}

export interface ProcessLive {
  job_id: string;
  name: string;
  pid: number;
  pgid: number;
  status: string;
  os_status: string;
  cpu_percent: number;
  memory_rss_mb: number;
  memory_percent: number;
  elapsed_time: number;
  slot?: number | null;
  workload_type: string;
}

export interface SystemMetrics {
  cpu_overall_percent: number;
  cpu_per_core_percent: number[];
  memory_total_mb: number;
  memory_used_mb: number;
  memory_percent: number;
  logical_cores: number;
  physical_cores: number;
  active_process_count: number;
  error?: string;
}

export interface SchedulerStatus {
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  algorithm: 'FCFS' | 'SJF' | 'PRIORITY' | 'ROUND_ROBIN';
  quantum: number;
  execution_slots: number;
  is_preemptive: boolean;
  sim_elapsed_time: number;
  active_slots: Record<number, string | null>;
  counts: {
    total: number;
    pending: number;
    ready: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
  };
}

export interface GanttEvent {
  job_id: string;
  job_name: string;
  slot: number;
  start_time: number;
  end_time: number;
  duration: number;
  event_type: string;
}

export interface AnalyticsSummary {
  algorithm: string;
  is_preemptive?: boolean;
  quantum?: number;
  execution_slots?: number;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_waiting_time: number;
  avg_turnaround_time: number;
  avg_response_time: number;
  cpu_utilization: number;
  throughput: number;
  jobs: Job[];
  gantt_events: GanttEvent[];
}

export interface ProcessLogEntry {
  stream: 'stdout' | 'stderr';
  line: string;
  ts: number;
}

export interface ProcessLogsResponse {
  found: boolean;
  job_id: string;
  job_name?: string;
  job_status?: string;
  workload_type?: string;
  elapsed_time?: number;
  pid: number | null;
  pgid: number | null;
  command: string | null;
  is_paused: boolean;
  is_alive: boolean;
  exit_code: number | null;
  logs: ProcessLogEntry[];
}

export interface RandomBatchConfig {
  count: number;
  scenario: 'random' | 'convoy' | 'priority_burst';
  clear_existing: boolean;
}

export interface SchedulingRunHistory {
  id: string;
  algorithm: string;
  quantum: number;
  execution_slots: number;
  is_preemptive: number;
  start_time: number;
  end_time: number | null;
  status: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_waiting_time: number;
  avg_turnaround_time: number;
  avg_response_time: number;
  cpu_utilization: number;
  throughput: number;
}

export interface SystemSettings {
  execution_slots: number;
  available_cores: number[];
  cpu_affinity: number[];
  algorithm: string;
  quantum: number;
  is_preemptive: boolean;
}
