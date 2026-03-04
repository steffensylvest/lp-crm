# LP CRM — Claude Instructions

## Session Start

At the start of every session, read these three files before making any edits:

1. `docs/ARCHITECTURE.md` — file map, stack, how to run, key patterns
2. `docs/DATA-MODEL.md` — GP / Fund / Meeting / PipelineItem data shapes + history tables
3. `docs/THEME.md` — all CSS variable tokens and how theming works

They are compact and cheap to read. They tell you exactly which file to open for any given task, so you don't need to search or read large files unnecessarily.

## Quick Orientation

- **Start dev:** `npm run dev` from project root (Python server on 3001 + Vite client on 5173)
- **Database:** SQLite at `python-server/lp_crm.db` (managed by SQLAlchemy)
- **Backend:** FastAPI in `python-server/` — `main.py` routes, `crud.py` logic, `models.py` ORM
- **Snowflake:** change `DATABASE_URL` in `python-server/.env` — no other code changes needed
- **All components:** `client/src/components/` — see ARCHITECTURE.md for the file map
- **All state:** lives in `client/src/App.jsx`, passed down as props
- **Theme tokens:** CSS variables set on App's root div, available everywhere via `var(--tx1)` etc.
- **History:** append-only audit tables in SQLite; change detection runs on every PUT /api/data

## First-Time Setup

```bash
npm run setup:python                              # pip3 install -r python-server/requirements.txt
cp python-server/lp_crm_seed.db python-server/lp_crm.db   # seed the database
npm run dev                                       # start everything
```

## Files to Skip

- `client/src/seed.js` — 250 lines of static fixture data. Only read if the user asks about demo/fallback data.
- `client/src/fallback.js` — offline placeholder data. Only read if the user reports issues with the offline banner.

## Implementation Rules

Before implementing any requested change, estimate complexity and classify as SMALL, MEDIUM, or LARGE. If unclear, default to MEDIUM.

### SMALL

Examples: small bug fixes, minor refactors, UI tweaks, simple logic updates, changes affecting 1–2 files.

- Implement directly — no confirmation required.
- Keep the change minimal and focused.

### MEDIUM

Examples: new feature touching several files, moderate refactoring, integrating a new dependency, changes affecting multiple modules.

1. Create a short implementation plan.
2. Implement one step at a time.
3. After each step, stop and wait for user confirmation before continuing.
4. Prefer modifying no more than 2–3 files per step.

### LARGE

Examples: major architecture changes, large refactors, introducing new subsystems, significant infrastructure or integration work.

1. Create a clear, detailed step-by-step implementation plan.
2. Wait for user approval before starting implementation.
3. Implement one step at a time.
4. After each step, stop and request confirmation before continuing.
5. Prefer modifying no more than 2–3 files per step.

### General Rules

- Prefer small, incremental changes over large edits.
- Avoid modifying many files at once.
- Ensure the repository remains in a working state after each step.
- When possible, make changes that are easy to review and revert.

## Documentation

If major architectural decisions are made, suggest updating:
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
