"""
main.py — FastAPI application

Exposes the same three endpoints as the old Node.js/Express server:
    GET  /api/health
    GET  /api/data
    PUT  /api/data

The Vite dev proxy (client/vite.config.js) already forwards /api → :3001,
so the React frontend requires zero changes.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import crud
import database


# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    database.init_db()
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="LP CRM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"ok": True, "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/data")
def get_data(db: Session = Depends(database.get_db)):
    """Return the full CRM dataset in the same shape as the old data.json API."""
    data = crud.get_all_data(db)
    # Bootstrap empty DB gracefully (mirrors Node.js behaviour)
    if not data["gps"] and not data["pipeline"]:
        return {"gps": [], "pipeline": [], "todos": []}
    return data


@app.put("/api/data")
def save_data(data: Dict[str, Any], db: Session = Depends(database.get_db)):
    """
    Replace the entire dataset. Called by the frontend 800 ms debounce auto-save.
    Mirrors the old PUT /api/data endpoint exactly.
    """
    if "gps" not in data or "pipeline" not in data:
        raise HTTPException(
            status_code=400,
            detail="Invalid payload: expected { gps: [], pipeline: [] }",
        )
    crud.upsert_all_data(db, data)
    return {"ok": True, "savedAt": datetime.now(timezone.utc).isoformat()}


# ── History endpoints ─────────────────────────────────────────────────────────

@app.get("/api/history/fund/{fund_id}/performance")
def fund_performance_history(fund_id: str, db: Session = Depends(database.get_db)):
    """Performance snapshots for a fund, newest first."""
    return crud.get_fund_performance_history(db, fund_id)


@app.get("/api/history/fund/{fund_id}/raised")
def fund_raised_history(fund_id: str, db: Session = Depends(database.get_db)):
    """Raised-size snapshots for a fund, newest first."""
    return crud.get_fund_raised_history(db, fund_id)


@app.get("/api/history/fund/{fund_id}/changes")
def fund_change_history(fund_id: str, db: Session = Depends(database.get_db)):
    """Change-log entries for a fund (score/status + pipeline stage), newest first."""
    return crud.get_fund_change_history(db, fund_id)


@app.get("/api/history/gp/{gp_id}/changes")
def gp_change_history(gp_id: str, db: Session = Depends(database.get_db)):
    """Change-log entries for a GP (score/owner), newest first."""
    return crud.get_gp_change_history(db, gp_id)
