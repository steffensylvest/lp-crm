"""
crud.py — Database operations

Public API:
    get_all_data(db)            → full dataset dict (same shape as old data.json)
    upsert_all_data(db, data)   → full replace of main tables + change detection
    get_fund_performance_history(db, fund_id)  → list[dict]
    get_fund_raised_history(db, fund_id)       → list[dict]
    get_fund_change_history(db, fund_id)       → list[dict] (fund + pipeline changes)
    get_gp_change_history(db, gp_id)           → list[dict]
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import (
    ChangeLog, Fund, FundPerformanceSnapshot, FundRaisedSnapshot,
    FundSector, GP, Meeting, PipelineItem, Todo,
)

# ── Change-detection config ───────────────────────────────────────────────────
# Tuples of (json_camelCase_key, orm_snake_case_attr)

FUND_SCALAR_FIELDS = [
    ("score",  "score"),
    ("status", "status"),
]

FUND_PERF_FIELDS = [
    ("netIrr",       "net_irr"),
    ("netMoic",      "net_moic"),
    ("grossIrr",     "gross_irr"),
    ("grossMoic",    "gross_moic"),
    ("dpi",          "dpi"),
    ("tvpi",         "tvpi"),
    ("rvpi",         "rvpi"),
    ("nav",          "nav"),
    ("undrawnValue", "undrawn_value"),
]

GP_SCALAR_FIELDS = [
    ("score", "score"),
    ("owner", "owner"),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _uid():
    return uuid.uuid4().hex[:8]

def _now():
    return datetime.now(timezone.utc).isoformat()

def _norm(v):
    """Normalise empty string / whitespace to None for consistent comparison."""
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


# ── Serialisers ───────────────────────────────────────────────────────────────

def _fund_to_dict(fund):
    return {
        "id":                 fund.id,
        "name":               fund.name,
        "series":             fund.series,
        "strategy":           fund.strategy,
        "subStrategy":        fund.sub_strategy,
        "sectors":            [s.sector for s in fund.sectors],
        "vintage":            fund.vintage,
        "currency":           fund.currency,
        "status":             fund.status,
        "score":              fund.score,
        "notes":              fund.notes,
        "targetSize":         fund.target_size,
        "raisedSize":         fund.raised_size,
        "finalSize":          fund.final_size,
        "hardCap":            fund.hard_cap,
        "invested":           fund.invested,
        "investmentAmount":   fund.investment_amount,
        "investmentCurrency": fund.investment_currency,
        "launchDate":         fund.launch_date,
        "firstCloseDate":     fund.first_close_date,
        "nextCloseDate":      fund.next_close_date,
        "finalCloseDate":     fund.final_close_date,
        "netIrr":             fund.net_irr,
        "netMoic":            fund.net_moic,
        "grossIrr":           fund.gross_irr,
        "grossMoic":          fund.gross_moic,
        "dpi":                fund.dpi,
        "tvpi":               fund.tvpi,
        "rvpi":               fund.rvpi,
        "nav":                fund.nav,
        "undrawnValue":       fund.undrawn_value,
        "perfDate":           fund.perf_date,
    }


def _meeting_to_dict(meeting):
    return {
        "id":       meeting.id,
        "date":     meeting.date,
        "type":     meeting.type,
        "location": meeting.location,
        "topic":    meeting.topic,
        "notes":    meeting.notes,
        "fundId":   meeting.fund_id,
        "loggedBy": meeting.logged_by,
        "loggedAt": meeting.logged_at,
    }


def _pipeline_to_dict(p):
    return {
        "id":            p.id,
        "gpName":        p.gp_name,
        "stage":         p.stage,
        "addedAt":       p.added_at,
        "pipelineNotes": p.pipeline_notes,
        "fundId":        p.fund_id,
    }


def _todo_to_dict(t):
    return {
        "id":        t.id,
        "text":      t.text,
        "done":      t.done,
        "createdAt": t.created_at,
    }


def _perf_snapshot_to_dict(s):
    return {
        "id":           s.id,
        "fundId":       s.fund_id,
        "perfDate":     s.perf_date,
        "netIrr":       s.net_irr,
        "netMoic":      s.net_moic,
        "grossIrr":     s.gross_irr,
        "grossMoic":    s.gross_moic,
        "dpi":          s.dpi,
        "tvpi":         s.tvpi,
        "rvpi":         s.rvpi,
        "nav":          s.nav,
        "undrawnValue": s.undrawn_value,
        "recordedAt":   s.recorded_at,
    }


def _raised_snapshot_to_dict(s):
    return {
        "id":         s.id,
        "fundId":     s.fund_id,
        "raisedSize": s.raised_size,
        "recordedAt": s.recorded_at,
    }


def _change_to_dict(c):
    return {
        "id":            c.id,
        "entityType":    c.entity_type,
        "entityId":      c.entity_id,
        "entityName":    c.entity_name,
        "fieldName":     c.field_name,
        "oldValue":      c.old_value,
        "newValue":      c.new_value,
        "changedAt":     c.changed_at,
        "changedBy":     c.changed_by,
        "relatedFundId": c.related_fund_id,
    }


# ── Bulk read ─────────────────────────────────────────────────────────────────

def get_all_data(db):
    gps      = db.query(GP).all()
    pipeline = db.query(PipelineItem).all()
    todos    = db.query(Todo).all()

    return {
        "gps": [
            {
                "id":           gp.id,
                "name":         gp.name,
                "hq":           gp.hq,
                "score":        gp.score,
                "owner":        gp.owner,
                "contact":      gp.contact,
                "contactEmail": gp.contact_email,
                "notes":        gp.notes,
                "funds":        [_fund_to_dict(f)    for f in gp.funds],
                "meetings":     [_meeting_to_dict(m) for m in gp.meetings],
            }
            for gp in gps
        ],
        "pipeline": [_pipeline_to_dict(p) for p in pipeline],
        "todos":    [_todo_to_dict(t)     for t in todos],
    }


# ── History queries ───────────────────────────────────────────────────────────

def get_fund_performance_history(db, fund_id):
    rows = (
        db.query(FundPerformanceSnapshot)
        .filter(FundPerformanceSnapshot.fund_id == fund_id)
        .order_by(FundPerformanceSnapshot.recorded_at.desc())
        .all()
    )
    return [_perf_snapshot_to_dict(r) for r in rows]


def get_fund_raised_history(db, fund_id):
    rows = (
        db.query(FundRaisedSnapshot)
        .filter(FundRaisedSnapshot.fund_id == fund_id)
        .order_by(FundRaisedSnapshot.recorded_at.desc())
        .all()
    )
    return [_raised_snapshot_to_dict(r) for r in rows]


def get_fund_change_history(db, fund_id, limit=100):
    """All change-log entries that directly concern this fund OR its pipeline item."""
    rows = (
        db.query(ChangeLog)
        .filter(
            or_(
                (ChangeLog.entity_type == "fund") & (ChangeLog.entity_id == fund_id),
                ChangeLog.related_fund_id == fund_id,
            )
        )
        .order_by(ChangeLog.changed_at.desc())
        .limit(limit)
        .all()
    )
    return [_change_to_dict(r) for r in rows]


def get_gp_change_history(db, gp_id, limit=100):
    rows = (
        db.query(ChangeLog)
        .filter(ChangeLog.entity_type == "gp", ChangeLog.entity_id == gp_id)
        .order_by(ChangeLog.changed_at.desc())
        .limit(limit)
        .all()
    )
    return [_change_to_dict(r) for r in rows]


# ── Bulk write + change detection ─────────────────────────────────────────────

def upsert_all_data(db, data):
    """
    Full replace of all main-table data (mirrors overwriting data.json).

    Before the delete-reinsert cycle the function diffs old vs new state and
    appends entries to the three append-only history tables:
        fund_performance_snapshots
        fund_raised_snapshots
        change_log

    History tables are NEVER deleted.
    """
    try:
        now = _now()

        # ── 0. Load current state for diffing ────────────────────────────────
        old_funds    = {f.id: f for f in db.query(Fund).all()}
        old_gps      = {g.id: g for g in db.query(GP).all()}
        old_pipeline = {p.id: p for p in db.query(PipelineItem).all()}

        # Build lookup maps from incoming JSON
        new_fund_map = {}
        for gp_data in data.get("gps", []):
            for f in gp_data.get("funds", []):
                new_fund_map[f["id"]] = f

        new_gp_map       = {g["id"]: g for g in data.get("gps", [])}
        new_pipeline_map = {p["id"]: p for p in data.get("pipeline", [])}

        # ── 1. Detect changes → write to history tables ───────────────────────

        # Fund scalar fields: score, status
        for fund_id, new_f in new_fund_map.items():
            old_f = old_funds.get(fund_id)
            if not old_f:
                continue

            for camel, snake in FUND_SCALAR_FIELDS:
                old_val = _norm(getattr(old_f, snake))
                new_val = _norm(new_f.get(camel))
                if old_val != new_val:
                    db.add(ChangeLog(
                        id          = _uid(),
                        entity_type = "fund",
                        entity_id   = fund_id,
                        entity_name = new_f.get("name"),
                        field_name  = camel,
                        old_value   = old_val,
                        new_value   = new_val,
                        changed_at  = now,
                    ))

            # Performance snapshot
            perf_changed = any(
                _norm(new_f.get(camel)) != _norm(getattr(old_f, snake))
                for camel, snake in FUND_PERF_FIELDS
            )
            has_perf = any(_norm(new_f.get(camel)) for camel, _ in FUND_PERF_FIELDS)

            if perf_changed and has_perf:
                perf_date = _norm(new_f.get("perfDate"))
                # Upsert on (fund_id, perf_date): same period = update, new period = insert
                if perf_date is None:
                    existing = (
                        db.query(FundPerformanceSnapshot)
                        .filter(
                            FundPerformanceSnapshot.fund_id == fund_id,
                            FundPerformanceSnapshot.perf_date.is_(None),
                        )
                        .first()
                    )
                else:
                    existing = (
                        db.query(FundPerformanceSnapshot)
                        .filter(
                            FundPerformanceSnapshot.fund_id == fund_id,
                            FundPerformanceSnapshot.perf_date == perf_date,
                        )
                        .first()
                    )

                if existing:
                    for camel, snake in FUND_PERF_FIELDS:
                        setattr(existing, snake, _norm(new_f.get(camel)))
                    existing.recorded_at = now
                else:
                    db.add(FundPerformanceSnapshot(
                        id            = _uid(),
                        fund_id       = fund_id,
                        perf_date     = perf_date,
                        net_irr       = _norm(new_f.get("netIrr")),
                        net_moic      = _norm(new_f.get("netMoic")),
                        gross_irr     = _norm(new_f.get("grossIrr")),
                        gross_moic    = _norm(new_f.get("grossMoic")),
                        dpi           = _norm(new_f.get("dpi")),
                        tvpi          = _norm(new_f.get("tvpi")),
                        rvpi          = _norm(new_f.get("rvpi")),
                        nav           = _norm(new_f.get("nav")),
                        undrawn_value = _norm(new_f.get("undrawnValue")),
                        recorded_at   = now,
                    ))

            # Raised-size snapshot: on change, skip if last snapshot is identical
            old_raised = _norm(old_f.raised_size)
            new_raised = _norm(new_f.get("raisedSize"))
            if old_raised != new_raised and new_raised:
                last = (
                    db.query(FundRaisedSnapshot)
                    .filter(FundRaisedSnapshot.fund_id == fund_id)
                    .order_by(FundRaisedSnapshot.recorded_at.desc())
                    .first()
                )
                if not last or last.raised_size != new_raised:
                    db.add(FundRaisedSnapshot(
                        id          = _uid(),
                        fund_id     = fund_id,
                        raised_size = new_raised,
                        recorded_at = now,
                    ))

        # GP scalar fields: score, owner
        for gp_id, new_g in new_gp_map.items():
            old_g = old_gps.get(gp_id)
            if not old_g:
                continue
            for camel, snake in GP_SCALAR_FIELDS:
                old_val = _norm(getattr(old_g, snake))
                new_val = _norm(new_g.get(camel))
                if old_val != new_val:
                    db.add(ChangeLog(
                        id          = _uid(),
                        entity_type = "gp",
                        entity_id   = gp_id,
                        entity_name = new_g.get("name"),
                        field_name  = camel,
                        old_value   = old_val,
                        new_value   = new_val,
                        changed_at  = now,
                    ))

        # Pipeline stage changes
        for p_id, new_p in new_pipeline_map.items():
            old_p = old_pipeline.get(p_id)
            if not old_p:
                continue
            if _norm(old_p.stage) != _norm(new_p.get("stage")):
                db.add(ChangeLog(
                    id              = _uid(),
                    entity_type     = "pipeline",
                    entity_id       = p_id,
                    entity_name     = new_p.get("gpName"),
                    field_name      = "stage",
                    old_value       = _norm(old_p.stage),
                    new_value       = _norm(new_p.get("stage")),
                    changed_at      = now,
                    related_fund_id = _norm(new_p.get("fundId")),
                ))

        # Flush history entries first — they survive independently of main-table ops
        db.flush()

        # ── 2. Clear + reinsert main tables (history tables untouched) ────────
        db.query(FundSector).delete(synchronize_session=False)
        db.query(Meeting).delete(synchronize_session=False)
        db.query(PipelineItem).delete(synchronize_session=False)
        db.query(Todo).delete(synchronize_session=False)
        db.query(Fund).delete(synchronize_session=False)
        db.query(GP).delete(synchronize_session=False)
        db.flush()
        # Expunge all to clear SQLAlchemy's identity map — prevents "conflicts
        # with persistent instance" warnings when reinserting objects with the
        # same PKs that were loaded during change detection above.
        db.expunge_all()

        for gp_data in data.get("gps", []):
            db.add(GP(
                id            = gp_data["id"],
                name          = gp_data.get("name", ""),
                hq            = gp_data.get("hq"),
                score         = gp_data.get("score"),
                owner         = gp_data.get("owner"),
                contact       = gp_data.get("contact"),
                contact_email = gp_data.get("contactEmail"),
                notes         = gp_data.get("notes"),
            ))

            for f in gp_data.get("funds", []):
                db.add(Fund(
                    id                  = f["id"],
                    gp_id               = gp_data["id"],
                    name                = f.get("name", ""),
                    series              = f.get("series"),
                    strategy            = f.get("strategy"),
                    sub_strategy        = f.get("subStrategy"),
                    vintage             = f.get("vintage"),
                    currency            = f.get("currency"),
                    status              = f.get("status"),
                    score               = f.get("score"),
                    notes               = f.get("notes"),
                    target_size         = f.get("targetSize") or None,
                    raised_size         = f.get("raisedSize") or None,
                    final_size          = f.get("finalSize")  or None,
                    hard_cap            = f.get("hardCap")    or None,
                    invested            = bool(f.get("invested", False)),
                    investment_amount   = f.get("investmentAmount")   or None,
                    investment_currency = f.get("investmentCurrency"),
                    launch_date         = f.get("launchDate"),
                    first_close_date    = f.get("firstCloseDate"),
                    next_close_date     = f.get("nextCloseDate"),
                    final_close_date    = f.get("finalCloseDate"),
                    net_irr             = f.get("netIrr"),
                    net_moic            = f.get("netMoic"),
                    gross_irr           = f.get("grossIrr"),
                    gross_moic          = f.get("grossMoic"),
                    dpi                 = f.get("dpi"),
                    tvpi                = f.get("tvpi"),
                    rvpi                = f.get("rvpi"),
                    nav                 = f.get("nav"),
                    undrawn_value       = f.get("undrawnValue"),
                    perf_date           = f.get("perfDate"),
                ))

                for sector in f.get("sectors", []):
                    db.add(FundSector(fund_id=f["id"], sector=sector))

            for m in gp_data.get("meetings", []):
                db.add(Meeting(
                    id        = m["id"],
                    gp_id     = gp_data["id"],
                    fund_id   = m.get("fundId"),
                    date      = m.get("date"),
                    type      = m.get("type"),
                    location  = m.get("location"),
                    topic     = m.get("topic"),
                    notes     = m.get("notes"),
                    logged_by = m.get("loggedBy"),
                    logged_at = m.get("loggedAt"),
                ))

        # Flush GPs + funds to DB before inserting pipeline (FK: pipeline.fund_id → funds.id)
        db.flush()

        for p in data.get("pipeline", []):
            db.add(PipelineItem(
                id             = p["id"],
                gp_name        = p.get("gpName"),
                stage          = p.get("stage"),
                added_at       = p.get("addedAt"),
                pipeline_notes = p.get("pipelineNotes"),
                fund_id        = p.get("fundId"),
            ))

        for t in data.get("todos", []):
            db.add(Todo(
                id         = t["id"],
                text       = t.get("text", ""),
                done       = bool(t.get("done", False)),
                created_at = t.get("createdAt"),
            ))

        db.commit()

    except Exception:
        db.rollback()
        raise
