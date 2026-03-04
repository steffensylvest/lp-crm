# LP CRM — Architecture

## How to run

```bash
# First-time setup (once)
npm run setup:python      # installs Python deps in python-server/
cp python-server/lp_crm_seed.db python-server/lp_crm.db   # seed the database

# Daily dev
npm run dev               # starts Python server (3001) + Vite client (5173)
npm run dev:server        # Python FastAPI server only
npm run dev:client        # Vite client only

# Legacy Node.js server (kept for reference, do not use)
npm run dev:server:node
```

> **IPv6 note:** The server binds to `0.0.0.0` (not just `127.0.0.1`) so macOS
> `localhost` resolves correctly over both IPv4 and IPv6.

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
| `main.py` | FastAPI app, all route definitions |
| `database.py` | SQLAlchemy engine setup, reads `DATABASE_URL` from `.env` |
| `models.py` | ORM table definitions (GP, Fund, FundSector, Meeting, PipelineItem, Todo + 3 history tables) |
| `crud.py` | `get_all_data()`, `upsert_all_data()` (with change detection), history query functions |
| `migrate.py` | One-time import: `data.json` → SQLite. Usage: `python migrate.py /path/to/data.json`. Idempotent — safe to re-run |
| `lp_crm_seed.db` | Pre-seeded SQLite database for first-time setup — copy to `lp_crm.db` |
| `requirements.txt` | FastAPI, uvicorn, SQLAlchemy, python-dotenv (Snowflake pkgs commented) |
| `.env` | `DATABASE_URL=sqlite:///./lp_crm.db` (not committed) |
| `.env.example` | Template with SQLite + Snowflake connection string examples |
| `lp_crm.db` | SQLite database file (not committed) |

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/data` | Full CRM dataset |
| PUT | `/api/data` | Replace entire dataset — called by 800 ms auto-save |
| GET | `/api/history/fund/{id}/performance` | Performance snapshots, newest first |
| GET | `/api/history/fund/{id}/raised` | Raised-size snapshots, newest first |
| GET | `/api/history/fund/{id}/changes` | Change log for fund (score, status, pipeline stage) |
| GET | `/api/history/gp/{id}/changes` | Change log for GP (score, owner/responsible) |

### Client — root (`client/src/`)

| File | Contents |
|------|----------|
| `App.jsx` | App component: state, effects, handlers, view routing |
| `api.js` | `loadData()`, `saveData()`, history fetch helpers (`loadFundPerformanceHistory`, `loadFundRaisedHistory`, `loadFundChangeHistory`, `loadGpChangeHistory`) |
| `fallback.js` | `FALLBACK_DATA` — dummy data shown when backend offline |
| `utils.js` | `uid()`, `now()`, `fmt(date)`, `fmtTs(ts)`, `fmtM(val, currency)` |
| `constants.js` | `SCORE_CONFIG`, `STRATEGY_OPTIONS`, `SUB_STRATEGY_PRESETS`, `SECTOR_OPTIONS`, `CURRENCIES`, `STATUS_OPTIONS`, `PIPELINE_STAGES`, `STATUS_PILL_KEY`, `SHORTCUTS` |
| `seed.js` | `mkSeed()` — demo fixture data |
| `theme.js` | `DARK`, `LIGHT` theme objects; `IS`, `ISFilled`, `TA`, `TAFilled`, `btnBase`, `btnPrimary`, `btnGhost`, `btnDanger` style objects |

### Client — components (`client/src/components/`)

| File | Exports | Notes |
|------|---------|-------|
| `Badges.jsx` | `ScoreBadge`, `StatusPill`, `Chip`, `SectorChip`, `SubStratChip`, `InvestedBadge` | |
| `Pickers.jsx` | `ScorePicker`, `StatusPicker`, `TagPicker`, `OwnerPicker`, `StagePicker`, `StrategyPicker`, `SubStrategyPicker`, `EditingContext`, `InlineMetric` | |
| `Overlay.jsx` | `Overlay`, `OverlayHeader` | |
| `Forms.jsx` | `Field`, `NoteField`, `GPForm`, `FundForm`, `MeetingForm` | |
| `FundDetail.jsx` | `FundDetailOverlay` | 4 tabs: Overview · Performance · History · Insights |
| `MeetingDetail.jsx` | `MeetingDetailOverlay` | |
| `GPDetail.jsx` | `GPDetailOverlay` | 3 tabs: Funds · History · Meetings |
| `PipelineBoard.jsx` | `PipelineBoard` | Drag-drop kanban |
| `FilterDropdown.jsx` | `FilterDropdown` | Multi-select popover |
| `DenseTable.jsx` | `DenseTable` | Collapsible GP/fund table |
| `Views.jsx` | `AllMeetingsView`, `AllFundsView`, `TagFilterView`, `GradeAView`, `FundraisingView` | |
| `SmartAdd.jsx` | `SmartAddModal`, `DataMenu`, `StatCard` | |

---

## Component prop signatures

| Component | Props |
|-----------|-------|
| `ScoreBadge` | `score` `size?="sm\|lg"` |
| `StatusPill` | `status` |
| `Chip` | `label` `color?` `bg?` `onClick?` |
| `SectorChip` | `label` `onClick?` |
| `SubStratChip` | `label` `onClick?` |
| `InvestedBadge` | `amount` `currency` |
| `ScorePicker` | `score` `onChange` `size?` |
| `StatusPicker` | `status` `onChange` |
| `TagPicker` | `selected[]` `options[]` `onChange` |
| `OwnerPicker` | `owner` `owners[]` `onChange` `placeholder?` |
| `StagePicker` | `stage` `onChange` |
| `StrategyPicker` | `strategy` `onChange` |
| `SubStrategyPicker` | `strategy` `subStrategy` `onChange` |
| `InlineMetric` | `id` `label` `value` `displayValue?` `onSave` `placeholder?` `type?` |
| `Overlay` | `onClose` `children` `width?` `zIndex?` |
| `OverlayHeader` | `title` `subtitle?` `onClose` `actions?` |
| `Field` | `label` `children` `half?` `third?` |
| `NoteField` | `value` `onSave` |
| `GPForm` | `initial?` `onSave` `onClose` `onDelete?` |
| `FundForm` | `initial?` `onSave` `onClose` `onDelete?` |
| `MeetingForm` | `initial?` `funds[]` `showFundPicker?` `onSave` `onClose` |
| `GPDetailOverlay` | `gp` `owners[]` `onClose` `onUpdate` `onTagClick` `onFundClick` `onMeetingClick` `onLogMeeting` `onDeleteGP` |
| `FundDetailOverlay` | `fund` `gp` `owners[]` `meetings[]` `pipeline[]` `onClose` `onSaveFund` `onPipelineStage` `onAddMeeting` `onTagClick` `onMeetingClick` `onGpClick` `zIndex?` `onEditingChange?` |
| `MeetingDetailOverlay` | `meeting` `fundName?` `gpName` `onClose` `onEdit` `onDelete` `zIndex?` |
| `PipelineBoard` | `pipeline[]` `gps[]` `onUpdate` `onFundClick` `onBack` |
| `FilterDropdown` | `label` `options[]` `selected[]` `onChange` `renderOption?` `accentColor?` `accentBg?` |
| `DenseTable` | `filtered[]` `allGps[]` `pipeline[]` `onGpClick` `onFundClick` `onMeetingClick` `autoExpand?` |
| `AllMeetingsView` | `gps[]` `onBack` `onMeetingClick` |
| `AllFundsView` | `gps[]` `onBack` `onFundClick` `onTagClick` |
| `TagFilterView` | `type` `value` `gps[]` `onBack` `onFundClick` |
| `GradeAView` | `gps[]` `onBack` `onGpClick` |
| `FundraisingView` | `gps[]` `onBack` `onFundClick` |
| `SmartAddModal` | `gps[]` `onClose` `onAddGP` `onAddFund` `onLogMeeting` |
| `DataMenu` | `exportData` `fileInputRef` `importData` `onLoadSeed` |
| `StatCard` | `label` `value` `accent?` `sub?` `onClick?` `shortcut?` |

---

## Key patterns

- **No Redux / Context API** (except `EditingContext` for inline-editing lock in FundDetail)
- **All state in App** — passed down as props
- **Inline styles throughout** — no CSS files, no Tailwind
- **Auto-save** — 800 ms debounce after any data change → PUT `/api/data`
- **History auto-refresh** — FundDetail and GPDetail re-fetch history 1.5 s after a tracked field changes (score, status, raisedSize, perf metrics, owner), giving the 800 ms auto-save time to settle first
- **Keyboard shortcuts** — `/` focuses search, `Esc` closes overlays, F1–F5 switch views
- **Offline fallback** — if backend unreachable, shows `FALLBACK_DATA` with orange banner
- **Currency formatting** — use `fmtM(val, currency)` from utils.js
- **Snowflake migration** — change `DATABASE_URL` in `python-server/.env` and uncomment Snowflake deps in `requirements.txt`

---

## Switching to Snowflake

1. `pip3 install snowflake-sqlalchemy` (or uncomment in `requirements.txt`)
2. Set in `python-server/.env`:
   ```
   DATABASE_URL=snowflake://USER:PASS@ACCOUNT/DB/SCHEMA?warehouse=WH&role=ROLE
   ```
3. Restart the server — SQLAlchemy handles the dialect automatically.
4. Run `python migrate.py /path/to/data.json` once to seed Snowflake.
