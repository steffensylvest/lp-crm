# LP CRM — Claude Instructions

At the start of every session, read these three files before making any edits:

1. `docs/ARCHITECTURE.md` — file map, stack, how to run, key patterns
2. `docs/DATA-MODEL.md` — GP / Fund / Meeting / PipelineItem data shapes + history tables
3. `docs/THEME.md` — all CSS variable tokens and how theming works

They are compact and cheap to read. They tell you exactly which file to open for any given task, so you don't need to search or read large files unnecessarily.

## Quick orientation

- **Start dev:** `npm run dev` from project root (Python server on 3001 + Vite client on 5173)
- **Database:** SQLite at `python-server/lp_crm.db` (managed by SQLAlchemy)
- **Backend:** FastAPI in `python-server/` — `main.py` routes, `crud.py` logic, `models.py` ORM
- **Snowflake:** change `DATABASE_URL` in `python-server/.env` — no other code changes needed
- **All components:** `client/src/components/` — see ARCHITECTURE.md for the file map
- **All state:** lives in `client/src/App.jsx`, passed down as props
- **Theme tokens:** CSS variables set on App's root div, available everywhere via `var(--tx1)` etc.
- **History:** append-only audit tables in SQLite; change detection runs on every PUT /api/data

## First-time setup

```bash
npm run setup:python    # pip3 install -r python-server/requirements.txt
npm run migrate         # import server/data.json → SQLite
npm run dev             # start everything
```

## Files you rarely need to read

- `client/src/seed.js` — 250 lines of static fixture data. Only read if the user asks about demo/fallback data.
- `client/src/fallback.js` — offline placeholder data. Only read if the user reports issues with the offline banner.
- `server/index.js` — legacy Node.js server, kept for reference only. The Python server is the active backend.
