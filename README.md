# LP CRM

A private-equity LP relationship management tool for tracking GPs, funds, meetings, people, and pipeline. Built as a single-page React app backed by a FastAPI + SQLite server with full audit history.

---

## Features

- **GP & Fund tracking** — rating, status, pipeline stage, fundraising metrics, performance returns, sectors, responsible team member
- **Pipeline view** — flat fund table with 26 sortable/filterable columns; drag-and-drop kanban board also available
- **People directory** — contacts linked to organizations with role and email
- **Meeting log** — log calls and meetings, link to fund or GP-level, track attendees and notes
- **Fundraising timeline** — interactive marker chart for launch / close dates with progress bar
- **Audit history** — automatic change log when rating, status, pipeline stage, or any tracked field changes; performance snapshots over time
- **Notes & Tasks** — rich inline notes per entity; task tracker with due dates and assignees
- **Preqin linking** — search-as-you-type to link any fund to its Preqin fund ID
- **Data Review** — inspect and bulk-fix data quality issues
- **Dashboard** — high-level portfolio stats and activity feed
- **Smart filtering** — filter by strategy, sector, status, score; cross-view tag navigation
- **Global search** — instant search across GPs, funds, people, and meetings
- **Dark/light theme** — CSS custom properties, toggled at runtime
- **Settings** — manage team members, lookup tables, and preferences

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, all inline styles (no CSS files / no Tailwind) |
| Backend | Python FastAPI on port 3001 |
| Database | SQLite (local dev) via SQLAlchemy — drop-in swap to Snowflake |
| Proxy | Vite dev proxy: `/api/*` → `http://localhost:3001` |

---

## Quick start

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10 with `pip`

> **Windows note:** Use `python` and `pip` (not `python3` / `pip3`). All npm scripts are cross-platform.

### First-time setup

```bash
git clone https://github.com/steffensylvest/lp-crm.git
cd lp-crm

# Install root + client npm dependencies
npm run install:all

# Install Python dependencies
npm run setup:python

# Seed the database from the bundled fixture data
cp python-server/lp_crm_seed.db python-server/lp_crm.db
```

### Run in development

```bash
npm run dev
```

This starts both servers concurrently:

| Service | URL |
|---------|-----|
| React client (Vite) | http://localhost:5173 |
| FastAPI backend | http://localhost:3001 |
| API health check | http://localhost:3001/api/health |

### Individual servers

```bash
npm run dev:server   # FastAPI only
npm run dev:client   # Vite only
```

---

## Project structure

```
lp-crm/
├── client/                  React frontend
│   └── src/
│       ├── App.jsx          Root component — all state, handlers, view routing
│       ├── api.js           v2 API functions (loadOrganizations, loadFunds, etc.)
│       ├── constants.js     Strategy options, sectors, currencies, score config
│       ├── theme.js         DARK / LIGHT theme objects + shared style objects
│       ├── settingsContext.js  React Context for settings/theme
│       └── components/
│           ├── FundDetail.jsx          Fund overlay (Overview / Performance / History / Insights)
│           ├── GPDetail.jsx            GP overlay (Funds / History / Meetings / People)
│           ├── PersonDetail.jsx        Person overlay
│           ├── PlacementAgentDetail.jsx Placement agent overlay
│           ├── MeetingDetail.jsx       Meeting overlay
│           ├── Forms.jsx               GPForm, FundForm, MeetingForm, NoteField, PreqinSearch
│           ├── Pickers.jsx             Inline pickers: score, status, owner, stage, strategy
│           ├── Badges.jsx              Score badge, status pill, sector/strategy chips
│           ├── PipelineBoard.jsx       Kanban board
│           ├── DenseTable.jsx          Collapsible GP/fund table
│           ├── Views.jsx               AllMeetings, AllFunds, TagFilter, Fundraising, GradeA
│           ├── DashboardView.jsx       Portfolio dashboard
│           ├── DataReview.jsx          Data quality review
│           ├── GlobalSearch.jsx        Global search overlay
│           ├── Notes.jsx               Notes panel
│           ├── Tasks.jsx               Task tracker
│           ├── SettingsView.jsx        Settings panel
│           ├── FilterDropdown.jsx      Multi-select filter popover
│           └── SmartAdd.jsx            Quick-add modal, stat cards, data menu
│
├── python-server/           FastAPI backend
│   ├── main.py              Route definitions — includes routes_v2 router
│   ├── models.py            SQLAlchemy ORM: 20 tables (organization, fund, meeting, etc.)
│   ├── crud.py              CRUD functions + serializers for all v2 entities
│   ├── routes_v2.py         /api/v2/* router (~40 endpoints)
│   ├── database.py          Engine setup, reads DATABASE_URL from .env
│   ├── seed_v2.py           Seeds taxonomy + lookup reference data (idempotent)
│   ├── migrate_v2.py        One-time: migrates old data → v2 tables
│   ├── preqin_sync.py       Preqin external DB integration
│   ├── requirements.txt
│   ├── .env.example         DATABASE_URL template
│   ├── lp_crm_seed.db       Seed database with dummy data (safe to commit)
│   └── external/
│       └── preqin_funds.db        Preqin export (not committed — place manually)
│
└── docs/
    ├── ARCHITECTURE.md      Full file map, API endpoints, component props
    ├── DATA-MODEL.md        TypeScript shapes + full SQL DDL + schema gaps
    └── THEME.md             CSS variable tokens and theming guide
```

