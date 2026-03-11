"""
models.py — SQLAlchemy ORM definitions

Table order follows the 8-layer design:
  1. Taxonomy           — self-referencing classification trees
  2. Lookup Definitions — configurable enum-like lists
  3. Core Entities      — organization, person, org_person, fund, fund_placement_agent
  4. EAV                — entity_attribute (sparse/optional fields)
  5. Data Provenance    — data_source, field_provenance
  5b. Tasks             — task (entity-attached, replaces todos)
  6. Notes              — note (first-class, polymorphic)
  7. Meetings           — meeting, meeting_entity, meeting_attendee
  8. Audit Log          — audit_log (universal)
  8b. External Data     — external_source, external_column_map (Preqin etc.)
"""

from sqlalchemy import (
    Boolean, Column, ForeignKey, Index, Integer, String, Text,
)
from sqlalchemy.orm import backref, relationship

from database import Base


# ── Layer 1: Taxonomy ─────────────────────────────────────────────────────────

class TaxonomyItem(Base):
    """
    Single self-referencing tree for all entity classifications.
    type values: geography | strategy | sector | target_market
    """
    __tablename__ = "taxonomy_item"

    id          = Column(String(50),  primary_key=True)
    type        = Column(String(50),  nullable=False)
    name        = Column(String(500), nullable=False)
    parent_id   = Column(String(50),  ForeignKey("taxonomy_item.id"), nullable=True)
    level_label = Column(String(100))   # e.g. "country", "region", "sub-strategy"
    sort_order  = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    description = Column(Text)
    metadata_   = Column("metadata", Text)   # JSON blob e.g. {"iso_code": "NO"}

    # Adjacency list — children backref creates parent on each child
    children = relationship(
        "TaxonomyItem",
        backref=backref("parent", remote_side="TaxonomyItem.id"),
        foreign_keys=[parent_id],
    )


class EntityTaxonomy(Base):
    """Polymorphic join: any entity → many taxonomy items (no cardinality limit)."""
    __tablename__ = "entity_taxonomy"
    __table_args__ = (
        Index("ix_et_entity",   "entity_type", "entity_id"),
        Index("ix_et_taxonomy", "taxonomy_id"),
    )

    id          = Column(String(50), primary_key=True)
    entity_type = Column(String(50), nullable=False)   # fund | organization | person | meeting
    entity_id   = Column(String(50), nullable=False)
    taxonomy_id = Column(String(50), ForeignKey("taxonomy_item.id"), nullable=False)
    is_primary  = Column(Boolean, default=False)
    created_at  = Column(String(50))
    created_by  = Column(String(200))

    taxonomy = relationship("TaxonomyItem")


# ── Layer 2: Lookup Definitions ───────────────────────────────────────────────

class LookupCategory(Base):
    """
    Named group of configurable enum values.
    Replaces hardcoded SCORE_CONFIG, STATUS_OPTIONS, PIPELINE_STAGES, etc.
    """
    __tablename__ = "lookup_category"

    id           = Column(String(50),  primary_key=True)
    name         = Column(String(200), nullable=False)
    entity_type  = Column(String(50))    # organization | fund | meeting | global
    description  = Column(Text)
    allows_multi = Column(Boolean, default=False)
    is_active    = Column(Boolean, default=True)

    items = relationship(
        "LookupItem",
        back_populates="category",
        order_by="LookupItem.sort_order",
        cascade="all, delete-orphan",
    )


class LookupItem(Base):
    """Single configurable enum value within a category."""
    __tablename__ = "lookup_item"

    id          = Column(String(50),  primary_key=True)
    category_id = Column(String(50),  ForeignKey("lookup_category.id"), nullable=False)
    code        = Column(String(100), nullable=False)   # stable key used in code: "A", "watching"
    label       = Column(String(200), nullable=False)   # display string: "Top Tier", "Watching"
    description = Column(Text)
    color       = Column(String(20))    # hex text colour
    bg_color    = Column(String(20))    # hex badge background
    sort_order  = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)
    is_default  = Column(Boolean, default=False)

    category = relationship("LookupCategory", back_populates="items")


