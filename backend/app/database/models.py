from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class JobCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    workload_type: str = Field(..., description="'cpu', 'memory', 'io', or 'custom'")
    command: Optional[str] = Field(None, description="Custom Linux command if workload_type == 'custom'")
    priority: int = Field(5, ge=1, le=10, description="Priority level 1-10 (1 is highest)")
    arrival_time: float = Field(0.0, ge=0.0, description="Relative arrival time in seconds")
    estimated_burst_time: float = Field(5.0, ge=0.5, le=300.0, description="Configured burst-time estimate in seconds")
    description: Optional[str] = Field("", max_length=500)

class JobUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    arrival_time: Optional[float] = Field(None, ge=0.0)
    estimated_burst_time: Optional[float] = Field(None, ge=0.5, le=300.0)
    description: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    name: str
    workload_type: str
    command: Optional[str] = None
    priority: int
    arrival_time: float
    estimated_burst_time: float
    remaining_burst_time: float
    description: Optional[str] = None
    status: str
    pid: Optional[int] = None
    pgid: Optional[int] = None
    exit_code: Optional[int] = None
    created_at: float
    first_started_at: Optional[float] = None
    last_started_at: Optional[float] = None
    completed_at: Optional[float] = None
    elapsed_time: float = 0.0
    cpu_time_spent: float = 0.0
    assigned_slot: Optional[int] = None
    error_message: Optional[str] = None

    # Computed metrics
    waiting_time: Optional[float] = None
    turnaround_time: Optional[float] = None
    response_time: Optional[float] = None

class SchedulerConfig(BaseModel):
    algorithm: str = Field("FCFS", description="'FCFS', 'SJF', 'PRIORITY', 'ROUND_ROBIN'")
    quantum: float = Field(2.0, ge=0.2, le=60.0, description="Round Robin time quantum in seconds")
    execution_slots: int = Field(2, ge=1, le=16, description="Max concurrent executing processes")
    is_preemptive: bool = Field(False, description="Whether SJF or Priority algorithm runs in preemptive mode")

class ProcessAction(BaseModel):
    job_id: str
    action: str = Field(..., description="'pause', 'resume', 'terminate'")

class SystemSettings(BaseModel):
    execution_slots: int = 2
    cpu_affinity: List[int] = []
    refresh_interval_ms: int = 500
    algorithm: str = "FCFS"
    quantum: float = 2.0
    is_preemptive: bool = False

class SystemMetrics(BaseModel):
    cpu_overall_percent: float
    cpu_per_core_percent: List[float]
    memory_total_mb: float
    memory_used_mb: float
    memory_percent: float
    logical_cores: int
    physical_cores: int
    active_process_count: int

class ProcessLiveMetrics(BaseModel):
    job_id: str
    pid: int
    name: str
    status: str
    cpu_percent: float
    memory_rss_mb: float
    memory_percent: float
    elapsed_time: float
    started_at: Optional[float] = None
    slot: Optional[int] = None

class GanttEvent(BaseModel):
    job_id: str
    job_name: str
    slot: int
    start_time: float
    end_time: float
    duration: float
    event_type: str  # RUNNING, PAUSED, etc.

class AnalyticsSummary(BaseModel):
    algorithm: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    jobs: List[JobResponse]
    gantt_events: List[GanttEvent]
