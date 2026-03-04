# LP CRM — Data Model

The database is **SQLite** (local dev) or **Snowflake** (production), managed via SQLAlchemy ORM in `python-server/models.py`.

---

## Main tables (read/written on every PUT /api/data)

### GP (`gps` table)
```ts
{
  id: string            // uid() — random 8-char alphanumeric
  name: string
  hq: string
  score: "A"|"B"|"C"|"D"|"E"
  owner: string         // responsible team member
  contact: string
  contactEmail: string
  notes: string
  funds: Fund[]         // nested in API response (JOIN via funds.gp_id)
  meetings: Meeting[]   // nested in API response (JOIN via meetings.gp_id)
}
```

### Fund (`funds` table)
```ts
{
  id: string
  gpId: string          // FK → gps.id

  // Identity
  name: string
  series: string        // e.g. "BCP", "EQT"
  strategy: string      // from STRATEGY_OPTIONS
  subStrategy: string
  sectors: string[]     // stored in fund_sectors join table
  vintage: string       // year as string, e.g. "2023"
  currency: string      // from CURRENCIES
  status: string        // from STATUS_OPTIONS
  score: "A"|"B"|"C"|"D"|"E"
  notes: string

  // Sizing (all stored as string to avoid float loss)
  targetSize: string    // millions
  raisedSize: string
  finalSize: string
  hardCap: string

  // Investment position
  invested: boolean
  investmentAmount: string
  investmentCurrency: string

  // Fundraising timeline
  launchDate: string        // ISO date "YYYY-MM-DD"
  firstCloseDate: string
  nextCloseDate: string
  finalCloseDate: string

  // Performance metrics (stored as string)
  netIrr: string
  netMoic: string
  grossIrr: string
  grossMoic: string
  dpi: string
  tvpi: string
  rvpi: string
  nav: string
  undrawnValue: string
  perfDate: string          // "as of" date for the metrics above

  // IC / commitment
  expectedAmount: string
  expectedCurrency: string
  icDate: string
}
```

### Meeting (`meetings` table)
```ts
{
  id: string
  gpId: string          // FK → gps.id
  fundId: string|null   // FK → funds.id, null for GP-level meetings
  date: string          // "YYYY-MM-DD"
  type: "In-Person"|"Virtual"|"Phone"|"Conference"
  location: string
  topic: string
  notes: string
  loggedBy: string
  loggedAt: string      // ISO timestamp
}
```

### PipelineItem (`pipeline` table)
```ts
{
  id: string
  fundId: string|null   // FK → funds.id (SET NULL on delete)
  gpName: string        // denormalized for display
  stage: string         // "watching"|"first-look"|"diligence"|"ic-review"|"committed"|"passed"
  addedAt: string       // ISO timestamp
  pipelineNotes: string
}
```

### Todo (`todos` table)
```ts
{
  id: string
  text: string
  done: boolean
  createdAt: string
}
```

---

## History / audit tables (append-only — never cleared by upsert)

These tables have **no FK constraint on `fund_id`** so history is preserved even if the fund row is momentarily absent during the delete-reinsert cycle.

### FundPerformanceSnapshot (`fund_performance_snapshots`)

One row per `(fund_id, perf_date)` pair — upserted in place when the user edits metrics for the same "as of" date; a new row inserted when `perfDate` changes.

```ts
{
  id: string
  fundId: string        // no FK constraint
  perfDate: string|null // "as of" date (can be null)
  netIrr: string
  netMoic: string
  grossIrr: string
  grossMoic: string
  dpi: string
  tvpi: string
  rvpi: string
  nav: string
  undrawnValue: string
  recordedAt: string    // ISO UTC timestamp
}
```

### FundRaisedSnapshot (`fund_raised_snapshots`)

One row per `raisedSize` change — skipped if the new value equals the last snapshot.

```ts
{
  id: string
  fundId: string        // no FK constraint
  raisedSize: string
  recordedAt: string
}
```

### ChangeLog (`change_log`)

Tracks scalar field changes for funds, GPs, and pipeline items.

