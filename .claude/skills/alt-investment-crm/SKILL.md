---
name: alt-investment-crm
description: >
  Use this skill whenever helping BUILD, MODIFY, DEBUG, or EXTEND the alternative investment CRM
  for a private markets investment team. Triggers: adding features or screens, writing backend/frontend
  code, designing data models for funds/GPs/contacts/meetings/diligence, building relationship health
  or rating logic, IC deck workflows, pipeline stage transitions, queries, API endpoints, or UI components.
  Also trigger when the user mentions: funds, GPs, placement agents, pipeline stages, go/no-go, IC decks,
  re-ups, vintage year, diligence tasks, relationship health, ratings, or placement agent workflows.
  This skill holds canonical domain knowledge, data model, business logic, and workflow rules.
  The end product has no AI at runtime — Claude's role is to build and extend it correctly.
---

# Alternative Investment CRM — Skill

## Team Context

**3–4 person investment team.** No analyst/senior distinction for daily work — everyone sources, meets, and diligences. A formal **Investment Committee (IC)** makes final commitment decisions. Assign tasks and ownership to named persons, not roles. No approval routing in the CRM.

**Active pipeline:** 50–100 funds currently in fundraising mode or coming to market. A fund leaves active tracking when it closes or is declined — but stays in the database. Total universe grows into the thousands over time.

---

## Core Entities

### Fund
- **Name**, **GP** (linked)
- **Strategy** — PE, VC, Credit, Real Assets, Infrastructure
- **Geography** — e.g. Nordic, Pan-European, Global, US
- **Fund size / target raise** — stored in fund currency
- **Fund currency** — ISO code (EUR, USD, SEK, GBP, DKK, NOK, CHF; others accepted). All monetary values on this record stored in this currency.
- **Vintage year** — expected close / first investment year
- **Expected close date** — drives dashboard alerts and urgency flags
- **Rating** — A/B/C/D/E/U; see Rating System
- **Re-up flag** — returning GP or new relationship
- **Source** — Re-up / Placement agent / Network referral / Direct inbound
- **Pipeline stage** — see Pipeline Stages
- **Lead team member** — single named person, primary ownership
- **Supporting team members** — zero or more; no different permissions
- **Placement agent** (if applicable) — linked PA record
- **Target commitment size** — intended commitment; stored in fund currency
- **Actual commitment size** — confirmed on move to Committed; defaults to target

### GP (Fund Manager)
- **Firm name**, **HQ** (city/country), **Strategy focus** (may be multiple), **AUM** (label source), **Founded year** (optional), **Website**
- **Relationship owner** — named team member
- **Rating** — A/B/C/D/E/U; independent of any specific fund
- **Relationship health** — Active/Warm/Cold/Dormant (calculated; never manual)
- **Notes** — free text
- Linked: contact persons (typed roles), all fund vintages, meetings, PAs
- **Re-up logic:** flag when committed fund is 3+ years old (typical cycle is 3–5 years to next fund). If GP also operates as PA, cross-link records.

### Contact Person
- **Full name**, **Title**, **Function** (Investment / IR / Legal / Finance / Operations / Other), **Current company** (linked GP or PA, or free text), **Email**, **Phone**, **LinkedIn** (optional), **Notes**
- Single record links to multiple entities with typed roles:

| Attached to | Role types |
|-------------|-----------|
| GP | Key contact, Investment team, IR, Legal, Operations |
| Placement Agent | Key contact, Coverage officer, Senior advisor |
| Fund | Investment team, IR contact, Legal contact |
| Meeting | External attendee (presence is the record) |

- One person, created once — role differs per entity
- Company changes: retain old link with date; add new. Job moves are relationship-relevant.

### Placement Agent
- **Firm name**, **HQ**, **Relationship owner**, **Rating** (quality of deal flow introduced), **Relationship health**
- Linked: contact persons, funds currently representing (active fundraise), funds historically sourced (closed)
- PA–Fund link records role: *currently representing* vs. *historically sourced*
- A firm may be both GP and PA — support this without forcing a choice; cross-link profiles, never merge
- One PA meeting may cover multiple funds — each fund discussed logged individually

