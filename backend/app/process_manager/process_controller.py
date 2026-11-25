"""
Linux Process Controller & Signal Dispatcher.
Spawns genuine OS child processes via subprocess.Popen inside isolated POSIX process groups
(os.setsid) so signals (SIGSTOP, SIGCONT, SIGTERM, SIGKILL) affect the parent and all child
subprocesses together without leaving orphan processes behind.
Also streams live stdout/stderr in daemon threads so pipe buffers never deadlock.
"""
import os
import signal
import subprocess
import shlex
import sys
import threading
import time
from collections import deque
import psutil
from typing import Dict, Optional, Tuple, List, Any

# List of dangerous tokens/commands prevented for safety
DANGEROUS_COMMANDS = {
    "sudo", "su", "rm", "mkfs", "dd", "shutdown", "reboot", "init",
    ":(){ :|:& };:", "chmod", "chown", "passwd", "userdel", "mkswap"
}

ALLOWED_COMMAND_PREFIXES = {
    "python", "python3", "echo", "sleep", "ls", "grep", "cat", "wc",
    "find", "sort", "head", "tail", "awk", "sed", "bc", "date", "whoami",
    "seq", "tr", "cut", "uniq", "basename", "dirname", "expr", "test"
}

class ManagedProcess:
    def __init__(self, job_id: str, popen: subprocess.Popen, pgid: int, command_str: str):
        self.job_id = job_id
        self.popen = popen
        self.pid = popen.pid
        self.pgid = pgid
        self.command_str = command_str
        self.is_paused = False
        self.exit_code: Optional[int] = None
        self.logs: deque = deque(maxlen=250)
        self._log_lock = threading.Lock()
        self._start_stream_readers()

    def _start_stream_readers(self):
        if self.popen.stdout:
            t_out = threading.Thread(target=self._read_stream, args=(self.popen.stdout, "stdout"), daemon=True)
            t_out.start()
        if self.popen.stderr:
            t_err = threading.Thread(target=self._read_stream, args=(self.popen.stderr, "stderr"), daemon=True)
            t_err.start()

    def _read_stream(self, stream, stream_name: str):
        try:
            for line in iter(stream.readline, ""):
                clean = line.rstrip("\r\n")
                if clean:
                    with self._log_lock:
                        self.logs.append({
                            "stream": stream_name,
                            "line": clean,
                            "ts": round(time.time(), 2)
                        })
        except Exception:
            pass
        finally:
            try:
                stream.close()
            except Exception:
                pass

    def get_logs(self) -> List[Dict[str, Any]]:
        with self._log_lock:
            return list(self.logs)

