"""
migrate_v2.py — Migrate old CRM_* tables → new v2 tables.

Safe to run multiple times (idempotent — checks by ID before inserting).
Old CRM_* tables are never modified or deleted.

Usage:
    cd python-server
    /usr/bin/python3 migrate_v2.py

What gets migrated:
    CRM_gps              → organization (org_type='gp')
    CRM_placement_agents → organization (org_type='placement_agent')
    CRM_gps.contact      → person + org_person
    CRM_funds            → fund
    CRM_fund_sectors     → entity_taxonomy (type='sector')
    fund.strategy/sub    → entity_taxonomy (type='strategy')
    CRM_pipeline         → fund.pipeline_stage_id / pipeline_added_at
    CRM_meetings         → meeting + meeting_entity (org + fund links)
    CRM_todos            → task (global, entity_type=NULL)
    CRM_change_log       → audit_log
"""

import os
import sys
import uuid
from datetime import datetime, timezone

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from sqlalchemy import text
from database import SessionLocal, init_db
from models import (
    Organization, Person, OrgPerson,
    FundV2, FundPlacementAgent,
    EntityTaxonomy, LookupItem,
    Note, Task, MeetingV2, MeetingEntity,
    AuditLog,
)

WARNINGS = []


def _uid():
    return uuid.uuid4().hex[:8]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _warn(msg):
    WARNINGS.append(msg)
    print(f"  ⚠  {msg}")


# ── Strategy / sector mapping ─────────────────────────────────────────────────
# Maps old free-text strings → new taxonomy_item IDs.
# Sub-strategy takes priority; falls back to strategy-level node.

STRATEGY_MAP = {
    # (strategy, sub_strategy) → taxonomy_id
    ("Buyout",         "Large-Cap Buyout"):     "str_pe_buyout_mega",
    ("Buyout",         "Mid-Cap Buyout"):        "str_pe_buyout_mid",
    ("Buyout",         "Small-Cap Buyout"):      "str_pe_buyout_small",
    ("Buyout",         None):                    "str_pe_buyout",
    ("Growth Equity",  "Minority Growth"):       "str_pe_growth_minority",
    ("Growth Equity",  None):                    "str_pe_growth",
    ("Venture Capital","Early Stage"):           "str_vc_early",
    ("Venture Capital","Late Stage"):            "str_vc_late",
    ("Venture Capital","Multi-Stage"):           "str_vc_multi",
    ("Venture Capital", None):                   "str_vc",
    ("Private Credit", "Senior Secured"):        "str_pd_dl",   # closest: Direct Lending
    ("Private Credit", "Unitranche"):            "str_pd_dl",
    ("Private Credit", "Mezzanine"):             "str_pd_mezz",
    ("Private Credit", "Direct Lending"):        "str_pd_dl",
    ("Private Credit", None):                    "str_pd",
    ("Private Debt",   "Direct Lending"):        "str_pd_dl",
    ("Private Debt",   None):                    "str_pd",
    ("Infrastructure", "Core Infrastructure"):   "str_infra_core",
    ("Infrastructure", "Core"):                  "str_infra_core",
    ("Infrastructure", "Core-Plus"):             "str_infra_core_plus",
    ("Infrastructure", "Value-Add"):             "str_infra_va",
    ("Infrastructure", None):                    "str_infra",
    ("Real Assets",    "Core"):                  "str_infra_core",  # best-fit
    ("Real Assets",    None):                    "str_infra",
    ("Real Estate",    "Core"):                  "str_re_core",
    ("Real Estate",    "Value Add"):             "str_re_va",
    ("Real Estate",    "Opportunistic"):         "str_re_opp",
    ("Real Estate",    None):                    "str_re",
    ("Natural Resources", None):                 "str_nr",
    ("Hedge Funds",    None):                    "str_hf",
    ("Multi",          None):                    "str_multi",
}