| Field | Tracked values |
|-------|----------------|
| Fund | `score`, `status` |
| GP | `score`, `owner` |
| Pipeline | `stage` |

```ts
{
  id: string
  entityType: "fund"|"gp"|"pipeline"
  entityId: string
  entityName: string        // denormalized for display
  fieldName: string         // "score"|"status"|"owner"|"stage"
  oldValue: string|null
  newValue: string
  changedAt: string         // ISO UTC timestamp
  changedBy: string|null    // future: user ID
  relatedFundId: string|null // pipeline entries: the fund they reference
}
```

---

## Where history appears in the UI

| History type | UI location |
|---|---|
| Fund score / status / pipeline stage | Fund detail overlay → **History tab** → Change History |
| Fund performance metrics | Fund detail overlay → **History tab** → Performance History |
| Fund raised amount | Fund detail overlay → **History tab** → Amount Raised |
| GP score / responsible | GP detail overlay → **History tab** → Change History |

History is fetched on overlay mount and auto-refreshes 1.5 s after a tracked field changes (after the 800 ms auto-save settles).

---

## Special flags

- `data.__isFallback = true` — set by `fallback.js`, prevents save, shows orange banner
- IDs are generated by `uid()` in `utils.js` (8-char hex)

---

## Option lists (from `constants.js`)

| Constant | Values |
|----------|--------|
| `STRATEGY_OPTIONS` | 10 asset class strategies |
| `SUB_STRATEGY_PRESETS` | sub-strategies keyed by strategy |
| `SECTOR_OPTIONS` | 22 sectors |
| `CURRENCIES` | USD, EUR, GBP, JPY, CHF, DKK, SEK, NOK, CAD, AUD |
| `STATUS_OPTIONS` | Pre-Marketing, Fundraising, Closed, Deployed, Monitoring, Exiting |
| `PIPELINE_STAGES` | watching, first-look, diligence, ic-review, committed, passed |
| `SCORE_CONFIG` | A/B/C/D/E with color, bg, description |

---

## SQL Schema

Canonical DDL for all tables. SQLAlchemy generates these automatically via `database.init_db()` → `Base.metadata.create_all()` on startup; you do **not** need to run these manually. They are provided here for reference and for setting up external databases (PostgreSQL, Snowflake, etc.).

All date fields are stored as ISO strings (`YYYY-MM-DD`) and all timestamps as ISO UTC strings (`2024-01-15T09:30:00+00:00`). Numeric amounts (sizes, returns) are stored as `VARCHAR` to avoid floating-point loss — the frontend always sends strings like `"25000"` or `"18.5"`.