### Meeting / Interaction
- **Date** (time optional), **Format** (In-person / Video call / Phone call / Internal discussion / Onsite DD / Conference / Other), **Title/subject**
- **Linked fund(s)** — multi-select
- **Linked GP**, **Linked PA** (if applicable)
- **External attendees** — linked contacts where possible; free text if not in CRM
- **Internal attendees** — named team members
- **Notes** — free text; first paragraph = summary excerpt in list views
- **Follow-up actions** — checklist with owner + due date; auto-creates Follow-up Tasks

**Contact event rules** (for relationship health calculation):
- ✅ In-person, Video call, Phone call, Onsite DD
- ✅ Conference — only if named external attendee from the firm is logged
- ❌ Internal discussion, tasks, notes without a meeting record

**Multi-entity linking is required:** one meeting appears in every linked entity's timeline.

### Task — two types

**Diligence Task** — formal DD work item, always linked to a fund
- Fields: description, owner, due date, status (Open/In Progress/Completed/Blocked)
- Categories: Legal, Tax, Financial, Operational, Reference Checks, Onsite DD, IC Material
- Auto-generated when fund enters DD (strategy-based checklist)

**Follow-up / Relationship Task** — reminder or nudge; linked to any entity (fund/GP/PA/contact)
- Can be dismissed (not just completed) — e.g. superseded when a meeting is logged
- Created manually or from meeting follow-up actions

Both types appear in Tasks screen and Dashboard, visually distinguishable.

---

## Pipeline Stages

Non-linear — funds can skip or return to earlier stages.

```
1. INBOUND              — received from GP, PA, re-up, or referral
2. FIRST MEETING        — initial GP meeting held
3. ACTIVE CONSIDERATION — internal discussions; optional Go/No-Go checkpoint
4. MARKET MAPPING       — peer comparison; portfolio fit analysis
5. DUE DILIGENCE        — formal DD; legal + tax (may run concurrently); optional Go/No-Go
6. IC PREPARATION       — investment case drafted; IC deck (PowerPoint) in preparation
7. IC PENDING           — submitted to IC; three outcomes:
                          → COMMITTED (confirm commitment size; defaults to target)
                          → DECLINED (decline reason required)
                          → Return to any earlier stage (IC requests more work)
8. COMMITTED            — actual commitment size confirmed; moves to Portfolio/Monitoring
9. DECLINED             — passed at any stage; reason required (see domain-rules.md)
10. MONITORING          — post-commitment; fund in portfolio
```

Go/no-go checkpoints are informal — loggable as internal meeting notes, never blocking.

**Decline reasons** — required dropdown on move to Declined. Categories: Valuation/terms, Team concerns, Strategy fit, Portfolio concentration, Fund size, Track record, Capacity/timing, Process concerns, IC rejection, Fundraise closed, Other. Full list: `references/domain-rules.md`.

**Performance data** (TVPI, DPI, RVPI, IRR, NAV, called capital %) — manually entered per quarter, not auto-fetched. Full definitions, entry model, display rules by stage: `references/domain-rules.md`.

---

## Currency & Display

- **Store** all monetary values in fund currency. Never convert at write time.
- **Single-fund views** — local currency only
- **List views / pipeline tables** — local + EUR equivalent: `SEK 2.5bn / ~EUR 220m` (tilde = approximate)
- **EUR** is the base comparison currency
- **FX rates** — live integration preferred; fallback is manually entered rate with date stamp. Flag rates older than 30 days.
- **Minimum currencies:** EUR, USD, GBP, SEK, DKK, NOK, CHF. Other ISO codes accepted.

---

## Sourcing Logic

| Source | Implication |
|--------|-------------|
| Re-up | Prior fund performance + relationship history are critical context |
| Placement agent | Log PA + individuals who introduced; each fund in a catch-up logged individually |
| Network / co-investor referral | Log who referred |
| Direct GP inbound | Log contact person who reached out |

