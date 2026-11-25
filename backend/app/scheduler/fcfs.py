from typing import List, Optional, Dict, Any


class FCFSScheduler:
    """
    First-Come, First-Served (FCFS) Scheduling Policy.
    Strict FIFO ordering: selects whichever READY job arrived earliest.
    Always non-preemptive (runs to completion once slotted).
    """
    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None
        # Sort by simulated arrival_time, breaking ties by creation order
        sorted_queue = sorted(ready_queue, key=lambda j: (j.get("arrival_time", 0.0), j.get("created_at", 0.0)))
        return sorted_queue[0]

    def should_preempt(self, running_jobs: List[Dict[str, Any]], ready_queue: List[Dict[str, Any]]) -> Optional[str]:
        # FCFS never interrupts a running process mid-execution
        return None
