from typing import List, Optional, Dict, Any

class SJFScheduler:
    """
    Shortest Job First (SJF) / Shortest Remaining Time First (SRTF) Scheduling Policy.
    - In non-preemptive mode: Selects ready job with shortest estimated_burst_time.
    - In preemptive mode (SRTF): Selects job with shortest remaining_burst_time.
      Can preempt a running job if a ready job has strictly less remaining burst time.
    """
    def __init__(self, is_preemptive: bool = False):
        self.is_preemptive = is_preemptive

    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None

        if self.is_preemptive:
            # Sort by remaining_burst_time, then arrival_time
            sorted_queue = sorted(
                ready_queue,
                key=lambda j: (j.get("remaining_burst_time", j.get("estimated_burst_time", 5.0)), j.get("arrival_time", 0.0))
            )
        else:
            # Sort by estimated_burst_time, then arrival_time
            sorted_queue = sorted(
                ready_queue,
                key=lambda j: (j.get("estimated_burst_time", 5.0), j.get("arrival_time", 0.0))
            )

        return sorted_queue[0]

    def should_preempt(self, running_jobs: List[Dict[str, Any]], ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Returns a dict {"preempt_job_id": id, "replace_with": job} if preemption should occur.
        """
        if not self.is_preemptive or not running_jobs or not ready_queue:
            return None

        # Find ready job with minimum remaining burst
        best_ready = min(
            ready_queue,
            key=lambda j: j.get("remaining_burst_time", j.get("estimated_burst_time", 5.0))
        )
        best_ready_rem = best_ready.get("remaining_burst_time", best_ready.get("estimated_burst_time", 5.0))

        # Find running job with maximum remaining burst
        worst_running = max(
            running_jobs,
            key=lambda j: j.get("remaining_burst_time", j.get("estimated_burst_time", 5.0))
        )
        worst_running_rem = worst_running.get("remaining_burst_time", worst_running.get("estimated_burst_time", 5.0))

        # If a candidate is strictly shorter by at least 0.5s margin to avoid thrashing
        if best_ready_rem < (worst_running_rem - 0.5):
            return {
                "preempt_job_id": worst_running["id"],
                "replace_with": best_ready
            }

        return None
