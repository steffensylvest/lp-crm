# LP CRM — Architecture

## How to run

```bash
# First-time setup (once)
npm run install:all           # install root + client npm deps
npm run setup:python          # installs Python deps
cp python-server/lp_crm_seed.db python-server/lp_crm.db   # seed the database

# Daily dev
npm run dev               # starts Python server (3001) + Vite client (5173)
npm run dev:server        # Python FastAPI server only
npm run dev:client        # Vite client only
```

> **IPv6 note:** The server binds to `0.0.0.0` (not just `127.0.0.1`) so macOS
> `localhost` resolves correctly over both IPv4 and IPv6.

> **Windows note:** `python` and `pip` are used (not `python3`/`pip3`). All npm scripts work cross-platform.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, no state library, all inline styles |
| Backend | **Python FastAPI** (`python-server/`) on port 3001 |
| Database | **SQLite** via SQLAlchemy ORM (local dev) |
| Future DB | Snowflake — change `DATABASE_URL` in `python-server/.env` only |
| Proxy | Vite dev proxy: `/api/*` → `http://localhost:3001` |
| Theming | CSS custom properties set on App's root `<div>`, inherited everywhere |

---

## File map

### Python server (`python-server/`)

| File | Contents |
|------|----------|
| `main.py` | FastAPI app — includes routes_v2 router |
| `database.py` | SQLAlchemy engine setup, reads `DATABASE_URL` from `.env` |
| `models_v2.py` | ORM: 20 tables (organization, fund, meeting, person, taxonomy_item, lookup_category, lookup_item, audit_log, etc.) |
| `crud.py` | All CRUD functions + serializers for v2 entities |
| `routes_v2.py` | `/api/v2/*` router (~40 endpoints) |
| `seed_v2.py` | Seeds taxonomy + lookup reference data (idempotent) |
| `migrate_v2.py` | One-time: migrates old CRM_* tables → v2 tables (idempotent) |
| `preqin_sync.py` | Preqin external DB integration helpers |
| `lp_crm_seed.db` | Pre-seeded SQLite database for first-time setup — copy to `lp_crm.db` |
| `requirements.txt` | FastAPI, uvicorn, SQLAlchemy, python-dotenv (Snowflake pkgs commented) |
| `.env` | `DATABASE_URL=sqlite:///./lp_crm.db` (not committed) |
| `.env.example` | Template with SQLite + Snowflake connection string examples |
| `lp_crm.db` | SQLite database file (not committed) |
| `external/preqin.db` | Preqin export — not committed, place manually |

### API endpoints

All v2 endpoints are under `/api/v2/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/v2/organizations` | List GPs and placement agents (`?org_type=gp\|placement_agent`) |
| POST | `/api/v2/organizations` | Create organization |
| GET/PUT/PATCH/DELETE | `/api/v2/organizations/{id}` | Get, replace, patch, or delete |
| GET | `/api/v2/funds` | List all funds |
| POST | `/api/v2/funds` | Create fund |
| GET/PUT/PATCH/DELETE | `/api/v2/funds/{id}` | Get, replace, patch, or delete |
| GET | `/api/v2/taxonomy` | Taxonomy tree (`?type=geography\|strategy\|sector\|target_market`) |
| GET | `/api/v2/lookups` | All lookup categories + items |
| GET | `/api/v2/lookups/{category_id}` | Items for one category |
| GET/POST | `/api/v2/notes` | List or create notes |
| PUT/DELETE | `/api/v2/notes/{id}` | Update or delete note |
| GET/POST | `/api/v2/meetings` | List or create meetings |
| GET/PUT/DELETE | `/api/v2/meetings/{id}` | Get, update, or delete meeting |
| GET/POST | `/api/v2/people` | List or create people |
| GET/PUT/DELETE | `/api/v2/people/{id}` | Get, update, or delete person |
| POST | `/api/v2/organizations/{id}/people` | Link person to organization |
| DELETE | `/api/v2/organizations/{id}/people/{pid}` | Unlink person |
| GET | `/api/v2/audit` | Change log (`?entity_type=&entity_id=`) |
| GET/POST | `/api/v2/tasks` | List or create tasks |
| PUT/DELETE | `/api/v2/tasks/{id}` | Update or delete task |
| GET | `/api/v2/external/preqin/search` | Search Preqin DB (`?q=`) |

**PATCH** body: `{ "field": "rating_id", "value": "li_fund_rating_a", "note": "...", "changed_by": "..." }` — auto-writes to `audit_log`.

### Client — root (`client/src/`)

