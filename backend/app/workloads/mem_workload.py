#!/usr/bin/env python3
"""
NEXUS Process Manager - Memory-Intensive Workload
Allocates chunks of real memory (e.g., 50MB - 150MB) and actively touches pages
to ensure resident set size (RSS) reflects genuine memory utilization.
"""
import sys
import time
import argparse
import os

def parse_args():
    parser = argparse.ArgumentParser(description="Memory-intensive test workload")
    parser.add_argument("--duration", type=float, default=6.0, help="Target duration in seconds")
    parser.add_argument("--target-mb", type=int, default=80, help="Target allocation in MB")
    parser.add_argument("--job-id", type=str, default="mem-job", help="Identifier for logging")
    return parser.parse_args()

def main():
    args = parse_args()
    pid = os.getpid()
    print(f"[NEXUS WORKLOAD] Memory task started. PID: {pid}, Target: {args.target_mb}MB for {args.duration:.1f}s, Job: {args.job_id}", flush=True)

    start_time = time.monotonic()
    chunks = []
    chunk_size = 5 * 1024 * 1024 # 5MB per block
    target_bytes = args.target_mb * 1024 * 1024

    # Gradually allocate and dirty memory pages
    allocated = 0
    while allocated < target_bytes:
        size = min(chunk_size, target_bytes - allocated)
        # Create bytearray and write patterns so the Linux kernel must allocate real pages (RSS)
        block = bytearray(size)
        for offset in range(0, size, 4096):
            block[offset] = 0xAA
        chunks.append(block)
        allocated += size

    print(f"[NEXUS MEM] Allocated {len(chunks)} blocks (~{allocated / (1024*1024):.1f} MB) in RAM.", flush=True)

    last_report = start_time
    passes = 0

    while True:
        now = time.monotonic()
        elapsed = now - start_time
        if elapsed >= args.duration:
            break

        # Actively scan and mutate memory to keep pages resident
        for block in chunks:
            for offset in range(0, len(block), 65536):
                block[offset] = (block[offset] + 1) & 0xFF

        passes += 1
        time.sleep(0.05) # Yield briefly so CPU usage isn't 100%, emphasizing memory footprint

        if now - last_report >= 1.0:
            pct = min(100.0, (elapsed / args.duration) * 100.0)
            print(f"[NEXUS MEM] PID {pid} elapsed: {elapsed:.1f}s / {args.duration:.1f}s ({pct:.0f}%), memory active ({passes} sweeps)", flush=True)
            last_report = now

    # Explicit cleanup
    chunks.clear()
    total_time = time.monotonic() - start_time
    print(f"[NEXUS WORKLOAD] Memory task finished cleanly. PID: {pid}, Total Time: {total_time:.2f}s", flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()
