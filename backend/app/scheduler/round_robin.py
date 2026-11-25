from typing import List, Optional, Dict, Any


class RoundRobinScheduler:
    """
    Round Robin (RR) Scheduling Policy.
    - Preemptive time-sharing policy with a fixed time quantum.
    - Uses `last_ready_at` (when a job entered or returned to READY) so any
      quantum-preempted process cycles strictly to the tail of the FIFO queue.
    """
    def __init__(self, quantum: float = 2.0):
        self.quantum = quantum

    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None
        # Pick the job that has been waiting in the READY queue the longest
        sorted_queue = sorted(
            ready_queue,
            key=lambda j: (j.get("last_ready_at", 0.0), j.get("arrival_time", 0.0), j.get("created_at", 0.0))
        )
        return sorted_queue[0]

    def is_quantum_expired(self, current_slice_time: float) -> bool:
        return current_slice_time >= self.quantum
