
import sqlite3
from config import DB_PATH

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS email_threads (
                id               TEXT PRIMARY KEY,
                job_title        TEXT,
                company          TEXT,
                recipient_email  TEXT,
                sent_at          TEXT,
                thread_id        TEXT,          -- Gmail thread ID
                message_id       TEXT,          -- Gmail message ID (for In-Reply-To)
                status           TEXT DEFAULT 'sent',  -- sent | followed_up | replied | closed
                follow_up_at     TEXT,          -- ISO timestamp when follow-up fires
                follow_up_sent   INTEGER DEFAULT 0,
                reply_received   INTEGER DEFAULT 0,
                reply_summary    TEXT,          -- Groq-generated summary of company reply
                outreach_email   TEXT,          -- original email we sent
                follow_up_email  TEXT,          -- follow-up we sent (if any)
                candidate_name   TEXT,
                resume_job_title TEXT
            )
        """)
        conn.commit()
