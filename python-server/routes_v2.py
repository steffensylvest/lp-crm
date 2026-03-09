"""
routes_v2.py — /api/v2/* endpoints.
"""

import os
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import crud as crud_v2
import preqin_sync
from database import get_db

router = APIRouter(prefix="/api/v2", tags=["v2"])


# ── Organizations ─────────────────────────────────────────────────────────────

@router.get("/organizations")
def list_organizations(
    org_type: Optional[str] = Query(None),
    rating_id: Optional[str] = Query(None),
    owner: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: Session = Depends(get_db),
):
    return crud_v2.get_organizations(
        db, org_type=org_type, rating_id=rating_id,
        owner=owner, include_deleted=include_deleted,
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
    db: Session = Depends(get_db),
):
    return crud_v2.get_people(db, org_id=org_id, include_deleted=include_deleted)


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
    """
    Trigger a Preqin sync. Reads external/preqin.db and upserts field_provenance rows.
    Returns a summary of what was created/updated/skipped.
    If external/preqin.db is missing, returns an error message — no crash.
    """
    result = preqin_sync.sync_preqin(db)
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


@router.get("/external/preqin/search")
def search_preqin(q: str = Query("", min_length=0)):
    """
    Search Preqin_Export by fund name or manager name.
    Returns up to 20 matches with key fields.
    """
    db_path = os.path.join(os.path.dirname(__file__), "external", "preqin.db")
    if not os.path.exists(db_path):
        return []
    if not q or len(q.strip()) < 2:
        return []
    term = f"%{q.strip()}%"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT "FUND ID", "FIRM ID", "FUND SERIES ID", "NAME", "FUND MANAGER",
                   "STRATEGY", "ASSET CLASS", "STATUS", "VINTAGE / INCEPTION YEAR",
                   "FUND CURRENCY", "FINAL CLOSE SIZE (USD MN)", "TARGET SIZE (USD MN)",
                   "GEOGRAPHIC FOCUS"
            FROM Preqin_Export
            WHERE lower("NAME") LIKE lower(?) OR lower("FUND MANAGER") LIKE lower(?)
            ORDER BY "NAME"
            LIMIT 20
            """,
            (term, term),
        ).fetchall()
        return [
            {
                "fund_id":        row["FUND ID"],
                "firm_id":        row["FIRM ID"],
                "series_id":      row["FUND SERIES ID"],
                "name":           (row["NAME"] or "").strip(),
                "manager":        row["FUND MANAGER"],
                "strategy":       row["STRATEGY"],
                "asset_class":    row["ASSET CLASS"],
                "status":         row["STATUS"],
                "vintage":        row["VINTAGE / INCEPTION YEAR"],
                "currency":       row["FUND CURRENCY"],
                "final_size_usd": row["FINAL CLOSE SIZE (USD MN)"],
                "target_size_usd":row["TARGET SIZE (USD MN)"],
                "geo_focus":      row["GEOGRAPHIC FOCUS"],
            }
            for row in rows
        ]
    finally:
        conn.close()
