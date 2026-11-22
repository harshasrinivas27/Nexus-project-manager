import os
import sqlite3
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "nexus.db")

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Jobs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workload_type TEXT NOT NULL,
        command TEXT,
        priority INTEGER NOT NULL DEFAULT 5,
        arrival_time REAL NOT NULL DEFAULT 0.0,
        estimated_burst_time REAL NOT NULL DEFAULT 5.0,
        remaining_burst_time REAL NOT NULL DEFAULT 5.0,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        pid INTEGER,
        pgid INTEGER,
        exit_code INTEGER,
        created_at REAL NOT NULL,
        first_started_at REAL,
        last_started_at REAL,
        completed_at REAL,
        elapsed_time REAL NOT NULL DEFAULT 0.0,
        cpu_time_spent REAL NOT NULL DEFAULT 0.0,
        assigned_slot INTEGER,
        error_message TEXT
    );
    """)

    # Scheduling Runs Table (for benchmark & history)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scheduling_runs (
        id TEXT PRIMARY KEY,
        algorithm TEXT NOT NULL,
        quantum REAL NOT NULL DEFAULT 2.0,
        execution_slots INTEGER NOT NULL DEFAULT 2,
        is_preemptive INTEGER NOT NULL DEFAULT 0,
        start_time REAL NOT NULL,
        end_time REAL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        total_jobs INTEGER NOT NULL DEFAULT 0,
        completed_jobs INTEGER NOT NULL DEFAULT 0,
        failed_jobs INTEGER NOT NULL DEFAULT 0,
        avg_waiting_time REAL NOT NULL DEFAULT 0.0,
        avg_turnaround_time REAL NOT NULL DEFAULT 0.0,
        avg_response_time REAL NOT NULL DEFAULT 0.0,
        cpu_utilization REAL NOT NULL DEFAULT 0.0,
        throughput REAL NOT NULL DEFAULT 0.0
    );
    """)

    # Dispatch & State Events Table (for Gantt charts & audit log)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dispatch_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        job_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp REAL NOT NULL,
        duration REAL DEFAULT 0.0,
        cpu_percent REAL DEFAULT 0.0,
        memory_mb REAL DEFAULT 0.0,
        slot_index INTEGER DEFAULT 0,
        details TEXT,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
    """)

    # Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()
