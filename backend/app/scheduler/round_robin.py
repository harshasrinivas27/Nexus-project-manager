from typing import List, Optional, Dict, Any
from collections import deque

class RoundRobinScheduler:
    """
    Round Robin (RR) Scheduling Policy.
    - Preemptive algorithm with a fixed time quantum.
    - Operates as a cyclic FIFO ready queue.
    - Jobs execute for up to `quantum` seconds.
    - If a job does not complete within its quantum, it is paused (SIGSTOP)
      and appended to the end of the ready queue.
    """
    def __init__(self, quantum: float = 2.0):
        self.quantum = quantum

    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None
        # Head of the FIFO queue
        return ready_queue[0]

    def is_quantum_expired(self, current_slice_time: float) -> bool:
        return current_slice_time >= self.quantum
