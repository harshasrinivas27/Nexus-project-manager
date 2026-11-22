#!/usr/bin/env python3
"""
NEXUS Process Manager - CPU-Intensive Workload
Performs real mathematical computation (matrix operations & prime number sieve)
to generate genuine CPU utilization on assigned CPU core(s).
"""
import sys
import time
import math
import argparse
import os

def parse_args():
    parser = argparse.ArgumentParser(description="CPU-intensive test workload")
    parser.add_argument("--duration", type=float, default=6.0, help="Target duration in seconds")
    parser.add_argument("--job-id", type=str, default="cpu-job", help="Identifier for logging")
    return parser.parse_args()

def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

def do_work():
    # Matrix multiplication chunk
    dim = 60
    a = [[math.sin(i * dim + j) for j in range(dim)] for i in range(dim)]
    b = [[math.cos(i * dim + j) for j in range(dim)] for i in range(dim)]
    c = [[0.0 for _ in range(dim)] for _ in range(dim)]
    for i in range(dim):
        for j in range(dim):
            s = 0.0
            for k in range(dim):
                s += a[i][k] * b[k][j]
            c[i][j] = s
    return c

def main():
    args = parse_args()
    pid = os.getpid()
    print(f"[NEXUS WORKLOAD] CPU task started. PID: {pid}, Target Duration: {args.duration:.1f}s, Job: {args.job_id}", flush=True)

    start_time = time.monotonic()
    last_report = start_time
    iterations = 0
    primes_found = 0
    num = 10000

    while True:
        now = time.monotonic()
        elapsed = now - start_time
        if elapsed >= args.duration:
            break

        # Genuine CPU intensive operations
        do_work()
        for _ in range(200):
            if is_prime(num):
                primes_found += 1
            num += 1

        iterations += 1

        # Report progress periodically
        if now - last_report >= 1.0:
            pct = min(100.0, (elapsed / args.duration) * 100.0)
            print(f"[NEXUS CPU] PID {pid} elapsed: {elapsed:.1f}s / {args.duration:.1f}s ({pct:.0f}%), primes: {primes_found}, iters: {iterations}", flush=True)
            last_report = now

    total_time = time.monotonic() - start_time
    print(f"[NEXUS WORKLOAD] CPU task finished cleanly. PID: {pid}, Total Time: {total_time:.2f}s, Iters: {iterations}", flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()
