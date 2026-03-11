import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { SCORE_CONFIG, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS, SECTOR_OPTIONS, CURRENCIES, STATUS_OPTIONS } from '../constants.js';
import { useSettings } from '../settingsContext.js';
import { IS, ISFilled, TA, TAFilled, btnBase, btnPrimary, btnGhost, btnDanger } from '../theme.js';
import { uid } from '../utils.js';
import { Chip, SectorChip, SubStratChip } from './Badges.jsx';
import { ScorePicker, StatusPicker, TagPicker, useOutsideClick } from './Pickers.jsx';
import { now } from '../utils.js';
import { renderMarkdown } from '../markdown.jsx';
import { searchPreqin, searchPreqinManagers, findOrCreatePerson, loadOrganizations, createFund, saveFund, createOrganization } from '../api.js';

// ─── Form Field ───────────────────────────────────────────────────────────────
export function Field({ label, children, half, third }) {
  const col = half ? "span 1" : third ? "span 1" : "span 2";
  return (
    <div style={{ marginBottom: "0.9rem", gridColumn: col }}>
      <label style={{ display: "block", color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.35rem" }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Rich Textarea (toolbar: bold / italic / bullet) ─────────────────────────
function RichTextarea({ value, onChange, style, placeholder, autoFocus }) {
  const ref = useRef();
  const selRef = useRef(null);

  // Restore cursor after React re-renders the controlled textarea
  useLayoutEffect(() => {
    if (selRef.current && ref.current) {
      ref.current.setSelectionRange(selRef.current.start, selRef.current.end);
      selRef.current = null;
    }
  });

  const insert = (before, after = before) => {
    const ta = ref.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    selRef.current = { start: s + before.length, end: e + before.length };
    onChange(value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e));
  };

  const bullet = () => {
    const ta = ref.current; if (!ta) return;
    const s = ta.selectionStart;
    const ls = value.lastIndexOf('\n', s - 1) + 1;
    const has = value.slice(ls).startsWith('- ');
    selRef.current = { start: s + (has ? -2 : 2), end: s + (has ? -2 : 2) };
    onChange(has ? value.slice(0, ls) + value.slice(ls + 2) : value.slice(0, ls) + '- ' + value.slice(ls));
  };

  const tb = { background: "none", border: "1px solid var(--border)", color: "var(--tx4)", borderRadius: "4px", padding: "0.1rem 0.45rem", fontSize: "0.72rem", cursor: "pointer", lineHeight: "1.4", fontFamily: "inherit" };
  return (
    <div>
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.35rem" }}>
        <button type="button" style={{ ...tb, fontWeight: 700 }}        onMouseDown={e => { e.preventDefault(); insert("**"); }}>B</button>
        <button type="button" style={{ ...tb, fontStyle: "italic" }}    onMouseDown={e => { e.preventDefault(); insert("*"); }}>I</button>
        <button type="button" style={tb}                               onMouseDown={e => { e.preventDefault(); bullet(); }}>• list</button>
      </div>
      <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape") e.stopPropagation(); }}
        style={style} placeholder={placeholder} autoFocus={autoFocus} />
    </div>
  );
}

// Inline-editable notes block
export function NoteField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { if (editing) setDraft(value || ""); }, [editing, value]);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ color: "var(--tx4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
        Notes
      </div>
      {editing ? (
        <div>
          <RichTextarea value={draft} onChange={setDraft} style={{ ...TA, minHeight: "90px", marginBottom: "0.4rem" }} autoFocus />
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            <button onClick={() => { onSave(draft); setEditing(false); }} style={{ ...btnPrimary, padding: "0.25rem 0.7rem", fontSize: "0.75rem" }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ ...btnGhost, padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.9rem 1rem", cursor: "pointer", minHeight: "48px" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hi)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
          {value
            ? <div style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>{renderMarkdown(value)}</div>
            : <div style={{ color: "var(--tx5)", fontSize: "0.8125rem" }}>Click to add notes…</div>}
        </div>
      )}
    </div>
  );
}

// ─── GP Form ──────────────────────────────────────────────────────────────────
export function GPForm({ initial, onSave, onClose, onDelete, owners = [] }) {
  const [d, setD] = useState(() => {
    const base = { name: "", hq: "", website: "", score: "C", contact: "", contactEmail: "", owner: "", notes: "" };
    if (!initial) return base;
    // Coerce null → "" for string fields (v2 orgs don't have hq/contact text fields)
    return { ...base, ...initial, hq: initial.hq ?? "", contact: initial.contact ?? "", contactEmail: initial.contactEmail ?? "", notes: initial.notes ?? "" };
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const fi = (v) => v ? ISFilled : IS; // filled vs empty style
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
      <Field label="Firm Name"><input style={fi(d.name)} value={d.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Blackstone" /></Field>
      <Field label="Headquarters" half><input style={fi(d.hq)} value={d.hq} onChange={e => set("hq", e.target.value)} placeholder="City, Country" /></Field>
      <Field label="Website" half><input style={fi(d.website)} value={d.website} onChange={e => set("website", e.target.value)} placeholder="firm.com" /></Field>
      <Field label="Primary Contact" half><input style={fi(d.contact)} value={d.contact} onChange={e => set("contact", e.target.value)} placeholder="Name" /></Field>
      <Field label="Contact Email" half><input style={fi(d.contactEmail)} value={d.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="email@firm.com" /></Field>
      <Field label="Responsible (our side)" half>
        <input style={fi(d.owner)} value={d.owner || ""} onChange={e => set("owner", e.target.value)} placeholder="Team member" list="gp-owners-list" autoComplete="off" />
        <datalist id="gp-owners-list">{owners.map(o => <option key={o} value={o} />)}</datalist>
      </Field>
      <Field label="GP Score" half>
        <select style={ISFilled} value={d.score} onChange={e => set("score", e.target.value)}>
          {Object.entries(SCORE_CONFIG).map(([k, v]) => <option key={k} value={k}>{k} — {v.desc}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea style={d.notes ? TAFilled : TA} value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Relationship notes…" /></Field>
      <div style={{ gridColumn: "span 2", display: "flex", gap: "0.75rem", justifyContent: "space-between", paddingTop: "0.5rem", alignItems: "center" }}>
        {onDelete && (
          <button onClick={() => {
            if (confirm("⚠️ Permanently delete this GP and ALL its funds and meetings? This cannot be undone.")) onDelete();
          }} style={{ ...btnDanger, padding: "0.45rem 0.9rem", fontSize: "0.8125rem" }}>Delete GP…</button>
        )}
        <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} style={btnPrimary}>Save GP</button>
        </div>
      </div>
    </div>
  );
}

// ─── Placement Agent Form ─────────────────────────────────────────────────────
export function PAForm({ initial, onSave, onClose, onDelete }) {
  const [d, setD] = useState(initial || { name: "", hq: "", website: "", contact: "", contactEmail: "", notes: "" });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const fi = (v) => v ? ISFilled : IS;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
      <Field label="Firm Name"><input style={fi(d.name)} value={d.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Lazard" /></Field>
      <Field label="Headquarters" half><input style={fi(d.hq)} value={d.hq} onChange={e => set("hq", e.target.value)} placeholder="City, Country" /></Field>
      <Field label="Website" half><input style={fi(d.website)} value={d.website} onChange={e => set("website", e.target.value)} placeholder="firm.com" /></Field>
      <Field label="Primary Contact" half><input style={fi(d.contact)} value={d.contact} onChange={e => set("contact", e.target.value)} placeholder="Name" /></Field>
      <Field label="Contact Email" half><input style={fi(d.contactEmail)} value={d.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="email@firm.com" /></Field>
      <Field label="Notes"><textarea style={d.notes ? TAFilled : TA} value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Notes…" /></Field>
      <div style={{ gridColumn: "span 2", display: "flex", gap: "0.75rem", justifyContent: "space-between", paddingTop: "0.5rem", alignItems: "center" }}>
        {onDelete && (
          <button onClick={() => { if (confirm("Delete this Placement Agent?")) onDelete(); }} style={{ ...btnDanger, padding: "0.45rem 0.9rem", fontSize: "0.8125rem" }}>Delete…</button>
        )}
        <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} style={btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared dropdown styles ───────────────────────────────────────────────────
const dropdownItem = { display: "flex", flexDirection: "column", gap: "0.15rem", padding: "0.5rem 0.75rem", cursor: "pointer", borderBottom: "1px solid var(--border)", background: "transparent" };
const dropdownItemFlat = { padding: "0.45rem 0.75rem", cursor: "pointer", borderBottom: "1px solid var(--border)", background: "transparent" };
const dropdownSectionHeader = { padding: "0.25rem 0.75rem", fontSize: "0.62rem", color: "var(--tx5)", textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--card)", borderBottom: "1px solid var(--border)" };
const dropdownSectionLabel = { padding: "0.3rem 0.75rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--tx5)", borderBottom: "1px solid var(--border)", background: "var(--card)" };

// ─── Preqin Fund Search ───────────────────────────────────────────────────────
// Inline combobox: type to search, click to link. Shows current link if set.
function PreqinSearch({ preqinFundId, preqinSeriesId, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      setLoading(true);
      searchPreqin(query).then(r => { setResults(r); setOpen(true); }).catch(() => setResults([])).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useOutsideClick(wrapRef, () => setOpen(false));

  const select = (r) => {
    onChange({ preqin_fund_id: String(r.fund_id), preqin_series_id: r.series_id ? String(r.series_id) : null });
    setQuery(""); setResults([]); setOpen(false);
  };
  const unlink = () => onChange({ preqin_fund_id: null, preqin_series_id: null });

  const inp = { width: "100%", background: "var(--card)", border: "1px solid var(--border-hi)", borderRadius: "6px", color: "var(--tx1)", padding: "0.45rem 0.65rem", fontSize: "0.825rem", outline: "none", boxSizing: "border-box" };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {preqinFundId ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.4rem 0.65rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--tx5)", flexShrink: 0 }}>Preqin ID</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--tx1)", fontWeight: 600 }}>{preqinFundId}</span>
          {preqinSeriesId && <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--tx4)" }}>series {preqinSeriesId}</span>}
          <button type="button" onClick={unlink} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tx5)", cursor: "pointer", fontSize: "0.75rem", padding: "0 0.2rem" }} title="Unlink">✕</button>
        </div>
      ) : (
        <input
          style={inp}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by fund name or manager…"
        />
      )}
      {!preqinFundId && loading && <div style={{ position: "absolute", right: "0.6rem", top: "0.5rem", color: "var(--tx5)", fontSize: "0.7rem" }}>…</div>}
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "8px", zIndex: 300, maxHeight: "220px", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" }}>
          {results.map(r => (
            <div key={r.fund_id} style={dropdownItem}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onMouseDown={e => { e.preventDefault(); select(r); }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{r.name}</span>
                {r.vintage && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{r.vintage}</span>}
                {r.status && <span style={{ color: "var(--tx4)", fontSize: "0.68rem", marginLeft: "auto" }}>{r.status}</span>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>{r.manager}</span>
                {r.strategy && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· {r.strategy}</span>}
                {r.geo_focus && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· {r.geo_focus}</span>}
                {r.final_size_usd && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· USD {Number(r.final_size_usd).toLocaleString()}M</span>}
                <span style={{ color: "var(--tx5)", fontSize: "0.65rem", marginLeft: "auto", fontFamily: "monospace" }}>#{r.fund_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.6rem 0.75rem", color: "var(--tx5)", fontSize: "0.8rem", zIndex: 300 }}>No matches found</div>
      )}
    </div>
  );
}

// ─── GP Search Field ──────────────────────────────────────────────────────────
// Searches own DB first, then Preqin managers, with two dropdown sections.
function GPSearchField({ onSelect }) {
  const [query, setQuery] = useState("");
  const [ownResults, setOwnResults] = useState([]);
  const [preqinResults, setPreqinResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setOwnResults([]); setPreqinResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const [own, preqin] = await Promise.all([
        loadOrganizations({ name: query, org_type: 'gp' }).catch(() => []),
        searchPreqinManagers(query).catch(() => []),
      ]);
      const ownNameSet = new Set((own || []).map(o => o.name.toLowerCase()));
      const filteredPreqin = (preqin || []).filter(p => !ownNameSet.has(p.manager_name.toLowerCase()));
      setOwnResults((own || []).slice(0, 8));
      setPreqinResults(filteredPreqin.slice(0, 5));
      setOpen(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useOutsideClick(wrapRef, () => setOpen(false));


  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={query ? ISFilled : IS}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search for a GP…"
        onFocus={() => query.length >= 2 && (ownResults.length > 0 || preqinResults.length > 0) && setOpen(true)}
        autoFocus
      />
      {loading && <div style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "var(--tx5)", fontSize: "0.7rem", pointerEvents: "none" }}>…</div>}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "8px", zIndex: 400, maxHeight: "300px", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" }}>
          {ownResults.length > 0 && (
            <>
              <div style={dropdownSectionHeader}>Your GPs</div>
              {ownResults.map(org => (
                <div key={org.id} style={dropdownItemFlat}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onMouseDown={e => { e.preventDefault(); onSelect({ id: org.id, name: org.name, preqin_manager_id: org.preqin_manager_id ?? null }); setQuery(""); setOpen(false); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{org.name}</span>
                    {org.preqin_manager_id && <span style={{ fontSize: "0.62rem", color: "var(--tx5)" }}>Preqin linked</span>}
                  </div>
                </div>
              ))}
            </>
          )}
          {preqinResults.length > 0 && (
            <>
              <div style={{ ...dropdownSectionHeader, borderTop: ownResults.length > 0 ? "1px solid var(--border)" : "none" }}>From Preqin</div>
              {preqinResults.map(p => (
                <div key={p.firm_id} style={dropdownItemFlat}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onMouseDown={e => { e.preventDefault(); onSelect({ id: null, name: p.manager_name, preqin_manager_id: String(p.firm_id) }); setQuery(""); setOpen(false); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{p.manager_name}</span>
                    <span style={{ fontSize: "0.62rem", color: "#6366f1", border: "1px solid #6366f180", borderRadius: "4px", padding: "0.05rem 0.3rem" }}>Preqin</span>
                  </div>
                </div>
              ))}
            </>
          )}
          {ownResults.length === 0 && preqinResults.length === 0 && !loading && query.trim().length >= 2 && (
            <div style={dropdownItemFlat}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onMouseDown={e => { e.preventDefault(); onSelect({ id: null, name: query.trim(), preqin_manager_id: null }); setQuery(""); setOpen(false); }}>
              <span style={{ color: "var(--tx2)", fontSize: "0.825rem" }}>+ Create <strong>{query.trim()}</strong> as new GP</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fund Name Search ─────────────────────────────────────────────────────────
// Smart typeahead for fund name: shows Preqin suggestions while typing.
// Selecting a suggestion auto-populates fields; typing freely works as plain input.
// firmId: if provided, shows that firm's funds first, then broader results below.
function FundNameSearch({ value, onChange, onPreqinSelect, firmId }) {
  const [firmResults, setFirmResults] = useState([]);
  const [widerResults, setWiderResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (value.trim().length < 2) { setFirmResults([]); setWiderResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => {
      setLoading(true);
      const firmFetch = firmId ? searchPreqin(value, firmId).catch(() => []) : Promise.resolve([]);
      const widerFetch = searchPreqin(value).catch(() => []);
      Promise.all([firmFetch, widerFetch]).then(([firm, wider]) => {
        const firmIds = new Set((firm || []).map(r => r.fund_id));
        const deduped = (wider || []).filter(r => !firmIds.has(r.fund_id));
        setFirmResults(firm || []);
        setWiderResults(deduped);
        setOpen(true);
      }).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [value, firmId]);

  useOutsideClick(wrapRef, () => setOpen(false));

  const sectionLabel = (text) => <div style={dropdownSectionLabel}>{text}</div>;
  const renderItem = (r) => (
    <div key={r.fund_id} style={dropdownItem}
      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      onMouseDown={e => { e.preventDefault(); onPreqinSelect(r); setOpen(false); }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{r.name}</span>
        {r.vintage && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{r.vintage}</span>}
        {r.status && <span style={{ color: "var(--tx4)", fontSize: "0.68rem", marginLeft: "auto" }}>{r.status}</span>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>{r.manager}</span>
        {r.strategy && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· {r.strategy}</span>}
        {r.geo_focus && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· {r.geo_focus}</span>}
        {r.target_size_usd && <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>· USD {Number(r.target_size_usd).toLocaleString()}M</span>}
      </div>
    </div>
  );

  const hasResults = firmResults.length > 0 || widerResults.length > 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={value ? ISFilled : IS}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        placeholder="Fund name (or search Preqin)…"
        autoFocus
      />
      {loading && <div style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "var(--tx5)", fontSize: "0.7rem", pointerEvents: "none" }}>…</div>}
      {open && hasResults && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "8px", zIndex: 400, maxHeight: "300px", overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" }}>
          {firmResults.length > 0 && (
            <>
              {sectionLabel("This GP")}
              {firmResults.map(renderItem)}
            </>
          )}
          {widerResults.length > 0 && (
            <>
              {sectionLabel(firmResults.length > 0 ? "Other funds" : "Preqin")}
              {widerResults.map(renderItem)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fund Form ────────────────────────────────────────────────────────────────
export function FundForm({ initial, onSave, onClose, onDelete, owners = [], gpOwner, orgId = null, orgName = null, showGPPicker = false }) {
  const { settings } = useSettings();
  const effectiveSectors = settings.sectors ?? SECTOR_OPTIONS;
  const effectiveStrategies = settings.strategies ?? STRATEGY_OPTIONS;
  const effectiveSubPresets = settings.subStrategyPresets ?? SUB_STRATEGY_PRESETS;
  const effectiveStatuses = settings.statusOptions ?? STATUS_OPTIONS;

  // ── Step machine (only for new funds when GP picker is active) ───────────────
  const isNew = !initial;
  const [step, setStep] = useState(() => {
    if (!isNew) return 'fields';    // editing: skip to fields immediately
    if (!showGPPicker) return 'fields'; // GP known (from overlay): go straight to fields
    return 'gp';
  });
  const [selectedOrg, setSelectedOrg] = useState(
    orgId ? { id: orgId, name: orgName } : null
  );

  const empty = { name: "", series: "", strategy: effectiveStrategies[0] || "Buyout", subStrategy: "", sectors: [], vintage: "", targetSize: "", hardCap: "", raisedSize: "", raisedDate: "", finalSize: "", currency: "USD", status: effectiveStatuses[0] || "Fundraising", launchDate: "", firstCloseDate: "", nextCloseDate: "", finalCloseDate: "", nextMarket: "", score: "C", owner: "", notes: "", invested: false, investmentAmount: "", investmentCurrency: "USD", preqin_fund_id: null, preqin_series_id: null };
  const [d, setD] = useState(() => {
    if (!initial) return empty;
    const merged = { ...empty, ...initial };
    const strKeys = ['name','series','subStrategy','vintage','targetSize','hardCap','raisedSize','raisedDate','finalSize','launchDate','firstCloseDate','nextCloseDate','finalCloseDate','nextMarket','owner','notes','investmentAmount'];
    strKeys.forEach(k => { if (merged[k] == null) merged[k] = ""; });
    return merged;
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const subPresets = effectiveSubPresets[d.strategy] || [];
  const fi = (v) => v ? ISFilled : IS;
  const sec = (label, color, mt = "1.25rem") => (
    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "0.6rem", marginTop: mt, marginBottom: "0.1rem" }}>
      <div style={{ width: "3px", height: "14px", background: color, borderRadius: "2px", flexShrink: 0 }} />
      <span style={{ color: "var(--tx2)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );

  // ── Auto-populate from Preqin fund row ──────────────────────────────────────
  const applyPreqinFund = (pqRow) => {
    const strategyLookup = {};
    effectiveStrategies.forEach(s => { strategyLookup[s.toLowerCase()] = s; });
    const mappedStrategy = pqRow.strategy
      ? (strategyLookup[pqRow.strategy.toLowerCase()] || "")
      : "";
    setD(p => ({
      ...p,
      name: pqRow.name || p.name,
      vintage: pqRow.vintage ? String(Math.round(pqRow.vintage)) : p.vintage,
      strategy: mappedStrategy || p.strategy,
      currency: pqRow.currency || p.currency,
      targetSize: pqRow.target_size_usd ? String(Math.round(pqRow.target_size_usd)) : p.targetSize,
      hardCap: pqRow.hard_cap_usd ? String(Math.round(pqRow.hard_cap_usd)) : p.hardCap,
      preqin_fund_id: pqRow.fund_id ? String(pqRow.fund_id) : p.preqin_fund_id,
      preqin_series_id: pqRow.series_id ? String(pqRow.series_id) : p.preqin_series_id,
    }));
  };

  // ── Save handler ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const handleSaveFund = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      let finalOrgId = selectedOrg?.id ?? orgId;
      // If a Preqin-sourced or free-typed GP doesn't exist in our DB yet, create it
      if (!finalOrgId && selectedOrg?.name) {
        const newOrg = await createOrganization({
          name: selectedOrg.name,
          org_type: 'gp',
          preqin_manager_id: selectedOrg.preqin_manager_id ?? null,
        });
        finalOrgId = newOrg.id;
      }
      if (!finalOrgId) { setSaveError("Select a GP first."); return; }
      if (isNew) {
        const payload = {
          org_id: finalOrgId,
          name: d.name,
          series: d.series || null,
          vintage: d.vintage || null,
          currency: d.currency || "USD",
          target_size: d.targetSize ? parseFloat(d.targetSize) : null,
          hard_cap: d.hardCap ? parseFloat(d.hardCap) : null,
          raised_size: d.raisedSize ? parseFloat(d.raisedSize) : null,
          raised_date: d.raisedDate || null,
          final_size: d.finalSize ? parseFloat(d.finalSize) : null,
          launch_date: d.launchDate || null,
          first_close_date: d.firstCloseDate || null,
          next_close_date: d.nextCloseDate || null,
          final_close_date: d.finalCloseDate || null,
          owner: d.owner || null,
          notes: d.notes || null,
          invested: d.invested || false,
          investment_amount: d.investmentAmount ? parseFloat(d.investmentAmount) : null,
          investment_currency: d.investmentCurrency || "USD",
          // Preserve Preqin linkage if fund was selected from Preqin search
          preqin_fund_id: d.preqin_fund_id || null,
          preqin_series_id: d.preqin_series_id || null,
        };
        const created = await createFund(payload);
        onSave(created, finalOrgId);
      } else {
        // Existing fund: PUT to persist all form fields to the backend
        const updated = await saveFund(d.id, {
          name: d.name,
          series: d.series || null,
          vintage: d.vintage || null,
          currency: d.currency || "USD",
          target_size: d.targetSize ? parseFloat(d.targetSize) : null,
          hard_cap: d.hardCap ? parseFloat(d.hardCap) : null,
          raised_size: d.raisedSize ? parseFloat(d.raisedSize) : null,
          raised_date: d.raisedDate || null,
          final_size: d.finalSize ? parseFloat(d.finalSize) : null,
          launch_date: d.launchDate || null,
          first_close_date: d.firstCloseDate || null,
          next_close_date: d.nextCloseDate || null,
          final_close_date: d.finalCloseDate || null,
          next_market: d.nextMarket || null,
          owner: d.owner || null,
          notes: d.notes || null,
          invested: d.invested || false,
          investment_amount: d.investmentAmount ? parseFloat(d.investmentAmount) : null,
          investment_currency: d.investmentCurrency || "USD",
          preqin_fund_id: d.preqin_fund_id || null,
          preqin_series_id: d.preqin_series_id || null,
        });
        onSave(updated ?? { ...d, org_id: finalOrgId });
      }
    } catch (err) {
      setSaveError(err.message || "Save failed — check the server is running.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step: GP picker ─────────────────────────────────────────────────────────
  if (step === 'gp') {
    return (
      <div>
        <div style={{ marginBottom: "0.5rem", color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Select GP</div>
        <GPSearchField onSelect={(org) => { setSelectedOrg(org); setStep('fields'); }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
      {/* Selected GP banner (new fund only) */}
      {isNew && selectedOrg && (
        <div style={{ gridColumn: "span 2", marginBottom: "0.5rem", padding: "0.45rem 0.75rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--tx2)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          GP: <strong style={{ color: "var(--tx1)" }}>{selectedOrg.name}</strong>
          {showGPPicker && <button type="button" onClick={() => setStep('gp')} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.75rem" }}>change</button>}
        </div>
      )}

      {/* ── Identity ── */}
      {sec("Identity", "#8b5cf6", "0")}
      <Field label="Fund Name">
        {isNew
          ? <FundNameSearch
              value={d.name}
              onChange={v => set("name", v)}
              onPreqinSelect={applyPreqinFund}
              firmId={selectedOrg?.preqin_manager_id || null}
            />
          : <input style={fi(d.name)} value={d.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Fund IX" />
        }
      </Field>

      {/* ── Remaining fields: hidden for new funds until name is entered ── */}
      {(!isNew || d.name.trim().length > 0) && <>
      <Field label="Fund Series" half><input style={fi(d.series)} value={d.series} onChange={e => set("series", e.target.value)} placeholder="e.g. Blackstone Capital Partners" /></Field>
      <Field label="Status" half>
        <select style={ISFilled} value={d.status} onChange={e => set("status", e.target.value)}>
          {effectiveStatuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Fund Score" half>
        <select style={ISFilled} value={d.score} onChange={e => set("score", e.target.value)}>
          {Object.entries(SCORE_CONFIG).map(([k, v]) => <option key={k} value={k}>{k} — {v.desc}</option>)}
        </select>
      </Field>
      <Field label={`Responsible${gpOwner && !d.owner ? ` (${gpOwner} from GP)` : ""}`} half>
        <input style={fi(d.owner)} value={d.owner || ""} onChange={e => set("owner", e.target.value)} placeholder={gpOwner || "Team member"} list="fund-owners-list" autoComplete="off" />
        <datalist id="fund-owners-list">{owners.map(o => <option key={o} value={o} />)}</datalist>
      </Field>

      {/* ── Asset Class ── */}
      {sec("Asset Class", "#f59e0b")}
      <Field label="Strategy" half>
        <select style={ISFilled} value={d.strategy} onChange={e => { set("strategy", e.target.value); set("subStrategy", ""); }}>
          {effectiveStrategies.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Sub-Strategy" half>
        <select style={d.subStrategy ? ISFilled : IS} value={d.subStrategy} onChange={e => set("subStrategy", e.target.value)}>
          <option value="">— None —</option>
          {subPresets.map(s => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Sector Focus"><TagPicker selected={d.sectors || []} options={effectiveSectors} onChange={v => set("sectors", v)} /></Field>

      {/* ── Fundraising ── */}
      {sec("Fundraising", "#3b82f6")}
      <Field label="Target Size (M)" half><input style={fi(d.targetSize)} value={d.targetSize} onChange={e => set("targetSize", e.target.value)} placeholder="10,000" /></Field>
      <Field label="Hard Cap (M)" half><input style={fi(d.hardCap)} value={d.hardCap || ""} onChange={e => set("hardCap", e.target.value)} placeholder="20,000" /></Field>
      <Field label="Amount Raised (M)" half><input style={fi(d.raisedSize)} value={d.raisedSize} onChange={e => set("raisedSize", e.target.value)} placeholder="7,500" /></Field>
      <Field label="Raised As Of Date" half><input type="date" style={fi(d.raisedDate)} value={d.raisedDate || ""} onChange={e => set("raisedDate", e.target.value)} /></Field>
      <Field label="Final Fund Size (M)" half><input style={fi(d.finalSize)} value={d.finalSize} onChange={e => set("finalSize", e.target.value)} placeholder="If closed" /></Field>
      <Field label="Launch Date (exp)" half><input type="date" style={fi(d.launchDate)} value={d.launchDate || ""} onChange={e => set("launchDate", e.target.value)} /></Field>
      <Field label="First Close Date" half><input type="date" style={fi(d.firstCloseDate)} value={d.firstCloseDate || ""} onChange={e => set("firstCloseDate", e.target.value)} /></Field>
      <Field label="Next Close Date" half><input type="date" style={fi(d.nextCloseDate)} value={d.nextCloseDate || ""} onChange={e => set("nextCloseDate", e.target.value)} /></Field>
      <Field label="Final Close Date" half><input type="date" style={fi(d.finalCloseDate)} value={d.finalCloseDate || ""} onChange={e => set("finalCloseDate", e.target.value)} /></Field>

      {/* ── Fund Details ── */}
      {sec("Fund Details", "#64748b")}
      <Field label="Vintage Year" half><input style={fi(d.vintage)} value={d.vintage} onChange={e => set("vintage", e.target.value)} placeholder="2024" /></Field>
      <Field label="Currency" half>
        <select style={ISFilled} value={d.currency} onChange={e => set("currency", e.target.value)}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Next Expected in Market" half><input style={fi(d.nextMarket)} value={d.nextMarket} onChange={e => set("nextMarket", e.target.value)} placeholder="2027-Q2" /></Field>

      {/* ── Commitment ── */}
      {sec("Commitment", "#22c55e")}
      <div style={{ gridColumn: "span 2", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginBottom: "0.9rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: "var(--tx2)", fontSize: "0.875rem" }}>
          <input type="checkbox" checked={d.invested} onChange={e => set("invested", e.target.checked)} style={{ width: "15px", height: "15px", accentColor: "#22c55e" }} />
          We have invested in this fund
        </label>
        {d.invested && (
          <div style={{ marginTop: "0.75rem" }}>
            <label style={{ display: "block", color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Investment Amount (M)</label>
            <input style={fi(d.investmentAmount)} value={d.investmentAmount} onChange={e => set("investmentAmount", e.target.value)} placeholder="50" />
          </div>
        )}
      </div>

      <Field label="Notes"><textarea style={d.notes ? TAFilled : TA} value={d.notes} onChange={e => set("notes", e.target.value)} placeholder="Investment thesis, concerns, key terms…" /></Field>

      {/* ── Preqin ── */}
      {sec("Preqin", "#6366f1")}
      <div style={{ gridColumn: "span 2" }}>
        <PreqinSearch
          preqinFundId={d.preqin_fund_id}
          preqinSeriesId={d.preqin_series_id}
          onChange={({ preqin_fund_id, preqin_series_id }) => setD(p => ({ ...p, preqin_fund_id, preqin_series_id }))}
        />
      </div>

      </>}

      {saveError && (
        <div style={{ gridColumn: "span 2", color: "#f87171", fontSize: "0.78rem", padding: "0.4rem 0.6rem", background: "#7f1d1d30", border: "1px solid #f8717140", borderRadius: "6px" }}>{saveError}</div>
      )}

      <div style={{ gridColumn: "span 2", display: "flex", gap: "0.75rem", justifyContent: "space-between", paddingTop: "0.5rem", alignItems: "center" }}>
        {onDelete && (
          <button onClick={() => {
            if (confirm("⚠️ Permanently delete this fund and ALL its meetings? This cannot be undone.")) onDelete();
          }} style={{ ...btnDanger, padding: "0.45rem 0.9rem", fontSize: "0.8125rem" }}>Delete Fund…</button>
        )}
        <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={isNew ? handleSaveFund : () => onSave(d)} disabled={saving || (isNew && !d.name.trim())} style={{ ...btnPrimary, opacity: (saving || (isNew && !d.name.trim())) ? 0.6 : 1 }}>{saving ? "Saving…" : "Save Fund"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Segmented Date Input (DD / MM / YYYY, auto-advances) ────────────────────
function DateInput({ value, onChange }) {
  const [yy, mm, dd] = value ? value.split("-") : ["", "", ""];
  const [day,   setDay]   = useState(dd || "");
  const [month, setMonth] = useState(mm || "");
  const [year,  setYear]  = useState(yy || "");
  const dayRef = useRef(); const monthRef = useRef(); const yearRef = useRef();
  const emit = (d, m, y) => { if (d && m && y.length === 4) onChange(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`); };
  const seg = { ...IS, textAlign: "center", padding: "0.3rem 0.15rem", fontSize: "0.875rem" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1px" }}>
      <input ref={dayRef} type="text" inputMode="numeric" value={day} placeholder="DD" style={{ ...seg, width: "34px" }}
        onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,2); setDay(v); emit(v,month,year); if (v.length===2||(v.length===1&&+v>3)){monthRef.current?.focus();monthRef.current?.select();} }}
        onKeyDown={e => { if (e.key==="ArrowRight"){e.preventDefault();monthRef.current?.focus();} }} />
      <span style={{ color:"var(--tx5)", userSelect:"none", fontSize:"0.8rem" }}>/</span>
      <input ref={monthRef} type="text" inputMode="numeric" value={month} placeholder="MM" style={{ ...seg, width: "34px" }}
        onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,2); setMonth(v); emit(day,v,year); if (v.length===2||(v.length===1&&+v>1)){yearRef.current?.focus();yearRef.current?.select();} }}
        onKeyDown={e => { if (e.key==="ArrowRight"){e.preventDefault();yearRef.current?.focus();} if ((e.key==="Backspace"||e.key==="ArrowLeft")&&!month){e.preventDefault();dayRef.current?.focus();dayRef.current?.select();} }} />
      <span style={{ color:"var(--tx5)", userSelect:"none", fontSize:"0.8rem" }}>/</span>
      <input ref={yearRef} type="text" inputMode="numeric" value={year} placeholder="YYYY" style={{ ...seg, width: "48px" }}
        onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,4); setYear(v); emit(day,month,v); }}
        onKeyDown={e => { if ((e.key==="Backspace"||e.key==="ArrowLeft")&&!year){e.preventDefault();monthRef.current?.focus();monthRef.current?.select();} }} />
    </div>
  );
}

// ─── Meeting Form helpers ──────────────────────────────────────────────────────
function parseName(str) {
  const trimmed = (str || "").trim();
  const m = trimmed.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) {
    const parts = m[1].trim().split(/\s+/);
    return { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || "", title: m[2].trim() };
  }
  const parts = trimmed.split(/\s+/);
  return { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || "", title: null };
}

// ─── Meeting Form ─────────────────────────────────────────────────────────────
export function MeetingForm({ initial, funds, onSave, onClose, showFundPicker = true, unitMembers = [], orgId = null, gpPeople = [], placementAgents = [] }) {
  const [d, setD] = useState(() => {
    const base = { date: "", type: "Virtual", location: "", topic: "", notes: "", fundId: null, loggedBy: "Me", loggedAt: now(), attendeesUs: [] };
    if (!initial) return base;
    return {
      ...base, ...initial,
      type: initial.type?.label ?? initial.type ?? "Virtual",
      loggedBy: initial.loggedBy ?? initial.created_by ?? "Me",
      location: initial.location ?? "",
      topic: initial.topic ?? "",
      notes: initial.notes ?? "",
    };
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));
  const fi = (v) => v ? ISFilled : IS;

  // ── Them attendees (GP side) ───────────────────────────────────────────────
  const [themAttendees, setThemAttendees] = useState(() => {
    if (!initial?.attendees) return [];
    return initial.attendees.filter(a => a.side === "them").map(a => ({
      key: a.person_id ?? (Math.random().toString(36).slice(2)),
      display: a.person ? `${a.person.first_name ?? ""} ${a.person.last_name ?? ""}`.trim() : "?",
      person_id: a.person_id, org_id: a.org_id,
    }));
  });
  const [theirInput, setTheirInput] = useState("");
  const [theirDropOpen, setTheirDropOpen] = useState(false);
  const theirRef = useRef();

  const theirSuggestions = useMemo(() => {
    if (theirInput.trim().length < 1) return [];
    const input = theirInput.toLowerCase();
    const existingIds = new Set(themAttendees.map(a => a.person_id).filter(Boolean));
    return gpPeople.filter(p => {
      const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
      return full.includes(input) && !existingIds.has(p.id);
    });
  }, [theirInput, gpPeople, themAttendees]);

  useOutsideClick(theirRef, () => setTheirDropOpen(false));

  const addTheirPerson = (p) => {
    const display = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() + (p.title ? ` · ${p.title}` : "");
    setThemAttendees(prev => [...prev, { key: p.id, display, person_id: p.id, org_id: orgId }]);
    setTheirInput(""); setTheirDropOpen(false);
  };
  const addTheirNew = () => {
    const raw = theirInput.trim(); if (!raw) return;
    const key = raw + Date.now();
    setThemAttendees(prev => [...prev, { key, display: raw, person_id: null, org_id: orgId }]);
    setTheirInput(""); setTheirDropOpen(false);
  };
  const removeTheirAttendee = (key) => setThemAttendees(prev => prev.filter(a => a.key !== key));

  // ── PA attendees ────────────────────────────────────────────────────────────
  const [paAttendees, setPaAttendees] = useState(() => {
    if (!initial?.attendees) return [];
    return initial.attendees.filter(a => a.side === "placement_agent").map(a => ({
      key: a.person_id ?? (Math.random().toString(36).slice(2)),
      display: a.person ? `${a.person.first_name ?? ""} ${a.person.last_name ?? ""}`.trim() : "?",
      person_id: a.person_id, pa_org_id: a.org_id,
      pa_name: placementAgents.find(pa => pa.id === a.org_id)?.name ?? "PA",
    }));
  });
  const [paExpanded, setPaExpanded] = useState(paAttendees.length > 0);
  const [paNameInput, setPaNameInput] = useState("");
  const [paOrgId, setPaOrgId] = useState(placementAgents[0]?.id ?? "");

  const addPaAttendee = () => {
    const name = paNameInput.trim(); if (!name || !paOrgId) return;
    const pa = placementAgents.find(p => p.id === paOrgId);
    setPaAttendees(prev => [...prev, { key: name + paOrgId + Date.now(), display: name, person_id: null, pa_org_id: paOrgId, pa_name: pa?.name ?? "PA" }]);
    setPaNameInput("");
  };
  const removePaAttendee = (key) => setPaAttendees(prev => prev.filter(a => a.key !== key));

  // ── Us attendees ───────────────────────────────────────────────────────────
  const [ourDraft, setOurDraft] = useState("");
  const toggleUs = (n) => { const cur = d.attendeesUs||[]; set("attendeesUs", cur.includes(n) ? cur.filter(x=>x!==n) : [...cur, n]); };
  const addUs = () => { const n = ourDraft.trim(); if (n && !(d.attendeesUs||[]).includes(n)) set("attendeesUs", [...(d.attendeesUs||[]), n]); setOurDraft(""); };
  const removeUs = (n) => set("attendeesUs", (d.attendeesUs||[]).filter(x => x !== n));
  const customUs = (d.attendeesUs||[]).filter(n => !unitMembers.includes(n));

  // ── Save: resolve person_ids then call onSave ──────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const resolvedThem = await Promise.all(themAttendees.map(async a => {
        if (a.person_id) return a;
        const parsed = parseName(a.display);
        const p = await findOrCreatePerson({ ...parsed, org_id: orgId || undefined }).catch(() => null);
        return { ...a, person_id: p?.id ?? null };
      }));
      const resolvedPa = await Promise.all(paAttendees.map(async a => {
        if (a.person_id) return a;
        const parsed = parseName(a.display);
        const p = await findOrCreatePerson({ ...parsed, org_id: a.pa_org_id }).catch(() => null);
        return { ...a, person_id: p?.id ?? null };
      }));
      const attendees = [
        ...resolvedThem.filter(a => a.person_id).map(a => ({ person_id: a.person_id, org_id: a.org_id ?? null, side: "them" })),
        ...resolvedPa.filter(a => a.person_id).map(a => ({ person_id: a.person_id, org_id: a.pa_org_id, side: "placement_agent" })),
      ];
      await onSave({ ...d, loggedAt: initial?.loggedAt || now(), attendees, _paOrgIds: resolvedPa.filter(a => a.person_id && a.pa_org_id).map(a => a.pa_org_id) });
    } catch (err) {
      setSaveError(err?.message || "Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Shared chip ────────────────────────────────────────────────────────────
  const chip = (label, onRemove, sub) => (
    <span key={label} style={{ display:"inline-flex", alignItems:"center", gap:"0.25rem", background:"var(--subtle)", color:"var(--tx3)", border:"1px solid var(--border)", borderRadius:"20px", padding:"0.1rem 0.5rem 0.1rem 0.6rem", fontSize:"0.72rem", userSelect:"none" }}>
      {label}{sub && <span style={{ color:"var(--tx5)", fontSize:"0.65rem" }}> · {sub}</span>}
      <span onClick={onRemove} style={{ opacity:0.5, fontSize:"0.8rem", cursor:"pointer" }}>×</span>
    </span>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
      <Field label="Date" half><DateInput value={d.date} onChange={v => set("date", v)} /></Field>
      <Field label="Type" half>
        <select style={ISFilled} value={d.type} onChange={e => set("type", e.target.value)}>
          {["Virtual","In-Person","Phone Call","Conference"].map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Location / Platform"><input style={fi(d.location)} value={d.location} onChange={e => set("location", e.target.value)} placeholder="Zoom / New York / Conference…" /></Field>
      <Field label="Topic / Agenda"><input style={fi(d.topic)} value={d.topic} onChange={e => set("topic", e.target.value)} placeholder="Annual LP Day, Q3 Update…" /></Field>
      {showFundPicker && (
        <Field label="Linked Fund (optional)">
          <select style={d.fundId ? ISFilled : IS} value={d.fundId || ""} onChange={e => set("fundId", e.target.value || null)}>
            <option value="">— GP-level meeting —</option>
            {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
      )}

      {/* Attendees */}
      <div style={{ gridColumn: "span 2", marginBottom: "0.9rem" }}>
        <div style={{ color:"var(--tx3)", fontSize:"0.7rem", fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Attendees</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 1rem" }}>

          {/* ── Them (Fund Manager + PA) ── */}
          <div>
            <div style={{ color:"var(--tx4)", fontSize:"0.68rem", fontWeight:600, marginBottom:"0.35rem" }}>Them (Fund Manager)</div>
            {themAttendees.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", marginBottom:"0.4rem" }}>
                {themAttendees.map(a => chip(a.display, () => removeTheirAttendee(a.key)))}
              </div>
            )}
            <div ref={theirRef} style={{ position:"relative" }}>
              <input
                value={theirInput}
                onChange={e => { setTheirInput(e.target.value); setTheirDropOpen(true); }}
                onFocus={() => setTheirDropOpen(true)}
                onKeyDown={e => {
                  if ((e.key==="Enter"||e.key===",") && theirInput.trim()) {
                    e.preventDefault();
                    theirSuggestions.length ? addTheirPerson(theirSuggestions[0]) : addTheirNew();
                  }
                  if (e.key==="Escape") setTheirDropOpen(false);
                }}
                placeholder={gpPeople.length ? "Search or type new name…" : "Type name (+ Title), Enter to add…"}
                style={{ ...IS, fontSize:"0.8rem", width:"100%", boxSizing:"border-box" }}
              />
              {theirDropOpen && (theirSuggestions.length > 0 || theirInput.trim()) && (
                <div style={{ position:"absolute", top:"calc(100% + 3px)", left:0, right:0, background:"var(--surface)", border:"1px solid var(--border-hi)", borderRadius:"7px", zIndex:200, maxHeight:"180px", overflowY:"auto", boxShadow:"0 6px 20px rgba(0,0,0,0.5)" }}>
                  {theirSuggestions.map(p => (
                    <div key={p.id} onMouseDown={e => { e.preventDefault(); addTheirPerson(p); }}
                      style={{ padding:"0.45rem 0.75rem", cursor:"pointer", borderBottom:"1px solid var(--border)", fontSize:"0.8rem" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <span style={{ color:"var(--tx1)", fontWeight:500 }}>{p.first_name} {p.last_name}</span>
                      {p.title && <span style={{ color:"var(--tx4)", fontSize:"0.72rem", marginLeft:"0.4rem" }}>{p.title}</span>}
                    </div>
                  ))}
                  {theirInput.trim() && (
                    <div onMouseDown={e => { e.preventDefault(); addTheirNew(); }}
                      style={{ padding:"0.45rem 0.75rem", cursor:"pointer", fontSize:"0.8rem", color:"var(--tx4)", fontStyle:"italic" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      Add "{theirInput.trim()}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Placement Agent sub-section ── */}
            {placementAgents.length > 0 && (
              <div style={{ marginTop:"0.55rem" }}>
                <button type="button" onClick={() => setPaExpanded(v => !v)}
                  style={{ background:"none", border:"none", color:"var(--tx4)", cursor:"pointer", fontSize:"0.68rem", padding:0, display:"flex", alignItems:"center", gap:"0.25rem" }}>
                  {paExpanded ? "▾" : "▸"} <span style={{ textDecoration:"underline" }}>From Placement Agent</span>
                </button>
                {paAttendees.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", marginTop:"0.3rem" }}>
                    {paAttendees.map(a => chip(a.display, () => removePaAttendee(a.key), a.pa_name))}
                  </div>
                )}
                {paExpanded && (
                  <div style={{ marginTop:"0.4rem", display:"flex", gap:"0.4rem", flexWrap:"wrap", alignItems:"center" }}>
                    <input
                      value={paNameInput}
                      onChange={e => setPaNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); addPaAttendee(); } }}
                      placeholder="Name (Title)"
                      style={{ ...IS, fontSize:"0.8rem", flex:"1 1 120px" }}
                    />
                    <select value={paOrgId} onChange={e => setPaOrgId(e.target.value)}
                      style={{ ...(paOrgId ? ISFilled : IS), fontSize:"0.8rem", flex:"1 1 100px" }}>
                      <option value="">Select PA…</option>
                      {placementAgents.map(pa => <option key={pa.id} value={pa.id}>{pa.name}</option>)}
                    </select>
                    <button type="button" onClick={addPaAttendee}
                      disabled={!paNameInput.trim() || !paOrgId}
                      style={{ ...btnPrimary, padding:"0.3rem 0.7rem", fontSize:"0.75rem", opacity: (!paNameInput.trim()||!paOrgId)?0.45:1 }}>
                      + Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Us ── */}
          <div>
            <div style={{ color:"var(--tx4)", fontSize:"0.68rem", fontWeight:600, marginBottom:"0.35rem" }}>Us</div>
            {unitMembers.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", marginBottom:"0.4rem" }}>
                {unitMembers.map(n => {
                  const sel = (d.attendeesUs||[]).includes(n);
                  return (
                    <span key={n} onClick={() => toggleUs(n)} style={{ display:"inline-flex", alignItems:"center", background: sel ? "rgba(99,102,241,0.18)" : "var(--subtle)", color: sel ? "var(--tx1)" : "var(--tx4)", border: sel ? "1px solid rgba(99,102,241,0.45)" : "1px solid var(--border)", borderRadius:"20px", padding:"0.1rem 0.55rem", fontSize:"0.72rem", cursor:"pointer", userSelect:"none", transition:"background 0.1s" }}>
                      {n}{sel ? " ✓" : ""}
                    </span>
                  );
                })}
              </div>
            )}
            {customUs.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", marginBottom:"0.4rem" }}>
                {customUs.map(n => (
                  <span key={n} onClick={() => removeUs(n)} style={{ display:"inline-flex", alignItems:"center", gap:"0.25rem", background:"var(--subtle)", color:"var(--tx3)", border:"1px solid var(--border)", borderRadius:"20px", padding:"0.1rem 0.5rem 0.1rem 0.6rem", fontSize:"0.72rem", cursor:"pointer", userSelect:"none" }}>
                    {n} <span style={{ opacity:0.5, fontSize:"0.8rem" }}>×</span>
                  </span>
                ))}
              </div>
            )}
            <input value={ourDraft} onChange={e => setOurDraft(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter"||e.key===","){e.preventDefault();addUs();} if (e.key==="Backspace"&&!ourDraft&&customUs.length) removeUs(customUs[customUs.length-1]); }}
              placeholder={unitMembers.length ? "Add other person…" : "Name, Enter to add…"} style={{ ...IS, fontSize:"0.8rem" }} />
          </div>
        </div>
      </div>

      <Field label="Notes"><RichTextarea value={d.notes || ""} onChange={v => set("notes", v)} style={{ ...(d.notes ? TAFilled : TA), minHeight:"120px" }} placeholder="Key takeaways, action items, observations…" /></Field>
      <Field label="Logged by" half><input style={fi(d.loggedBy)} value={d.loggedBy || ""} onChange={e => set("loggedBy", e.target.value)} placeholder="Your name" /></Field>
      {saveError && (
        <div style={{ gridColumn: "span 2", color: "#f87171", fontSize: "0.8rem", padding: "0.4rem 0.6rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px" }}>
          {saveError}
        </div>
      )}
      <div style={{ gridColumn: "span 2", display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Log Meeting"}</button>
      </div>
    </div>
  );
}