SECTOR_MAP = {
    "Aerospace":              "sec_industrials",       # no exact match — closest
    "Business Services":      "sec_business_svcs",
    "Consumer":               "sec_consumer",
    "Consumer Goods":         "sec_consumer",
    "Consumer Discretionary": "sec_consumer_disc",
    "Consumer Staples":       "sec_consumer_staples",
    "Data Centres":           "sec_technology",
    "Digital Infrastructure": "sec_technology",
    "Energy":                 "sec_energy",
    "Energy Transition":      "sec_energy_transition",
    "Financial Services":     "sec_financials",
    "FinTech":                "sec_fintech",
    "Healthcare":             "sec_healthcare",
    "Pharma & Biotech":       "sec_pharma",
    "Industrials":            "sec_industrials",
    "IT / Technology":        "sec_technology",
    "Logistics":              "sec_transport",
    "Materials":              "sec_materials",
    "Media":                  "sec_telecom_media",
    "Real Estate":            "sec_real_estate",
    "Residential Housing":    "sec_real_estate",
    "Software & SaaS":        "sec_software",
    "Solar":                  "sec_energy_transition",
    "Technology":             "sec_technology",
    "Telecom":                "sec_telecom_media",
    "Transport":              "sec_transport",
    "Wind":                   "sec_energy_transition",
}

MEETING_TYPE_MAP = {
    "In-Person":  "li_meeting_in_person",
    "Virtual":    "li_meeting_virtual",
    "Phone":      "li_meeting_phone",
    "Phone Call": "li_meeting_phone",
    "Conference": "li_meeting_conference",
}

FUND_STATUS_MAP = {
    "Pre-Marketing":  "li_fund_status_pre_marketing",
    "Fundraising":    "li_fund_status_fundraising",
    "First Close":    "li_fund_status_first_close",
    "Final Close":    "li_fund_status_final_close",
    "Closed":         "li_fund_status_closed",
    "Deployed":       "li_fund_status_deployed",
    "Monitoring":     "li_fund_status_monitoring",
    "Exiting":        "li_fund_status_exiting",
}


def _rating_id(db, score, category_id):
    """Resolve a score letter ('A'..'E') to its lookup_item ID."""
    if not score:
        return None
    item = db.query(LookupItem).filter_by(category_id=category_id, code=score).first()
    if not item:
        _warn(f"Unknown rating score '{score}' for category {category_id}")
        return None
    return item.id


def _strategy_id(strategy, sub_strategy):
    """Return taxonomy_item ID for a strategy+sub_strategy pair."""
    key = (strategy, sub_strategy or None)
    if key in STRATEGY_MAP:
        return STRATEGY_MAP[key]
    # Fall back to strategy-only
    fallback = (strategy, None)
    if fallback in STRATEGY_MAP:
        _warn(f"No exact match for ('{strategy}', '{sub_strategy}') — using parent '{strategy}'")
        return STRATEGY_MAP[fallback]
    _warn(f"No taxonomy match for strategy='{strategy}' sub='{sub_strategy}' — skipped")
    return None


def _sector_id(sector):
    if sector in SECTOR_MAP:
        return SECTOR_MAP[sector]
    _warn(f"No taxonomy match for sector='{sector}' — skipped")
    return None


def exists(db, model, pk):
    return db.get(model, pk) is not None


# ── Migration steps ───────────────────────────────────────────────────────────

