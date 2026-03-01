# LP CRM

A private-equity LP relationship management tool for tracking GPs, funds, meetings, and pipeline. Built as a single-page React app backed by a FastAPI + SQLite server with automatic history tracking.

---

## Features

- **GP & Fund tracking** — rating, status, pipeline stage, fundraising metrics, performance returns, sectors, responsible team member
- **Pipeline board** — drag-and-drop kanban across six stages (Watching → First Look → Diligence → IC Review → Committed → Passed)
- **Meeting log** — log calls and meetings, link to fund or GP-level, track attendees and notes
- **Fundraising timeline** — interactive marker chart for launch / close dates with progress bar
- **History tracking** — automatic audit log when rating, status, or pipeline stage changes; performance and raised-amount snapshots over time
- **Rich notes** — inline markdown editor with bold / italic / bullet toolbar
- **Smart filtering** — filter by strategy, sector, status, score; cross-view tag navigation
- **Dark/light theme** — CSS custom properties, toggled at runtime
- **Offline fallback** — shows demo data with orange banner when backend is unreachable

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
- Python ≥ 3.10 with `pip3`

### First-time setup

```bash
git clone https://github.com/steffensylvest/lp-crm.git
cd lp-crm

# Install all dependencies (npm + Python)
npm run setup:python

# Seed the database from the bundled fixture data
cp python-server/lp_crm_seed.db python-server/lp_crm.db
# — or migrate from a data.json export —
# npm run migrate
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
│       ├── api.js           loadData() / saveData() / history fetchers
│       ├── constants.js     Strategy options, sectors, currencies, score config
│       ├── theme.js         DARK / LIGHT theme objects + shared style objects
│       └── components/
│           ├── FundDetail.jsx      Fund overlay (Overview / Performance / History / Insights)
│           ├── GPDetail.jsx        GP overlay (Funds / History / Meetings)
│           ├── MeetingDetail.jsx   Meeting overlay
│           ├── Forms.jsx           GPForm, FundForm, MeetingForm, NoteField
│           ├── Pickers.jsx         Inline pickers: score, status, owner, stage, strategy
│           ├── Badges.jsx          Score badge, status pill, sector/strategy chips
│           ├── PipelineBoard.jsx   Kanban board
│           ├── DenseTable.jsx      Collapsible GP/fund table
│           ├── Views.jsx           AllMeetings, AllFunds, TagFilter, Fundraising, GradeA
│           └── SmartAdd.jsx        Quick-add modal, stat cards, data menu
│
├── python-server/           FastAPI backend
│   ├── main.py              Route definitions
│   ├── models.py            SQLAlchemy ORM models (9 tables)
│   ├── crud.py              Read/write + change detection + history writes
│   ├── database.py          Engine setup, reads DATABASE_URL from .env
│   ├── migrate.py           One-time import: data.json → database
│   ├── requirements.txt
│   ├── .env.example         DATABASE_URL template
│   └── lp_crm_seed.db       Seed database with dummy data (safe to commit)
│
├── server/                  Legacy Node.js server (kept for reference)
│   ├── index.js
│   └── data.json            Source file for migrate.py
│
└── docs/
    ├── ARCHITECTURE.md      Full file map, API endpoints, component props
    ├── DATA-MODEL.md        TypeScript shapes + full SQL DDL + schema gaps
    └── THEME.md             CSS variable tokens and theming guide
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/data` | Full CRM dataset |
| PUT | `/api/data` | Replace entire dataset (called by 800 ms auto-save) |
| GET | `/api/history/fund/{id}/performance` | Performance snapshots |
| GET | `/api/history/fund/{id}/raised` | Raised-size snapshots |
| GET | `/api/history/fund/{id}/changes` | Change log for a fund |
| GET | `/api/history/gp/{id}/changes` | Change log for a GP |

---

## Database

SQLite by default. The schema is created automatically on startup via `Base.metadata.create_all()`. See [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) for the full SQL DDL, foreign key structure, and a table of frontend fields not yet persisted to the database.

### Switching to Snowflake

1. Uncomment Snowflake packages in `python-server/requirements.txt` and run `pip3 install -r requirements.txt`
2. Set in `python-server/.env`:
   ```
   DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE
   ```
3. Restart — SQLAlchemy handles the dialect. Run `npm run migrate` to seed from `server/data.json`.

---

## Key behaviours

- **Auto-save** — data is PUT to the API 800 ms after any change; no explicit save button
- **History tracking** — changes to fund rating/status, GP rating/responsible, and pipeline stage are logged to `change_log`; performance edits snapshot to `fund_performance_snapshots`; raised-size changes snapshot to `fund_raised_snapshots`
- **Offline mode** — if the backend is unreachable on load, fallback demo data is shown with an orange banner; saves are blocked
- **Keyboard shortcuts** — `Esc` closes overlays, `/` focuses search, `F1`–`F5` switch views
- **No external state library** — all state lives in `App.jsx`, passed down as props; `EditingContext` is the only React Context used

---

## Documentation

| Doc | Contents |
|-----|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full file map, API endpoints, all component prop signatures |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | TypeScript field shapes, SQL DDL, FK diagram, schema gap tracker |
| [`docs/THEME.md`](docs/THEME.md) | CSS custom properties, token reference, theming guide |
