"""
database.py — SQLAlchemy engine + session factory

Switching to Snowflake is a one-line change in .env:
    DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE

Everything else in the codebase stays identical.
"""

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lp_crm.db")

# SQLite needs check_same_thread disabled for FastAPI's thread-pool workers.
# For all other dialects (Snowflake, PostgreSQL) this kwarg is ignored.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

# Enable FK enforcement for SQLite (off by default).
# Snowflake / PostgreSQL enforce FKs at the server level.
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(conn, _record):
        conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _make_meeting_attendee_person_nullable() -> None:
    """Make meeting_attendee.person_id nullable (SQLite requires table recreation)."""
    with engine.connect() as conn:
        # Check if the column is already nullable by checking table info
        rows = conn.execute(text("PRAGMA table_info(meeting_attendee)")).fetchall()
        for row in rows:
            # row: (cid, name, type, notnull, dflt_value, pk)
            if row[1] == "person_id" and row[3] == 0:
                return  # already nullable, nothing to do
        # Recreate with person_id nullable
        try:
            conn.execute(text("PRAGMA foreign_keys=OFF"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS meeting_attendee_new (
                    id         VARCHAR(50) NOT NULL PRIMARY KEY,
                    meeting_id VARCHAR(50) NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
                    person_id  VARCHAR(50) REFERENCES person(id),
                    org_id     VARCHAR(50) REFERENCES organization(id),
                    side       VARCHAR(50)
                )
            """))
            conn.execute(text("""
                INSERT INTO meeting_attendee_new SELECT id, meeting_id, person_id, org_id, side
                FROM meeting_attendee
            """))
            conn.execute(text("DROP TABLE meeting_attendee"))
            conn.execute(text("ALTER TABLE meeting_attendee_new RENAME TO meeting_attendee"))
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.commit()
            print("[db] meeting_attendee.person_id made nullable.")
        except Exception as e:
            print(f"[db] meeting_attendee migration skipped: {e}")


def _migrate_columns() -> None:
    """Add new columns to existing tables. Each ALTER is idempotent (errors ignored)."""
    statements = [
        "ALTER TABLE CRM_gps ADD COLUMN website VARCHAR(500)",
        "ALTER TABLE CRM_funds ADD COLUMN raised_date VARCHAR(20)",
        "ALTER TABLE CRM_funds ADD COLUMN next_market VARCHAR(100)",
        "ALTER TABLE CRM_funds ADD COLUMN expected_amount VARCHAR(50)",
        "ALTER TABLE CRM_funds ADD COLUMN ic_date VARCHAR(20)",
        "ALTER TABLE CRM_meetings ADD COLUMN attendees_them TEXT",
        "ALTER TABLE CRM_meetings ADD COLUMN attendees_us TEXT",
        "ALTER TABLE CRM_funds ADD COLUMN placement_agent_id VARCHAR(50)",
    ]
    # SQLite does not support ALTER COLUMN — recreate meeting_attendee with person_id nullable
    _make_meeting_attendee_person_nullable()
    with engine.connect() as conn:
        for sql in statements:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # column already exists


def init_db() -> None:
    """Create all tables that don't yet exist. Safe to call on every startup."""
    import models  # noqa: F401 — registers all tables on Base.metadata
    Base.metadata.create_all(bind=engine)
    _migrate_columns()
    print(f"[db] Connected to {DATABASE_URL.split('?')[0]}")
    print("[db] Schema ready.")
