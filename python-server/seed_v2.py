"""
seed_v2.py — Seed reference data for the v2 data model.

Populates:
  - taxonomy_item  (geography tree, strategy tree, sector list, target market list)
  - lookup_category + lookup_item  (ratings, statuses, pipeline stages, meeting types)
  - data_source    (manual entry, Preqin)
  - external_source + external_column_map  (Preqin DB column mappings)

Safe to run multiple times — each record is upserted by primary key.

Usage:
    cd python-server
    /usr/bin/python3 seed_v2.py
"""

import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from database import SessionLocal, init_db
from models import (
    TaxonomyItem, LookupCategory, LookupItem,
    DataSource, ExternalSource, ExternalColumnMap,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def upsert(db, model, **kwargs):
    """Insert or update by primary key (id for most tables, autoincrement for ExternalColumnMap)."""
    pk = kwargs.get("id")
    if pk is not None:
        existing = db.get(model, pk)
        if existing:
            for k, v in kwargs.items():
                setattr(existing, k, v)
            return existing
    obj = model(**kwargs)
    db.add(obj)
    return obj


def upsert_column_map(db, **kwargs):
    """Upsert ExternalColumnMap by (source_id, external_column)."""
    existing = (
        db.query(ExternalColumnMap)
        .filter_by(source_id=kwargs["source_id"], external_column=kwargs["external_column"])
        .first()
    )
    if existing:
        for k, v in kwargs.items():
            if k != "id":
                setattr(existing, k, v)
        return existing
    obj = ExternalColumnMap(**{k: v for k, v in kwargs.items() if k != "id"})
    db.add(obj)
    return obj


# ── Geography tree ────────────────────────────────────────────────────────────

GEO = [
    # (id, name, parent_id, level_label, sort_order)
    ("geo_global",          "Global",               None,               "global",       0),

    # Continents / major regions
    ("geo_europe",          "Europe",               "geo_global",       "continent",    10),
    ("geo_americas",        "Americas",             "geo_global",       "continent",    20),
    ("geo_apac",            "Asia-Pacific",         "geo_global",       "continent",    30),
    ("geo_mea",             "Middle East & Africa", "geo_global",       "continent",    40),

    # Europe sub-regions
    ("geo_nordics",         "Nordics",              "geo_europe",       "region",       10),
    ("geo_dach",            "DACH",                 "geo_europe",       "region",       20),
    ("geo_benelux",         "Benelux",              "geo_europe",       "region",       30),
    ("geo_uk_ire",          "UK & Ireland",         "geo_europe",       "region",       40),
    ("geo_southern_europe", "Southern Europe",      "geo_europe",       "region",       50),
    ("geo_cee",             "Central & Eastern Europe", "geo_europe",   "region",       60),
    ("geo_other_europe",    "Other Europe",         "geo_europe",       "region",       70),

    # Nordics countries
    ("geo_norway",          "Norway",               "geo_nordics",      "country",      10),
    ("geo_sweden",          "Sweden",               "geo_nordics",      "country",      20),
    ("geo_denmark",         "Denmark",              "geo_nordics",      "country",      30),
    ("geo_finland",         "Finland",              "geo_nordics",      "country",      40),
    ("geo_iceland",         "Iceland",              "geo_nordics",      "country",      50),

    # DACH countries
    ("geo_germany",         "Germany",              "geo_dach",         "country",      10),
    ("geo_austria",         "Austria",              "geo_dach",         "country",      20),
    ("geo_switzerland",     "Switzerland",          "geo_dach",         "country",      30),

    # Benelux countries
    ("geo_netherlands",     "Netherlands",          "geo_benelux",      "country",      10),
    ("geo_belgium",         "Belgium",              "geo_benelux",      "country",      20),
    ("geo_luxembourg",      "Luxembourg",           "geo_benelux",      "country",      30),

    # UK & Ireland
    ("geo_uk",              "United Kingdom",       "geo_uk_ire",       "country",      10),
    ("geo_ireland",         "Ireland",              "geo_uk_ire",       "country",      20),

    # Southern Europe
    ("geo_france",          "France",               "geo_southern_europe", "country",   10),
    ("geo_italy",           "Italy",                "geo_southern_europe", "country",   20),
    ("geo_spain",           "Spain",                "geo_southern_europe", "country",   30),
    ("geo_portugal",        "Portugal",             "geo_southern_europe", "country",   40),

    # CEE
    ("geo_poland",          "Poland",               "geo_cee",          "country",      10),
    ("geo_czechia",         "Czech Republic",       "geo_cee",          "country",      20),
    ("geo_hungary",         "Hungary",              "geo_cee",          "country",      30),
    ("geo_romania",         "Romania",              "geo_cee",          "country",      40),

    # Americas
    ("geo_north_america",   "North America",        "geo_americas",     "region",       10),
    ("geo_latin_america",   "Latin America",        "geo_americas",     "region",       20),

    # North America countries
    ("geo_usa",             "United States",        "geo_north_america","country",      10),
    ("geo_canada",          "Canada",               "geo_north_america","country",      20),

    # Latin America
    ("geo_brazil",          "Brazil",               "geo_latin_america","country",      10),
    ("geo_mexico",          "Mexico",               "geo_latin_america","country",      20),
    ("geo_other_latam",     "Other Latin America",  "geo_latin_america","country",      30),

    # Asia-Pacific
    ("geo_china",           "China",                "geo_apac",         "country",      10),
    ("geo_japan",           "Japan",                "geo_apac",         "country",      20),
    ("geo_india",           "India",                "geo_apac",         "country",      30),
    ("geo_australia",       "Australia",            "geo_apac",         "country",      40),
    ("geo_southeast_asia",  "Southeast Asia",       "geo_apac",         "region",       50),
    ("geo_south_korea",     "South Korea",          "geo_apac",         "country",      60),
    ("geo_other_apac",      "Other Asia-Pacific",   "geo_apac",         "country",      70),

    # Middle East & Africa
    ("geo_middle_east",     "Middle East",          "geo_mea",          "region",       10),
    ("geo_africa",          "Africa",               "geo_mea",          "region",       20),
]


# ── Strategy tree ─────────────────────────────────────────────────────────────

STR = [
    # Asset classes (roots)
    ("str_pe",          "Private Equity",               None,           "asset_class",   10),
    ("str_pd",          "Private Debt",                 None,           "asset_class",   20),
    ("str_infra",       "Infrastructure",               None,           "asset_class",   30),
    ("str_re",          "Real Estate",                  None,           "asset_class",   40),
    ("str_vc",          "Venture Capital",              None,           "asset_class",   50),
    ("str_nr",          "Natural Resources",            None,           "asset_class",   60),
    ("str_hf",          "Hedge Funds",                  None,           "asset_class",   70),
    ("str_multi",       "Multi / Fund of Funds",        None,           "asset_class",   80),

    # Private Equity strategies
    ("str_pe_buyout",   "Buyout",                       "str_pe",       "strategy",      10),
    ("str_pe_growth",   "Growth Equity",                "str_pe",       "strategy",      20),
    ("str_pe_vc",       "Venture Capital",              "str_pe",       "strategy",      30),  # PE-flavour VC
    ("str_pe_secondaries", "Secondaries",               "str_pe",       "strategy",      40),
    ("str_pe_other",    "Other Private Equity",         "str_pe",       "strategy",      50),

    # Buyout sub-strategies
    ("str_pe_buyout_mega",  "Buyout Mega / Large Cap",  "str_pe_buyout","sub_strategy",  10),
    ("str_pe_buyout_mid",   "Buyout Mid Cap",           "str_pe_buyout","sub_strategy",  20),
    ("str_pe_buyout_small", "Buyout Small Cap",         "str_pe_buyout","sub_strategy",  30),

    # Growth Equity sub-strategies
    ("str_pe_growth_minority", "Growth Minority",       "str_pe_growth","sub_strategy",  10),

    # Private Debt strategies
    ("str_pd_dl",       "Direct Lending",               "str_pd",       "strategy",      10),
    ("str_pd_mezz",     "Mezzanine / Junior Debt",      "str_pd",       "strategy",      20),
    ("str_pd_distressed", "Distressed / Special Situations", "str_pd",  "strategy",      30),
    ("str_pd_nav",      "NAV Financing",                "str_pd",       "strategy",      40),
    ("str_pd_other",    "Other Private Debt",           "str_pd",       "strategy",      50),

    # Infrastructure strategies
    ("str_infra_core",  "Core Infrastructure",          "str_infra",    "strategy",      10),
    ("str_infra_core_plus", "Core-Plus Infrastructure", "str_infra",    "strategy",      20),
    ("str_infra_va",    "Value-Add / Opportunistic Infra", "str_infra", "strategy",      30),

    # Real Estate strategies
    ("str_re_core",     "Core Real Estate",             "str_re",       "strategy",      10),
    ("str_re_va",       "Value-Add Real Estate",        "str_re",       "strategy",      20),
    ("str_re_opp",      "Opportunistic Real Estate",    "str_re",       "strategy",      30),

    # Venture Capital strategies
    ("str_vc_early",    "Early Stage VC",               "str_vc",       "strategy",      10),
    ("str_vc_late",     "Late Stage VC",                "str_vc",       "strategy",      20),
    ("str_vc_multi",    "Multi-Stage VC",               "str_vc",       "strategy",      30),

    # Hedge Funds strategies
    ("str_hf_ls",       "Long/Short Equity",            "str_hf",       "strategy",      10),
    ("str_hf_macro",    "Global Macro",                 "str_hf",       "strategy",      20),
    ("str_hf_multi",    "Multi-Strategy Hedge Fund",    "str_hf",       "strategy",      30),
    ("str_hf_other",    "Other Hedge Funds",            "str_hf",       "strategy",      40),
]


# ── Sector list (one level deep) ──────────────────────────────────────────────

SECTORS = [
    ("sec_technology",      "Technology"),
    ("sec_software",        "Software & SaaS"),
    ("sec_hardware",        "Hardware & Semiconductors"),
    ("sec_healthcare",      "Healthcare"),
    ("sec_pharma",          "Pharma & Biotech"),
    ("sec_medtech",         "Medical Devices & MedTech"),
    ("sec_industrials",     "Industrials"),
    ("sec_consumer",        "Consumer"),
    ("sec_consumer_staples","Consumer Staples"),
    ("sec_consumer_disc",   "Consumer Discretionary"),
    ("sec_financials",      "Financial Services"),
    ("sec_fintech",         "FinTech"),
    ("sec_energy",          "Energy"),
    ("sec_energy_transition","Energy Transition & Cleantech"),
    ("sec_business_svcs",   "Business Services"),
    ("sec_telecom_media",   "Telecom & Media"),
    ("sec_education",       "Education"),
    ("sec_agriculture",     "Agriculture & Food"),
    ("sec_materials",       "Materials"),
    ("sec_transport",       "Transportation & Logistics"),
    ("sec_real_estate",     "Real Estate"),
    ("sec_diversified",     "Diversified / Multi-Sector"),
]


# ── Target market list (flat) ─────────────────────────────────────────────────

TARGET_MARKETS = [
    ("tm_lmm",   "Lower Middle Market",  10),
    ("tm_mm",    "Middle Market",        20),
    ("tm_umm",   "Upper Middle Market",  30),
    ("tm_large", "Large Cap",            40),
    ("tm_mega",  "Mega Cap / Global",    50),
]


# ── Lookup definitions ────────────────────────────────────────────────────────

LOOKUP_CATEGORIES = [
    # (id, name, entity_type, allows_multi)
    ("lc_gp_rating",      "GP Rating",        "organization", False),
    ("lc_fund_rating",    "Fund Rating",       "fund",         False),
    ("lc_fund_status",    "Fund Status",       "fund",         False),
    ("lc_pipeline_stage", "Pipeline Stage",    "fund",         False),
    ("lc_meeting_type",   "Meeting Type",      "meeting",      False),
]

RATING_ITEMS = [
    # (code, label, description, color, bg_color, sort_order)
    ("A", "Top Tier",  "Outstanding — highest conviction",             "#166534", "#dcfce7", 10),
    ("B", "Strong",    "High quality, strong interest",                "#1e40af", "#dbeafe", 20),
    ("C", "Watchlist", "Monitoring, moderate interest",                "#92400e", "#fef3c7", 30),
    ("D", "Weak",      "Significant concerns",                         "#9a3412", "#ffedd5", 40),
    ("E", "Pass",      "Not investable",                               "#374151", "#f3f4f6", 50),
]

FUND_STATUS_ITEMS = [
    ("pre-marketing",  "Pre-Marketing",   "Preparing to launch fundraise",        "#6b21a8", "#f3e8ff", 10),
    ("fundraising",    "Fundraising",     "Actively raising capital",             "#1d4ed8", "#dbeafe", 20),
    ("first-close",    "First Close",     "First close completed",                "#0369a1", "#e0f2fe", 30),
    ("final-close",    "Final Close",     "Final close completed",                "#065f46", "#d1fae5", 40),
    ("closed",         "Closed",          "Fundraise complete",                   "#166534", "#dcfce7", 50),
    ("deployed",       "Deployed",        "Capital fully deployed",               "#374151", "#f3f4f6", 60),
    ("monitoring",     "Monitoring",      "Portfolio monitoring phase",           "#374151", "#f3f4f6", 70),
    ("exiting",        "Exiting",         "Active realisation / wind-down",       "#92400e", "#fef3c7", 80),
]

PIPELINE_STAGE_ITEMS = [
    ("watching",    "Watching",     "On radar, not yet in active review",      "#374151", "#f3f4f6", 10),
    ("first-look",  "First Look",   "Initial meeting or materials review",     "#1d4ed8", "#dbeafe", 20),
    ("diligence",   "Diligence",    "Active due diligence underway",           "#92400e", "#fef3c7", 30),
    ("ic-review",   "IC Review",    "Presented to investment committee",       "#6b21a8", "#f3e8ff", 40),
    ("committed",   "Committed",    "Commitment made",                         "#166534", "#dcfce7", 50),
    ("passed",      "Passed",       "Reviewed and passed",                     "#6b7280", "#f9fafb", 60),
]

MEETING_TYPE_ITEMS = [
    ("in-person",   "In-Person",    "Physical meeting",         "#374151", "#f3f4f6", 10),
    ("virtual",     "Virtual",      "Video call",               "#1d4ed8", "#dbeafe", 20),
    ("phone",       "Phone",        "Phone call",               "#374151", "#f3f4f6", 30),
    ("conference",  "Conference",   "Industry conference",      "#6b21a8", "#f3e8ff", 40),
]


# ── Data sources ──────────────────────────────────────────────────────────────

DATA_SOURCES = [
    ("ds_manual",  "Manual Entry",  "manual",        None),
    ("ds_preqin",  "Preqin",        "file_import",   "Preqin Ltd."),
]


# ── Preqin external sources + column maps ─────────────────────────────────────

PREQIN_COLUMN_MAP = [
    # (external_table, external_column, our_entity_type, our_field_name, transform)
    ("Preqin_Export", "FUND ID",                        "fund",         "preqin_fund_id",            None),
    ("Preqin_Export", "FUND SERIES ID",                 "fund",         "preqin_series_id",          None),
    ("Preqin_Export", "FIRM ID",                        "organization", "preqin_manager_id",         None),
    ("Preqin_Export", "NAME",                           "fund",         "name",                      None),
    ("Preqin_Export", "FUND SERIES NAME",               "fund",         "series",                    None),
    ("Preqin_Export", "VINTAGE / INCEPTION YEAR",       "fund",         "vintage",                   "to_int"),
    ("Preqin_Export", "FUND CURRENCY",                  "fund",         "currency",                  None),
    ("Preqin_Export", "TARGET SIZE (CURR. MN)",         "fund",         "target_size",               "to_str"),
    ("Preqin_Export", "FINAL CLOSE SIZE (CURR. MN)",    "fund",         "final_size",                "to_str"),
    ("Preqin_Export", "FINAL CLOSE SIZE (USD MN)",      "fund",         "final_size",                "to_str"),
    ("Preqin_Export", "HARD CAP (CURR. MN)",            "fund",         "hard_cap",                  "to_str"),
    ("Preqin_Export", "FUND RAISING LAUNCH DATE",       "fund",         "launch_date",               "to_date"),
    ("Preqin_Export", "LATEST CLOSE DATE",              "fund",         "next_close_date",           "to_date"),
    ("Preqin_Export", "FINAL CLOSE DATE",               "fund",         "final_close_date",          "to_date"),
    ("Preqin_Export", "DOMICILE",                       "fund",         "domicile",                  None),
    ("Preqin_Export", "FUND LEGAL STRUCTURE",           "fund",         "legal_structure",           None),
    ("Preqin_Export", "WEBSITE",                        "organization", "website",                   None),
    ("Preqin_Export", "FUND MANAGER TOTAL AUM (USD MN)","organization", "aum",                       "to_str"),
    ("Preqin_Export", "SUSTAINABILITY LABELS",          "fund",         "entity_attribute:esg_labels",  None),
    ("Preqin_Export", "SUSTAINABILITY THEMES",          "fund",         "entity_attribute:esg_themes",  None),
    ("Preqin_Export", "UN SDG ALIGNMENT",               "fund",         "entity_attribute:un_sdg",      None),
]

PREQIN_PERFORMANCE_COLUMN_MAP = [
    # (external_table, external_column, our_entity_type, our_field_name, transform)
    # Match key (not a suggestion — filtered in preqin_sync.py)
    ("Preqin_Export", "FUND ID",                    "fund", "preqin_fund_id",   None),
    # Performance metrics
    ("Preqin_Export", "NET IRR (%)",                "fund", "net_irr",          "to_str"),
    ("Preqin_Export", "NET MULTIPLE (X)",           "fund", "net_moic",         "to_str"),
    ("Preqin_Export", "NET MULTIPLE (X)",           "fund", "tvpi",             "to_str"),
    # DPI/RVPI in Preqin = % of paid-in (e.g. 45.6 = 45.6%); div100 → multiple (0.456x)
    ("Preqin_Export", "DPI (%)",                    "fund", "dpi",              "div100"),
    ("Preqin_Export", "RVPI (%)",                   "fund", "rvpi",             "div100"),
    ("Preqin_Export", "DATE REPORTED",              "fund", "perf_date",        "to_date"),
    # Valuation
    ("Preqin_Export", "FUND AUM (CURR. MN)",        "fund", "nav",              "to_str"),
    ("Preqin_Export", "FUND DRY POWDER (CURR. MN)", "fund", "undrawn_value",    "to_str"),
    # Benchmarking (existing columns on fund_v2)
    ("Preqin_Export", "PREQIN QUARTILE RANK",       "fund", "quartile_ranking", "to_int"),
    ("Preqin_Export", "BENCHMARK NAME",             "fund", "benchmark_name",   "to_str"),
    ("Preqin_Export", "S&P 500 LN-PME",             "fund", "pme",              "to_str"),
    ("Preqin_Export", "S&P 500 PME+",               "fund", "pme_index",        "to_str"),
]

PREQIN_MANAGERS_COLUMN_MAP = [
    # (external_table, external_column, our_entity_type, our_field_name, transform)
    # Match key (not a suggestion — filtered in preqin_sync.py)
    ("Preqin_Export", "FIRM ID",                                   "organization", "preqin_manager_id",    None),
    # Firm fields — all map to existing organization columns
    ("Preqin_Export", "FIRM NAME",                                 "organization", "name",                 None),
    ("Preqin_Export", "WEBSITE",                                   "organization", "website",              None),
    ("Preqin_Export", "YEAR EST.",                                 "organization", "founded_year",         "to_int"),
    ("Preqin_Export", "TOTAL STAFF",                               "organization", "total_team_size",      "to_int"),
    ("Preqin_Export", "INVESTMENT TEAM STAFF",                     "organization", "investment_team_size", "to_int"),
    ("Preqin_Export", "TOTAL:ASSETS UNDER MANAGEMENT (USD MN)",   "organization", "aum",                  "to_str"),
    ("Preqin_Export", "TOTAL: ASSETS UNDER MANAGEMENT(DATE)",     "organization", "aum_date",             "to_date"),
    ("Preqin_Export", "FIRM'S MAIN CURRENCY",                      "organization", "aum_currency",         None),
]


# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    init_db()
    db = SessionLocal()
    try:
        print("Seeding taxonomy_item (geography)...")
        for tid, name, parent_id, level_label, sort_order in GEO:
            upsert(db, TaxonomyItem, id=tid, type="geography", name=name,
                   parent_id=parent_id, level_label=level_label, sort_order=sort_order)

        print("Seeding taxonomy_item (strategy)...")
        for tid, name, parent_id, level_label, sort_order in STR:
            upsert(db, TaxonomyItem, id=tid, type="strategy", name=name,
                   parent_id=parent_id, level_label=level_label, sort_order=sort_order)

        print("Seeding taxonomy_item (sectors)...")
        for i, (tid, name) in enumerate(SECTORS):
            upsert(db, TaxonomyItem, id=tid, type="sector", name=name,
                   parent_id=None, level_label="sector", sort_order=i * 10)

        print("Seeding taxonomy_item (target markets)...")
        for tid, name, sort_order in TARGET_MARKETS:
            upsert(db, TaxonomyItem, id=tid, type="target_market", name=name,
                   parent_id=None, level_label="target_market", sort_order=sort_order)

        print("Seeding lookup_category + lookup_item...")
        for cat_id, name, entity_type, allows_multi in LOOKUP_CATEGORIES:
            upsert(db, LookupCategory, id=cat_id, name=name,
                   entity_type=entity_type, allows_multi=allows_multi)

        # GP Rating and Fund Rating share the same codes/labels
        for cat_id in ("lc_gp_rating", "lc_fund_rating"):
            for code, label, desc, color, bg_color, sort_order in RATING_ITEMS:
                item_id = f"li_{cat_id.replace('lc_', '')}_{code.lower()}"
                upsert(db, LookupItem, id=item_id, category_id=cat_id, code=code,
                       label=label, description=desc, color=color, bg_color=bg_color,
                       sort_order=sort_order)

        for code, label, desc, color, bg_color, sort_order in FUND_STATUS_ITEMS:
            item_id = f"li_fund_status_{code.replace('-', '_')}"
            upsert(db, LookupItem, id=item_id, category_id="lc_fund_status",
                   code=code, label=label, description=desc, color=color,
                   bg_color=bg_color, sort_order=sort_order)

        for code, label, desc, color, bg_color, sort_order in PIPELINE_STAGE_ITEMS:
            item_id = f"li_pipeline_{code.replace('-', '_')}"
            upsert(db, LookupItem, id=item_id, category_id="lc_pipeline_stage",
                   code=code, label=label, description=desc, color=color,
                   bg_color=bg_color, sort_order=sort_order)

        for code, label, desc, color, bg_color, sort_order in MEETING_TYPE_ITEMS:
            item_id = f"li_meeting_{code.replace('-', '_')}"
            upsert(db, LookupItem, id=item_id, category_id="lc_meeting_type",
                   code=code, label=label, description=desc, color=color,
                   bg_color=bg_color, sort_order=sort_order)

        print("Seeding data_source...")
        for sid, name, source_type, provider in DATA_SOURCES:
            upsert(db, DataSource, id=sid, name=name, source_type=source_type, provider=provider)

        print("Seeding external_source (Preqin)...")
        upsert(db, ExternalSource, id="es_preqin", name="preqin",
               file_path="external/preqin_funds.db",
               description="Preqin fund + manager export (Preqin_Export table). "
                           "Updated manually. Column headers may change — update "
                           "external_column_map when they do.")

        print("Seeding external_column_map (Preqin funds)...")
        for ext_table, ext_col, entity_type, field_name, transform in PREQIN_COLUMN_MAP:
            upsert_column_map(db,
                source_id="es_preqin",
                external_table=ext_table,
                external_column=ext_col,
                our_entity_type=entity_type,
                our_field_name=field_name,
                transform=transform,
                is_active=True,
            )

        print("Seeding external_source (Preqin performance)...")
        upsert(db, ExternalSource, id="es_preqin_performance", name="preqin_performance",
               file_path="external/preqin_performance.db",
               description="Preqin performance export (net IRR, net multiple, DPI, RVPI, NAV, quartile). "
                           "DPI/RVPI stored as multiples (div100 applied to convert from %).")

        print("Seeding external_column_map (Preqin performance)...")
        for ext_table, ext_col, entity_type, field_name, transform in PREQIN_PERFORMANCE_COLUMN_MAP:
            upsert_column_map(db,
                source_id="es_preqin_performance",
                external_table=ext_table,
                external_column=ext_col,
                our_entity_type=entity_type,
                our_field_name=field_name,
                transform=transform,
                is_active=True,
            )

        print("Seeding external_source (Preqin managers)...")
        upsert(db, ExternalSource, id="es_preqin_managers", name="preqin_managers",
               file_path="external/Preqin_managers.db",
               description="Preqin managers/firms export (name, AUM, website, team size, founded year).")

        print("Seeding external_column_map (Preqin managers)...")
        for ext_table, ext_col, entity_type, field_name, transform in PREQIN_MANAGERS_COLUMN_MAP:
            upsert_column_map(db,
                source_id="es_preqin_managers",
                external_table=ext_table,
                external_column=ext_col,
                our_entity_type=entity_type,
                our_field_name=field_name,
                transform=transform,
                is_active=True,
            )

        db.commit()
        print("\nSeed complete.")
        print(f"  taxonomy_item rows : {db.query(TaxonomyItem).count()}")
        print(f"  lookup_category    : {db.query(LookupCategory).count()}")
        print(f"  lookup_item        : {db.query(LookupItem).count()}")
        print(f"  data_source        : {db.query(DataSource).count()}")
        print(f"  external_source    : {db.query(ExternalSource).count()}")
        print(f"  external_column_map: {db.query(ExternalColumnMap).count()}")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
