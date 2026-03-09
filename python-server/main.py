"""
main.py — FastAPI application
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
import routes_v2


# ── Startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    database.init_db()
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="LP CRM API", lifespan=lifespan)
app.include_router(routes_v2.router)

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