| File | Contents |
|------|----------|
| `App.jsx` | App component: state, effects, handlers, view routing |
| `api.js` | v2 API functions: `loadOrganizations`, `loadFunds`, `loadLookups`, `loadTaxonomy`, `loadMeetings`, `loadPeople`, `loadNotes`, `loadTasks`, `patchFundField`, `patchOrgField`, `searchPreqin`, etc. |
| `utils.js` | `uid()`, `now()`, `fmt(date)`, `fmtTs(ts)`, `fmtM(val, currency)` |
| `constants.js` | `SCORE_CONFIG`, `STRATEGY_OPTIONS`, `SUB_STRATEGY_PRESETS`, `SECTOR_OPTIONS`, `CURRENCIES`, `STATUS_OPTIONS`, `PIPELINE_STAGES`, `STATUS_PILL_KEY`, `SHORTCUTS` |
| `theme.js` | `DARK`, `LIGHT` theme objects; `IS`, `ISFilled`, `TA`, `TAFilled`, `btnBase`, `btnPrimary`, `btnGhost`, `btnDanger` style objects |
| `settingsContext.js` | `SettingsContext`, `useSettings()` — provides settings and theme mode |

### Client — components (`client/src/components/`)

| File | Exports | Notes |
|------|---------|-------|
| `Badges.jsx` | `ScoreBadge`, `StatusPill`, `Chip`, `SectorChip`, `SubStratChip`, `InvestedBadge` | |
| `Pickers.jsx` | `ScorePicker`, `StatusPicker`, `TagPicker`, `OwnerPicker`, `StagePicker`, `StrategyPicker`, `SubStrategyPicker`, `EditingContext`, `InlineMetric` | |
| `Overlay.jsx` | `Overlay`, `OverlayHeader` | |
| `Forms.jsx` | `Field`, `NoteField`, `GPForm`, `FundForm`, `MeetingForm`, `PreqinSearch` | |
| `FundDetail.jsx` | `FundDetailOverlay` | 4 tabs: Overview · Performance · History · Insights |
| `MeetingDetail.jsx` | `MeetingDetailOverlay` | |
| `GPDetail.jsx` | `GPDetailOverlay` | 4 tabs: Funds · History · Meetings · People |
| `PersonDetail.jsx` | `PersonDetailOverlay` | |
| `PlacementAgentDetail.jsx` | `PlacementAgentDetailOverlay` | |
| `PipelineBoard.jsx` | `PipelineBoard` | Drag-drop kanban |
| `FilterDropdown.jsx` | `FilterDropdown` | Multi-select popover |
| `DenseTable.jsx` | `DenseTable` | Collapsible GP/fund table |
| `Views.jsx` | `AllMeetingsView`, `AllFundsView`, `TagFilterView`, `GradeAView`, `FundraisingView` | |
| `DashboardView.jsx` | `DashboardView` | Portfolio stats + activity feed |
| `DataReview.jsx` | `DataReview` | Data quality inspection and bulk fixes |
| `GlobalSearch.jsx` | `GlobalSearch` | Instant search across GPs, funds, people, meetings |
| `Notes.jsx` | `NotesPanel` | Notes per entity |
| `Tasks.jsx` | `TasksPanel` | Task tracker with due dates |
| `SettingsView.jsx` | `SettingsView` | Manage team members, lookups, preferences |
| `SmartAdd.jsx` | `SmartAddModal`, `DataMenu`, `StatCard` | |

---

## Key patterns

- **No Redux / Context API** (except `EditingContext` for inline-editing lock, and `SettingsContext` for theme)
- **All state in App** — passed down as props
- **Inline styles throughout** — no CSS files, no Tailwind
- **Field-level PATCH** — each field edit calls `PATCH /api/v2/{entity}/{id}` immediately; no bulk save
- **Audit auto-written** — every PATCH writes to `audit_log` automatically in the backend
- **Keyboard shortcuts** — `/` focuses global search, `Esc` closes overlays, F1–F5 switch views
- **Currency formatting** — use `fmtM(val, currency)` from utils.js
- **Lookup indexing** — `loadLookups()` returns a flat list; App.jsx transforms it to `{ categories, items_by_category }` with slug keys (`lc_pipeline_stage` → `pipeline-stage`)
- **Snowflake migration** — change `DATABASE_URL` in `python-server/.env` and uncomment Snowflake deps in `requirements.txt`

---

## Switching to Snowflake

1. Uncomment Snowflake packages in `python-server/requirements.txt`
2. Run `npm run setup:python`
3. Set in `python-server/.env`:
   ```
   DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE
   ```
4. Restart the server — SQLAlchemy handles the dialect automatically.
5. Run `python python-server/migrate_v2.py` once to seed Snowflake.
