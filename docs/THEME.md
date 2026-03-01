# LP CRM — Theme System

Themes are defined in `client/src/theme.js`. The active theme object is spread onto App's root `<div>` via `style={{...theme, background:"var(--bg)", ...}}`, making all CSS variables available to every child via inheritance.

Toggle state: `darkMode` in App. Persisted to `localStorage` key `lp-crm-theme`.

## Base surface tokens

| Variable | Dark | Light | Use |
|----------|------|-------|-----|
| `--bg` | `#020617` | `#f1f5f9` | Page background |
| `--surface` | `#0b1120` | `#ffffff` | Dropdown/popover bg |
| `--card` | `#0f172a` | `#ffffff` | Card / panel bg |
| `--row` | `#080f1e` | `#f8fafc` | Table row bg |
| `--hover` | `#141f35` | `#e2e8f0` | Hover bg |
| `--subtle` | `#1e293b` | `#e8eef5` | Subtle section bg |
| `--border` | `#243347` | `#d1dae6` | Default border |
| `--border-hi` | `#384f68` | `#94a3b8` | Highlighted border |

## Text tokens

| Variable | Dark | Light | Use |
|----------|------|-------|-----|
| `--tx1` | `#f1f5f9` | `#0f172a` | Primary text |
| `--tx2` | `#a8bbc8` | `#334155` | Secondary text |
| `--tx3` | `#7e99ac` | `#475569` | Tertiary / label text |
| `--tx4` | `#627d92` | `#64748b` | Muted text |
| `--tx5` | `#475569` | `#94a3b8` | Very muted / placeholder |

## Score badge tokens (A–E)

| Variable | Dark | Light |
|----------|------|-------|
| `--sb-A-bg` | `#052e16` | `#dcfce7` |
| `--sb-A-c` | `#4ade80` | `#166534` |
| `--sb-A-bd` | `#4ade8040` | `#16653440` |
| `--sb-B-bg` | `#0f3320` | `#f0fdf4` |
| `--sb-B-c` | `#86efac` | `#15803d` |
| `--sb-C-bg` | `#3d1608` | `#fff7ed` |
| `--sb-C-c` | `#fb923c` | `#c2410c` |
| `--sb-D-bg` | `#431407` | `#fff7ed` |
| `--sb-D-c` | `#f97316` | `#9a3412` |
| `--sb-E-bg` | `#450a0a` | `#fef2f2` |
| `--sb-E-c` | `#ef4444` | `#dc2626` |

Used by `ScoreBadge` in `Badges.jsx` as `var(--sb-${score}-bg)` etc.

## Status pill tokens (1–6)

| # | Status | Dark bg | Dark text | Light bg | Light text |
|---|--------|---------|-----------|----------|------------|
| 1 | Fundraising | `#1e3a5f` | `#60a5fa` | `#dbeafe` | `#1d4ed8` |
| 2 | Pre-Marketing | `#1c2a40` | `#93c5fd` | `#eff6ff` | `#2563eb` |
| 3 | Closed | `#1e293b` | `#94a3b8` | `#f1f5f9` | `#64748b` |
| 4 | Deployed | `#14532d` | `#4ade80` | `#dcfce7` | `#166534` |
| 5 | Monitoring | `#1e293b` | `#64748b` | `#f8fafc` | `#64748b` |
| 6 | Exiting | `#451a03` | `#fbbf24` | `#fef9c3` | `#92400e` |

Used by `StatusPill` and `StatusPicker` as `var(--pill-bg-${k})` / `var(--pill-c-${k})`.
Key map: `STATUS_PILL_KEY` in `constants.js`.

## Chip / badge tokens

| Variable | Dark | Light | Component |
|----------|------|-------|-----------|
| `--chip-bg` | `#1e293b` | `#e2e8f0` | `Chip` default bg |
| `--chip-c` | `#94a3b8` | `#64748b` | `Chip` default text |
| `--sector-bg` | `#0c1829` | `#e0f2fe` | `SectorChip` bg |
| `--sector-c` | `#93b4cc` | `#0369a1` | `SectorChip` text |
| `--sector-bd` | `#1a3550` | `#7dd3fc` | `SectorChip` border |
| `--invested-bg` | `#052e16` | `#dcfce7` | `InvestedBadge` bg |
| `--invested-c` | `#4ade80` | `#166534` | `InvestedBadge` text |
| `--invested-bd` | `#22c55e40` | `#16653440` | `InvestedBadge` border |

## Style constants (from theme.js)

These are plain JS objects used directly in `style={{...IS}}` etc.:

| Name | Use |
|------|-----|
| `IS` | Input / select — unfocused |
| `ISFilled` | Input / select — has value |
| `TA` | Textarea — unfocused |
| `TAFilled` | Textarea — has value |
| `btnBase` | Small outline button |
| `btnPrimary` | Blue filled button |
| `btnGhost` | Minimal ghost button |
| `btnDanger` | Red destructive button |

## Adding a new themed element
1. Add CSS variable to both `DARK` and `LIGHT` in `theme.js`
2. Use `var(--your-token)` in the component's inline style
3. No prop drilling or context needed — it inherits from the root div
