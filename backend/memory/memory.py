import os
import sqlite3
import logging
from contextlib import contextmanager

# Define DB Path inside backend/instance/
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "instance")
DB_PATH = os.path.join(DB_DIR, "vaani.db")

memory_logger = logging.getLogger("vaani_memory")

@contextmanager
def get_db():
    """Thread-safe context manager for SQLite connections with Foreign Keys enabled."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        memory_logger.error(f"Database transaction error: {e}")
        raise
    finally:
        conn.close()

def db_init():
    """Initializes the database schema if tables do not exist."""
    memory_logger.info("Initializing SQLite database tables...")
    with get_db() as conn:
        # 1. Conversations Table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 2. Messages Table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
        """)
        
        # 3. Preferences Table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            user_id TEXT PRIMARY KEY,
            preferred_model TEXT,
            preferred_voice TEXT,
            speech_speed REAL DEFAULT 1.0,
            language TEXT DEFAULT 'en',
            theme TEXT DEFAULT 'dark',
            context_window INTEGER DEFAULT 10,
            chunk_size INTEGER DEFAULT 500,
            chunk_overlap INTEGER DEFAULT 100,
            memory_enabled INTEGER DEFAULT 1
        );
        """)
        
        # 4. Documents Table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            type TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # 5. Document Chunks (Vector Store) Table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            page INTEGER,
            content TEXT NOT NULL,
            embedding BLOB,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
        """)
        
        # 6. Audio Logs Table (Session Audio Logs)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS audio_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            voice TEXT,
            speed REAL,
            text TEXT,
            audio_path TEXT,
            duration_seconds REAL,
            response_time REAL
        );
        """)
        # Migrate: add response_time column if missing (for existing databases)
        try:
            conn.execute("ALTER TABLE audio_logs ADD COLUMN response_time REAL")
        except Exception:
            pass  # Column already exists
    memory_logger.info("Database initialization complete.")

# --- CONVERSATION HELPERS ---

def start_new_conversation(user_id="default", title="New Conversation"):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
            (user_id, title)
        )
        return cursor.lastrowid

def rename_conversation(conversation_id, title):
    with get_db() as conn:
        conn.execute(
            "UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, conversation_id)
        )
        return True

def delete_conversation(conversation_id):
    with get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        return True

def get_conversations(user_id="default"):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,)
        ).fetchall()
        return [dict(row) for row in rows]

# --- MESSAGE HELPERS ---

def save_message(conversation_id, role, content):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
            (conversation_id, role, content)
        )
        conn.execute(
            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (conversation_id,)
        )
        return True

def load_conversation(conversation_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, role, content, timestamp FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,)
        ).fetchall()
        return [dict(row) for row in rows]

def get_recent_context(conversation_id, limit=10):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?",
            (conversation_id, limit)
        ).fetchall()
        return [dict(row) for row in reversed(rows)]

def search_history(query, user_id="default"):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT c.id, c.title, c.created_at, c.updated_at
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
            ORDER BY c.updated_at DESC
            """,
            (user_id, f"%{query}%", f"%{query}%")
        ).fetchall()
        return [dict(row) for row in rows]

# --- PREFERENCES HELPERS ---

def load_preferences(user_id="default"):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM preferences WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            return dict(row)
        # Create default preferences if none exist
        conn.execute(
            "INSERT INTO preferences (user_id) VALUES (?)",
            (user_id,)
        )
        row = conn.execute("SELECT * FROM preferences WHERE user_id = ?", (user_id,)).fetchone()
        return dict(row)

def save_preferences(user_id="default", **kwargs):
    fields = []
    values = []
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        values.append(v)
    if not fields:
        return False
    values.append(user_id)
    query = f"UPDATE preferences SET {', '.join(fields)} WHERE user_id = ?"
    with get_db() as conn:
        conn.execute(query, tuple(values))
        return True

# --- AUDIO LOGS HELPERS ---

def save_audio_log(id, voice, speed, text, audio_path, duration_seconds, response_time=0.0, timestamp=None):
    from datetime import datetime
    if not timestamp:
        timestamp = datetime.now().strftime('%I:%M:%S %p') # e.g. '11:42:15 PM'
    with get_db() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO audio_logs (id, timestamp, voice, speed, text, audio_path, duration_seconds, response_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (id, timestamp, voice, speed, text, audio_path, duration_seconds, response_time)
        )
    return True

def get_audio_logs():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, timestamp, voice, speed, text, audio_path, duration_seconds, response_time FROM audio_logs ORDER BY timestamp DESC"
        ).fetchall()
        logs = [dict(row) for row in rows]
        
        # Scan and update duration if missing/0 for existing MP3 files
        updated_any = False
        for log in logs:
            if not log.get("duration_seconds") or log["duration_seconds"] == 0.0:
                audio_path = log["audio_path"]
                if audio_path:
                    # Convert static audio URL to local file path
                    if audio_path.startswith("/static/"):
                        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        local_path = os.path.join(base_dir, audio_path.lstrip("/"))
                        if os.path.exists(local_path):
                            try:
                                from mutagen.mp3 import MP3
                                audio = MP3(local_path)
                                duration = round(audio.info.length, 2)
                                log["duration_seconds"] = duration
                                conn.execute("UPDATE audio_logs SET duration_seconds = ? WHERE id = ?", (duration, log["id"]))
                                updated_any = True
                                memory_logger.info("Automatically updated missing duration for audio log %s to %.2fs", log["id"], duration)
                            except Exception as e:
                                memory_logger.error("Failed to read duration for old audio file %s: %s", local_path, e)
        return logs

def clear_audio_logs():
    with get_db() as conn:
        conn.execute("DELETE FROM audio_logs")
    return True