---

## API endpoints

All v2 endpoints are under `/api/v2/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/v2/organizations` | List GPs and placement agents |
| POST | `/api/v2/organizations` | Create organization |
| GET/PUT/PATCH/DELETE | `/api/v2/organizations/{id}` | Get, replace, patch, or delete |
| GET | `/api/v2/funds` | List all funds |
| POST | `/api/v2/funds` | Create fund |
| GET/PUT/PATCH/DELETE | `/api/v2/funds/{id}` | Get, replace, patch, or delete |
| GET | `/api/v2/taxonomy` | Taxonomy tree (geography, strategy, sector, target_market) |
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
| GET | `/api/v2/audit` | Change log (filter by entity_type, entity_id) |
| GET/POST | `/api/v2/tasks` | List or create tasks |
| PUT/DELETE | `/api/v2/tasks/{id}` | Update or delete task |
| GET | `/api/v2/external/preqin/search?q=` | Search Preqin DB (`firm_id` param filters to one manager) |
| GET | `/api/v2/external/preqin/managers?q=` | Search Preqin manager names |
| GET | `/api/v2/external/preqin/series/{id}` | All funds in a Preqin series |
| GET | `/api/v2/external/preqin/link-suggestions` | Funds with potential Preqin matches |
| POST | `/api/v2/external/sync` | Trigger Preqin data sync |
| GET | `/api/v2/external/pending` | Pending provenance items awaiting review |
| PATCH | `/api/v2/external/provenance/{id}/accept\|reject` | Accept or reject a Preqin suggestion |

**PATCH** any fund or org field: `PATCH /api/v2/funds/{id}` with body `{ "field": "rating_id", "value": "li_fund_rating_a", "note": "...", "changed_by": "..." }` — auto-writes to audit_log.

---

## Database

SQLite by default. The schema is created automatically on startup via `Base.metadata.create_all()`. See [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) for the full SQL DDL and entity relationships.

The database has 20 tables: `organization`, `fund`, `fund_sector`, `fund_strategy`, `org_person`, `person`, `meeting`, `meeting_attendee`, `note`, `task`, `taxonomy_item`, `lookup_category`, `lookup_item`, `audit_log`, `performance_snapshot`, `entity_taxonomy`, `field_provenance`, `data_source`, `lookup_category`, `lookup_item`.

### Switching to Snowflake

1. Uncomment Snowflake packages in `python-server/requirements.txt` and run `npm run setup:python`
2. Set in `python-server/.env`:
   ```
   DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE
   ```
3. Restart — SQLAlchemy handles the dialect. Run `python python-server/migrate_v2.py` to seed.

---

## Key behaviours

- **No auto-save** — changes are saved immediately on each field edit via individual PATCH calls
- **Audit history** — every PATCH call writes to `audit_log`; rating, status, and pipeline stage changes are always tracked
- **Preqin linking** — funds can be linked to a Preqin fund ID via the Edit form; requires `external/preqin_funds.db` to be present
- **Keyboard shortcuts** — `Esc` closes overlays, `/` focuses global search, `F1`–`F5` switch views
- **No external state library** — all state lives in `App.jsx`, passed down as props; `SettingsContext` provides theme

---

## Documentation

| Doc | Contents |
|-----|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full file map, API endpoints, all component prop signatures |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | TypeScript field shapes, SQL DDL, FK diagram, schema gap tracker |
| [`docs/THEME.md`](docs/THEME.md) | CSS custom properties, token reference, theming guide |
