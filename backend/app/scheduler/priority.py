from typing import List, Optional, Dict, Any

class PriorityScheduler:
    """
    Priority Scheduling Policy.
    Priority values: 1 (highest) to 10 (lowest).
    - Non-preemptive: Once dispatched, runs until completion.
    - Preemptive: If a ready job has strictly higher priority (lower numeric value)
      than an active running job, the lower-priority job is preempted.
    """
    def __init__(self, is_preemptive: bool = False):
        self.is_preemptive = is_preemptive

    def select_next_job(self, ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not ready_queue:
            return None
        # Sort primarily by priority (ascending, 1 is highest), then arrival_time
        sorted_queue = sorted(
            ready_queue,
            key=lambda j: (j.get("priority", 5), j.get("arrival_time", 0.0), j.get("created_at", 0.0))
        )
        return sorted_queue[0]

    def should_preempt(self, running_jobs: List[Dict[str, Any]], ready_queue: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not self.is_preemptive or not running_jobs or not ready_queue:
            return None

        # Highest priority ready job (lowest number)
        best_ready = min(ready_queue, key=lambda j: j.get("priority", 5))
        best_prio = best_ready.get("priority", 5)

        # Lowest priority running job (highest number)
        worst_running = max(running_jobs, key=lambda j: j.get("priority", 5))
        worst_prio = worst_running.get("priority", 5)

        if best_prio < worst_prio:
            return {
                "preempt_job_id": worst_running["id"],
                "replace_with": best_ready
            }

        return None