# ── Layer 3: Core Entities ────────────────────────────────────────────────────

class Organization(Base):
    """
    Replaces the CRM_gps table. Covers GPs, placement agents, co-investors etc.
    org_type: gp | placement_agent | co_investor | lp | advisor | other
    """
    __tablename__ = "organization"

    id                   = Column(String(50),  primary_key=True)
    org_type             = Column(String(50),  nullable=False)
    name                 = Column(String(500), nullable=False)
    hq_geography_id      = Column(String(50),  ForeignKey("taxonomy_item.id"), nullable=True)
    website              = Column(String(500))
    aum                  = Column(String(50))
    aum_currency         = Column(String(10))
    aum_date             = Column(String(20))
    founded_year         = Column(Integer)
    first_fund_year      = Column(Integer)
    funds_raised_count   = Column(Integer)
    investment_team_size = Column(Integer)
    total_team_size      = Column(Integer)
    regulatory_body      = Column(String(200))
    pri_signatory        = Column(Boolean, default=False)
    ilpa_member          = Column(Boolean, default=False)
    spin_out_from_org_id = Column(String(50),  ForeignKey("organization.id"), nullable=True)
    rating_id            = Column(String(50),  ForeignKey("lookup_item.id"),  nullable=True)
    owner                = Column(String(200))
    is_active            = Column(Boolean, default=True)
    notes_text           = Column(Text)                    # migrated to note table; kept for compat
    preqin_manager_id    = Column(String(100))             # Preqin "Firm ID" for auto-matching
    deleted_at           = Column(String(50))              # soft delete — NULL = active

    hq_geography  = relationship("TaxonomyItem",  foreign_keys=[hq_geography_id])
    spin_out_from = relationship(
        "Organization",
        foreign_keys=[spin_out_from_org_id],
        remote_side="Organization.id",
    )
    rating  = relationship("LookupItem",    foreign_keys=[rating_id])
    funds   = relationship("FundV2",        back_populates="org", cascade="all, delete-orphan", foreign_keys="[FundV2.org_id]")
    people  = relationship("OrgPerson",     back_populates="org", cascade="all, delete-orphan")


class Person(Base):
    __tablename__ = "person"

    id               = Column(String(50),  primary_key=True)
    first_name       = Column(String(200))
    last_name        = Column(String(200))
    email            = Column(String(500))
    phone            = Column(String(100))
    mobile           = Column(String(100))
    title            = Column(String(200))
    linkedin_url     = Column(String(500))
    investment_focus = Column(Text)
    is_active        = Column(Boolean, default=True)
    deleted_at       = Column(String(50))

    org_memberships = relationship("OrgPerson", back_populates="person", cascade="all, delete-orphan")