def migrate_orgs(db, raw):
    """CRM_gps + CRM_placement_agents → organization."""
    print("Migrating organizations (GPs)...")
    gps = raw.execute(text("SELECT * FROM CRM_gps")).mappings().all()
    for row in gps:
        if exists(db, Organization, row["id"]):
            continue
        rating_id = _rating_id(db, row.get("score"), "lc_gp_rating")
        org = Organization(
            id=row["id"],
            org_type="gp",
            name=row["name"],
            website=row.get("website"),
            owner=row.get("owner"),
            rating_id=rating_id,
            notes_text=row.get("notes"),
        )
        db.add(org)

    print("Migrating organizations (placement agents)...")
    agents = raw.execute(text("SELECT * FROM CRM_placement_agents")).mappings().all()
    for row in agents:
        if exists(db, Organization, row["id"]):
            continue
        org = Organization(
            id=row["id"],
            org_type="placement_agent",
            name=row["name"],
            website=row.get("website"),
            notes_text=row.get("notes"),
        )
        db.add(org)

    db.flush()

    # Migrate GP contacts → person + org_person
    print("Migrating GP contacts → person + org_person...")
    for row in gps:
        contact = (row.get("contact") or "").strip()
        email   = (row.get("contact_email") or "").strip()
        if not contact and not email:
            continue

        # Derive person ID deterministically from org ID
        person_id = f"p_{row['id']}"
        if not exists(db, Person, person_id):
            # Split name into first/last on first space
            parts = contact.split(" ", 1)
            person = Person(
                id=person_id,
                first_name=parts[0] if parts else contact,
                last_name=parts[1] if len(parts) > 1 else None,
                email=email or None,
            )
            db.add(person)

        link_id = f"op_{row['id']}"
        if not exists(db, OrgPerson, link_id):
            db.add(OrgPerson(
                id=link_id,
                org_id=row["id"],
                person_id=person_id,
                role="Contact",
                is_primary=True,
            ))

    # Migrate placement agent contacts
    for row in agents:
        contact = (row.get("contact") or "").strip()
        email   = (row.get("contact_email") or "").strip()
        if not contact and not email:
            continue
        person_id = f"p_{row['id']}"
        if not exists(db, Person, person_id):
            parts = contact.split(" ", 1)
            db.add(Person(
                id=person_id,
                first_name=parts[0] if parts else contact,
                last_name=parts[1] if len(parts) > 1 else None,
                email=email or None,
            ))
        link_id = f"op_{row['id']}"
        if not exists(db, OrgPerson, link_id):
            db.add(OrgPerson(
                id=link_id,
                org_id=row["id"],
                person_id=person_id,
                role="Contact",
                is_primary=True,
            ))

    db.flush()


def migrate_funds(db, raw):
    """CRM_funds → fund, with strategy → entity_taxonomy."""
    print("Migrating funds...")
    funds = raw.execute(text("SELECT * FROM CRM_funds")).mappings().all()

    for row in funds:
        if not exists(db, FundV2, row["id"]):
            # Resolve vintage string → int
            vintage = None
            if row.get("vintage"):
                try:
                    vintage = int(str(row["vintage"]).strip())
                except (ValueError, TypeError):
                    pass

            status_id = FUND_STATUS_MAP.get(row.get("status") or "")
            if row.get("status") and not status_id:
                _warn(f"Unknown fund status '{row['status']}' for fund {row['id']}")

            rating_id = _rating_id(db, row.get("score"), "lc_fund_rating")

            db.add(FundV2(
                id=row["id"],
                org_id=row["gp_id"],
                name=row["name"],
                series=row.get("series"),
                vintage=vintage,
                currency=row.get("currency"),
                # Sizing
                target_size=row.get("target_size"),
                raised_size=row.get("raised_size"),
                raised_date=row.get("raised_date"),
                final_size=row.get("final_size"),
                hard_cap=row.get("hard_cap"),
                # Investment
                invested=bool(row.get("invested")),
                investment_amount=row.get("investment_amount"),
                investment_currency=row.get("investment_currency"),
                # Pre-commitment planning
                expected_amount=row.get("expected_amount"),
                ic_date=row.get("ic_date"),
                # Fundraising timeline
                launch_date=row.get("launch_date"),
                first_close_date=row.get("first_close_date"),
                next_close_date=row.get("next_close_date"),
                final_close_date=row.get("final_close_date"),
                # Performance metrics
                net_irr=row.get("net_irr"),
                net_moic=row.get("net_moic"),
                gross_irr=row.get("gross_irr"),
                gross_moic=row.get("gross_moic"),
                dpi=row.get("dpi"),
                tvpi=row.get("tvpi"),
                rvpi=row.get("rvpi"),
                nav=row.get("nav"),
                undrawn_value=row.get("undrawn_value"),
                perf_date=row.get("perf_date"),
                # Lookups
                status_id=status_id or None,
                rating_id=rating_id,
                owner=row.get("owner") or None,  # old fund model had no owner field
            ))

        # Strategy → entity_taxonomy
        strategy    = (row.get("strategy") or "").strip()
        sub_strategy = (row.get("sub_strategy") or "").strip()
        if strategy:
            tax_id = _strategy_id(strategy, sub_strategy or None)
            if tax_id:
                et_id = f"et_str_{row['id']}"
                if not exists(db, EntityTaxonomy, et_id):
                    db.add(EntityTaxonomy(
                        id=et_id,
                        entity_type="fund",
                        entity_id=row["id"],
                        taxonomy_id=tax_id,
                        is_primary=True,
                    ))

        # Notes → note table
        if row.get("notes"):
            note_id = f"n_fund_{row['id']}"
            if not exists(db, Note, note_id):
                db.add(Note(
                    id=note_id,
                    entity_type="fund",
                    entity_id=row["id"],
                    body=row["notes"],
                    created_at=_now(),
                ))

    db.flush()