---

## Relationship Health

Calculated separately for GPs and PAs. Never manually set. Calculated at **firm level** — any qualifying interaction with any person at the firm counts.

**Default thresholds** (configurable): Active ≤90d · Warm 91–180d · Cold 181–365d · Dormant 365+d

**Signals:** last contact date, interaction frequency (6m/12m trailing), relationship owner, active fund count, trend (6m vs prior 6m).

**Future-dated meetings** count as active contact — prevents false alerts when a meeting is imminent.

**Alert snooze** — alerts snoozeable per entity; default 30 days, user-configurable. Suppresses display only; health status unchanged.

**Rating adjusts urgency** — A-rated Cold GP is more urgent than D-rated Cold GP. Thresholds in `references/domain-rules.md`.

---

## Rating System

Funds, GPs, and PAs each rated independently. Default U for all new records. Changed freely by any team member — no approval. Store last-changed date + previous value.

| Rating | Meaning |
|--------|---------|
| A | High conviction — likely to invest / top-tier relationship |
| B | Strong interest — active engagement warranted |
| C | Moderate interest — engage periodically |
| D | Low interest — monitor passively |
| E | Pass — deprioritised; may track for market awareness |
| U | Unrated — not yet assessed |

- Fund and GP ratings are independent — A-rated GP may have a C-rated current fund
- PA rating = quality of deal flow, not investment attractiveness
- E-rated fund can stay in active pipeline (tracked but expected to pass)
- Rating preserved on Declined records

**Contact frequency targets and alert thresholds by rating:** full table in `references/domain-rules.md`. Summary: A = alert at 60d, B = 90d, C = 180d (standard), D = 365d, E = no alert.

**UI:** rating badge on all table rows and profile headers; filter on all tables; Pipeline default filters to A/B; heat map weights by rating.

---

## Global Search

Persistent search bar in top nav. Live dropdown grouped by entity type.

| Entity | Fields searched |
|--------|----------------|
| Funds | Name |
| GPs | Firm name |
| Placement Agents | Firm name |
| Contacts | Full name, email |
| Meetings | Title/subject (lower priority) |

Context per result (fund: name + GP + vintage; contact: name + title + company). Case-insensitive, partial match. All searchable fields must be indexed — no full table scans.

---

## Smart Features (Rule-Based, No Runtime AI)

Proactively suggest these when building relevant features.

**Internal signals:** days since last contact (rating-weighted alerts) · pipeline stage duration (stale flag) · team coverage (single-person GP risk) · meeting frequency trend · PA source pattern · re-up gap · diligence task overdue · portfolio concentration · fund close date proximity

**External integrations:** Preqin/PitchBook (auto-populate fund/GP data) · LinkedIn (enrich contacts) · Calendar (suggest meeting logs) · News/RSS (GP news on profiles) · FX rates (EUR equivalents)

**Priority features:**
1. Relationship heat map — health + rating combined
2. Pipeline velocity tracker — avg days per stage; flag outliers
3. Fund close date calendar — 90/180-day view
4. Auto diligence checklist — strategy-based on DD entry
5. Portfolio fit score — rule-based (strategy/geography/size)
6. PA productivity dashboard — conversion rates by stage
7. Re-up comparison — current vs. prior vintage side-by-side

---

## UI Design Principles

Professional tool used daily. Optimise for speed, clarity, information density — not visual impressiveness.

**Reference:** Bloomberg Terminal, FactSet, Airtable (dense). Not SaaS marketing sites, consumer apps, or AI demo projects.

- **Functional over beautiful** — every element earns its place through workflow value
- **Density over whitespace** — 25 funds visible without scrolling; compact rows, tight padding
- **No decorative elements** — no gradients, illustrations, textures. Colour = information only (stage/rating/alert)
- **Neutral typography** — clean legible sans-serif; invisible, not expressive
- **Muted palette** — light neutral background, dark text, functional accent colours only. No purple gradients.
- **Fast interactions** — minimal animation, no transitions, immediate inline editing
- **Avoid AI aesthetics** — no rounded card grids, pastel blocks, oversized icons, excessive whitespace

