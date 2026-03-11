# Domain Rules Reference

Detailed business logic rules for the alternative investment CRM. Read this file when implementing features that involve fund status transitions, performance data, decline reasons, or any business logic that needs precise definition.

---

## Table of Contents
1. [Decline Reasons](#decline-reasons)
2. [Performance Data](#performance-data)
3. [IC Stage Transition Rules](#ic-stage-transition-rules)
4. [Currency Handling](#currency-handling)
5. [Rating Contact Frequency Targets](#rating-contact-frequency-targets)

---

## Rating Contact Frequency Targets

Contact frequency targets and relationship health alert thresholds by rating, for GPs and PAs.

| Rating | Contact target | Cold alert threshold | Alert generated? |
|--------|---------------|---------------------|-----------------|
| A | Every 60 days | 60 days | Yes — highest urgency |
| B | Every 90 days | 90 days | Yes |
| C | Every 180 days | 180 days (standard) | Yes |
| D | Every 365 days | 365 days | Yes — low urgency |
| E | None — deprioritised | — | No |
| U | Every 180 days | 180 days (standard) | Yes |

These thresholds override the base relationship health thresholds **for alert generation only**. The underlying Active/Warm/Cold/Dormant status always reflects absolute elapsed time. Dashboard alerts and heat map urgency indicators weight by rating — a Cold A-rated GP surfaces above a Cold D-rated GP regardless of how long each has been cold.

---

## Decline Reasons

When a fund is moved to Declined status, a reason category **must** be selected before the transition is saved. This is a required field — the stage change should not be completable without it.

**Field spec:** single-select dropdown + optional free-text notes field

| Category | When to use |
|----------|-------------|
| **Valuation / terms** | Pricing, management fees, carry terms, or other fund economics not acceptable |
| **Team concerns** | Key person risk, team instability, recent departures, insufficient track record of the investment team |
| **Strategy fit** | Fund strategy doesn't align with current portfolio construction goals or investment mandate |
| **Portfolio concentration** | Committing would create overweight in a strategy, geography, GP, or vintage year |
| **Fund too large / too small** | Target commitment falls outside the team's viable range (too small to be meaningful; too large relative to portfolio size) |
| **Track record insufficient** | Not enough performance history on prior funds to support conviction — typically applies to emerging managers |
| **Capacity / timing** | Team capacity constraints, budget already allocated for the vintage, or poor timing relative to other active processes |
| **Process concerns** | Issues identified during diligence — legal, operational, governance, ESG, or compliance concerns |
| **IC rejection** | Investment Committee did not approve the commitment recommendation |
| **LP / investor concerns** | Issues raised by the team's own investors (LPs) that make the investment unsuitable |
| **Fundraise closed / missed** | Fund closed or hard cap reached before the team's process could be completed |
| **Relationship / sourcing only** | Fund was tracked for awareness but never seriously evaluated — logging for completeness |
| **Other** | Free text required if selected — must provide explanation |

**Implementation notes:**
- Decline reason is visible on the fund record header and in the fund's stage history
- Decline reason is filterable and exportable from the Funds universe table
- Over time, the distribution of decline reasons is analytically useful — build aggregation queries to support this
- A fund can be re-opened from Declined (e.g. if re-introduced in a later vintage) — the reason from the prior decline should be preserved in history, not overwritten

---

## Performance Data

### Contexts

Performance data appears in two distinct contexts with different purposes:

| Context | Which funds | Purpose |
|---------|------------|---------|
| **Portfolio monitoring** | Committed / Monitoring stage | Track ongoing performance of invested funds |
| **Re-up diligence input** | Pipeline funds that are re-ups | Reference prior fund vintage performance during evaluation |

### Metric Definitions

| Metric | Full name | Definition | Notes |
|--------|-----------|-----------|-------|
| **TVPI** | Total Value to Paid-In | (Distributions + Remaining NAV) / Called Capital | Primary return multiple; also called MOIC (Multiple on Invested Capital) |
| **DPI** | Distributions to Paid-In | Cash distributed to investors / Called Capital | Measures realisation — cash actually returned |
| **RVPI** | Residual Value to Paid-In | Current NAV / Called Capital | Unrealised portion; TVPI = DPI + RVPI |
| **IRR** | Internal Rate of Return | Annualised return accounting for timing of cash flows | Sensitive to early distributions; compare with caution across vintages |
| **NAV** | Net Asset Value | Current carrying value of the fund as reported by GP | GP-reported; typically lagged by one quarter |
| **Called capital %** | — | Called Capital / Total Commitment × 100 | Indicates how far into the investment period the fund is |
| **Commitment size** | — | The team's committed amount in original currency | Record currency alongside value |
| **Expected end date** | — | Anticipated fund termination / final distribution date | Often 10 years from vintage year ± extensions |

### Data Entry Model

- **Source:** manually entered by the team based on GP quarterly reports (ILPA-format capital account statements or equivalent)
- **Not auto-fetched:** even if Preqin/PitchBook integration is active, externally sourced performance data must be treated as indicative and clearly labelled as such — never overwrite manually entered data with external data silently
- **Frequency:** quarterly (align with GP reporting calendar — typically March, June, September, December)
- **Storage:** each data entry is a separate record tied to a reporting period — do not overwrite previous values. Schema should store: fund_id, metric, value, currency, reporting_date, entered_by, entered_at
- **Currency:** store in the reported currency; display with optional conversion to a user-defined base currency if FX integration is active. Never convert stored values — only convert at display time.

### Display Rules by Pipeline Stage

| Stage | Performance section behaviour |
|-------|------------------------------|
| Inbound | Hidden — not relevant |
| First Meeting | Hidden — not relevant |
| Active Consideration | Hidden — not relevant |
| Market Mapping | Hidden unless re-up — if re-up, show prior fund performance as read-only reference panel |
| Due Diligence | Show prior fund performance as read-only reference panel (re-ups and new GPs with prior funds) |
| IC Preparation | Show prior fund performance prominently — key input for IC materials |
| IC Pending | Show prior fund performance |
| Committed | Show current fund metrics (latest quarter) + entry point data (commitment size, date) |
| Monitoring | Show full metrics (latest + historical by quarter); allow trend charts |
| Declined | Show if data was entered before decline; read-only |

### Re-up Display

When a fund in pipeline is a re-up, the performance panel shows:
- Prior fund name and vintage year (clearly labelled)
- Most recent reported TVPI, DPI, IRR
- Called capital % (indicates maturity of prior fund)
- Any available quarterly trend (last 4 quarters if entered)
- Source label: "Reported by GP" or "Via Preqin" depending on origin

This panel is read-only — it is reference data for the evaluation, not editable from the fund profile. To edit prior fund performance, navigate to that fund's own record.

---

## IC Stage Transition Rules

When a fund is in **IC — Pending Decision**, three outcomes are possible. The system must present these as explicit choices rather than a generic stage-change dropdown, since each has different data consequences.

| Outcome | Stage change | Required fields | Notes |
|---------|-------------|-----------------|-------|
| **IC Approved → Committed** | IC Pending → Committed | Confirm actual commitment size (defaults to target; editable) | Triggers move to Portfolio / Monitoring view |
| **IC Rejected → Declined** | IC Pending → Declined | Decline reason (see Decline Reasons) | Treated the same as any other decline; reason = "IC rejection" is a valid category |
| **Return to pipeline** | IC Pending → any earlier stage | Stage selection + optional note | Used when IC requests more diligence, renegotiation, or deferred decision |

**Commitment size on transition to Committed:**
- The system should present a confirmation dialog when moving to Committed
- Pre-populate with the fund's target commitment size
- Allow the user to adjust — actual commitment may differ (e.g. capacity constraints at close, revised allocation)
- Store both target and actual commitment so the delta is visible
- Currency is the fund's own currency (not EUR) — do not auto-convert at time of entry

**No IC deck management in the CRM:**
- IC materials (presentations, memos) are prepared and distributed outside the CRM
- The CRM does not store or route IC materials — the stage change to IC Pending is sufficient to indicate materials have been submitted
- Any notes about the IC process can be logged as an internal meeting/note linked to the fund

---

## Currency Handling

**Storage:**
- All monetary values stored in original currency — never convert at write time
- Each monetary field must be accompanied by a currency code (ISO 4217: EUR, USD, GBP, SEK, DKK, NOK, CHF, etc.)
- Schema pattern: store value and currency as a pair, e.g. `{ amount: 250000000, currency: "SEK" }`

**Display — single fund context (fund profile, fund detail):**
- Show in local (fund) currency only
- No EUR conversion needed unless user explicitly requests it

**Display — multi-fund context (pipeline table, portfolio table, any list view):**
- Show local currency value + EUR equivalent side by side
- Format: `SEK 2.5bn / ~EUR 220m` — tilde (~) indicates approximate conversion
- EUR equivalent is always approximate; never present it as exact

**FX rates:**
- Preferred: live or daily rates via FX integration
- Fallback: manually entered rate per currency pair, stored with entry date
- Stale threshold: rates older than 30 days should be visually flagged (e.g. with a warning icon) so users know the conversion may be outdated
- Rate used for a displayed conversion should be inspectable — hovering or clicking the EUR value should show the rate and its date

**Minimum supported currencies:** EUR, USD, GBP, SEK, DKK, NOK, CHF. Additional ISO currency codes should be accepted as free text without requiring system configuration.
