"""
routes_v2.py — /api/v2/* endpoints.
"""

import os
import re
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crud as crud_v2
import preqin_sync
from database import get_db
from models import PreqinLinkIgnore

router = APIRouter(prefix="/api/v2", tags=["v2"])


# ── Organizations ─────────────────────────────────────────────────────────────

@router.get("/organizations")
def list_organizations(
    org_type: Optional[str] = Query(None),
    rating_id: Optional[str] = Query(None),
    owner: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud_v2.get_organizations(
        db, org_type=org_type, rating_id=rating_id,
        owner=owner, name=name, include_deleted=include_deleted,
    )


@router.get("/organizations/{org_id}")
def get_organization(org_id: str, db: Session = Depends(get_db)):
    org = crud_v2.get_organization(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("/organizations", status_code=201)
def create_organization(data: Dict[str, Any], db: Session = Depends(get_db)):
    if not data.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    return crud_v2.create_organization(db, data)


@router.put("/organizations/{org_id}")
def update_organization(org_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_organization(db, org_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


@router.patch("/organizations/{org_id}")
def patch_organization(org_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    field = data.get("field")
    if not field:
        raise HTTPException(status_code=400, detail="field is required")
    result = crud_v2.patch_organization_field(
        db, org_id, field, data.get("value"),
        note=data.get("note"),
        changed_by=data.get("changed_by"),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return result


@router.delete("/organizations/{org_id}", status_code=204)
def delete_organization(
    org_id: str,
    hard: bool = Query(False),
    db: Session = Depends(get_db),
):
    ok = crud_v2.delete_organization(db, org_id, hard=hard)
    if not ok:
        raise HTTPException(status_code=404, detail="Organization not found")


# ── Funds ─────────────────────────────────────────────────────────────────────

@router.get("/funds")
def list_funds(
    org_id: Optional[str] = Query(None),
    status_id: Optional[str] = Query(None),
    rating_id: Optional[str] = Query(None),
    pipeline_stage_id: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud_v2.get_funds(
        db, org_id=org_id, status_id=status_id,
        rating_id=rating_id, pipeline_stage_id=pipeline_stage_id,
        include_deleted=include_deleted,
    )


@router.get("/funds/{fund_id}")
def get_fund(fund_id: str, db: Session = Depends(get_db)):
    fund = crud_v2.get_fund(db, fund_id)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    return fund


@router.post("/funds", status_code=201)
def create_fund(data: Dict[str, Any], db: Session = Depends(get_db)):
    if not data.get("name") or not data.get("org_id"):
        raise HTTPException(status_code=400, detail="name and org_id are required")
    return crud_v2.create_fund(db, data)


@router.put("/funds/{fund_id}")
def update_fund(fund_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_fund(db, fund_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Fund not found")
    return result


@router.patch("/funds/{fund_id}")
def patch_fund(fund_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    field = data.get("field")
    if not field:
        raise HTTPException(status_code=400, detail="field is required")
    result = crud_v2.patch_fund_field(
        db, fund_id, field, data.get("value"),
        note=data.get("note"),
        changed_by=data.get("changed_by"),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Fund not found")
    return result


@router.delete("/funds/{fund_id}", status_code=204)
def delete_fund(
    fund_id: str,
    hard: bool = Query(False),
    db: Session = Depends(get_db),
):
    ok = crud_v2.delete_fund(db, fund_id, hard=hard)
    if not ok:
        raise HTTPException(status_code=404, detail="Fund not found")


# ── Taxonomy ──────────────────────────────────────────────────────────────────

@router.get("/taxonomy")
def get_taxonomy(
    type: Optional[str] = Query(None),
    flat: bool = Query(False),
    db: Session = Depends(get_db),
):
    if flat:
        return crud_v2.get_taxonomy_flat(db, type=type)
    return crud_v2.get_taxonomy(db, type=type)


# ── Lookups ───────────────────────────────────────────────────────────────────

@router.get("/lookups")
def get_lookups(db: Session = Depends(get_db)):
    return crud_v2.get_lookups(db)


@router.get("/lookups/{category_id}")
def get_lookups_by_category(category_id: str, db: Session = Depends(get_db)):
    result = crud_v2.get_lookups_by_category(db, category_id)
    if not result:
        raise HTTPException(status_code=404, detail="Lookup category not found")
    return result


# ── Notes ─────────────────────────────────────────────────────────────────────

@router.get("/notes")
def list_notes(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    db: Session = Depends(get_db),
):
    return crud_v2.get_notes(db, entity_type, entity_id)


@router.post("/notes", status_code=201)
def create_note(data: Dict[str, Any], db: Session = Depends(get_db)):
    if not data.get("entity_type") or not data.get("entity_id"):
        raise HTTPException(status_code=400, detail="entity_type and entity_id are required")
    return crud_v2.create_note(db, data)


@router.put("/notes/{note_id}")
def update_note(note_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_note(db, note_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Note not found")
    return result


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    ok = crud_v2.delete_note(db, note_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Note not found")


# ── Meetings ──────────────────────────────────────────────────────────────────

@router.get("/meetings")
def list_meetings(
    org_id: Optional[str] = Query(None),
    fund_id: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud_v2.get_meetings(db, org_id=org_id, fund_id=fund_id,
                                include_deleted=include_deleted)


@router.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    m = crud_v2.get_meeting(db, meeting_id)
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return m


@router.post("/meetings", status_code=201)
def create_meeting(data: Dict[str, Any], db: Session = Depends(get_db)):
    return crud_v2.create_meeting(db, data)


@router.put("/meetings/{meeting_id}")
def update_meeting(meeting_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_meeting(db, meeting_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return result


@router.delete("/meetings/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    ok = crud_v2.delete_meeting(db, meeting_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Meeting not found")


# ── People ────────────────────────────────────────────────────────────────────

@router.get("/people")
def list_people(
    org_id: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    q: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return crud_v2.get_people(db, org_id=org_id, include_deleted=include_deleted, search=q, limit=limit)


@router.get("/people/{person_id}")
def get_person(person_id: str, db: Session = Depends(get_db)):
    p = crud_v2.get_person(db, person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    return p


@router.post("/people", status_code=201)
def create_person(data: Dict[str, Any], db: Session = Depends(get_db)):
    return crud_v2.create_person(db, data)


@router.put("/people/{person_id}")
def update_person(person_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_person(db, person_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")
    return result


@router.delete("/people/{person_id}", status_code=204)
def delete_person(person_id: str, db: Session = Depends(get_db)):
    ok = crud_v2.delete_person(db, person_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Person not found")


@router.post("/organizations/{org_id}/people", status_code=201)
def link_person_to_org(org_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    if not data.get("person_id"):
        raise HTTPException(status_code=400, detail="person_id is required")
    return crud_v2.link_person_to_org(db, org_id, data["person_id"], data)


@router.delete("/organizations/{org_id}/people/{person_id}", status_code=204)
def unlink_person_from_org(org_id: str, person_id: str, db: Session = Depends(get_db)):
    ok = crud_v2.unlink_person_from_org(db, org_id, person_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Link not found")


@router.post("/people/find-or-create", status_code=200)
def find_or_create_person(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Find an existing person by name (within org if org_id given), or create them."""
    return crud_v2.find_or_create_person(db, data)


@router.get("/people/duplicates")
def get_duplicate_people(db: Session = Depends(get_db)):
    """Return groups of people with the same normalized name (potential duplicates)."""
    return crud_v2.get_duplicate_people(db)


@router.post("/people/merge", status_code=200)
def merge_people(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Merge duplicate people: transfer relationships from merge_ids to keep_id."""
    keep_id = data.get("keep_id")
    merge_ids = data.get("merge_ids", [])
    if not keep_id or not merge_ids:
        raise HTTPException(status_code=400, detail="keep_id and merge_ids are required")
    return crud_v2.merge_people(db, keep_id, merge_ids)


@router.get("/funds/duplicates")
def get_duplicate_funds(db: Session = Depends(get_db)):
    """Return groups of funds with the same normalized name (potential duplicates)."""
    return crud_v2.get_duplicate_funds(db)


@router.post("/funds/merge", status_code=200)
def merge_funds(data: Dict[str, Any], db: Session = Depends(get_db)):
    """Merge duplicate funds: transfer relationships from merge_ids to keep_id."""
    keep_id = data.get("keep_id")
    merge_ids = data.get("merge_ids", [])
    if not keep_id or not merge_ids:
        raise HTTPException(status_code=400, detail="keep_id and merge_ids are required")
    return crud_v2.merge_funds(db, keep_id, merge_ids)


# ── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/audit")
def get_audit_log(
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    db: Session = Depends(get_db),
):
    return crud_v2.get_audit_log(db, entity_type, entity_id)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.get("/tasks")
def list_tasks(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud_v2.get_tasks(db, entity_type=entity_type, entity_id=entity_id,
                              include_deleted=include_deleted)


@router.post("/tasks", status_code=201)
def create_task(data: Dict[str, Any], db: Session = Depends(get_db)):
    if not data.get("text"):
        raise HTTPException(status_code=400, detail="text is required")
    return crud_v2.create_task(db, data)


@router.put("/tasks/{task_id}")
def update_task(task_id: str, data: Dict[str, Any], db: Session = Depends(get_db)):
    result = crud_v2.update_task(db, task_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    ok = crud_v2.delete_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")


# ── External data (Preqin) ────────────────────────────────────────────────────

@router.get("/external/sources")
def list_external_sources(db: Session = Depends(get_db)):
    """List all external sources with last_synced timestamp."""
    return preqin_sync.get_external_sources(db)


@router.post("/external/sync")
def trigger_sync(db: Session = Depends(get_db)):
    """Sync fund + org fields from preqin_funds.db → field_provenance."""
    result = preqin_sync.sync_preqin(db)
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error"))
    return result


@router.post("/external/sync/performance")
def trigger_sync_performance(db: Session = Depends(get_db)):
    """Sync fund performance metrics from preqin_performance.db → field_provenance."""
    result = preqin_sync.sync_preqin_performance(db)
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error"))
    return result


@router.post("/external/sync/managers")
def trigger_sync_managers(db: Session = Depends(get_db)):
    """Sync org/firm fields from Preqin_managers.db → field_provenance."""
    result = preqin_sync.sync_preqin_managers(db)
    if not result.get("ok"):
        raise HTTPException(status_code=422, detail=result.get("error"))
    return result


@router.get("/external/pending")
def list_pending(db: Session = Depends(get_db)):
    """All field_provenance rows with status='pending', ordered by entity."""
    return preqin_sync.get_pending_provenance(db)


@router.patch("/external/provenance/{provenance_id}/accept")
def accept_provenance(
    provenance_id: str,
    data: Dict[str, Any] = {},
    db: Session = Depends(get_db),
):
    """
    Accept a pending Preqin suggestion:
    - Writes the value onto the entity column (or entity_attribute for EAV fields)
    - Writes an audit_log entry with source=Preqin
    - Sets field_provenance.status = 'accepted'
    """
    result = preqin_sync.accept_provenance(db, provenance_id,
                                           accepted_by=data.get("accepted_by"))
    if not result:
        raise HTTPException(status_code=404,
                            detail="Provenance row not found or not in pending state")
    return result


@router.patch("/external/provenance/{provenance_id}/reject")
def reject_provenance(
    provenance_id: str,
    data: Dict[str, Any] = {},
    db: Session = Depends(get_db),
):
    """Reject a pending suggestion — marks it rejected, leaves entity unchanged."""
    result = preqin_sync.reject_provenance(db, provenance_id,
                                           rejected_by=data.get("rejected_by"))
    if not result:
        raise HTTPException(status_code=404,
                            detail="Provenance row not found or not in pending state")
    return result


# ── SQL Explorer ──────────────────────────────────────────────────────────────

def _get_db_path(db_name: str) -> str:
    base = os.path.dirname(__file__)
    if db_name == "preqin":
        return os.path.join(base, "external", "preqin_funds.db")
    return os.path.join(base, "lp_crm.db")


@router.get("/sql/tables")
def sql_tables(db: str = Query("crm")):
    """List all table names in the selected database."""
    path = _get_db_path(db)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database '{db}' not found")
    conn = sqlite3.connect(path)
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


@router.post("/sql/query")
def sql_query(body: Dict[str, Any]):
    """
    Execute a read-only SQL query.
    Body: { "db": "crm"|"preqin", "sql": "SELECT ..." }
    Returns: { "columns": [...], "rows": [[...], ...] }
    Limited to 100 rows. Only SELECT statements allowed.
    """
    db_name = body.get("db", "crm")
    sql = (body.get("sql") or "").strip()
    if not sql:
        raise HTTPException(status_code=400, detail="sql is required")
    # Only allow SELECT statements
    first_word = sql.lstrip().split()[0].upper() if sql.split() else ""
    if first_word not in ("SELECT", "WITH", "EXPLAIN", "PRAGMA"):
        raise HTTPException(status_code=400, detail="Only SELECT/WITH/EXPLAIN/PRAGMA queries allowed")
    path = _get_db_path(db_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database '{db_name}' not found")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute(sql)
        rows = cur.fetchmany(100)
        columns = [d[0] for d in cur.description] if cur.description else []
        return {"columns": columns, "rows": [list(r) for r in rows]}
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


_PQ_SELECT = """
    SELECT "FUND ID", "FIRM ID", "FUND SERIES ID", "NAME", "FUND MANAGER",
           "STRATEGY", "ASSET CLASS", "STATUS", "VINTAGE / INCEPTION YEAR",
           "FUND CURRENCY", "FINAL CLOSE SIZE (USD MN)", "TARGET SIZE (USD MN)",
           "HARD CAP (USD MN)", "GEOGRAPHIC FOCUS"
    FROM Preqin_Export
"""

def _pq_row(row):
    return {
        "fund_id":         row["FUND ID"],
        "firm_id":         row["FIRM ID"],
        "series_id":       row["FUND SERIES ID"],
        "name":            (row["NAME"] or "").strip(),
        "manager":         row["FUND MANAGER"],
        "strategy":        row["STRATEGY"],
        "asset_class":     row["ASSET CLASS"],
        "status":          row["STATUS"],
        "vintage":         row["VINTAGE / INCEPTION YEAR"],
        "currency":        row["FUND CURRENCY"],
        "final_size_usd":  row["FINAL CLOSE SIZE (USD MN)"],
        "target_size_usd": row["TARGET SIZE (USD MN)"],
        "hard_cap_usd":    row["HARD CAP (USD MN)"],
        "geo_focus":       row["GEOGRAPHIC FOCUS"],
    }

def _pq_connect():
    db_path = os.path.join(os.path.dirname(__file__), "external", "preqin_funds.db")
    if not os.path.exists(db_path):
        return None
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _search_relevance(tokens, name, manager):
    """
    Relevance score 0.0–3.0 for sorting search results.

    2.0 pts — fraction of query tokens found in manager name  (manager match)
    1.0 pts — fraction of query tokens found in fund name     (name match)

    So a perfect manager match scores 2.0+, a partial manager match outranks
    a fund whose name happens to contain the tokens but whose manager is unrelated.
    Ties are broken by name alphabetically in the SQL query.
    """
    if not tokens:
        return 0.0
    name_l    = (name    or "").lower()
    manager_l = (manager or "").lower()
    mgr_hits  = sum(1 for t in tokens if t.lower() in manager_l)
    name_hits = sum(1 for t in tokens if t.lower() in name_l)
    return (mgr_hits / len(tokens)) * 2.0 + (name_hits / len(tokens)) * 1.0


@router.get("/external/preqin/search")
def search_preqin(q: str = Query("", min_length=0), firm_id: Optional[str] = Query(None)):
    """
    Token-based AND search: all words in q must appear (in any order) in fund
    name or manager name. Results include a `relevance` score so the frontend
    can order series groups: best-matching manager first, then same-manager
    funds, then different managers.
    Optional firm_id: limits results to that manager's firm.
    """
    conn = _pq_connect()
    if conn is None:
        return []
    tokens = [t for t in q.strip().split() if len(t) >= 2]
    if not tokens:
        return []
    # Each token must match NAME or FUND MANAGER (AND between tokens)
    clauses = " AND ".join(
        ['(lower("NAME") LIKE lower(?) OR lower("FUND MANAGER") LIKE lower(?))'
         for _ in tokens]
    )
    params = [p for t in tokens for p in (f"%{t}%", f"%{t}%")]
    where = clauses
    if firm_id:
        where += ' AND "FIRM ID" = ?'
        params.append(firm_id)
    try:
        rows = conn.execute(
            f'{_PQ_SELECT} WHERE {where} ORDER BY "NAME" LIMIT 60',
            params,
        ).fetchall()
        results = []
        for r in rows:
            d = _pq_row(r)
            d["relevance"] = _search_relevance(tokens, d["name"], d["manager"])
            results.append(d)
        return results
    finally:
        conn.close()


@router.get("/external/preqin/series/{series_id}")
def get_preqin_series(series_id: str):
    """Return all funds belonging to a Preqin fund series."""
    conn = _pq_connect()
    if conn is None:
        return []
    try:
        rows = conn.execute(
            f'{_PQ_SELECT} WHERE "FUND SERIES ID" = ? ORDER BY "VINTAGE / INCEPTION YEAR", "NAME"',
            (series_id,),
        ).fetchall()
        return [_pq_row(r) for r in rows]
    finally:
        conn.close()


@router.get("/external/preqin/managers")
def search_preqin_managers(q: str = Query("", min_length=0)):
    """Search Preqin manager names. Returns distinct firm_id + manager_name pairs."""
    conn = _pq_connect()
    if conn is None:
        return []
    q = q.strip()
    if len(q) < 2:
        return []
    try:
        rows = conn.execute(
            'SELECT DISTINCT "FIRM ID" as firm_id, "FUND MANAGER" as manager_name '
            'FROM Preqin_Export '
            'WHERE lower("FUND MANAGER") LIKE lower(?) '
            'ORDER BY "FUND MANAGER" LIMIT 20',
            (f"%{q}%",),
        ).fetchall()
        return [{"firm_id": r["firm_id"], "manager_name": r["manager_name"]} for r in rows]
    finally:
        conn.close()


# ── Preqin Link Suggestions ────────────────────────────────────────────────────

# ── Name tokenisation ─────────────────────────────────────────────────────────

# Stop-words stripped before name comparison (strategy words kept — they help
# detect mismatches, e.g. "Credit" vs "Buyout")
_STOP = {
    'fund', 'lp', 'llp', 'gp', 'inc', 'ltd', 'co', 'the', 'and', 'of', 'for',
    'capital', 'partners', 'management', 'investments', 'group', 'advisors',
    'asset', 'global', 'private', 'opportunities', 'opportunity',
    'associates', 'holdings', 'international', 'strategies', 'solutions',
}

# Roman numerals → integers so "IV" == "4"
_ROMAN = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7,
    'viii': 8, 'ix': 9, 'x': 10, 'xi': 11, 'xii': 12, 'xiii': 13,
    'xiv': 14, 'xv': 15,
}


def _tokens(name: str) -> list:
    name = name.lower()
    name = re.sub(r'[^a-z0-9\s]', ' ', name)
    tokens = name.split()
    tokens = [str(_ROMAN.get(t, t)) for t in tokens]
    return [t for t in tokens if t not in _STOP and len(t) > 1]


def _jaccard(a: str, b: str) -> float:
    ta = set(_tokens(a))
    tb = set(_tokens(b))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


# ── Vintage scoring ────────────────────────────────────────────────────────────
# Returns additive modifier, or None to signal "disqualify this candidate".

_VINTAGE_MODIFIERS = {0: 0.20, 1: 0.10, 2: 0.0, 3: -0.12, 4: -0.22}
_MAX_VINTAGE_GAP = 4   # gaps larger than this → disqualify


def _vintage_modifier(our, preqin_val):  # returns float or None (disqualify)
    if not our or not preqin_val:
        return 0.0     # one side missing → neutral, don't disqualify
    try:
        diff = abs(int(our) - int(preqin_val))
        if diff > _MAX_VINTAGE_GAP:
            return None   # disqualify
        return _VINTAGE_MODIFIERS.get(diff, -0.22)
    except (ValueError, TypeError):
        return 0.0


# ── Strategy compatibility ─────────────────────────────────────────────────────
# Groups of keywords; a fund belongs to the first group that matches.

_STRAT_GROUPS = [
    ("credit",     {'credit', 'debt', 'distressed', 'mezzanine', 'direct lending',
                    'lending', 'special situations', 'fixed income', 'loan'}),
    ("buyout",     {'buyout', 'buy-out', 'private equity', 'growth equity', 'growth'}),
    ("venture",    {'venture', ' vc ', 'early stage', 'late stage', 'seed'}),
    ("infra",      {'infrastructure', 'infra', 'transport', 'utility', 'utilities'}),
    ("real_estate",{'real estate', 'realty', 'property', 'real assets'}),
    ("nat_res",    {'natural resources', 'energy', 'oil', 'gas', 'commodities',
                    'agriculture', 'timberland', 'mining'}),
    ("secondaries",{'secondaries', 'secondary', 'fund of funds'}),
]


def _strat_group(label):  # returns str or None
    if not label:
        return None
    low = label.lower()
    for group_name, kws in _STRAT_GROUPS:
        if any(k in low for k in kws):
            return group_name
    return None


def _manager_similarity(our_org_name, preqin_manager):
    """
    Similarity between our fund manager and a Preqin fund manager (0.0–1.0).
    Returns None if either side is unknown (no penalty applied).

    Includes abbreviation awareness:
      "General Atlantic" vs "GA Growth Partners" → sim 0.65 (abbreviation "ga" found)
      "Apollo Global Management" vs "10 Point Capital" → sim 0.0 (no overlap)
    """
    if not our_org_name or not preqin_manager:
        return None

    our_toks = set(_tokens(our_org_name))
    pq_toks  = set(_tokens(preqin_manager))

    # Direct Jaccard on meaningful (non-stop) tokens
    if our_toks and pq_toks:
        sim = len(our_toks & pq_toks) / len(our_toks | pq_toks)
    elif not our_toks and not pq_toks:
        return None  # both names are entirely stop-words — can't tell
    else:
        sim = 0.0

    # Abbreviation check: first letter of each alphabetic word > 1 char
    def _abbrev(name):
        words = re.sub(r'[^a-zA-Z0-9\s]', ' ', name).split()
        letters = [w[0].lower() for w in words if len(w) > 1 and not w.isdigit()]
        result = "".join(letters)
        return result if len(result) >= 2 else ""

    our_abbrev = _abbrev(our_org_name)
    pq_abbrev  = _abbrev(preqin_manager)
    # Use raw (unstopped) token sets for abbreviation lookup
    pq_raw  = set(re.sub(r'[^a-z0-9\s]', ' ', preqin_manager.lower()).split())
    our_raw = set(re.sub(r'[^a-z0-9\s]', ' ', our_org_name.lower()).split())

    if our_abbrev and our_abbrev in pq_raw:
        sim = max(sim, 0.65)   # e.g. "General Atlantic" → "ga" found in "GA Growth"
    if pq_abbrev and pq_abbrev in our_raw:
        sim = max(sim, 0.65)   # reverse abbreviation

    return sim


def _strategy_modifier(our_name: str, pq_strategy: str, pq_asset_class: str) -> float:
    """
    Uses the *fund name* as a proxy for our strategy (we don't have the FK in the
    matching loop without extra queries).  Compares against Preqin STRATEGY +
    ASSET CLASS.  Returns additive modifier in range [-0.40, +0.12].
    """
    pq_label = f"{pq_strategy or ''} {pq_asset_class or ''}"
    our_group = _strat_group(our_name)
    pq_group  = _strat_group(pq_label)

    if our_group is None or pq_group is None:
        return 0.0   # can't tell → neutral
    if our_group == pq_group:
        return 0.12  # confirmed match
    return -0.40     # confirmed mismatch → heavy penalty


# ── Preqin row helpers ─────────────────────────────────────────────────────────

def _preqin_mini(row) -> dict:
    return {
        "fund_id":        row["FUND ID"],
        "firm_id":        row["FIRM ID"],
        "series_id":      row["FUND SERIES ID"],
        "name":           (row["NAME"] or "").strip(),
        "manager":        row["FUND MANAGER"],
        "strategy":       row["STRATEGY"],
        "asset_class":    row["ASSET CLASS"],
        "vintage":        row["VINTAGE / INCEPTION YEAR"],
        "status":         row["STATUS"],
        "final_size_usd": row["FINAL CLOSE SIZE (USD MN)"],
    }


_PQ_COLS = """
    "FUND ID","FIRM ID","FUND SERIES ID","NAME","FUND MANAGER",
    "STRATEGY","ASSET CLASS","VINTAGE / INCEPTION YEAR","STATUS","FINAL CLOSE SIZE (USD MN)"
"""


@router.get("/external/preqin/link-suggestions")
def preqin_link_suggestions(db: Session = Depends(get_db)):
    """
    Auto-generate fund→Preqin link candidates for unlinked funds.

    Three strategies (best score wins per fund):
      1. Series chain  — fund shares internal series label with an already-linked
                         fund; look for remaining funds in that Preqin series.
      2. Manager scope — GP has preqin_manager_id; restrict to that firm then
                         pick best name match.
      3. Name only     — Jaccard similarity on normalised tokens.
    """
    from models import FundV2, Organization

    preqin_path = os.path.join(os.path.dirname(__file__), "external", "preqin_funds.db")
    if not os.path.exists(preqin_path):
        return []

    all_funds = db.query(FundV2).filter(FundV2.deleted_at == None).all()  # noqa: E711

    # Ignored pairs: only suppress if ignored within the last 90 days
    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    ignored = {
        (r.fund_id, r.preqin_fund_id)
        for r in db.query(PreqinLinkIgnore).all()
        if r.ignored_at and r.ignored_at > cutoff
    }
    linked_preqin_ids = {f.preqin_fund_id for f in all_funds if f.preqin_fund_id}
    unlinked = [f for f in all_funds if not f.preqin_fund_id]
    if not unlinked:
        return []

    org_ids = {f.org_id for f in unlinked}
    orgs = {o.id: o for o in db.query(Organization).filter(Organization.id.in_(org_ids)).all()}

    # Map internal series label → set of Preqin series IDs.
    # Includes funds that have preqin_series_id set manually (even without a linked fund).
    series_to_pq_series: dict = {}
    for f in all_funds:
        if f.preqin_series_id and f.series:
            series_to_pq_series.setdefault(f.series, set()).add(f.preqin_series_id)

    conn = sqlite3.connect(preqin_path)
    conn.row_factory = sqlite3.Row

    try:
        suggestions = []

        for fund in unlinked:
            org = orgs.get(fund.org_id)
            best_score, best_match, best_reason = 0.0, None, ""

            def _score_row(row, base, sim_weight, check_manager=True):
                """
                Compute final score for a single Preqin row.
                Returns None if the candidate should be disqualified.

                check_manager=False for strategy-1 (series chain) because the
                series linkage already provides strong manager evidence.
                """
                sim = _jaccard(fund.name or "", row["NAME"] or "")
                raw = base + sim * sim_weight

                vm = _vintage_modifier(fund.vintage, row["VINTAGE / INCEPTION YEAR"])
                if vm is None:
                    return None   # vintage gap too large → disqualify

                sm = _strategy_modifier(
                    fund.name or "",
                    row["STRATEGY"],
                    row["ASSET CLASS"],
                )

                # Manager similarity gate — disqualify if managers are clearly different
                if check_manager and org:
                    mgr_sim = _manager_similarity(org.name, row["FUND MANAGER"])
                    if mgr_sim is not None:
                        if mgr_sim < 0.20:
                            # Clearly different manager: only keep if name match is
                            # near-identical (very rare case, e.g. rebranded firms)
                            if sim < 0.75:
                                return None
                        elif mgr_sim >= 0.60:
                            raw += 0.08   # confirmed manager → small bonus

                return min(1.0, max(0.0, raw + vm + sm))

            # ── 1: Series chain ────────────────────────────────────────────────
            if fund.series and fund.series in series_to_pq_series:
                for pq_series_id in series_to_pq_series[fund.series]:
                    rows = conn.execute(
                        f'SELECT {_PQ_COLS} FROM Preqin_Export WHERE "FUND SERIES ID" = ?'
                        ' ORDER BY "VINTAGE / INCEPTION YEAR"',
                        (pq_series_id,),
                    ).fetchall()
                    for row in rows:
                        pid = row["FUND ID"]
                        if pid in linked_preqin_ids or (fund.id, pid) in ignored:
                            continue
                        score = _score_row(row, base=0.55, sim_weight=0.45, check_manager=False)
                        if score is not None and score > best_score:
                            best_score = score
                            best_match = _preqin_mini(row)
                            sibling = next(
                                (f.name for f in all_funds
                                 if f.series == fund.series and f.preqin_series_id == pq_series_id),
                                None,
                            )
                            best_reason = (
                                f"Same series as \"{sibling}\"" if sibling
                                else "Matched by fund series"
                            )

            # ── 2: Manager-scoped name match ───────────────────────────────────
            if org and org.preqin_manager_id:
                rows = conn.execute(
                    f'SELECT {_PQ_COLS} FROM Preqin_Export WHERE "FIRM ID" = ?',
                    (org.preqin_manager_id,),
                ).fetchall()
                for row in rows:
                    pid = row["FUND ID"]
                    if pid in linked_preqin_ids or (fund.id, pid) in ignored:
                        continue
                    score = _score_row(row, base=0.30, sim_weight=0.70)
                    if score is not None and score > best_score:
                        best_score = score
                        best_match = _preqin_mini(row)
                        best_reason = "Same manager (Preqin firm match)"

            # ── 3: Name-only fallback ──────────────────────────────────────────
            # Use AND logic (all tokens must appear) so that e.g. "KKR Infrastructure V"
            # targets "KKR Global Infrastructure Investors V" rather than being lost
            # among 80+ single-token OR matches that hit the LIMIT first.
            # If AND returns nothing, retry with the single most-specific token (OR).
            if best_score < 0.45:
                toks = _tokens(fund.name or "")[:3]
                if toks:
                    and_clauses = " AND ".join(['lower("NAME") LIKE ?' for _ in toks])
                    and_params  = [f"%{t}%" for t in toks]
                    rows = conn.execute(
                        f'SELECT {_PQ_COLS} FROM Preqin_Export WHERE {and_clauses} LIMIT 80',
                        and_params,
                    ).fetchall()
                    # Fallback: if AND found nothing, try the longest (rarest) token alone
                    if not rows:
                        rarest = max(toks, key=len)
                        rows = conn.execute(
                            f'SELECT {_PQ_COLS} FROM Preqin_Export WHERE lower("NAME") LIKE ? LIMIT 80',
                            (f"%{rarest}%",),
                        ).fetchall()
                    for row in rows:
                        pid = row["FUND ID"]
                        if pid in linked_preqin_ids or (fund.id, pid) in ignored:
                            continue
                        score = _score_row(row, base=0.0, sim_weight=1.0)
                        if score is not None and score > best_score:
                            best_score = score
                            best_match = _preqin_mini(row)
                            best_reason = "Name similarity"

            if best_match and best_score >= 0.45:
                suggestions.append({
                    "fund_id":          fund.id,
                    "fund_name":        fund.name,
                    "fund_series":      fund.series,
                    "fund_vintage":     fund.vintage,
                    "preqin_series_id": fund.preqin_series_id,  # show if already assigned
                    "org_name":         org.name if org else None,
                    "score":            round(best_score, 3),
                    "reason":           best_reason,
                    "preqin":           best_match,
                })

        suggestions.sort(key=lambda x: x["score"], reverse=True)
        return suggestions

    finally:
        conn.close()


@router.post("/external/preqin/link-suggestions/ignore")
def ignore_preqin_link_suggestion(body: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Mark a fund→Preqin pair as ignored.
    Body: { "fund_id": "...", "preqin_fund_id": "..." }
    Pairs ignored >90 days ago are automatically re-surfaced in suggestions.
    """
    fund_id = body.get("fund_id")
    preqin_fund_id = body.get("preqin_fund_id")
    if not fund_id or not preqin_fund_id:
        raise HTTPException(status_code=400, detail="fund_id and preqin_fund_id required")
    existing = (
        db.query(PreqinLinkIgnore)
        .filter_by(fund_id=fund_id, preqin_fund_id=preqin_fund_id)
        .first()
    )
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        existing.ignored_at = now  # refresh timestamp so 90-day clock resets
    else:
        db.add(PreqinLinkIgnore(
            fund_id=fund_id,
            preqin_fund_id=preqin_fund_id,
            ignored_at=now,
        ))
    db.commit()
    return {"ok": True}


@router.get("/external/preqin/link-suggestions/ignored")
def get_ignored_link_suggestions(db: Session = Depends(get_db)):
    """Return all ignored fund→Preqin pairs with fund and Preqin names."""
    from models import FundV2
    rows = db.query(PreqinLinkIgnore).order_by(PreqinLinkIgnore.ignored_at.desc()).all()
    if not rows:
        return []

    fund_map = {
        f.id: f
        for f in db.query(FundV2).filter(
            FundV2.id.in_({r.fund_id for r in rows})
        ).all()
    }

    # Look up Preqin names from external DB
    pq_names = {}
    preqin_path = os.path.join(os.path.dirname(__file__), "external", "preqin_funds.db")
    if os.path.exists(preqin_path):
        pq_conn = sqlite3.connect(preqin_path)
        pq_conn.row_factory = sqlite3.Row
        pq_ids = [r.preqin_fund_id for r in rows]
        placeholders = ",".join("?" * len(pq_ids))
        for pq_row in pq_conn.execute(
            f'SELECT "FUND ID", "NAME" FROM Preqin_Export WHERE "FUND ID" IN ({placeholders})',
            pq_ids,
        ).fetchall():
            pq_names[str(pq_row["FUND ID"])] = pq_row["NAME"]
        pq_conn.close()

    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    return [
        {
            "id":             r.id,
            "fund_id":        r.fund_id,
            "fund_name":      fund_map[r.fund_id].name if r.fund_id in fund_map else f"Fund {r.fund_id}",
            "preqin_fund_id": r.preqin_fund_id,
            "preqin_name":    pq_names.get(str(r.preqin_fund_id), f"#{r.preqin_fund_id}"),
            "ignored_at":     r.ignored_at,
            "stale":          bool(r.ignored_at and r.ignored_at < cutoff),
        }
        for r in rows
        if r.fund_id in fund_map
    ]


@router.delete("/external/preqin/link-suggestions/ignore")
def unignore_preqin_link_suggestion(
    fund_id: str = Query(...),
    preqin_fund_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Remove an ignore record so the pair resurfaces in suggestions."""
    db.query(PreqinLinkIgnore).filter_by(
        fund_id=fund_id, preqin_fund_id=preqin_fund_id
    ).delete()
    db.commit()
    return {"ok": True}
