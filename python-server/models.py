"""
models.py — SQLAlchemy ORM table definitions

All column types use SQLAlchemy generics so they map correctly to:
  • SQLite   (local dev)
  • PostgreSQL (optional intermediate)
  • Snowflake (production) via snowflake-sqlalchemy

Numeric fields that the frontend stores as strings (e.g. "25000", "18.5")
are kept as String here for zero-loss round-tripping. Snowflake VARCHAR
handles these without issue.
"""

from sqlalchemy import (
    Boolean, Column, ForeignKey, String, Text,
    PrimaryKeyConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


class PlacementAgent(Base):
    __tablename__ = "CRM_placement_agents"

    id            = Column(String(50),  primary_key=True)
    name          = Column(String(500), nullable=False)
    hq            = Column(String(500))
    website       = Column(String(500))
    contact       = Column(String(500))
    contact_email = Column(String(500))
    notes         = Column(Text)

    funds = relationship("Fund", back_populates="placement_agent",
                         foreign_keys="[Fund.placement_agent_id]", lazy="selectin")


class GP(Base):
    __tablename__ = "CRM_gps"

    id             = Column(String(50),  primary_key=True)
    name           = Column(String(500), nullable=False)
    hq             = Column(String(500))
    website        = Column(String(500))
    score          = Column(String(10))
    owner          = Column(String(200))
    contact        = Column(String(500))
    contact_email  = Column(String(500))
    notes          = Column(Text)

    funds    = relationship("Fund",    back_populates="gp",  cascade="all, delete-orphan", lazy="selectin")
    meetings = relationship("Meeting", back_populates="gp",  cascade="all, delete-orphan", lazy="selectin")


class Fund(Base):
    __tablename__ = "CRM_funds"

    id                  = Column(String(50),  primary_key=True)
    gp_id               = Column(String(50),  ForeignKey("CRM_gps.id",   ondelete="CASCADE"), nullable=False)

    # Identity
    name                = Column(String(500), nullable=False)
    series              = Column(String(200))
    strategy            = Column(String(200))
    sub_strategy        = Column(String(200))
    vintage             = Column(String(10))
    currency            = Column(String(10))
    status              = Column(String(100))
    score               = Column(String(10))
    notes               = Column(Text)

    # Fundraising planning
    raised_date         = Column(String(20))   # "as of" date for raisedSize
    next_market         = Column(String(100))  # e.g. "2027-Q2"
    expected_amount     = Column(String(50))   # planned commitment size
    ic_date             = Column(String(20))   # investment committee date

    # Sizing (stored as string — frontend sends "25000" etc.)
    target_size         = Column(String(50))
    raised_size         = Column(String(50))
    final_size          = Column(String(50))
    hard_cap            = Column(String(50))

    # Investment position
    invested            = Column(Boolean, default=False)
    investment_amount   = Column(String(50))
    investment_currency = Column(String(10))

    # Fundraising timeline
    launch_date         = Column(String(20))
    first_close_date    = Column(String(20))
    next_close_date     = Column(String(20))
    final_close_date    = Column(String(20))

    # Performance metrics (stored as string — frontend sends "18.5", "2.0", etc.)
    net_irr             = Column(String(50))
    net_moic            = Column(String(50))
    gross_irr           = Column(String(50))
    gross_moic          = Column(String(50))
    dpi                 = Column(String(50))
    tvpi                = Column(String(50))
    rvpi                = Column(String(50))
    nav                 = Column(String(50))
    undrawn_value       = Column(String(50))
    perf_date           = Column(String(20))

    placement_agent_id = Column(String(50), ForeignKey("CRM_placement_agents.id", ondelete="SET NULL"), nullable=True)

    gp               = relationship("GP",              back_populates="funds")
    placement_agent  = relationship("PlacementAgent",  back_populates="funds",
                                    foreign_keys=[placement_agent_id])
    sectors          = relationship("FundSector", back_populates="fund", cascade="all, delete-orphan", lazy="selectin")


class FundSector(Base):
    """Many-to-many join for fund ↔ sector strings (no separate sector table needed)."""
    __tablename__ = "CRM_fund_sectors"
    __table_args__ = (PrimaryKeyConstraint("fund_id", "sector"),)

    fund_id = Column(String(50), ForeignKey("CRM_funds.id", ondelete="CASCADE"), nullable=False)
    sector  = Column(String(200), nullable=False)

    fund = relationship("Fund", back_populates="sectors")


class Meeting(Base):
    __tablename__ = "CRM_meetings"

    id         = Column(String(50),  primary_key=True)
    gp_id      = Column(String(50),  ForeignKey("CRM_gps.id",   ondelete="CASCADE"), nullable=False)
    fund_id    = Column(String(50),  ForeignKey("CRM_funds.id", ondelete="SET NULL"), nullable=True)

    date           = Column(String(20))
    type           = Column(String(100))
    location       = Column(String(500))
    topic          = Column(String(500))
    notes          = Column(Text)
    attendees_them = Column(Text)   # JSON array of strings
    attendees_us   = Column(Text)   # JSON array of strings
    logged_by      = Column(String(200))
    logged_at      = Column(String(50))

    gp   = relationship("GP",   back_populates="meetings")
    fund = relationship("Fund")


class PipelineItem(Base):
    __tablename__ = "CRM_pipeline"

    id             = Column(String(50),  primary_key=True)
    gp_name        = Column(String(500))
    stage          = Column(String(100))
    added_at       = Column(String(50))
    pipeline_notes = Column(Text)
    fund_id        = Column(String(50),  ForeignKey("CRM_funds.id", ondelete="SET NULL"), nullable=True)


class Todo(Base):
    __tablename__ = "CRM_todos"

    id         = Column(String(50),  primary_key=True)
    text       = Column(Text,        nullable=False)
    done       = Column(Boolean,     default=False)
    created_at = Column(String(50))


# ── History / Audit tables ────────────────────────────────────────────────────
# These tables are APPEND-ONLY (never cleared by upsert_all_data).
# fund_id columns intentionally have NO FK constraint so history is preserved
# even after a fund is recreated or a row is momentarily absent.

class FundPerformanceSnapshot(Base):
    """
    One row per (fund_id, perf_date) pair.
    Upserted in place when the user edits performance metrics for the same
    'as of' date; a new row is inserted when perfDate changes.
    """
    __tablename__ = "CRM_fund_performance_snapshots"

    id            = Column(String(50), primary_key=True)
    fund_id       = Column(String(50), nullable=False, index=True)
    perf_date     = Column(String(20))          # "as of" date — can be NULL

    net_irr       = Column(String(50))
    net_moic      = Column(String(50))
    gross_irr     = Column(String(50))
    gross_moic    = Column(String(50))
    dpi           = Column(String(50))
    tvpi          = Column(String(50))
    rvpi          = Column(String(50))
    nav           = Column(String(50))
    undrawn_value = Column(String(50))

    recorded_at   = Column(String(50), nullable=False)   # ISO timestamp


class FundRaisedSnapshot(Base):
    """One row per raisedSize change — builds a fundraising progress timeline."""
    __tablename__ = "CRM_fund_raised_snapshots"

    id          = Column(String(50), primary_key=True)
    fund_id     = Column(String(50), nullable=False, index=True)
    raised_size = Column(String(50))
    recorded_at = Column(String(50), nullable=False)


class AppSettings(Base):
    """Single-row singleton — stores the entire settings JSON blob."""
    __tablename__ = "CRM_app_settings"

    id   = Column(String(10), primary_key=True, default="singleton")
    data = Column(Text, nullable=False, default="{}")


class ChangeLog(Base):
    """
    Generic audit log for tracked scalar fields:
      • fund  : score, status
      • gp    : score, owner
      • pipeline : stage
    related_fund_id lets us query all changes affecting a given fund
    (including pipeline stage changes that reference it).
    """
    __tablename__ = "CRM_change_log"

    id              = Column(String(50),  primary_key=True)
    entity_type     = Column(String(50),  nullable=False)   # 'fund' | 'gp' | 'pipeline'
    entity_id       = Column(String(50),  nullable=False)
    entity_name     = Column(String(500))                   # denormalized for display
    field_name      = Column(String(100), nullable=False)   # 'score' | 'status' | 'owner' | 'stage'
    old_value       = Column(String(500))
    new_value       = Column(String(500))
    changed_at      = Column(String(50),  nullable=False)
    changed_by      = Column(String(200))                   # future: user ID
    related_fund_id = Column(String(50))                    # pipeline changes: FK-to-fund (no constraint)