class ProcessController:
    def __init__(self):
        # Maps job_id -> ManagedProcess
        self._processes: Dict[str, ManagedProcess] = {}

    def validate_command(self, cmd_str: str) -> Tuple[bool, str, List[str]]:
        if not cmd_str or not cmd_str.strip():
            return False, "Command cannot be empty", []

        try:
            tokens = shlex.split(cmd_str.strip())
        except Exception as e:
            return False, f"Failed to parse command syntax: {str(e)}", []

        if not tokens:
            return False, "Command has no tokens", []

        base_cmd = os.path.basename(tokens[0])

        # Check blacklist
        if base_cmd in DANGEROUS_COMMANDS:
            return False, f"Command '{base_cmd}' is prohibited for security reasons.", []

        for t in tokens:
            if t in DANGEROUS_COMMANDS:
                return False, f"Prohibited operation token: '{t}'", []

        # Allow safe prefix check or python scripts
        if base_cmd not in ALLOWED_COMMAND_PREFIXES and not base_cmd.endswith(".py") and not base_cmd.endswith(".sh"):
            # Check if binary exists in PATH
            found = False
            for p in os.environ.get("PATH", "").split(os.pathsep):
                candidate = os.path.join(p, base_cmd)
                if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                    found = True
                    break
            if not found:
                return False, f"Command executable '{base_cmd}' not found or permitted.", []

        return True, "Valid", tokens

    def spawn_process(
        self,
        job_id: str,
        workload_type: str,
        burst_time: float,
        custom_command: Optional[str] = None,
        cpu_affinity: Optional[List[int]] = None,
        workloads_dir: Optional[str] = None
    ) -> Tuple[bool, str, Optional[int]]:
        """
        Creates and starts an actual Linux process with its own process group (setsid).
        Returns: (success, message, pid)
        """
        if job_id in self._processes and self.is_alive(job_id):
            return False, f"Job {job_id} already has a running process (PID {self._processes[job_id].pid})", self._processes[job_id].pid

        python_bin = sys.executable

        if workload_type == "custom":
            if not custom_command:
                return False, "Custom command required for 'custom' workload", None
            is_valid, msg, tokens = self.validate_command(custom_command)
            if not is_valid:
                return False, f"Command validation failed: {msg}", None
            args = tokens
            cmd_display = custom_command
        elif workload_type in ("cpu", "memory", "io"):
            if not workloads_dir:
                workloads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "workloads")

            target_script = {
                "cpu": os.path.join(workloads_dir, "cpu_workload.py"),
                "memory": os.path.join(workloads_dir, "mem_workload.py"),
                "io": os.path.join(workloads_dir, "io_workload.py")
            }[workload_type]

            if not os.path.exists(target_script):
                return False, f"Workload script not found: {target_script}", None

            args = [python_bin, target_script, "--duration", str(burst_time), "--job-id", str(job_id)]
            cmd_display = f"{workload_type} (duration={burst_time:.1f}s)"
        else:
            return False, f"Unknown workload type: {workload_type}", None

        try:
            # Spawn process in its own session/process group so all children receive signals
            child_env = os.environ.copy()
            child_env["PYTHONUNBUFFERED"] = "1"
            proc = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                env=child_env,
                preexec_fn=os.setsid,
                close_fds=True
            )
            pgid = os.getpgid(proc.pid)
            managed = ManagedProcess(job_id=job_id, popen=proc, pgid=pgid, command_str=cmd_display)
            self._processes[job_id] = managed

            # Set CPU Affinity if configured
            if cpu_affinity and len(cpu_affinity) > 0:
                self.apply_cpu_affinity(proc.pid, cpu_affinity)

            return True, f"Process started successfully (PID: {proc.pid}, PGID: {pgid})", proc.pid
        except Exception as e:
            return False, f"Failed to spawn process: {str(e)}", None

    def pause_process(self, job_id: str) -> Tuple[bool, str]:
        """Sends SIGSTOP to the process group."""
        if job_id not in self._processes:
            return False, f"No process found for job {job_id}"

        proc = self._processes[job_id]
        if not self.is_alive(job_id):
            return False, f"Process {proc.pid} is already terminated"

        try:
            os.killpg(proc.pgid, signal.SIGSTOP)
            proc.is_paused = True
            return True, f"Process {proc.pid} paused (SIGSTOP sent to PGID {proc.pgid})"
        except Exception as e:
            return False, f"Error pausing process {proc.pid}: {str(e)}"

    def resume_process(self, job_id: str) -> Tuple[bool, str]:
        """Sends SIGCONT to the process group."""
        if job_id not in self._processes:
            return False, f"No process found for job {job_id}"

        proc = self._processes[job_id]
        if not self.is_alive(job_id):
            return False, f"Process {proc.pid} is already terminated"

        try:
            os.killpg(proc.pgid, signal.SIGCONT)
            proc.is_paused = False
            return True, f"Process {proc.pid} resumed (SIGCONT sent to PGID {proc.pgid})"
        except Exception as e:
            return False, f"Error resuming process {proc.pid}: {str(e)}"

    def terminate_process(self, job_id: str) -> Tuple[bool, str]:
        """Sends SIGTERM, waits briefly, and forces SIGKILL if necessary."""
        if job_id not in self._processes:
            return False, f"No process found for job {job_id}"

        proc = self._processes[job_id]
        try:
            # First send SIGCONT in case it's paused so it can handle SIGTERM
            try:
                os.killpg(proc.pgid, signal.SIGCONT)
            except OSError:
                pass

            os.killpg(proc.pgid, signal.SIGTERM)
            try:
                proc.popen.wait(timeout=1.5)
            except subprocess.TimeoutExpired:
                # Force kill if still lingering
                os.killpg(proc.pgid, signal.SIGKILL)
                proc.popen.wait(timeout=1.0)

            proc.exit_code = proc.popen.returncode
            return True, f"Process {proc.pid} terminated (exit code: {proc.exit_code})"
        except ProcessLookupError:
            proc.exit_code = -1
            return True, f"Process {proc.pid} was already terminated."
        except Exception as e:
            return False, f"Failed to terminate process: {str(e)}"

    def is_alive(self, job_id: str) -> bool:
        if job_id not in self._processes:
            return False
        proc = self._processes[job_id]
        ret = proc.popen.poll()
        if ret is not None:
            proc.exit_code = ret
            return False
        return True

    def get_exit_code(self, job_id: str) -> Optional[int]:
        if job_id not in self._processes:
            return None
        proc = self._processes[job_id]
        ret = proc.popen.poll()
        if ret is not None:
            proc.exit_code = ret
        return proc.exit_code

    def apply_cpu_affinity(self, pid: int, cores: List[int]) -> Tuple[bool, str]:
        try:
            p = psutil.Process(pid)
            p.cpu_affinity(cores)
            return True, f"CPU affinity set to cores {cores} for PID {pid}"
        except Exception as e:
            return False, f"Failed to set CPU affinity: {str(e)}"

    def get_logs(self, job_id: str) -> Dict[str, Any]:
        """Returns captured stdout/stderr lines and process status for a managed job."""
        if job_id not in self._processes:
            return {
                "found": False,
                "job_id": job_id,
                "pid": None,
                "pgid": None,
                "command": None,
                "is_paused": False,
                "is_alive": False,
                "exit_code": None,
                "logs": []
            }
        proc = self._processes[job_id]
        alive = self.is_alive(job_id)
        return {
            "found": True,
            "job_id": job_id,
            "pid": proc.pid,
            "pgid": proc.pgid,
            "command": proc.command_str,
            "is_paused": proc.is_paused,
            "is_alive": alive,
            "exit_code": self.get_exit_code(job_id),
            "logs": proc.get_logs()
        }

    def cleanup_all(self):
        """Terminates all managed process groups on shutdown."""
        for job_id in list(self._processes.keys()):
            if self.is_alive(job_id):
                self.terminate_process(job_id)
        self._processes.clear()

process_controller = ProcessController()
