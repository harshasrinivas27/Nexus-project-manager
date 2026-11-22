#!/usr/bin/env python3
"""
NEXUS Process Manager - I/O-Intensive Workload
Simulates I/O and waiting patterns using real temporary file disk writes,
hash checks, fsync calls, and periodic I/O pauses.
"""
import sys
import time
import argparse
import os
import tempfile
import hashlib

def parse_args():
    parser = argparse.ArgumentParser(description="I/O and waiting workload")
    parser.add_argument("--duration", type=float, default=6.0, help="Target duration in seconds")
    parser.add_argument("--job-id", type=str, default="io-job", help="Identifier for logging")
    return parser.parse_args()

def main():
    args = parse_args()
    pid = os.getpid()
    print(f"[NEXUS WORKLOAD] I/O task started. PID: {pid}, Target Duration: {args.duration:.1f}s, Job: {args.job_id}", flush=True)

    start_time = time.monotonic()
    last_report = start_time
    cycles = 0

    with tempfile.NamedTemporaryFile(prefix=f"nexus_io_{pid}_", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        data_block = os.urandom(64 * 1024) # 64 KB block

        while True:
            now = time.monotonic()
            elapsed = now - start_time
            if elapsed >= args.duration:
                break

            # Write data to disk and force kernel sync
            with open(tmp_path, "wb") as f:
                for _ in range(16):
                    f.write(data_block)
                f.flush()
                os.fsync(f.fileno())

            # Read back and calculate SHA256
            hasher = hashlib.sha256()
            with open(tmp_path, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    hasher.update(chunk)
            _ = hasher.hexdigest()

            cycles += 1
            # Simulate real I/O wait state
            time.sleep(0.15)

            if now - last_report >= 1.0:
                pct = min(100.0, (elapsed / args.duration) * 100.0)
                print(f"[NEXUS IO] PID {pid} elapsed: {elapsed:.1f}s / {args.duration:.1f}s ({pct:.0f}%), I/O cycles: {cycles}", flush=True)
                last_report = now

    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

    total_time = time.monotonic() - start_time
    print(f"[NEXUS WORKLOAD] I/O task completed cleanly. PID: {pid}, Total Time: {total_time:.2f}s, Cycles: {cycles}", flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()
