from typing import List, Optional, Dict, Any

class FCFSScheduler:
    """
    First-Come, First-Served (FCFS) Scheduling Policy.
    Non-preemptive algorithm that selects the job with the earliest arrival time.
    Tie-breaking is based on initial registration order (created_at).
    """
    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None
        # Sort primarily by arrival_time, then by created_at
        sorted_queue = sorted(ready_queue, key=lambda j: (j.get("arrival_time", 0.0), j.get("created_at", 0.0)))
        return sorted_queue[0]

    def should_preempt(self, running_jobs: List[Dict[str, Any]], ready_queue: List[Dict[str, Any]]) -> Optional[str]:
        # FCFS is non-preemptive
        return None