---

## CRM Screens

Full specs in `references/screens.md`. Read that file before building any screen.

### Navigation
Left pane (collapsible): Dashboard · Pipeline · Funds · GPs · Placement Agents · Contacts · Meeting Log · Tasks · Portfolio/Monitoring. Global search bar in top nav (persistent).

### Table Philosophy
All list views are tables. No cards. No kanban. Every table: sortable, multi-column filterable, free-text search, pagination/virtual scroll, column show/hide, CSV/Excel export. Default views always pre-filtered. 20–30 rows visible without scrolling.

### Two Table Types

**Level 1 — Universe Table** (all screens except Pipeline)
- Browse and navigate full record universe
- Columns: name, GP, strategy, geography, vintage, rating, status, relationship owner, last activity

**Level 2 — Pipeline Table** (Pipeline screen only)
- Daily active deal management; scope: Inbound→IC Pending
- Columns: rating badge, stage (colour-coded), days in stage, target raise (local+EUR), expected close, source, lead, last meeting, next action (inline editable), overdue tasks
- Default sort: most advanced → most stale within stage. Default filter: A/B rated.

### Screen Index

| Screen | Purpose | Type |
|--------|---------|------|
| Dashboard | Glanceable; My/Team toggle; pipeline summary, heat map, tasks, re-ups, close alerts, velocity | Widgets |
| Pipeline | Active deal management — Inbound→IC Pending | Level 2 |
| Funds | Full fund universe | Level 1 |
| Fund Profile | Stage history, meetings, diligence, performance, portfolio fit, external data | Detail |
| GPs | All GP firms | Level 1 |
| GP Profile | Contacts, vintages, relationship health, re-up radar | Detail |
| Placement Agents | All PAs + productivity metrics | Level 1 |
| PA Profile | Funds introduced, conversion rates, history, GP dual-role flag | Detail |
| Contacts | All contact persons | Level 1 |
| Contact Profile | Fields, company history, linked entities, meeting history | Detail |
| Meeting Log | All interactions; multi-entity linking | Level 1 |
| Tasks | Diligence + follow-up; My/All toggle | Level 1 |
| Portfolio/Monitoring | Committed funds; performance; concentration charts | Level 1 |

---

## Development Guidelines

**Principles:** domain correctness over generic CRM patterns · lean and functional (3–4 person team) · no runtime AI (deterministic only) · referential integrity always preserved

**When writing code:** ask for tech stack if unknown · read existing code carefully before modifying · extend existing patterns · index for scale (thousands of records total)

**When designing features:** clarify which entity/workflow is touched · check against pipeline stages and relationship model · flag ambiguities before building

### Key Business Logic Rules
- **Soft-delete only** — all entities marked deleted + timestamp; hidden from views/search; never hard-deleted; recoverable. Deleting a GP soft-deletes only that record — linked funds/meetings/tasks remain intact.
- **Non-linear pipeline** — funds can skip or return to any stage
- **Go/no-go checkpoints** are loggable, never blocking
- **PA meetings link to multiple funds** — one meeting → many funds in data model
- **Re-ups surface GP historical funds** — GP→vintage relationship is central
- **Relationship health** calculated separately for GPs and PAs; never conflated
- **Task ownership** = named person, not a role
- **Future-dated meetings** count as active contact
- **Alert snooze** suppresses display only; health status and last contact date unchanged

### IC Deck Export
Format: PowerPoint (.pptx). Slides: Fund Overview · GP Background · Investment Thesis · Portfolio Fit · Market Context · DD Summary · Legal & Tax · Risk Factors · Recommendation + Commitment Size. Read `/mnt/skills/public/pptx/SKILL.md` first.

### Seed / Test Data
Use realistic private markets terminology — Nordic PE, Pan-European credit, global infrastructure — not generic placeholders.
