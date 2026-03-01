# LP CRM — Data Model

The database is **SQLite** (local dev) or **Snowflake** (production), managed via SQLAlchemy ORM in `python-server/models.py`. The API always returns and accepts JSON in the same shape as the original `server/data.json` for full frontend compatibility.

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
