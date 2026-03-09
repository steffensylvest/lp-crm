"""
preqin_sync.py — Sync data from external/preqin.db into field_provenance.

Matches Preqin rows to our entities via:
  - fund.preqin_fund_id   ← "FUND ID"
  - fund.preqin_series_id ← "FUND SERIES ID"
  - org.preqin_manager_id ← "FIRM ID"

Only creates / updates rows with status='pending'.
Never touches 'accepted' or 'rejected' rows — those are user decisions.

Safe to call multiple times — fully idempotent.
Works silently if external/preqin.db is missing (returns error message, no crash).
"""

import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from models import (
    AuditLog, EntityAttribute, ExternalColumnMap, ExternalSource,
    FieldProvenance, FundV2, Organization,
)

PREQIN_SOURCE_ID      = "es_preqin"
PREQIN_DATA_SOURCE_ID = "ds_preqin"
MATCH_FIELDS          = {"preqin_fund_id", "preqin_series_id", "preqin_manager_id"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid() -> str:
    return str(uuid.uuid4())


# ── Value transforms ──────────────────────────────────────────────────────────

def _transform(raw, transform: Optional[str]) -> Optional[str]:
    """Convert a raw Preqin cell value to a normalised string for storage."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None

    if transform == "to_int":
        try:
            return str(int(float(s)))
        except (ValueError, TypeError):
            return None

    if transform == "to_date":
        for fmt in ("%d %b %Y", "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%b %Y"):
            try:
                return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return s  # pass through as-is if format unrecognised

    return s  # "to_str" and default


# ── Main sync function ────────────────────────────────────────────────────────

def sync_preqin(db: Session) -> Dict:
    """
    Full sync: Preqin_Export → field_provenance.
    Returns a summary dict. Never raises — errors are captured in the return value.
    """
    # ── Validate setup ────────────────────────────────────────────────────────
    ext = db.query(ExternalSource).filter(ExternalSource.id == PREQIN_SOURCE_ID).first()
    if not ext:
        return {
            "ok": False,
            "error": "Preqin external_source not found. Run seed_v2.py first.",
        }

    db_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), ext.file_path
    )
    if not os.path.exists(db_path):
        return {
            "ok": False,
            "error": f"Preqin DB not found at '{ext.file_path}'. "
                     "Place the file there and retry. App works normally without it.",
        }

    column_maps = (
        db.query(ExternalColumnMap)
        .filter(
            ExternalColumnMap.source_id == PREQIN_SOURCE_ID,
            ExternalColumnMap.is_active == True,  # noqa: E712
        )
        .all()
    )
    if not column_maps:
        return {"ok": False, "error": "No active column maps found. Run seed_v2.py first."}

    # Build: external_column → [(entity_type, field_name, transform), ...]
    col_map: Dict[str, list] = {}
    for cm in column_maps:
        col_map.setdefault(cm.external_column, []).append(
            (cm.our_entity_type, cm.our_field_name, cm.transform)
        )

    # ── Index our entities by Preqin ID ───────────────────────────────────────
    funds_by_fund_id: Dict[str, FundV2]   = {}
    funds_by_series_id: Dict[str, FundV2] = {}
    for fund in db.query(FundV2).filter(FundV2.deleted_at == None).all():  # noqa: E711
        if fund.preqin_fund_id:
            funds_by_fund_id[str(fund.preqin_fund_id).strip()] = fund
        if fund.preqin_series_id:
            funds_by_series_id[str(fund.preqin_series_id).strip()] = fund

    orgs_by_manager_id: Dict[str, Organization] = {}
    for org in db.query(Organization).filter(Organization.deleted_at == None).all():  # noqa: E711
        if org.preqin_manager_id:
            orgs_by_manager_id[str(org.preqin_manager_id).strip()] = org

    # ── Read Preqin DB ────────────────────────────────────────────────────────
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM Preqin_Export")
        rows = cur.fetchall()
        conn.close()
    except Exception as exc:
        return {"ok": False, "error": f"Failed to read Preqin DB: {exc}"}

    counters = {
        "rows_read":           len(rows),
        "rows_matched_fund":   0,
        "rows_matched_org":    0,
        "rows_unmatched":      0,
        "provenance_created":  0,
        "provenance_updated":  0,
        "provenance_skipped":  0,
        "warnings":            [],
    }

    # ── Pre-load existing pending provenance rows into memory for fast lookup
    # Key: (entity_type, entity_id, field_name, source_id)
    existing_prov: Dict[tuple, FieldProvenance] = {}
    for fp in (
        db.query(FieldProvenance)
        .filter(FieldProvenance.source_id == PREQIN_DATA_SOURCE_ID)
        .all()
    ):
        key = (fp.entity_type, fp.entity_id, fp.field_name, fp.source_id)
        existing_prov[key] = fp

    now = _now()

    # ── Process each Preqin row ────────────────────────────────────────────────
    for row in rows:
        row_dict = dict(row)

        raw_fund_id   = str(row_dict.get("FUND ID",        "") or "").strip()
        raw_series_id = str(row_dict.get("FUND SERIES ID", "") or "").strip()
        raw_firm_id   = str(row_dict.get("FIRM ID",        "") or "").strip()

        matched_fund = (
            funds_by_fund_id.get(raw_fund_id) or
            funds_by_series_id.get(raw_series_id)
        )
        matched_org = orgs_by_manager_id.get(raw_firm_id)

        if not matched_fund and not matched_org:
            counters["rows_unmatched"] += 1
            continue

        if matched_fund:
            counters["rows_matched_fund"] += 1
        if matched_org:
            counters["rows_matched_org"] += 1

        # ── For each mapped column, upsert field_provenance ──────────────────
        for ext_col, mappings in col_map.items():
            raw_value = row_dict.get(ext_col)

            for entity_type, field_name, transform in mappings:
                if field_name in MATCH_FIELDS:
                    continue  # matching fields are not suggestions

                if entity_type == "fund":
                    entity = matched_fund
                elif entity_type == "organization":
                    entity = matched_org
                else:
                    continue

                if not entity:
                    continue

                transformed = _transform(raw_value, transform)
                if transformed is None:
                    continue

                key = (entity_type, entity.id, field_name, PREQIN_DATA_SOURCE_ID)
                fp = existing_prov.get(key)

                if fp:
                    if fp.status in ("accepted", "rejected"):
                        counters["provenance_skipped"] += 1
                        continue
                    if fp.value == transformed:
                        counters["provenance_skipped"] += 1
                        continue
                    # Pending row exists but value changed — update it
                    fp.value = transformed
                    fp.proposed_at = now
                    counters["provenance_updated"] += 1
                else:
                    # New suggestion
                    fp = FieldProvenance(
                        id=_uid(),
                        entity_type=entity_type,
                        entity_id=entity.id,
                        field_name=field_name,
                        value=transformed,
                        source_id=PREQIN_DATA_SOURCE_ID,
                        status="pending",
                        original_external_value=transformed,
                        proposed_at=now,
                    )
                    db.add(fp)
                    existing_prov[key] = fp   # prevent double-insert within batch
                    counters["provenance_created"] += 1

    # ── Finalise ──────────────────────────────────────────────────────────────
    ext.last_synced = now
    db.commit()

    return {
        "ok":        True,
        "synced_at": now,
        **counters,
    }


# ── Pending provenance query ──────────────────────────────────────────────────

def get_pending_provenance(db: Session) -> List[Dict]:
    """All pending field_provenance rows, ordered by entity then field."""
    rows = (
        db.query(FieldProvenance)
        .filter(FieldProvenance.status == "pending")
        .order_by(
            FieldProvenance.entity_type,
            FieldProvenance.entity_id,
            FieldProvenance.field_name,
        )
        .all()
    )
    return [_s_fp(r) for r in rows]


def accept_provenance(
    db: Session,
    provenance_id: str,
    accepted_by: Optional[str] = None,
) -> Optional[Dict]:
    """
    Accept a pending suggestion:
      1. Write the value onto the entity (fund or org column).
      2. Write an audit_log entry (source = Preqin).
      3. Mark field_provenance as accepted.
    For EAV fields (field_name starts with 'entity_attribute:') the value is
    written to entity_attribute instead of a direct column.
    """
    fp = db.query(FieldProvenance).filter(FieldProvenance.id == provenance_id).first()
    if not fp or fp.status != "pending":
        return None

    now = _now()

    if fp.field_name.startswith("entity_attribute:"):
        # Write to entity_attribute table
        attr_key = fp.field_name.split(":", 1)[1]
        ea = (
            db.query(EntityAttribute)
            .filter(
                EntityAttribute.entity_type == fp.entity_type,
                EntityAttribute.entity_id == fp.entity_id,
                EntityAttribute.key == attr_key,
            )
            .first()
        )
        if ea:
            ea.value = fp.value
            ea.updated_at = now
            ea.accepted_at = now
            ea.accepted_by = accepted_by
            ea.source_id = PREQIN_DATA_SOURCE_ID
            ea.status = "accepted"
        else:
            db.add(EntityAttribute(
                id=_uid(),
                entity_type=fp.entity_type,
                entity_id=fp.entity_id,
                key=attr_key,
                value=fp.value,
                data_type="text",
                source_id=PREQIN_DATA_SOURCE_ID,
                status="accepted",
                created_at=now,
                updated_at=now,
                accepted_at=now,
                accepted_by=accepted_by,
            ))
    else:
        # Write directly to the entity column
        old_value = None
        if fp.entity_type == "fund":
            entity = db.query(FundV2).filter(FundV2.id == fp.entity_id).first()
        else:
            entity = db.query(Organization).filter(Organization.id == fp.entity_id).first()

        if entity and hasattr(entity, fp.field_name):
            old_value = getattr(entity, fp.field_name)
            setattr(entity, fp.field_name, fp.value)

        # Audit log entry
        if entity:
            db.add(AuditLog(
                id=_uid(),
                entity_type=fp.entity_type,
                entity_id=fp.entity_id,
                entity_name=getattr(entity, "name", None),
                field_name=fp.field_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=fp.value,
                note="Accepted from Preqin",
                changed_at=now,
                changed_by=accepted_by,
                source_id=PREQIN_DATA_SOURCE_ID,
            ))

    # Mark provenance as accepted
    fp.status = "accepted"
    fp.accepted_at = now
    fp.accepted_by = accepted_by
    db.commit()
    db.refresh(fp)
    return _s_fp(fp)


def reject_provenance(
    db: Session,
    provenance_id: str,
    rejected_by: Optional[str] = None,
) -> Optional[Dict]:
    """Reject a pending suggestion — marks it rejected, leaves entity unchanged."""
    fp = db.query(FieldProvenance).filter(FieldProvenance.id == provenance_id).first()
    if not fp or fp.status != "pending":
        return None
    fp.status = "rejected"
    fp.rejected_at = _now()
    fp.rejected_by = rejected_by
    db.commit()
    db.refresh(fp)
    return _s_fp(fp)


def get_external_sources(db: Session) -> List[Dict]:
    sources = db.query(ExternalSource).all()
    return [
        {
            "id":          s.id,
            "name":        s.name,
            "file_path":   s.file_path,
            "description": s.description,
            "last_synced": s.last_synced,
        }
        for s in sources
    ]


def _s_fp(fp: FieldProvenance) -> Dict:
    return {
        "id":                      fp.id,
        "entity_type":             fp.entity_type,
        "entity_id":               fp.entity_id,
        "field_name":              fp.field_name,
        "value":                   fp.value,
        "source_id":               fp.source_id,
        "status":                  fp.status,
        "original_external_value": fp.original_external_value,
        "proposed_at":             fp.proposed_at,
        "accepted_at":             fp.accepted_at,
        "accepted_by":             fp.accepted_by,
        "rejected_at":             fp.rejected_at,
        "rejected_by":             fp.rejected_by,
    }
