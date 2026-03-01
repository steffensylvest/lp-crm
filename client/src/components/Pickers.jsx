import React, { useState, useEffect, useRef } from "react";
import { SCORE_CONFIG, STATUS_PILL_KEY, STATUS_OPTIONS, PIPELINE_STAGES, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS } from '../constants.js';
import { IS } from '../theme.js';
import { Chip } from './Badges.jsx';

// Shared hook: close popover when clicking outside
function useOutsideClick(ref, onClose) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
}

// Shared popover container style
const popover = (extra = {}) => ({
  position: "absolute", top: "calc(100% + 6px)", left: 0,
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: "10px", padding: "0.5rem", zIndex: 2000,
  boxShadow: "0 12px 40px rgba(0,0,0,0.8)", ...extra,
});

// Shared popover section label style
const popoverLabel = { color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0.2rem 0.4rem 0.5rem" };

// Clickable score badge that opens a compact picker popover
export function ScorePicker({ score, onChange, size = "sm" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: `var(--sb-${score}-bg)`, color: `var(--sb-${score}-c)`, border: `1px solid var(--sb-${score}-bd)`, borderRadius: "4px", padding: size === "lg" ? "0.3rem 0.8rem" : "0.1rem 0.45rem", fontSize: size === "lg" ? "0.95rem" : "0.72rem", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {score}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "200px" })}>
          <div style={popoverLabel}>Rating</div>
          {Object.entries(SCORE_CONFIG).map(([k, v]) => (
            <div key={k} onClick={() => { onChange(k); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: k === score ? `var(--sb-${k}-bg)` : "none", transition: "background 0.1s" }}
              onMouseEnter={e => { if (k !== score) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (k !== score) e.currentTarget.style.background = "none"; }}>
              <span style={{ background: `var(--sb-${k}-bg)`, color: `var(--sb-${k}-c)`, border: `1px solid var(--sb-${k}-bd)`, borderRadius: "3px", padding: "0.1rem 0.45rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: "monospace", minWidth: "20px", textAlign: "center" }}>{k}</span>
              <span style={{ color: k === score ? `var(--sb-${k}-c)` : "var(--tx4)", fontSize: "0.8rem" }}>{v.desc}</span>
              {k === score && <span style={{ marginLeft: "auto", color: `var(--sb-${k}-c)`, fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clickable status pill that opens a compact picker
export function StatusPicker({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  const k = STATUS_PILL_KEY[status] || 3;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: `var(--pill-bg-${k})`, color: `var(--pill-c-${k})`, borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {status}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "160px" })}>
          <div style={popoverLabel}>Status</div>
          {STATUS_OPTIONS.map(s => {
            const sk = STATUS_PILL_KEY[s] || 3;
            return (
              <div key={s} onClick={() => { onChange(s); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s === status ? `var(--pill-bg-${sk})` : "none" }}
                onMouseEnter={e => { if (s !== status) e.currentTarget.style.background = "var(--hover)"; }}
                onMouseLeave={e => { if (s !== status) e.currentTarget.style.background = "none"; }}>
                <span style={{ background: `var(--pill-bg-${sk})`, color: `var(--pill-c-${sk})`, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.72rem", minWidth: "90px" }}>{s}</span>
                {s === status && <span style={{ color: `var(--pill-c-${sk})`, fontSize: "0.7rem", marginLeft: "auto" }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Multi-select Tag Picker ──────────────────────────────────────────────────
export function TagPicker({ selected = [], options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ ...IS, cursor: "pointer", minHeight: "38px", display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
        {selected.length === 0 && <span style={{ color: "var(--tx4)", fontSize: "0.875rem" }}>Select sectors…</span>}
        {selected.map(v => <Chip key={v} label={v} />)}
        <span style={{ marginLeft: "auto", color: "var(--tx4)", fontSize: "0.7rem" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "8px", zIndex: 200, maxHeight: "180px", overflow: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" }}>
          {options.map(v => (
            <div key={v} onClick={() => toggle(v)} style={{ padding: "0.45rem 0.75rem", cursor: "pointer", color: selected.includes(v) ? "var(--tx2)" : "var(--tx4)", background: selected.includes(v) ? "var(--subtle)" : "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "13px", height: "13px", border: "2px solid var(--border-hi)", borderRadius: "3px", background: selected.includes(v) ? "var(--border-hi)" : "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "var(--bg)", flexShrink: 0 }}>{selected.includes(v) ? "✓" : ""}</span>
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clickable owner tag that opens a compact picker
export function OwnerPicker({ owner, owners = [], onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  const allOptions = owner && !owners.includes(owner) ? [owner, ...owners] : owners;
  const display = owner || placeholder;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px", padding: "0.15rem 0.6rem", fontSize: "0.72rem", color: display ? (owner ? "var(--tx2)" : "var(--tx4)") : "var(--tx5)", fontWeight: owner ? 500 : 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", transition: "border-color 0.15s, background 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
      >
        <span>{display || "No owner"}{!owner && placeholder ? " ↑" : ""}</span>
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "150px" })}>
          <div style={popoverLabel}>Responsible</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: !owner ? "var(--subtle)" : "none" }}
            onMouseEnter={e => { if (owner) e.currentTarget.style.background = "var(--hover)"; }}
            onMouseLeave={e => { if (owner) e.currentTarget.style.background = "none"; }}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None{placeholder ? ` (inherit ${placeholder})` : ""}</span>
            {!owner && <span style={{ marginLeft: "auto", color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
          </div>
          {allOptions.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: o === owner ? "var(--subtle)" : "none" }}
              onMouseEnter={e => { if (o !== owner) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (o !== owner) e.currentTarget.style.background = "none"; }}>
              <span style={{ fontSize: "0.8rem", color: o === owner ? "var(--tx1)" : "var(--tx3)" }}>👤 {o}</span>
              {o === owner && <span style={{ marginLeft: "auto", color: "var(--tx3)", fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clickable pipeline stage pill that opens a compact picker
export function StagePicker({ stage, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  const current = PIPELINE_STAGES.find(s => s.id === stage);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: current ? current.bg : "var(--subtle)", border: `1px solid ${current ? current.bd : "var(--border)"}`, color: current ? current.ac : "var(--tx4)", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {current ? current.label : "No stage"}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "170px" })}>
          <div style={popoverLabel}>Pipeline Stage</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: !stage ? "var(--subtle)" : "none" }}
            onMouseEnter={e => { if (stage) e.currentTarget.style.background = "var(--hover)"; }}
            onMouseLeave={e => { if (stage) e.currentTarget.style.background = "none"; }}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None</span>
            {!stage && <span style={{ marginLeft: "auto", color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
          </div>
          {PIPELINE_STAGES.map(s => (
            <div key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s.id === stage ? s.bg : "none" }}
              onMouseEnter={e => { if (s.id !== stage) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (s.id !== stage) e.currentTarget.style.background = "none"; }}>
              <span style={{ background: s.bg, color: s.ac, border: `1px solid ${s.bd}`, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{s.label}</span>
              {s.id === stage && <span style={{ color: s.ac, fontSize: "0.7rem", marginLeft: "auto" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clickable strategy picker
export function StrategyPicker({ strategy, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useOutsideClick(ref, () => setOpen(false));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "var(--subtle)", border: "1px solid var(--border)", color: strategy ? "var(--tx2)" : "var(--tx5)", borderRadius: "4px", padding: "0.15rem 0.55rem", fontSize: "0.78rem", fontWeight: strategy ? 600 : 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {strategy || "—"}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "190px", maxHeight: "280px", overflowY: "auto" })}>
          <div style={popoverLabel}>Strategy</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None</span>
          </div>
          {STRATEGY_OPTIONS.map(s => (
            <div key={s} onClick={() => { onChange(s); setOpen(false); }}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s === strategy ? "var(--subtle)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onMouseEnter={e => { if (s !== strategy) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (s !== strategy) e.currentTarget.style.background = "none"; }}>
              <span style={{ color: s === strategy ? "var(--tx1)" : "var(--tx3)", fontSize: "0.8rem" }}>{s}</span>
              {s === strategy && <span style={{ color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Clickable sub-strategy picker — presets from selected strategy + free-text input
export function SubStrategyPicker({ strategy, subStrategy, onChange }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(subStrategy || "");
  const ref = useRef();
  const inputRef = useRef();
  useOutsideClick(ref, () => setOpen(false));
  useEffect(() => { if (open) { setText(subStrategy || ""); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  const options = strategy ? (SUB_STRATEGY_PRESETS[strategy] || []) : [];
  const save = (val) => { onChange(val || null); setOpen(false); };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: "var(--subtle)", border: "1px solid var(--border)", color: subStrategy ? "var(--tx3)" : "var(--tx5)", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", fontWeight: 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {subStrategy || "—"}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={popover({ minWidth: "210px", maxHeight: "300px", overflowY: "auto" })}>
          <div style={popoverLabel}>Sub-strategy</div>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(text.trim()); if (e.key === "Escape") setOpen(false); }}
            placeholder="Type or pick below…"
            style={{ ...IS, margin: "0 0.4rem 0.35rem", width: "calc(100% - 0.8rem)", fontSize: "0.8rem", padding: "0.3rem 0.5rem", boxSizing: "border-box" }} />
          {options.map(s => (
            <div key={s} onClick={() => save(s)}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s === subStrategy ? "var(--subtle)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onMouseEnter={e => { if (s !== subStrategy) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (s !== subStrategy) e.currentTarget.style.background = "none"; }}>
              <span style={{ color: s === subStrategy ? "var(--tx1)" : "var(--tx3)", fontSize: "0.8rem" }}>{s}</span>
              {s === subStrategy && <span style={{ color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
          {subStrategy && (
            <div onClick={() => save(null)}
              style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", marginTop: options.length > 0 ? "0.25rem" : 0, borderTop: options.length > 0 ? "1px solid var(--border)" : "none", paddingTop: options.length > 0 ? "0.5rem" : "0.35rem" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ color: "var(--tx5)", fontSize: "0.75rem", fontStyle: "italic" }}>× Clear</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Shared context so only one InlineMetric can be open at a time
export const EditingContext = React.createContext({ editingId: null, setEditingId: () => {} });

// Inline-editable metric card — Enter to save, Esc/blur to cancel, only one open at a time
export function InlineMetric({ id, label, value, displayValue, onSave, placeholder = "", type = "text" }) {
  const { editingId, setEditingId } = React.useContext(EditingContext);
  const editing = editingId === id;
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef();

  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [editing]);

  const commit = () => { onSave(draft.trim()); setEditingId(null); };
  const cancel = () => setEditingId(null);

  return (
    <div
      onClick={() => !editing && setEditingId(id)}
      style={{ background: "var(--card)", border: `1px solid ${editing ? "#3b82f6" : "var(--border)"}`, borderRadius: "8px", padding: "0.75rem 1rem", cursor: editing ? "default" : "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={e => { if (!editing) e.currentTarget.style.borderColor = "var(--border-hi)"; }}
      onMouseLeave={e => { if (!editing) e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
        {label}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.stopPropagation(); commit(); }
            if (e.key === "Escape") { e.stopPropagation(); cancel(); }
            if (e.key === "Tab") {
              e.preventDefault();
              if (draft.trim() !== (value || "")) commit(); else cancel();
            }
          }}
          onBlur={() => {
            if (type === "date" && draft !== (value || "")) commit();
            else cancel();
          }}
          onClick={e => e.stopPropagation()}
          style={{ ...IS, padding: "0.25rem 0.4rem", fontSize: "0.9rem", fontWeight: 600 }}
          placeholder={placeholder}
        />
      ) : (
        <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.9rem" }}>
          {displayValue || value || <span style={{ color: "var(--tx5)" }}>—</span>}
        </div>
      )}
    </div>
  );
}
