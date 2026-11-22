import os
import psutil
import time
from typing import Dict, List, Optional, Any
from .process_controller import process_controller, ManagedProcess

class ProcessMonitor:
    def __init__(self):
        # Cache psutil.Process handles for fast cpu_percent calculations
        self._psutil_procs: Dict[int, psutil.Process] = {}

    def get_system_metrics(self) -> Dict[str, Any]:
        """Collects real-time host/WSL system telemetry using psutil."""
        try:
            cpu_overall = psutil.cpu_percent(interval=None)
            cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
            vmem = psutil.virtual_memory()
            logical_cores = psutil.cpu_count(logical=True) or 1
            physical_cores = psutil.cpu_count(logical=False) or logical_cores

            # Count actual system running processes
            pids = psutil.pids()

            return {
                "cpu_overall_percent": round(cpu_overall, 1),
                "cpu_per_core_percent": [round(c, 1) for c in cpu_per_core],
                "memory_total_mb": round(vmem.total / (1024 * 1024), 1),
                "memory_used_mb": round(vmem.used / (1024 * 1024), 1),
                "memory_percent": round(vmem.percent, 1),
                "logical_cores": logical_cores,
                "physical_cores": physical_cores,
                "active_process_count": len(pids)
            }
        except Exception as e:
            return {
                "cpu_overall_percent": 0.0,
                "cpu_per_core_percent": [],
                "memory_total_mb": 0.0,
                "memory_used_mb": 0.0,
                "memory_percent": 0.0,
                "logical_cores": 1,
                "physical_cores": 1,
                "active_process_count": 0,
                "error": str(e)
            }

    def get_process_metrics(self, job_id: str, pid: int) -> Optional[Dict[str, Any]]:
        """Collects genuine OS metrics for a managed PID."""
        if not psutil.pid_exists(pid):
            if pid in self._psutil_procs:
                del self._psutil_procs[pid]
            return None

        try:
            if pid not in self._psutil_procs:
                self._psutil_procs[pid] = psutil.Process(pid)
            p = self._psutil_procs[pid]

            with p.oneshot():
                status_raw = p.status() # 'running', 'stopped', 'sleeping', 'zombie', etc.
                cpu_pct = p.cpu_percent(interval=None)
                mem_info = p.memory_info()
                mem_rss_mb = mem_info.rss / (1024 * 1024)
                mem_pct = p.memory_percent()
                create_time = p.create_time()
                cpu_times = p.cpu_times()
                total_cpu_time = cpu_times.user + cpu_times.system

            # Map raw OS status to clean display
            status_map = {
                psutil.STATUS_RUNNING: "RUNNING",
                psutil.STATUS_SLEEPING: "SLEEPING",
                psutil.STATUS_STOPPED: "PAUSED",
                psutil.STATUS_ZOMBIE: "ZOMBIE",
                psutil.STATUS_DEAD: "TERMINATED",
            }
            status_clean = status_map.get(status_raw, status_raw.upper())

            # If our controller explicitly marked it as paused, verify
            if process_controller._processes.get(job_id) and process_controller._processes[job_id].is_paused:
                status_clean = "PAUSED"

            return {
                "job_id": job_id,
                "pid": pid,
                "status": status_clean,
                "cpu_percent": round(cpu_pct, 1),
                "memory_rss_mb": round(mem_rss_mb, 2),
                "memory_percent": round(mem_pct, 2),
                "cpu_time": round(total_cpu_time, 2),
                "created_at": create_time
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            if pid in self._psutil_procs:
                del self._psutil_procs[pid]
            return None
        except Exception:
            return None

    def poll_all_managed(self) -> Dict[str, Dict[str, Any]]:
        """Returns metrics for all alive managed processes."""
        results = {}
        for job_id, managed in list(process_controller._processes.items()):
            metrics = self.get_process_metrics(job_id, managed.pid)
            if metrics:
                results[job_id] = metrics
        return results

process_monitor = ProcessMonitor()
