"""
crud.py — Database access functions.

All functions accept a SQLAlchemy Session and return plain dicts.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import (
    AuditLog, EntityTaxonomy, ExternalColumnMap, ExternalSource,
    FieldProvenance, FundPlacementAgent, FundV2,
    LookupCategory, LookupItem, MeetingAttendee, MeetingEntity, MeetingV2,
    Note, OrgPerson, Organization, Person, Task, TaxonomyItem,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Serializers ───────────────────────────────────────────────────────────────

def _s_lookup_item(item: Optional[LookupItem]) -> Optional[Dict]:
    if not item:
        return None
    return {
        "id": item.id,
        "code": item.code,
        "label": item.label,
        "color": item.color,
        "bg_color": item.bg_color,
        "sort_order": item.sort_order,
    }


def _s_taxonomy_item(item: Optional[TaxonomyItem]) -> Optional[Dict]:
    if not item:
        return None
    return {
        "id": item.id,
        "type": item.type,
        "name": item.name,
        "parent_id": item.parent_id,
        "level_label": item.level_label,
        "sort_order": item.sort_order,
    }


def _s_person(person: Person) -> Dict:
    return {
        "id": person.id,
        "first_name": person.first_name,
        "last_name": person.last_name,
        "email": person.email,
        "phone": person.phone,
        "mobile": person.mobile,
        "title": person.title,
        "linkedin_url": person.linkedin_url,
        "investment_focus": person.investment_focus,
        "deleted_at": person.deleted_at,
    }


def _s_org_person(op: OrgPerson) -> Dict:
    return {
        "id": op.id,
        "org_id": op.org_id,
        "person_id": op.person_id,
        "role": op.role,
        "is_primary": op.is_primary,
        "start_date": op.start_date,
        "end_date": op.end_date,
        "person": _s_person(op.person) if op.person else None,
    }


def _s_fund(fund: FundV2, include_org: bool = False) -> Dict:
    d = {
        "id": fund.id,
        "org_id": fund.org_id,
        "name": fund.name,
        "series": fund.series,
        "vintage": fund.vintage,
        "currency": fund.currency,
        # Sizing
        "target_size": fund.target_size,
        "raised_size": fund.raised_size,
        "raised_date": fund.raised_date,
        "final_size": fund.final_size,
        "hard_cap": fund.hard_cap,
        "min_commitment": fund.min_commitment,
        # Economics
        "management_fee_rate": fund.management_fee_rate,
        "management_fee_basis": fund.management_fee_basis,
        "carry_rate": fund.carry_rate,
        "hurdle_rate": fund.hurdle_rate,
        "gp_commitment_pct": fund.gp_commitment_pct,
        "gp_commitment_amount": fund.gp_commitment_amount,
        "waterfall_type": fund.waterfall_type,
        "catch_up": fund.catch_up,
        # Fund terms
        "investment_period_years": fund.investment_period_years,
        "fund_term_years": fund.fund_term_years,
        "extension_options": fund.extension_options,
        "recycling_provisions": fund.recycling_provisions,
        # Legal / structure
        "legal_structure": fund.legal_structure,
        "domicile": fund.domicile,
        "regulatory_regime": fund.regulatory_regime,
        # LP pre-commitment
        "expected_amount": fund.expected_amount,
        "expected_currency": fund.expected_currency,
        "ic_date": fund.ic_date,
        # LP post-commitment
        "committed_amount": fund.committed_amount,
        "committed_currency": fund.committed_currency,
        "committed_date": fund.committed_date,
        "called_amount": fund.called_amount,
        "uncalled_amount": fund.uncalled_amount,
        "distributions_amount": fund.distributions_amount,
        "cost_basis": fund.cost_basis,
        "is_on_lpac": fund.is_on_lpac,
        "co_invest_rights": fund.co_invest_rights,
        # Legacy
        "invested": fund.invested,
        "investment_amount": fund.investment_amount,
        "investment_currency": fund.investment_currency,
        # Introduction
        "introduced_by_org_id": fund.introduced_by_org_id,
        "introduced_by_person_id": fund.introduced_by_person_id,
        "introduced_at": fund.introduced_at,
        # Fundraising timeline
        "launch_date": fund.launch_date,
        "first_close_date": fund.first_close_date,
        "next_close_date": fund.next_close_date,
        "final_close_date": fund.final_close_date,
        # Status / rating / pipeline
        "status_id": fund.status_id,
        "status": _s_lookup_item(fund.status),
        "rating_id": fund.rating_id,
        "rating": _s_lookup_item(fund.rating),
        "pipeline_stage_id": fund.pipeline_stage_id,
        "pipeline_stage": _s_lookup_item(fund.pipeline_stage),
        "pipeline_added_at": fund.pipeline_added_at,
        "owner": fund.owner,
        # Performance
        "net_irr": fund.net_irr,
        "net_moic": fund.net_moic,
        "gross_irr": fund.gross_irr,
        "gross_moic": fund.gross_moic,
        "dpi": fund.dpi,
        "tvpi": fund.tvpi,
        "rvpi": fund.rvpi,
        "nav": fund.nav,
        "undrawn_value": fund.undrawn_value,
        "perf_date": fund.perf_date,
        "quartile_ranking": fund.quartile_ranking,
        "benchmark_name": fund.benchmark_name,
        "pme": fund.pme,
        "pme_index": fund.pme_index,
        # External IDs
        "preqin_fund_id": fund.preqin_fund_id,
        "preqin_series_id": fund.preqin_series_id,
        "deleted_at": fund.deleted_at,
    }
    if include_org and fund.org:
        d["org"] = {
            "id": fund.org.id,
            "name": fund.org.name,
            "org_type": fund.org.org_type,
        }
    return d


def _s_org(
    org: Organization,
    include_funds: bool = False,
    include_people: bool = False,
) -> Dict:
    d = {
        "id": org.id,
        "org_type": org.org_type,
        "name": org.name,
        "website": org.website,
        "aum": org.aum,
        "aum_currency": org.aum_currency,
        "aum_date": org.aum_date,
        "founded_year": org.founded_year,
        "first_fund_year": org.first_fund_year,
        "funds_raised_count": org.funds_raised_count,
        "investment_team_size": org.investment_team_size,
        "total_team_size": org.total_team_size,
        "regulatory_body": org.regulatory_body,
        "pri_signatory": org.pri_signatory,
        "ilpa_member": org.ilpa_member,
        "spin_out_from_org_id": org.spin_out_from_org_id,
        "rating_id": org.rating_id,
        "rating": _s_lookup_item(org.rating),
        "owner": org.owner,
        "is_active": org.is_active,
        "preqin_manager_id": org.preqin_manager_id,
        "deleted_at": org.deleted_at,
    }
    if include_funds:
        d["funds"] = [_s_fund(f) for f in org.funds if not f.deleted_at]
    if include_people:
        d["people"] = [_s_org_person(op) for op in org.people]
    return d


def _s_note(note: Note) -> Dict:
    return {
        "id": note.id,
        "entity_type": note.entity_type,
        "entity_id": note.entity_id,
        "body": note.body,
        "is_pinned": note.is_pinned,
        "created_at": note.created_at,
        "created_by": note.created_by,
        "updated_at": note.updated_at,
        "source_id": note.source_id,
        "deleted_at": note.deleted_at,
    }


def _s_meeting(meeting: MeetingV2) -> Dict:
    return {
        "id": meeting.id,
        "date": meeting.date,
        "type_id": meeting.type_id,
        "type": _s_lookup_item(meeting.type),
        "location": meeting.location,
        "topic": meeting.topic,
        "notes": meeting.notes,
        "created_at": meeting.created_at,
        "created_by": meeting.created_by,
        "deleted_at": meeting.deleted_at,
        "entities": [
            {
                "id": e.id,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "is_primary": e.is_primary,
            }
            for e in meeting.entities
        ],
        "attendees": [
            {
                "id": a.id,
                "person_id": a.person_id,
                "org_id": a.org_id,
                "side": a.side,
                "person": _s_person(a.person) if a.person else None,
            }
            for a in meeting.attendees
        ],
    }


def _s_task(task: Task) -> Dict:
    return {
        "id": task.id,
        "entity_type": task.entity_type,
        "entity_id": task.entity_id,
        "text": task.text,
        "due_date": task.due_date,
        "priority": task.priority,
        "assigned_to": task.assigned_to,
        "is_done": task.is_done,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "deleted_at": task.deleted_at,
    }


def _s_audit(entry: AuditLog) -> Dict:
    return {
        "id": entry.id,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "entity_name": entry.entity_name,
        "field_name": entry.field_name,
        "old_value": entry.old_value,
        "new_value": entry.new_value,
        "data_type": entry.data_type,
        "note": entry.note,
        "perf_date": entry.perf_date,
        "changed_at": entry.changed_at,
        "changed_by": entry.changed_by,
        "source_id": entry.source_id,
    }


# ── Organizations ─────────────────────────────────────────────────────────────

def get_organizations(
    db: Session,
    org_type: Optional[str] = None,
    rating_id: Optional[str] = None,
    owner: Optional[str] = None,
    include_deleted: bool = False,
) -> List[Dict]:
    q = db.query(Organization)
    if not include_deleted:
        q = q.filter(Organization.deleted_at == None)  # noqa: E711
    if org_type:
        q = q.filter(Organization.org_type == org_type)
    if rating_id:
        q = q.filter(Organization.rating_id == rating_id)
    if owner:
        q = q.filter(Organization.owner == owner)
    orgs = q.order_by(Organization.name).all()
    return [_s_org(o, include_funds=True, include_people=True) for o in orgs]


def get_organization(db: Session, org_id: str) -> Optional[Dict]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None
    return _s_org(org, include_funds=True, include_people=True)


def create_organization(db: Session, data: Dict) -> Dict:
    org = Organization(
        id=data.get("id") or _uid(),
        org_type=data.get("org_type", "gp"),
        name=data["name"],
        website=data.get("website"),
        aum=data.get("aum"),
        aum_currency=data.get("aum_currency"),
        aum_date=data.get("aum_date"),
        founded_year=data.get("founded_year"),
        first_fund_year=data.get("first_fund_year"),
        funds_raised_count=data.get("funds_raised_count"),
        investment_team_size=data.get("investment_team_size"),
        total_team_size=data.get("total_team_size"),
        regulatory_body=data.get("regulatory_body"),
        pri_signatory=data.get("pri_signatory", False),
        ilpa_member=data.get("ilpa_member", False),
        spin_out_from_org_id=data.get("spin_out_from_org_id"),
        rating_id=data.get("rating_id"),
        owner=data.get("owner"),
        is_active=data.get("is_active", True),
        preqin_manager_id=data.get("preqin_manager_id"),
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return _s_org(org)


def update_organization(db: Session, org_id: str, data: Dict) -> Optional[Dict]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None
    for f in [
        "name", "org_type", "website", "aum", "aum_currency", "aum_date",
        "founded_year", "first_fund_year", "funds_raised_count",
        "investment_team_size", "total_team_size", "regulatory_body",
        "pri_signatory", "ilpa_member", "spin_out_from_org_id",
        "rating_id", "owner", "is_active", "preqin_manager_id",
    ]:
        if f in data:
            setattr(org, f, data[f])
    db.commit()
    db.refresh(org)
    return _s_org(org, include_funds=True, include_people=True)


def patch_organization_field(
    db: Session,
    org_id: str,
    field_name: str,
    new_value: Any,
    note: Optional[str] = None,
    changed_by: Optional[str] = None,
) -> Optional[Dict]:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return None
    old_value = getattr(org, field_name, None)
    if old_value == new_value:
        return _s_org(org)
    setattr(org, field_name, new_value)
    entry = AuditLog(
        id=_uid(),
        entity_type="organization",
        entity_id=org_id,
        entity_name=org.name,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        note=note,
        changed_at=_now(),
        changed_by=changed_by,
    )
    db.add(entry)
    db.commit()
    db.refresh(org)
    return _s_org(org)


def delete_organization(db: Session, org_id: str, hard: bool = False) -> bool:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return False
    if hard:
        db.delete(org)
    else:
        org.deleted_at = _now()
    db.commit()
    return True


# ── Funds ─────────────────────────────────────────────────────────────────────

def get_funds(
    db: Session,
    org_id: Optional[str] = None,
    status_id: Optional[str] = None,
    rating_id: Optional[str] = None,
    pipeline_stage_id: Optional[str] = None,
    include_deleted: bool = False,
) -> List[Dict]:
    q = db.query(FundV2)
    if not include_deleted:
        q = q.filter(FundV2.deleted_at == None)  # noqa: E711
    if org_id:
        q = q.filter(FundV2.org_id == org_id)
    if status_id:
        q = q.filter(FundV2.status_id == status_id)
    if rating_id:
        q = q.filter(FundV2.rating_id == rating_id)
    if pipeline_stage_id:
        q = q.filter(FundV2.pipeline_stage_id == pipeline_stage_id)
    funds = q.order_by(FundV2.name).all()
    return [_s_fund(f, include_org=True) for f in funds]


def get_fund(db: Session, fund_id: str) -> Optional[Dict]:
    fund = db.query(FundV2).filter(FundV2.id == fund_id).first()
    if not fund:
        return None
    return _s_fund(fund, include_org=True)


def create_fund(db: Session, data: Dict) -> Dict:
    fund = FundV2(
        id=data.get("id") or _uid(),
        org_id=data["org_id"],
        name=data["name"],
        series=data.get("series"),
        vintage=data.get("vintage"),
        currency=data.get("currency"),
        target_size=data.get("target_size"),
        raised_size=data.get("raised_size"),
        raised_date=data.get("raised_date"),
        final_size=data.get("final_size"),
        hard_cap=data.get("hard_cap"),
        min_commitment=data.get("min_commitment"),
        management_fee_rate=data.get("management_fee_rate"),
        management_fee_basis=data.get("management_fee_basis"),
        carry_rate=data.get("carry_rate"),
        hurdle_rate=data.get("hurdle_rate"),
        gp_commitment_pct=data.get("gp_commitment_pct"),
        gp_commitment_amount=data.get("gp_commitment_amount"),
        waterfall_type=data.get("waterfall_type"),
        catch_up=data.get("catch_up"),
        investment_period_years=data.get("investment_period_years"),
        fund_term_years=data.get("fund_term_years"),
        extension_options=data.get("extension_options"),
        recycling_provisions=data.get("recycling_provisions"),
        legal_structure=data.get("legal_structure"),
        domicile=data.get("domicile"),
        regulatory_regime=data.get("regulatory_regime"),
        expected_amount=data.get("expected_amount"),
        expected_currency=data.get("expected_currency"),
        ic_date=data.get("ic_date"),
        committed_amount=data.get("committed_amount"),
        committed_currency=data.get("committed_currency"),
        committed_date=data.get("committed_date"),
        called_amount=data.get("called_amount"),
        uncalled_amount=data.get("uncalled_amount"),
        distributions_amount=data.get("distributions_amount"),
        cost_basis=data.get("cost_basis"),
        is_on_lpac=data.get("is_on_lpac", False),
        co_invest_rights=data.get("co_invest_rights", False),
        invested=data.get("invested", False),
        investment_amount=data.get("investment_amount"),
        investment_currency=data.get("investment_currency"),
        introduced_by_org_id=data.get("introduced_by_org_id"),
        introduced_by_person_id=data.get("introduced_by_person_id"),
        introduced_at=data.get("introduced_at"),
        launch_date=data.get("launch_date"),
        first_close_date=data.get("first_close_date"),
        next_close_date=data.get("next_close_date"),
        final_close_date=data.get("final_close_date"),
        status_id=data.get("status_id"),
        rating_id=data.get("rating_id"),
        pipeline_stage_id=data.get("pipeline_stage_id"),
        pipeline_added_at=data.get("pipeline_added_at"),
        owner=data.get("owner"),
        net_irr=data.get("net_irr"),
        net_moic=data.get("net_moic"),
        gross_irr=data.get("gross_irr"),
        gross_moic=data.get("gross_moic"),
        dpi=data.get("dpi"),
        tvpi=data.get("tvpi"),
        rvpi=data.get("rvpi"),
        nav=data.get("nav"),
        undrawn_value=data.get("undrawn_value"),
        perf_date=data.get("perf_date"),
        quartile_ranking=data.get("quartile_ranking"),
        benchmark_name=data.get("benchmark_name"),
        pme=data.get("pme"),
        pme_index=data.get("pme_index"),
        preqin_fund_id=data.get("preqin_fund_id"),
        preqin_series_id=data.get("preqin_series_id"),
    )
    db.add(fund)
    db.commit()
    db.refresh(fund)
    return _s_fund(fund, include_org=True)


def update_fund(db: Session, fund_id: str, data: Dict) -> Optional[Dict]:
    fund = db.query(FundV2).filter(FundV2.id == fund_id).first()
    if not fund:
        return None
    for f in [
        "name", "series", "vintage", "currency",
        "target_size", "raised_size", "raised_date", "final_size", "hard_cap", "min_commitment",
        "management_fee_rate", "management_fee_basis", "carry_rate", "hurdle_rate",
        "gp_commitment_pct", "gp_commitment_amount", "waterfall_type", "catch_up",
        "investment_period_years", "fund_term_years", "extension_options", "recycling_provisions",
        "legal_structure", "domicile", "regulatory_regime",
        "expected_amount", "expected_currency", "ic_date",
        "committed_amount", "committed_currency", "committed_date",
        "called_amount", "uncalled_amount", "distributions_amount", "cost_basis",
        "is_on_lpac", "co_invest_rights",
        "invested", "investment_amount", "investment_currency",
        "introduced_by_org_id", "introduced_by_person_id", "introduced_at",
        "launch_date", "first_close_date", "next_close_date", "final_close_date",
        "status_id", "rating_id", "pipeline_stage_id", "pipeline_added_at", "owner",
        "net_irr", "net_moic", "gross_irr", "gross_moic", "dpi", "tvpi", "rvpi",
        "nav", "undrawn_value", "perf_date",
        "quartile_ranking", "benchmark_name", "pme", "pme_index",
        "preqin_fund_id", "preqin_series_id",
    ]:
        if f in data:
            setattr(fund, f, data[f])
    db.commit()
    db.refresh(fund)
    return _s_fund(fund, include_org=True)


def patch_fund_field(
    db: Session,
    fund_id: str,
    field_name: str,
    new_value: Any,
    note: Optional[str] = None,
    changed_by: Optional[str] = None,
) -> Optional[Dict]:
    fund = db.query(FundV2).filter(FundV2.id == fund_id).first()
    if not fund:
        return None
    old_value = getattr(fund, field_name, None)
    if old_value == new_value:
        return _s_fund(fund)
    setattr(fund, field_name, new_value)
    entry = AuditLog(
        id=_uid(),
        entity_type="fund",
        entity_id=fund_id,
        entity_name=fund.name,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        note=note,
        changed_at=_now(),
        changed_by=changed_by,
    )
    db.add(entry)
    db.commit()
    db.refresh(fund)
    return _s_fund(fund, include_org=True)


def delete_fund(db: Session, fund_id: str, hard: bool = False) -> bool:
    fund = db.query(FundV2).filter(FundV2.id == fund_id).first()
    if not fund:
        return False
    if hard:
        db.delete(fund)
    else:
        fund.deleted_at = _now()
    db.commit()
    return True


# ── Taxonomy ──────────────────────────────────────────────────────────────────

def _build_tree(all_items: List[TaxonomyItem], parent_id: Optional[str]) -> List[Dict]:
    """Recursively build a nested tree from a flat item list."""
    children = [i for i in all_items if i.parent_id == parent_id]
    children.sort(key=lambda x: (x.sort_order or 0, x.name))
    return [
        {
            "id": item.id,
            "type": item.type,
            "name": item.name,
            "parent_id": item.parent_id,
            "level_label": item.level_label,
            "sort_order": item.sort_order,
            "is_active": item.is_active,
            "description": item.description,
            "children": _build_tree(all_items, item.id),
        }
        for item in children
    ]


def get_taxonomy(db: Session, type: Optional[str] = None) -> List[Dict]:
    q = db.query(TaxonomyItem).filter(TaxonomyItem.is_active == True)  # noqa: E712
    if type:
        q = q.filter(TaxonomyItem.type == type)
    all_items = q.all()
    return _build_tree(all_items, None)


def get_taxonomy_flat(db: Session, type: Optional[str] = None) -> List[Dict]:
    """Return flat list — useful for sector and target_market."""
    q = db.query(TaxonomyItem).filter(TaxonomyItem.is_active == True)  # noqa: E712
    if type:
        q = q.filter(TaxonomyItem.type == type)
    items = q.order_by(TaxonomyItem.sort_order, TaxonomyItem.name).all()
    return [_s_taxonomy_item(i) for i in items]


# ── Lookups ───────────────────────────────────────────────────────────────────

def get_lookups(db: Session) -> List[Dict]:
    categories = (
        db.query(LookupCategory)
        .filter(LookupCategory.is_active == True)  # noqa: E712
        .all()
    )
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "entity_type": cat.entity_type,
            "allows_multi": cat.allows_multi,
            "items": [
                {
                    "id": item.id,
                    "code": item.code,
                    "label": item.label,
                    "description": item.description,
                    "color": item.color,
                    "bg_color": item.bg_color,
                    "sort_order": item.sort_order,
                    "is_default": item.is_default,
                }
                for item in cat.items
                if item.is_active
            ],
        }
        for cat in categories
    ]


def get_lookups_by_category(db: Session, category_id: str) -> Optional[Dict]:
    cat = db.query(LookupCategory).filter(LookupCategory.id == category_id).first()
    if not cat:
        return None
    return {
        "id": cat.id,
        "name": cat.name,
        "items": [
            {
                "id": i.id,
                "code": i.code,
                "label": i.label,
                "color": i.color,
                "bg_color": i.bg_color,
                "sort_order": i.sort_order,
            }
            for i in cat.items
            if i.is_active
        ],
    }


# ── Notes ─────────────────────────────────────────────────────────────────────

def get_notes(db: Session, entity_type: str, entity_id: str) -> List[Dict]:
    notes = (
        db.query(Note)
        .filter(
            Note.entity_type == entity_type,
            Note.entity_id == entity_id,
            Note.deleted_at == None,  # noqa: E711
        )
        .order_by(Note.is_pinned.desc(), Note.created_at.desc())
        .all()
    )
    return [_s_note(n) for n in notes]


def create_note(db: Session, data: Dict) -> Dict:
    note = Note(
        id=data.get("id") or _uid(),
        entity_type=data["entity_type"],
        entity_id=data["entity_id"],
        body=data.get("body", ""),
        is_pinned=data.get("is_pinned", False),
        created_at=data.get("created_at") or _now(),
        created_by=data.get("created_by"),
        updated_at=_now(),
        source_id=data.get("source_id"),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _s_note(note)


def update_note(db: Session, note_id: str, data: Dict) -> Optional[Dict]:
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        return None
    for f in ["body", "is_pinned"]:
        if f in data:
            setattr(note, f, data[f])
    note.updated_at = _now()
    db.commit()
    db.refresh(note)
    return _s_note(note)


def delete_note(db: Session, note_id: str) -> bool:
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        return False
    note.deleted_at = _now()
    db.commit()
    return True


# ── Meetings ──────────────────────────────────────────────────────────────────

def get_meetings(
    db: Session,
    org_id: Optional[str] = None,
    fund_id: Optional[str] = None,
    include_deleted: bool = False,
) -> List[Dict]:
    q = db.query(MeetingV2)
    if not include_deleted:
        q = q.filter(MeetingV2.deleted_at == None)  # noqa: E711

    if org_id and fund_id:
        # Filter by org first, then intersect with fund
        q = q.join(MeetingEntity, MeetingV2.id == MeetingEntity.meeting_id).filter(
            MeetingEntity.entity_type == "organization",
            MeetingEntity.entity_id == org_id,
        )
        meetings = q.all()
        linked_fund_meeting_ids = {
            me.meeting_id
            for me in db.query(MeetingEntity).filter(
                MeetingEntity.entity_type == "fund",
                MeetingEntity.entity_id == fund_id,
                MeetingEntity.meeting_id.in_([m.id for m in meetings]),
            ).all()
        }
        return [_s_meeting(m) for m in meetings if m.id in linked_fund_meeting_ids]

    elif org_id:
        q = q.join(MeetingEntity, MeetingV2.id == MeetingEntity.meeting_id).filter(
            MeetingEntity.entity_type == "organization",
            MeetingEntity.entity_id == org_id,
        )
    elif fund_id:
        q = q.join(MeetingEntity, MeetingV2.id == MeetingEntity.meeting_id).filter(
            MeetingEntity.entity_type == "fund",
            MeetingEntity.entity_id == fund_id,
        )

    meetings = q.order_by(MeetingV2.date.desc()).all()
    return [_s_meeting(m) for m in meetings]


def get_meeting(db: Session, meeting_id: str) -> Optional[Dict]:
    m = db.query(MeetingV2).filter(MeetingV2.id == meeting_id).first()
    return _s_meeting(m) if m else None


def create_meeting(db: Session, data: Dict) -> Dict:
    meeting = MeetingV2(
        id=data.get("id") or _uid(),
        date=data.get("date"),
        type_id=data.get("type_id"),
        location=data.get("location"),
        topic=data.get("topic"),
        notes=data.get("notes"),
        created_at=data.get("created_at") or _now(),
        created_by=data.get("created_by"),
    )
    db.add(meeting)
    db.flush()
    for entity in data.get("entities", []):
        db.add(MeetingEntity(
            id=_uid(),
            meeting_id=meeting.id,
            entity_type=entity["entity_type"],
            entity_id=entity["entity_id"],
            is_primary=entity.get("is_primary", False),
        ))
    for attendee in data.get("attendees", []):
        db.add(MeetingAttendee(
            id=_uid(),
            meeting_id=meeting.id,
            person_id=attendee["person_id"],
            org_id=attendee.get("org_id"),
            side=attendee.get("side"),
        ))
    db.commit()
    db.refresh(meeting)
    return _s_meeting(meeting)


def update_meeting(db: Session, meeting_id: str, data: Dict) -> Optional[Dict]:
    meeting = db.query(MeetingV2).filter(MeetingV2.id == meeting_id).first()
    if not meeting:
        return None
    for f in ["date", "type_id", "location", "topic", "notes"]:
        if f in data:
            setattr(meeting, f, data[f])
    if "entities" in data:
        db.query(MeetingEntity).filter(MeetingEntity.meeting_id == meeting_id).delete()
        for entity in data["entities"]:
            db.add(MeetingEntity(
                id=_uid(),
                meeting_id=meeting_id,
                entity_type=entity["entity_type"],
                entity_id=entity["entity_id"],
                is_primary=entity.get("is_primary", False),
            ))
    if "attendees" in data:
        db.query(MeetingAttendee).filter(MeetingAttendee.meeting_id == meeting_id).delete()
        for attendee in data["attendees"]:
            db.add(MeetingAttendee(
                id=_uid(),
                meeting_id=meeting_id,
                person_id=attendee["person_id"],
                org_id=attendee.get("org_id"),
                side=attendee.get("side"),
            ))
    db.commit()
    db.refresh(meeting)
    return _s_meeting(meeting)


def delete_meeting(db: Session, meeting_id: str) -> bool:
    meeting = db.query(MeetingV2).filter(MeetingV2.id == meeting_id).first()
    if not meeting:
        return False
    meeting.deleted_at = _now()
    db.commit()
    return True


# ── People ────────────────────────────────────────────────────────────────────

def get_people(
    db: Session,
    org_id: Optional[str] = None,
    include_deleted: bool = False,
) -> List[Dict]:
    if org_id:
        org_persons = db.query(OrgPerson).filter(OrgPerson.org_id == org_id).all()
        people = [
            op.person for op in org_persons
            if op.person and (include_deleted or not op.person.deleted_at)
        ]
        return [_s_person(p) for p in people]
    q = db.query(Person)
    if not include_deleted:
        q = q.filter(Person.deleted_at == None)  # noqa: E711
    return [_s_person(p) for p in q.order_by(Person.last_name, Person.first_name).all()]


def get_person(db: Session, person_id: str) -> Optional[Dict]:
    p = db.query(Person).filter(Person.id == person_id).first()
    return _s_person(p) if p else None


def create_person(db: Session, data: Dict) -> Dict:
    person = Person(
        id=data.get("id") or _uid(),
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        email=data.get("email"),
        phone=data.get("phone"),
        mobile=data.get("mobile"),
        title=data.get("title"),
        linkedin_url=data.get("linkedin_url"),
        investment_focus=data.get("investment_focus"),
    )
    db.add(person)
    db.flush()
    if data.get("org_id"):
        db.add(OrgPerson(
            id=_uid(),
            org_id=data["org_id"],
            person_id=person.id,
            role=data.get("role"),
            is_primary=data.get("is_primary", False),
        ))
    db.commit()
    db.refresh(person)
    return _s_person(person)


def update_person(db: Session, person_id: str, data: Dict) -> Optional[Dict]:
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return None
    for f in ["first_name", "last_name", "email", "phone", "mobile",
              "title", "linkedin_url", "investment_focus"]:
        if f in data:
            setattr(person, f, data[f])
    db.commit()
    db.refresh(person)
    return _s_person(person)


def delete_person(db: Session, person_id: str) -> bool:
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return False
    person.deleted_at = _now()
    db.commit()
    return True


def link_person_to_org(db: Session, org_id: str, person_id: str, data: Dict) -> Dict:
    op = OrgPerson(
        id=_uid(),
        org_id=org_id,
        person_id=person_id,
        role=data.get("role"),
        is_primary=data.get("is_primary", False),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return _s_org_person(op)


def unlink_person_from_org(db: Session, org_id: str, person_id: str) -> bool:
    op = db.query(OrgPerson).filter(
        OrgPerson.org_id == org_id,
        OrgPerson.person_id == person_id,
    ).first()
    if not op:
        return False
    db.delete(op)
    db.commit()
    return True


# ── Audit Log ─────────────────────────────────────────────────────────────────

def get_audit_log(db: Session, entity_type: str, entity_id: str) -> List[Dict]:
    entries = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.changed_at.desc())
        .all()
    )
    return [_s_audit(e) for e in entries]


# ── Tasks ─────────────────────────────────────────────────────────────────────

def get_tasks(
    db: Session,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    include_deleted: bool = False,
) -> List[Dict]:
    q = db.query(Task)
    if not include_deleted:
        q = q.filter(Task.deleted_at == None)  # noqa: E711
    if entity_type:
        q = q.filter(Task.entity_type == entity_type)
    if entity_id:
        q = q.filter(Task.entity_id == entity_id)
    tasks = q.order_by(Task.is_done, Task.created_at.desc()).all()
    return [_s_task(t) for t in tasks]


def create_task(db: Session, data: Dict) -> Dict:
    task = Task(
        id=data.get("id") or _uid(),
        entity_type=data.get("entity_type"),
        entity_id=data.get("entity_id"),
        text=data["text"],
        due_date=data.get("due_date"),
        priority=data.get("priority"),
        assigned_to=data.get("assigned_to"),
        is_done=data.get("is_done", False),
        created_at=_now(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _s_task(task)


def update_task(db: Session, task_id: str, data: Dict) -> Optional[Dict]:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    for f in ["text", "due_date", "priority", "assigned_to", "is_done"]:
        if f in data:
            setattr(task, f, data[f])
    if data.get("is_done") and not task.completed_at:
        task.completed_at = _now()
    elif not data.get("is_done"):
        task.completed_at = None
    db.commit()
    db.refresh(task)
    return _s_task(task)


def delete_task(db: Session, task_id: str) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    task.deleted_at = _now()
    db.commit()
    return True