> **⚠ Missing columns** — Several fields used by the frontend are not yet added to `models.py` or `crud.py`. These are flagged inline below and in the [gaps section](#schema-gaps--todo).

---

### `gps`

```sql
CREATE TABLE gps (
    id            VARCHAR(50)  PRIMARY KEY,   -- 8-char hex uid()
    name          VARCHAR(500) NOT NULL,
    hq            VARCHAR(500),
    website       VARCHAR(500),               -- ⚠ not yet in models.py / crud.py
    score         VARCHAR(10),               -- 'A'|'B'|'C'|'D'|'E'
    owner         VARCHAR(200),              -- responsible team member
    contact       VARCHAR(500),
    contact_email VARCHAR(500),
    notes         TEXT
);
```

---

### `funds`

```sql
CREATE TABLE funds (
    id                  VARCHAR(50)  PRIMARY KEY,
    gp_id               VARCHAR(50)  NOT NULL
                            REFERENCES gps(id) ON DELETE CASCADE,

    -- Identity
    name                VARCHAR(500) NOT NULL,
    series              VARCHAR(200),           -- e.g. "BCP", "EQT"
    strategy            VARCHAR(200),
    sub_strategy        VARCHAR(200),
    vintage             VARCHAR(10),            -- year as string, e.g. "2023"
    currency            VARCHAR(10),            -- from CURRENCIES
    status              VARCHAR(100),           -- from STATUS_OPTIONS
    score               VARCHAR(10),
    owner               VARCHAR(200),           -- ⚠ not yet in models.py / crud.py
    notes               TEXT,

    -- Sizing (all VARCHAR — frontend sends "25000" etc.)
    target_size         VARCHAR(50),
    raised_size         VARCHAR(50),
    raised_date         VARCHAR(20),            -- ⚠ not yet in models.py / crud.py
    final_size          VARCHAR(50),
    hard_cap            VARCHAR(50),

    -- Next vintage
    next_market         VARCHAR(100),           -- ⚠ not yet in models.py / crud.py

    -- Investment position
    invested            BOOLEAN DEFAULT FALSE,
    investment_amount   VARCHAR(50),
    investment_currency VARCHAR(10),

    -- Planned commitment (shown when "Planning to invest" is checked)
    expected_amount     VARCHAR(50),            -- ⚠ not yet in models.py / crud.py
    ic_date             VARCHAR(20),            -- ⚠ not yet in models.py / crud.py

    -- Fundraising timeline
    launch_date         VARCHAR(20),
    first_close_date    VARCHAR(20),
    next_close_date     VARCHAR(20),
    final_close_date    VARCHAR(20),

    -- Performance metrics (all VARCHAR)
    net_irr             VARCHAR(50),
    net_moic            VARCHAR(50),
    gross_irr           VARCHAR(50),
    gross_moic          VARCHAR(50),
    dpi                 VARCHAR(50),
    tvpi                VARCHAR(50),
    rvpi                VARCHAR(50),
    nav                 VARCHAR(50),
    undrawn_value       VARCHAR(50),
    perf_date           VARCHAR(20)             -- "as of" date for the metrics above
);
```

---

### `fund_sectors`

Many-to-many join table — one row per (fund, sector) pair. No separate `sectors` lookup table is needed.

```sql
CREATE TABLE fund_sectors (
    fund_id VARCHAR(50)  NOT NULL
                REFERENCES funds(id) ON DELETE CASCADE,
    sector  VARCHAR(200) NOT NULL,
    PRIMARY KEY (fund_id, sector)
);
```

---

### `meetings`

```sql
CREATE TABLE meetings (
    id             VARCHAR(50)  PRIMARY KEY,
    gp_id          VARCHAR(50)  NOT NULL
                       REFERENCES gps(id)   ON DELETE CASCADE,
    fund_id        VARCHAR(50)
                       REFERENCES funds(id) ON DELETE SET NULL,  -- NULL = GP-level meeting

    date           VARCHAR(20),
    type           VARCHAR(100),   -- 'Virtual'|'In-Person'|'Phone Call'|'Conference'
    location       VARCHAR(500),
    topic          VARCHAR(500),
    notes          TEXT,

    attendees_them TEXT,           -- ⚠ not yet in models.py / crud.py; JSON array ["Name", ...]
    attendees_us   TEXT,           -- ⚠ not yet in models.py / crud.py; JSON array

    logged_by      VARCHAR(200),
    logged_at      VARCHAR(50)     -- ISO UTC timestamp
);
```

---

### `pipeline`

```sql
CREATE TABLE pipeline (
    id             VARCHAR(50) PRIMARY KEY,
    fund_id        VARCHAR(50)
                       REFERENCES funds(id) ON DELETE SET NULL,

    gp_name        VARCHAR(500),   -- denormalized for display (avoids JOIN)
    stage          VARCHAR(100),   -- 'watching'|'first-look'|'diligence'|'ic-review'|'committed'|'passed'
    added_at       VARCHAR(50),    -- ISO UTC timestamp
    pipeline_notes TEXT
);
```

---

### `todos`

```sql
CREATE TABLE todos (
    id         VARCHAR(50) PRIMARY KEY,
    text       TEXT        NOT NULL,
    done       BOOLEAN     DEFAULT FALSE,
    created_at VARCHAR(50)
);
```

---

### Append-only history tables

These tables are **never cleared** by `upsert_all_data`. The `fund_id` columns intentionally carry **no FK constraint** so history rows survive even if a fund is deleted and re-created with the same ID during the delete-reinsert write cycle.

#### `fund_performance_snapshots`

One row per `(fund_id, perf_date)` pair — upserted in-place when the user edits the same "as of" date; a new row is inserted when `perf_date` changes.

```sql
CREATE TABLE fund_performance_snapshots (
    id            VARCHAR(50) PRIMARY KEY,
    fund_id       VARCHAR(50) NOT NULL,   -- no FK — intentional, see note above
    perf_date     VARCHAR(20),            -- "as of" date; NULL = undated

    net_irr       VARCHAR(50),
    net_moic      VARCHAR(50),
    gross_irr     VARCHAR(50),
    gross_moic    VARCHAR(50),
    dpi           VARCHAR(50),
    tvpi          VARCHAR(50),
    rvpi          VARCHAR(50),
    nav           VARCHAR(50),
    undrawn_value VARCHAR(50),

    recorded_at   VARCHAR(50) NOT NULL    -- ISO UTC timestamp of the save
);

CREATE INDEX ix_fps_fund_id ON fund_performance_snapshots(fund_id);
```

#### `fund_raised_snapshots`

One row per `raisedSize` change — skipped if the new value equals the most recent snapshot.

```sql
CREATE TABLE fund_raised_snapshots (
    id          VARCHAR(50) PRIMARY KEY,
    fund_id     VARCHAR(50) NOT NULL,   -- no FK — intentional
    raised_size VARCHAR(50),
    recorded_at VARCHAR(50) NOT NULL
);

CREATE INDEX ix_frs_fund_id ON fund_raised_snapshots(fund_id);
```

#### `change_log`

Generic audit log for tracked scalar fields. Query by `entity_id` for a specific entity, or by `related_fund_id` to get pipeline stage changes that affect a given fund.

```sql
CREATE TABLE change_log (
    id              VARCHAR(50)  PRIMARY KEY,
    entity_type     VARCHAR(50)  NOT NULL,   -- 'fund' | 'gp' | 'pipeline'
    entity_id       VARCHAR(50)  NOT NULL,
    entity_name     VARCHAR(500),            -- denormalized for display
    field_name      VARCHAR(100) NOT NULL,   -- 'score' | 'status' | 'owner' | 'stage'
    old_value       VARCHAR(500),
    new_value       VARCHAR(500),
    changed_at      VARCHAR(50)  NOT NULL,   -- ISO UTC timestamp
    changed_by      VARCHAR(200),            -- future: user/session ID
    related_fund_id VARCHAR(50)              -- pipeline entries: fund they reference (no FK)
);
```

---

### Relationship diagram

```
gps ──< funds ──< fund_sectors
 │         │
 └──< meetings >── (fund_id nullable)
           │
pipeline >── (fund_id nullable, SET NULL on delete)

-- Append-only (no FK to funds):
fund_performance_snapshots  (fund_id, perf_date)
fund_raised_snapshots       (fund_id)
change_log                  (entity_id, related_fund_id)
```

---

### Schema gaps / TODO

The following fields are used by the frontend but are **not yet present in `python-server/models.py` or `crud.py`**. They are silently dropped on every PUT save, meaning data entered in the UI will not persist:

| Table | Missing column | Frontend field | Priority |
|-------|---------------|----------------|----------|
| `gps` | `website` | `gp.website` (GPForm) | Low |
| `funds` | `owner` | `fund.owner` — Responsible person | **High** |
| `funds` | `raised_date` | `fund.raisedDate` — Raised As Of | Medium |
| `funds` | `next_market` | `fund.nextMarket` — Next Expected in Market | Medium |
| `funds` | `expected_amount` | `fund.expectedAmount` — Planned commitment | Medium |
| `funds` | `ic_date` | `fund.icDate` — IC Date | Medium |
| `meetings` | `attendees_them` | `meeting.attendeesThem` (JSON array) | Medium |
| `meetings` | `attendees_us` | `meeting.attendeesUs` (JSON array) | Medium |

To fix: add each column to the relevant class in `models.py`, add to the `db.add(...)` call in `crud.py`'s `upsert_all_data`, and add to the corresponding `_*_to_dict` serialiser.