def migrate_sectors(db, raw):
    """CRM_fund_sectors → entity_taxonomy (type='sector')."""
    print("Migrating fund sectors → entity_taxonomy...")
    rows = raw.execute(text("SELECT * FROM CRM_fund_sectors")).mappings().all()
    # Track (fund_id, tax_id) pairs to deduplicate within this run
    # (multiple old sector strings can map to the same taxonomy ID)
    seen = set()
    for row in rows:
        tax_id = _sector_id(row["sector"])
        if not tax_id:
            continue
        key = (row["fund_id"], tax_id)
        if key in seen:
            continue
        seen.add(key)
        et_id = f"et_sec_{row['fund_id']}_{tax_id}"
        if not exists(db, EntityTaxonomy, et_id):
            db.add(EntityTaxonomy(
                id=et_id,
                entity_type="fund",
                entity_id=row["fund_id"],
                taxonomy_id=tax_id,
            ))
    db.flush()


def migrate_pipeline(db, raw):
    """CRM_pipeline → fund.pipeline_stage_id + fund.pipeline_added_at."""
    print("Migrating pipeline stages → fund fields...")
    rows = raw.execute(text("SELECT * FROM CRM_pipeline")).mappings().all()
    stage_map = {
        "watching":   "li_pipeline_watching",
        "first-look": "li_pipeline_first_look",
        "diligence":  "li_pipeline_diligence",
        "ic-review":  "li_pipeline_ic_review",
        "committed":  "li_pipeline_committed",
        "passed":     "li_pipeline_passed",
    }
    for row in rows:
        if not row.get("fund_id"):
            _warn(f"Pipeline row {row['id']} has no fund_id — skipped")
            continue
        fund = db.get(FundV2, row["fund_id"])
        if not fund:
            _warn(f"Pipeline row {row['id']} references missing fund {row['fund_id']} — skipped")
            continue
        stage_item_id = stage_map.get(row.get("stage") or "")
        if not stage_item_id:
            _warn(f"Unknown pipeline stage '{row.get('stage')}' — skipped")
            continue
        fund.pipeline_stage_id = stage_item_id
        fund.pipeline_added_at = row.get("added_at")
    db.flush()


def migrate_placement_agents(db, raw):
    """CRM_funds.placement_agent_id → fund_placement_agent join table."""
    print("Migrating placement agent links → fund_placement_agent...")
    rows = raw.execute(
        text("SELECT id, placement_agent_id FROM CRM_funds WHERE placement_agent_id IS NOT NULL")
    ).mappings().all()
    for row in rows:
        link_id = f"fpa_{row['id']}"
        if not exists(db, FundPlacementAgent, link_id):
            db.add(FundPlacementAgent(
                id=link_id,
                fund_id=row["id"],
                org_id=row["placement_agent_id"],
                is_active=True,
            ))
    db.flush()


def migrate_meetings(db, raw):
    """CRM_meetings → meeting + meeting_entity (org link + optional fund link)."""
    print("Migrating meetings...")
    rows = raw.execute(text("SELECT * FROM CRM_meetings")).mappings().all()
    for row in rows:
        if not exists(db, MeetingV2, row["id"]):
            type_id = MEETING_TYPE_MAP.get(row.get("type") or "")
            if row.get("type") and not type_id:
                _warn(f"Unknown meeting type '{row['type']}' for meeting {row['id']}")

            db.add(MeetingV2(
                id=row["id"],
                date=row.get("date"),
                type_id=type_id,
                location=row.get("location"),
                topic=row.get("topic"),
                notes=row.get("notes"),
                created_at=row.get("logged_at") or _now(),
                created_by=row.get("logged_by"),
            ))

        # Link to org (primary entity)
        me_org_id = f"me_org_{row['id']}"
        if not exists(db, MeetingEntity, me_org_id):
            db.add(MeetingEntity(
                id=me_org_id,
                meeting_id=row["id"],
                entity_type="organization",
                entity_id=row["gp_id"],
                is_primary=True,
            ))

        # Link to fund (secondary entity, if set)
        if row.get("fund_id"):
            me_fund_id = f"me_fund_{row['id']}"
            if not exists(db, MeetingEntity, me_fund_id):
                db.add(MeetingEntity(
                    id=me_fund_id,
                    meeting_id=row["id"],
                    entity_type="fund",
                    entity_id=row["fund_id"],
                    is_primary=False,
                ))

    db.flush()


