# CRM Screen Specifications

Detailed spec for each screen in the alternative investment CRM. Read this file when building, modifying, or debugging any UI screen or component.

---

## Table of Contents
1. [Dashboard](#1-dashboard)
2. [Funds Screen & Fund Profile](#2-funds-screen--fund-profile)
3. [GPs Screen & GP Profile](#3-gps-screen--gp-profile)
4. [Placement Agents Screen & PA Profile](#4-placement-agents-screen--pa-profile)
5. [Active Pipeline View](#5-active-pipeline-view)
6. [Contacts Screen & Contact Profile](#6-contacts-screen--contact-profile)
7. [Meetings & Notes](#7-meetings--notes)
8. [Tasks](#8-tasks)
9. [Portfolio / Monitoring View](#9-portfolio--monitoring-view)
10. [External Data Integration Points](#external-data-integration-points)

---

## 1. Dashboard

The primary landing screen. Should be glanceable — a team member opening the app should be able to assess the state of the pipeline, their personal workload, and items requiring attention within seconds.

**Two modes:**
- **My View** — scoped to the logged-in user: their funds, their tasks, their meetings, their relationships
- **Team View** — full pipeline across all team members; useful for partners and team-wide status reviews

**Modules:**

| Module | Description |
|--------|-------------|
| **Pipeline summary** | Fund counts by stage, filterable by strategy/geography. Visual funnel or bar chart. |
| **Relationship heat map** | Grid or list of GPs and PAs colour-coded by health status (Active/Warm/Cold/Dormant). Rating badge shown per entity. A-rated Cold/Dormant entities are surfaced most prominently — rating and health status combine to determine urgency. Click-through to GP or PA profile. |
| **Meetings to be planned** | GPs and PAs with active pipeline funds where no meeting has been logged in longer than the rating-based contact frequency target (e.g. 60 days for A-rated, 90 days for B-rated). Surfaced as actionable nudges. **Snooze:** the user can dismiss each alert for a custom number of days (default 30); the alert reappears after the snooze period. A meeting logged with a future date counts as active — the system treats it as if contact has occurred. |
| **Outstanding diligence tasks** | Open tasks past due date or due within 7 days, grouped by fund. Scoped to user in My View. |
| **Upcoming re-ups** | GPs with a committed fund approaching typical re-up timing (3–4 years into fund life), or where a new vintage has been announced externally. |
| **Fund close date alerts** | Funds in DD, IC Prep, or IC Pending where expected close date is within 90 days. |
| **Pipeline velocity flags** | Funds in current stage significantly longer than the historical average for that stage. |
| **Recent activity feed** | Last 10–15 actions across the team (meetings logged, stage changes, tasks completed). Team View only. |

**Design notes:**
- Modules should be collapsible/configurable per user
- My View / Team View toggle persistent per user (remembered in user preferences)
- All counts and flags calculated live from DB — no cached snapshots
- Dashboard modules link through to the relevant screen or record, never dead-ends

---

## 2. Funds Screen & Fund Profile

### Funds Screen (Universe Table)

Shows the **Level 1 Aggregated Table** — the full universe of funds tracked in the CRM across all vintages and statuses.

- **Default filter:** current/recent vintages (last 5–7 years) + active/monitoring statuses
- Users can clear all filters to see the complete all-time universe
- Never load all records unfiltered by default

**Table columns:** fund name, GP (linked), rating (A–U badge), strategy, geography, vintage year, fund size, status (pipeline stage or Committed/Declined/Monitoring), lead team member, last activity date.

Clicking a row → Fund Profile.

---

### Fund Profile

The central detail page for a single fund.

| Section | Content |
|---------|---------|
| **Header** | Fund name, GP (linked), strategy, geography, vintage year, target size, rating badge (A–U, editable inline), current stage, source, lead team member, re-up flag |
| **Pipeline status** | Current stage with visual progress indicator; full stage history with entry dates; go/no-go decisions logged |
| **Team coverage** | Which team members have been involved and in what capacity (lead / meeting attendee / DD task owner) |
| **Meetings & notes** | Chronological list of all linked meetings and notes; each shows brief excerpt, expandable to full detail |
| **Diligence tracker** | Open and completed tasks grouped by category (Legal, Tax, Financial, Operational, Reference); owner and due date visible |
| **Performance data** | Committed/monitoring funds: TVPI, DPI, RVPI, IRR, NAV, called capital %. Pipeline funds: prior fund performance if available. Hide/collapse section for early-stage funds where not relevant. |
| **Portfolio fit** | Rule-based fit indicators: strategy concentration vs. portfolio, geography concentration, fund size alignment |
| **External data panel** | Preqin/PitchBook (if integrated): GP AUM, fund series history, comparable funds, recent GP news. Degrade gracefully if not configured. |
| **Related entities** | Links to GP profile, PA (if applicable), all linked contact persons |

**Notes:**
- Meeting summaries: show first 2–3 lines with "expand" option — never full notes by default in list context
- Performance metrics: only show for Monitoring/Committed/Re-up funds — hide for early pipeline stages

---

## 3. GPs Screen & GP Profile

### GPs Screen (Universe Table)

Shows the **Level 1 Aggregated Table** for all GP firms.

**Table columns:** GP name, HQ/primary geography, strategy focus, rating (A–U badge), AUM (if available), relationship owner (internal), relationship health status, active funds in pipeline (count), total funds tracked (count), last interaction date.

Clicking a row → GP Profile.

---

### GP Profile

Comprehensive view of a fund manager across all vintages and the full relationship history.

| Section | Content |
|---------|---------|
| **Header** | GP name, HQ location, strategy focus, AUM, rating badge (A–U, editable inline), relationship owner (internal), relationship health status badge |
| **Contact persons** | All individuals at this GP in the CRM — role, last interaction date, link to contact record |
| **Funds in CRM** | All fund vintages tracked in CRM — stage, commitment status, performance data where available. Table format. |
| **Funds not in CRM** | External data only (Preqin/PitchBook): other known funds from this GP not yet in CRM, with one-click add. Degrade gracefully if integration not active. |
| **Relationship history** | Chronological log of all meetings, calls, notes across all funds associated with this GP |
| **Relationship health metrics** | Last contact date, interaction frequency (6m / 12m trailing), status badge, trend indicator (improving / stable / declining) |
| **Re-up radar** | If GP has a committed fund in portfolio: estimated re-up timing based on vintage + typical fund cycle; flag if new vintage appears to be in market |

**Notes:**
- GP Profile accessible from: fund profiles, meeting log, relationship heat map on dashboard, GPs table
- "Funds not in CRM" panel should be hidden (not just greyed out) if external integration is not configured

---

## 4. Placement Agents Screen & PA Profile

### Placement Agents Screen (Universe Table)

Shows the **Level 1 Aggregated Table** for all PA firms.

**Table columns:** PA name, relationship owner (internal), rating (A–U badge), relationship health status, total funds introduced (all time), active funds in pipeline (count), conversion rate (% reaching DD or beyond), last interaction date.

Clicking a row → PA Profile.

---

### Placement Agent Profile

Structured around the PA's role as deal flow introducer. Key dynamic: breadth across multiple GPs and funds, and the possibility that a PA firm may also appear as a GP.

| Section | Content |
|---------|---------|
| **Header** | PA firm name, HQ/geography, relationship owner (internal), rating badge (A–U, editable inline), relationship health status badge, total funds introduced count |
| **Contact persons** | Individuals at this PA tracked in the CRM — role, last interaction date, link to contact record |
| **Funds currently representing** | Active fundraises this PA is currently marketing — fund name, GP, strategy, stage in CRM pipeline |
| **Funds historically sourced** | Closed funds that entered the CRM via this PA — outcome (Committed / Declined), vintage year |
| **PA productivity metrics** | Total funds introduced; conversion rate by stage (First Meeting → DD → Commitment); average pipeline duration per fund introduced |
| **Relationship history** | All meetings and notes linked to this PA. Each entry shows all funds discussed — never just one. |
| **Relationship health metrics** | Last contact date, frequency (6m / 12m), status badge, trend (improving / stable / declining) |
| **GP / dual-role flag** | If this firm also appears as a GP in the CRM, display a clear link to the GP profile and flag the dual role |

**Notes:**
- PA catch-up meetings often cover multiple funds — meeting entries must display all linked funds
- The distinction between "currently representing" and "historically sourced" maps to the PA–Fund link role field (see Core Entities)
- If the firm operates as both GP and PA, both profiles should exist and cross-link — do not merge them

---

## 5. Active Pipeline View

Operational heart of the CRM for daily deal management. Uses the **Level 2 Pipeline Table**.

### Table Columns (default set)

| Column | Notes |
|--------|-------|
| Fund name | Link to fund profile |
| GP | Link to GP profile |
| Rating | A/B/C/D/E/U badge — colour coded; filterable |
| Strategy | |
| Geography | |
| Target raise | Show in local currency + EUR equivalent (e.g. "SEK 2.5bn / ~EUR 220m"). See Currency & Display rules in SKILL.md. |
| Pipeline stage | Colour-coded by stage |
| Days in current stage | Highlight if above historical average for that stage |
| Expected close date | Highlight red if within 90 days |
| Source | PA / Direct / Re-up / Network |
| Lead team member | |
| Last meeting date | |
| Next planned action | Editable inline — free text |
| Overdue tasks | Red dot indicator if any open tasks past due |

### Filters (always visible — not hidden in a dropdown menu)
- Rating (multi-select; default view pre-set to A and B to show highest-priority opportunities)
- Stage (multi-select)
- Strategy (multi-select)
- Geography (multi-select)
- Lead team member
- Source
- Re-up only (toggle)

### Quick Actions Per Row
- Log meeting
- Add task
- Change stage
- View fund profile

**No kanban view.** The table is the only format for this screen.

**Default sort:** IC Pending first, then by stage descending (most advanced), then by days in stage descending (most stale within each stage).

---

## 6. Contacts Screen & Contact Profile

### Contacts Screen (Universe Table)

Shows all contact persons tracked in the CRM across all entity types.

**Default filter:** active contacts (linked to at least one active GP, PA, or pipeline fund). Users can clear to see all contacts including historical.

**Table columns:** full name, title, function, current company (linked to GP or PA where applicable), linked funds (count), last interaction date, relationship owner (internal team member most recently in contact).

Clicking a row → Contact Profile.

---

### Contact Profile

| Section | Content |
|---------|---------|
| **Header** | Full name, title, function, current company (linked), email, phone, LinkedIn |
| **Company history** | Current and previous companies with dates — job moves are relationship-relevant |
| **Linked GPs** | GPs this person is associated with, and their role at each |
| **Linked funds** | Funds this person is associated with, and their role on each fund (investment team / IR contact / legal contact) |
| **Linked PA** | PA firm if applicable, and role |
| **Meeting history** | All meetings this person attended — date, type, linked fund/GP/PA, brief summary excerpt |
| **Notes** | Free text context field |

**Notes:**
- A contact may be linked to multiple GPs, funds, and PAs simultaneously — the profile is the single source of truth for that person across all relationships
- When a contact changes company, do not overwrite — preserve history with dates

---

## 7. Meetings & Notes

Unified log of all interactions — meetings, calls, onsite visits, internal notes — across all entities in the CRM.

### List View
- Table format: date, interaction type, linked entities (fund/GP/PA), internal attendees, brief summary excerpt
- Filters: entity type (fund/GP/PA), date range, internal team member, interaction type
- Quick-add button always visible

### Meeting / Note Detail
Structured fields:
- Date and time
- Format: In-person / Video / Call / Internal note / Onsite DD
- Linked fund(s) — multi-select
- Linked GP
- Linked PA (if applicable)
- External attendees — linked to contact records where possible
- Internal attendees — team member names
- Notes — free text area
- Follow-up actions — checklist with owner + due date (these feed the task system and dashboard)

### Multi-Entity Linking
A single meeting must be linkable to multiple entities simultaneously. Example: a PA catch-up covers two funds from different GPs → the meeting appears in the PA's timeline, both funds' timelines, and both GPs' timelines. This is a core data model requirement, not optional.

### Summary Excerpts
The first paragraph of notes is used as the summary excerpt in list views and on entity profile pages. Full notes are only shown in the meeting detail view.

---

## 8. Tasks

Standalone task management screen covering both Diligence Tasks and Follow-up Tasks (see Core Entities in SKILL.md for the distinction between types).

**Table columns:** task description, type (Diligence / Follow-up), linked entity/fund (linked), category, owner, due date, status, days overdue (if applicable)

**Filters:**
- Type (Diligence / Follow-up)
- Linked fund / GP / PA
- Owner
- Category (Diligence tasks only)
- Status
- Due date range

**Toggle:** My Tasks / All Tasks

**Group by:** fund, due date, or entity

**Status values:**
- Diligence Tasks: Open, In Progress, Completed, Blocked
- Follow-up Tasks: Open, Completed, Dismissed *(dismissed = no longer relevant, e.g. superseded by a logged meeting)*

**Visual distinction:** Diligence Tasks and Follow-up Tasks should be visually distinguishable — e.g. by type badge or subtle row colour difference — since they represent fundamentally different kinds of work.

**Automatic population:**
- Diligence Tasks: auto-generated when a fund enters DD stage (pre-populated checklist based on strategy — see Smart Features in SKILL.md)
- Follow-up Tasks: created manually or from meeting follow-up action items

Each task row links back to its primary linked entity (fund profile, GP profile, etc.).

---

## 8. Portfolio / Monitoring View

Dedicated view for committed funds. Separate navigation item from active pipeline — these are funds where the investment decision has been made.

### Table
Columns: fund name, GP, strategy, geography, vintage year, fund currency, commitment date, commitment size (local + EUR equivalent), called %, NAV (local + EUR equivalent), TVPI, DPI, IRR, expected end date.

Sortable and filterable by all columns. Monetary columns (commitment size, NAV) show local currency value with EUR equivalent — format consistent with pipeline table. See Currency & Display rules in SKILL.md.

### Portfolio Analytics
Below or alongside the table:
- Concentration charts: by strategy, geography, GP, vintage year
- Called vs. uncalled capital summary
- Flag: funds approaching end of life (within 2 years of expected termination)
- Flag: funds with no performance update in 12+ months

Link from any row → full Fund Profile (meeting history, diligence record, full detail).

---

## External Data Integration Points

When Preqin, PitchBook, or a similar data provider is integrated, external data surfaces at these specific locations. **Always label external data clearly** (e.g. badge: "Via Preqin") so users know it is not manually verified internal data.

| Location | What external data adds |
|----------|------------------------|
| Fund Profile | Prior fund performance by vintage (TVPI/DPI/IRR), comparable funds currently fundraising, fund close status |
| GP Profile — Funds not in CRM panel | Other known fund vintages from this GP not yet added to CRM, with one-click add |
| GP Profile — header | AUM history, team changes, recent news/press |
| Dashboard — Re-up radar | Signal that a GP's next vintage is being marketed in the market, before it has been formally logged in CRM |
| Active Pipeline table | Peer context column: how does this fund's target size compare to comparable funds in the same strategy/vintage? |

External data panels must degrade gracefully — hide the panel entirely (not show an error) if the integration is not configured or the API call fails.
