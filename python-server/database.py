"""
database.py — SQLAlchemy engine + session factory

Switching to Snowflake is a one-line change in .env:
    DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE

Everything else in the codebase stays identical.
"""

import os
from sqlalchemy import create_engine, event
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


def init_db() -> None:
    """Create all tables that don't yet exist. Safe to call on every startup."""
    import models  # noqa: F401 — imports register models on Base.metadata
    Base.metadata.create_all(bind=engine)
    print(f"[db] Connected to {DATABASE_URL.split('?')[0]}")
    print("[db] Schema ready.")
