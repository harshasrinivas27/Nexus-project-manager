from typing import List, Dict, Any
from ..database.database import get_db_connection

class ExecutionHistory:
    def get_all_runs(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM scheduling_runs ORDER BY start_time DESC").fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_run_details(self, run_id: str) -> Dict[str, Any]:
        conn = get_db_connection()
        run = conn.execute("SELECT * FROM scheduling_runs WHERE id = ?", (run_id,)).fetchone()
        events = conn.execute("SELECT * FROM dispatch_events WHERE run_id = ? ORDER BY timestamp ASC", (run_id,)).fetchall()
        conn.close()

        return {
            "run": dict(run) if run else None,
            "events": [dict(e) for e in events]
        }

execution_history = ExecutionHistory()