class OrgPerson(Base):
    """Many-to-many between Organization and Person with role + tenure."""
    __tablename__ = "org_person"

    id         = Column(String(50), primary_key=True)
    org_id     = Column(String(50), ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    person_id  = Column(String(50), ForeignKey("person.id",       ondelete="CASCADE"), nullable=False)
    role       = Column(String(200))
    is_primary = Column(Boolean, default=False)
    start_date = Column(String(20))
    end_date   = Column(String(20))   # NULL = current

    org    = relationship("Organization", back_populates="people")
    person = relationship("Person",       back_populates="org_memberships")


class FundV2(Base):
    """
    Replaces CRM_funds. Table name is 'fund' (no CRM_ prefix).
    Python class is FundV2 to avoid collision with old Fund class during migration.
    """
    __tablename__ = "fund"

    id     = Column(String(50),  primary_key=True)
    org_id = Column(String(50),  ForeignKey("organization.id", ondelete="CASCADE"), nullable=False)
    name   = Column(String(500), nullable=False)
    series = Column(String(200))
    vintage  = Column(Integer)
    currency = Column(String(10))

    # ── Sizing ────────────────────────────────────────────────────────────────
    target_size    = Column(String(50))
    raised_size    = Column(String(50))
    raised_date    = Column(String(20))
    final_size     = Column(String(50))
    hard_cap       = Column(String(50))
    min_commitment = Column(String(50))

    # ── Economics ─────────────────────────────────────────────────────────────
    management_fee_rate   = Column(String(20))    # e.g. "2.0"
    management_fee_basis  = Column(String(50))    # committed_capital | invested_capital | nav
    carry_rate            = Column(String(20))    # e.g. "20"
    hurdle_rate           = Column(String(20))    # preferred return e.g. "8"
    gp_commitment_pct     = Column(String(20))    # e.g. "1"
    gp_commitment_amount  = Column(String(50))
    waterfall_type        = Column(String(50))    # european | american
    catch_up              = Column(String(200))

    # ── Fund terms ────────────────────────────────────────────────────────────
    investment_period_years = Column(String(10))
    fund_term_years         = Column(String(10))
    extension_options       = Column(String(100))   # e.g. "2 x 1 year"
    recycling_provisions    = Column(String(200))

    # ── Legal / structure ─────────────────────────────────────────────────────
    legal_structure   = Column(String(100))   # LP, SCSp, SICAV, LLC, etc.
    domicile          = Column(String(200))   # Cayman, Luxembourg, Delaware, etc.
    regulatory_regime = Column(String(100))   # AIFMD, SEC-registered, exempt, etc.

    # ── LP position — pre-commitment ──────────────────────────────────────────
    expected_amount   = Column(String(50))
    expected_currency = Column(String(10))
    ic_date           = Column(String(20))

    # ── LP position — post-commitment ─────────────────────────────────────────
    committed_amount     = Column(String(50))
    committed_currency   = Column(String(10))
    committed_date       = Column(String(20))
    called_amount        = Column(String(50))
    uncalled_amount      = Column(String(50))
    distributions_amount = Column(String(50))
    cost_basis           = Column(String(50))
    is_on_lpac           = Column(Boolean, default=False)
    co_invest_rights     = Column(Boolean, default=False)

    # ── Legacy investment flag (kept for migration compat) ────────────────────
    invested            = Column(Boolean, default=False)
    investment_amount   = Column(String(50))
    investment_currency = Column(String(10))

    # ── Deal introduction ─────────────────────────────────────────────────────
    introduced_by_org_id    = Column(String(50), ForeignKey("organization.id"), nullable=True)
    introduced_by_person_id = Column(String(50), ForeignKey("person.id"),       nullable=True)
    introduced_at           = Column(String(20))

    # ── Fundraising timeline ──────────────────────────────────────────────────
    launch_date      = Column(String(20))
    first_close_date = Column(String(20))
    next_close_date  = Column(String(20))
    final_close_date = Column(String(20))

    # ── Status / rating / pipeline (FK to configurable lookup_item) ───────────
    status_id         = Column(String(50), ForeignKey("lookup_item.id"), nullable=True)
    rating_id         = Column(String(50), ForeignKey("lookup_item.id"), nullable=True)
    pipeline_stage_id = Column(String(50), ForeignKey("lookup_item.id"), nullable=True)
    pipeline_added_at = Column(String(50))

    owner = Column(String(200))

    # ── Performance metrics (all VARCHAR — frontend sends strings) ────────────
    net_irr       = Column(String(50))
    net_moic      = Column(String(50))
    gross_irr     = Column(String(50))
    gross_moic    = Column(String(50))
    dpi           = Column(String(50))
    tvpi          = Column(String(50))
    rvpi          = Column(String(50))
    nav           = Column(String(50))
    undrawn_value = Column(String(50))
    perf_date     = Column(String(20))

    # ── Performance context ───────────────────────────────────────────────────
    quartile_ranking = Column(Integer)
    benchmark_name   = Column(String(200))
    pme              = Column(String(50))
    pme_index        = Column(String(200))

    # ── External IDs ──────────────────────────────────────────────────────────
    preqin_fund_id   = Column(String(100))   # Preqin "Fund ID"
    preqin_series_id = Column(String(100))   # Preqin "Fund Series ID"

    impact_flag = Column(Boolean, default=False)   # ESG/Impact strategy flag

    deleted_at = Column(String(50))   # soft delete — NULL = active

    org                  = relationship("Organization",  back_populates="funds",            foreign_keys=[org_id])
    introduced_by_org    = relationship("Organization",  foreign_keys=[introduced_by_org_id])
    introduced_by_person = relationship("Person",        foreign_keys=[introduced_by_person_id])
    status               = relationship("LookupItem",    foreign_keys=[status_id])
    rating               = relationship("LookupItem",    foreign_keys=[rating_id])
    pipeline_stage       = relationship("LookupItem",    foreign_keys=[pipeline_stage_id])
    placement_agents     = relationship("FundPlacementAgent", back_populates="fund", cascade="all, delete-orphan")


class FundPlacementAgent(Base):
    """Links a fund to one or more placement agents for that fundraise."""
    __tablename__ = "fund_placement_agent"

    id            = Column(String(50), primary_key=True)
    fund_id       = Column(String(50), ForeignKey("fund.id",         ondelete="CASCADE"), nullable=False)
    org_id        = Column(String(50), ForeignKey("organization.id"), nullable=False)
    mandate_start = Column(String(20))
    mandate_end   = Column(String(20))   # NULL = active mandate
    is_active     = Column(Boolean, default=True)
    notes         = Column(Text)

    fund = relationship("FundV2",       back_populates="placement_agents")
    org  = relationship("Organization")


# ── Layer 4: EAV (sparse / optional attributes) ───────────────────────────────

class EntityAttribute(Base):
    """
    Key-value store for fields that only apply to some entities.
    e.g. ESG rating, SFDR article, jurisdiction, domicile variants.
    In Snowflake production consider using a VARIANT column instead.
    """
    __tablename__ = "entity_attribute"
    __table_args__ = (
        Index("ix_ea_entity", "entity_type", "entity_id"),
    )

    id             = Column(String(50),  primary_key=True)
    entity_type    = Column(String(50),  nullable=False)   # fund | organization | person
    entity_id      = Column(String(50),  nullable=False)
    key            = Column(String(200), nullable=False)   # e.g. "esg_rating", "sfdr_article"
    value          = Column(Text)
    data_type      = Column(String(20))    # text | number | date | boolean | url
    source_id      = Column(String(50),  ForeignKey("data_source.id"), nullable=True)
    status         = Column(String(20),  default="manual")   # manual | pending_review | accepted | rejected
    original_value = Column(Text)          # preserved if external value was accepted then edited
    created_at     = Column(String(50))
    updated_at     = Column(String(50))
    accepted_at    = Column(String(50))
    accepted_by    = Column(String(200))


# ── Layer 5: Data Provenance ──────────────────────────────────────────────────

class DataSource(Base):
    """Registry of data origins — manual entry, Preqin, PitchBook, etc."""
    __tablename__ = "data_source"

    id          = Column(String(50),  primary_key=True)
    name        = Column(String(200), nullable=False)   # e.g. "Preqin", "Manual Entry"
    source_type = Column(String(50))    # manual | external_api | file_import | calculated
    provider    = Column(String(200))
    fetched_at  = Column(String(50))
    notes       = Column(Text)


class FieldProvenance(Base):
    """
    Tracks externally proposed field values pending user accept/reject.
    status: pending | accepted | rejected | superseded
    """
    __tablename__ = "field_provenance"
    __table_args__ = (
        Index("ix_fp_entity", "entity_type", "entity_id"),
    )

    id                      = Column(String(50),  primary_key=True)
    entity_type             = Column(String(50),  nullable=False)
    entity_id               = Column(String(50),  nullable=False)
    field_name              = Column(String(200), nullable=False)
    value                   = Column(Text)
    source_id               = Column(String(50),  ForeignKey("data_source.id"), nullable=True)
    status                  = Column(String(20),  nullable=False, default="pending")
    original_external_value = Column(Text)   # preserved after accept + subsequent edit
    proposed_at             = Column(String(50))
    accepted_at             = Column(String(50))
    accepted_by             = Column(String(200))
    rejected_at             = Column(String(50))
    rejected_by             = Column(String(200))

    source = relationship("DataSource")


# ── Layer 5b: Tasks ───────────────────────────────────────────────────────────

class Task(Base):
    """
    Entity-attached tasks. Replaces the flat CRM_todos table.
    entity_type=NULL means a global (unattached) task.
    """
    __tablename__ = "task"
    __table_args__ = (
        Index("ix_task_entity", "entity_type", "entity_id"),
    )

    id           = Column(String(50), primary_key=True)
    entity_type  = Column(String(50))   # fund | organization | person | meeting | NULL
    entity_id    = Column(String(50))
    text         = Column(Text,        nullable=False)
    due_date     = Column(String(20))
    priority     = Column(String(20))   # high | medium | low
    assigned_to  = Column(String(200))
    is_done      = Column(Boolean, default=False)
    created_at   = Column(String(50))
    completed_at = Column(String(50))
    deleted_at   = Column(String(50))


# ── Layer 6: Notes ────────────────────────────────────────────────────────────

class Note(Base):
    """
    First-class note table. Body is plain markdown text.
    Polymorphic: attaches to any entity via entity_type + entity_id.
    Meeting notes are stored inline on the meeting row instead (simpler UX).
    """
    __tablename__ = "note"
    __table_args__ = (
        Index("ix_note_entity", "entity_type", "entity_id"),
    )

    id          = Column(String(50), primary_key=True)
    entity_type = Column(String(50), nullable=False)   # fund | organization | person
    entity_id   = Column(String(50), nullable=False)
    body        = Column(Text,       nullable=False)
    is_pinned   = Column(Boolean, default=False)
    created_at  = Column(String(50))
    created_by  = Column(String(200))
    updated_at  = Column(String(50))
    source_id   = Column(String(50), ForeignKey("data_source.id"), nullable=True)
    deleted_at  = Column(String(50))


# ── Layer 7: Meetings ─────────────────────────────────────────────────────────

class MeetingV2(Base):
    """
    Replaces CRM_meetings. Table name is 'meeting'.
    Links to multiple entities (org, fund, person) via MeetingEntity.
    Inline notes field saved with the form — no separate note table entry for meetings.
    """
    __tablename__ = "meeting"

    id         = Column(String(50), primary_key=True)
    date       = Column(String(20))
    type_id    = Column(String(50), ForeignKey("lookup_item.id"), nullable=True)
    location   = Column(String(500))
    topic      = Column(String(500))
    notes      = Column(Text)       # inline markdown notes, saved with the meeting form
    created_at = Column(String(50))
    created_by = Column(String(200))
    deleted_at = Column(String(50))

    type      = relationship("LookupItem")
    entities  = relationship("MeetingEntity",  back_populates="meeting", cascade="all, delete-orphan")
    attendees = relationship("MeetingAttendee", back_populates="meeting", cascade="all, delete-orphan")


class MeetingEntity(Base):
    """Polymorphic link from a meeting to any entity (org, fund, person)."""
    __tablename__ = "meeting_entity"
    __table_args__ = (
        Index("ix_me_meeting", "meeting_id"),
        Index("ix_me_entity",  "entity_type", "entity_id"),
    )

    id          = Column(String(50), primary_key=True)
    meeting_id  = Column(String(50), ForeignKey("meeting.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), nullable=False)   # fund | organization | person
    entity_id   = Column(String(50), nullable=False)
    is_primary  = Column(Boolean, default=False)

    meeting = relationship("MeetingV2", back_populates="entities")


class MeetingAttendee(Base):
    """Individual person attending a meeting, with which org they represented."""
    __tablename__ = "meeting_attendee"

    id         = Column(String(50), primary_key=True)
    meeting_id = Column(String(50), ForeignKey("meeting.id",       ondelete="CASCADE"), nullable=False)
    person_id  = Column(String(50), ForeignKey("person.id"),        nullable=True)
    org_id     = Column(String(50), ForeignKey("organization.id"),  nullable=True)
    side       = Column(String(50))   # us | them | placement_agent | other

    meeting = relationship("MeetingV2",    back_populates="attendees")
    person  = relationship("Person")
    org     = relationship("Organization")


# ── Layer 8: Universal Audit Log ─────────────────────────────────────────────

class AuditLog(Base):
    """
    Universal append-only audit trail for all entity field changes.
    Replaces CRM_change_log + CRM_fund_raised_snapshots + CRM_fund_performance_snapshots.

    perf_date is set on performance metric rows so the History tab can
    reconstruct a snapshot by grouping all metric rows sharing the same perf_date.
    """
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_al_entity",  "entity_type", "entity_id"),
        Index("ix_al_changed", "changed_at"),
        Index("ix_al_perf",    "entity_id", "perf_date"),
    )

    id          = Column(String(50),  primary_key=True)
    entity_type = Column(String(50),  nullable=False)
    entity_id   = Column(String(50),  nullable=False)
    entity_name = Column(String(500))                  # denormalized for display
    field_name  = Column(String(200), nullable=False)
    old_value   = Column(Text)
    new_value   = Column(Text)
    data_type   = Column(String(20))    # text | number | date | boolean | lookup | taxonomy
    note        = Column(Text)          # optional change annotation e.g. "Upgraded after Q3 call"
    perf_date   = Column(String(20))    # only set for performance metric changes
    changed_at  = Column(String(50),  nullable=False)
    changed_by  = Column(String(200))
    source_id   = Column(String(50),  ForeignKey("data_source.id"), nullable=True)

    source = relationship("DataSource")


# ── Layer 8b: External Data Integration ──────────────────────────────────────

class ExternalSource(Base):
    """
    Registry of external database files in python-server/external/.
    Files are updated manually and never committed to git.
    App works fully without any external files present.
    """
    __tablename__ = "external_source"

    id          = Column(String(50),  primary_key=True)
    name        = Column(String(100), nullable=False)   # e.g. "preqin"
    file_path   = Column(String(500))    # relative to python-server/: "external/preqin_funds.db"
    description = Column(Text)
    last_synced = Column(String(50))     # ISO timestamp of last successful sync

    column_maps = relationship("ExternalColumnMap", back_populates="source", cascade="all, delete-orphan")


class ExternalColumnMap(Base):
    """
    Maps an external DB column header to one of our entity fields.
    When a provider renames a column, update this table — no code change needed.
    our_field_name can be a direct column (e.g. "net_irr") or an EAV key
    prefixed with "entity_attribute:" (e.g. "entity_attribute:esg_labels").
    """
    __tablename__ = "external_column_map"

    id              = Column(Integer,     primary_key=True, autoincrement=True)
    source_id       = Column(String(50),  ForeignKey("external_source.id"), nullable=False)
    external_table  = Column(String(200))    # table name inside external DB
    external_column = Column(String(200),  nullable=False)   # exact column header
    our_entity_type = Column(String(50),   nullable=False)   # fund | organization
    our_field_name  = Column(String(100),  nullable=False)   # our column or "entity_attribute:key"
    transform       = Column(String(50))     # to_int | to_str | to_date | parse_percent
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text)           # e.g. "Renamed from X in Mar 2026 export"

    source = relationship("ExternalSource", back_populates="column_maps")


class PreqinLinkIgnore(Base):
    """
    Stores fund→Preqin pairs that the user has chosen to ignore.
    Ensures the same suggestion is never surfaced again.
    """
    __tablename__ = "preqin_link_ignore"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    fund_id        = Column(String(50), nullable=False)
    preqin_fund_id = Column(String(100), nullable=False)
    ignored_at     = Column(String(50))   # ISO timestamp