def migrate_todos(db, raw):
    """CRM_todos → task (global, entity_type=NULL)."""
    print("Migrating todos → tasks...")
    rows = raw.execute(text("SELECT * FROM CRM_todos")).mappings().all()
    for row in rows:
        from models import Task as TaskModel
        if not exists(db, TaskModel, row["id"]):
            db.add(TaskModel(
                id=row["id"],
                entity_type=None,
                entity_id=None,
                text=row["text"],
                is_done=bool(row.get("done")),
                created_at=row.get("created_at"),
            ))
    db.flush()


def migrate_change_log(db, raw):
    """CRM_change_log → audit_log."""
    print("Migrating change_log → audit_log...")
    rows = raw.execute(text("SELECT * FROM CRM_change_log")).mappings().all()
    entity_type_map = {"fund": "fund", "gp": "organization", "pipeline": "fund"}
    field_name_map  = {
        "score":  "rating_id",
        "status": "status_id",
        "owner":  "owner",
        "stage":  "pipeline_stage_id",
    }
    for row in rows:
        if not exists(db, AuditLog, row["id"]):
            entity_type = entity_type_map.get(row["entity_type"], row["entity_type"])
            field_name  = field_name_map.get(row["field_name"], row["field_name"])
            db.add(AuditLog(
                id=row["id"],
                entity_type=entity_type,
                entity_id=row["entity_id"],
                entity_name=row.get("entity_name"),
                field_name=field_name,
                old_value=row.get("old_value"),
                new_value=row.get("new_value"),
                changed_at=row["changed_at"],
                changed_by=row.get("changed_by"),
            ))
    db.flush()


def migrate_org_notes(db, raw):
    """Migrate gps.notes that weren't already in notes_text → note table."""
    print("Migrating GP notes → note table...")
    rows = raw.execute(text("SELECT id, notes FROM CRM_gps WHERE notes IS NOT NULL AND notes != ''")).mappings().all()
    for row in rows:
        note_id = f"n_org_{row['id']}"
        if not exists(db, Note, note_id):
            db.add(Note(
                id=note_id,
                entity_type="organization",
                entity_id=row["id"],
                body=row["notes"],
                created_at=_now(),
            ))
    db.flush()


# ── Main ──────────────────────────────────────────────────────────────────────

def migrate():
    init_db()
    db  = SessionLocal()
    raw = db.get_bind().connect()   # raw connection for old-table reads

    try:
        migrate_orgs(db, raw)
        migrate_funds(db, raw)
        migrate_sectors(db, raw)
        migrate_pipeline(db, raw)
        migrate_placement_agents(db, raw)
        migrate_meetings(db, raw)
        migrate_todos(db, raw)
        migrate_change_log(db, raw)
        migrate_org_notes(db, raw)

        db.commit()
        raw.close()

        print("\nMigration complete.")
        print(f"  organization   : {db.query(Organization).count()}")
        print(f"  person         : {db.query(Person).count()}")
        print(f"  org_person     : {db.query(OrgPerson).count()}")
        print(f"  fund           : {db.query(FundV2).count()}")
        print(f"  entity_taxonomy: {db.query(EntityTaxonomy).count()}")
        print(f"  meeting        : {db.query(MeetingV2).count()}")
        print(f"  meeting_entity : {db.query(MeetingEntity).count()}")
        print(f"  note           : {db.query(Note).count()}")
        print(f"  audit_log      : {db.query(AuditLog).count()}")

        if WARNINGS:
            print(f"\n{len(WARNINGS)} warnings (review manually):")
            for w in WARNINGS:
                print(f"  ⚠  {w}")
        else:
            print("\nNo warnings.")

    except Exception:
        db.rollback()
        raw.close()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
