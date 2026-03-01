#!/usr/bin/env python3
"""
migrate.py — One-time migration from data.json → SQL database

Usage (from the python-server/ directory):
    python migrate.py                        # uses ../server/data.json by default
    python migrate.py /path/to/data.json     # explicit path

The script is idempotent: it clears all tables before reinserting, so it is
safe to run multiple times (e.g. if you want to re-seed from a fresh JSON dump).
"""

import json
import sys
from pathlib import Path
from typing import Union

import database
import crud


def migrate(json_path: Union[str, Path]) -> None:
    json_path = Path(json_path).resolve()
    if not json_path.exists():
        print(f"[migrate] ERROR: File not found: {json_path}")
        sys.exit(1)

    print(f"[migrate] Loading {json_path} …")
    with open(json_path, encoding="utf-8") as fh:
        data = json.load(fh)

    gp_count      = len(data.get("gps", []))
    fund_count    = sum(len(g.get("funds",    [])) for g in data.get("gps", []))
    meeting_count = sum(len(g.get("meetings", [])) for g in data.get("gps", []))
    pipeline_count = len(data.get("pipeline", []))
    todo_count    = len(data.get("todos", []))

    print(f"[migrate] Found: {gp_count} GPs | {fund_count} funds | "
          f"{meeting_count} meetings | {pipeline_count} pipeline | {todo_count} todos")

    print("[migrate] Initialising database …")
    database.init_db()

    db = database.SessionLocal()
    try:
        print("[migrate] Writing to database …")
        crud.upsert_all_data(db, data)
        print("[migrate] ✓ Migration complete.")
        print(f"[migrate]   {gp_count} GPs, {fund_count} funds, {meeting_count} meetings "
              f"written to {database.DATABASE_URL.split('?')[0]}")
    except Exception as exc:
        print(f"[migrate] ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    default_path = Path(__file__).parent.parent / "server" / "data.json"
    path_arg = sys.argv[1] if len(sys.argv) > 1 else str(default_path)
    migrate(path_arg)
