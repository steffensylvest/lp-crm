import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { SCORE_CONFIG, STATUS_OPTIONS, PIPELINE_STAGES, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS } from '../constants.js';
import { IS } from '../theme.js';
import { Chip, getStatusStyle } from './Badges.jsx';
import { useSettings } from '../settingsContext.js';

// Shared hook: close popover when clicking outside (accepts single ref or array)
export function useOutsideClick(refs, onClose) {
  useEffect(() => {
    const refsArr = Array.isArray(refs) ? refs : [refs];
    const h = (e) => { if (refsArr.every(r => !r.current?.contains(e.target))) onClose(); };
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
// items: optional [{ code, label, color, bg_color }] from v2 API — falls back to SCORE_CONFIG
export function ScorePicker({ score, onChange, size = "sm", items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef();
  const portalRef = useRef();
  useOutsideClick([ref, portalRef], () => setOpen(false));

  const entries = items
    ? items.map(i => ({ code: i.code, label: i.label, desc: i.label, bg: i.bg_color, c: i.color, bd: `${i.color}40` }))
    : Object.entries(SCORE_CONFIG).map(([k, v]) => ({ code: k, label: k, desc: v.desc, bg: `var(--sb-${k}-bg)`, c: `var(--sb-${k}-c)`, bd: `var(--sb-${k}-bd)` }));

  const current = entries.find(e => e.code === score) ?? { bg: `var(--sb-${score}-bg)`, c: `var(--sb-${score}-c)`, bd: `var(--sb-${score}-bd)`, label: score };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: score ? current.bg : "var(--subtle)", color: score ? current.c : "var(--tx5)", border: `1px solid ${score ? current.bd : "var(--border)"}`, borderRadius: "4px", padding: size === "lg" ? "0.3rem 0.8rem" : "0.1rem 0.45rem", fontSize: size === "lg" ? "0.95rem" : "0.72rem", fontWeight: score ? 700 : 400, fontFamily: "monospace", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {current.label ?? "—"}
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "200px" }}>
          <div style={popoverLabel}>Rating</div>
          {entries.map(e => (
            <div key={e.code} onClick={() => { onChange(e.code); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: e.code === score ? e.bg : "none", transition: "background 0.1s" }}
              onMouseEnter={el => { if (e.code !== score) el.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={el => { if (e.code !== score) el.currentTarget.style.background = "none"; }}>
              <span style={{ background: e.bg, color: e.c, border: `1px solid ${e.bd}`, borderRadius: "3px", padding: "0.1rem 0.45rem", fontSize: "0.75rem", fontWeight: 700, fontFamily: "monospace", minWidth: "20px", textAlign: "center" }}>{e.label}</span>
              <span style={{ color: e.code === score ? e.c : "var(--tx4)", fontSize: "0.8rem" }}>{e.desc}</span>
              {e.code === score && <span style={{ marginLeft: "auto", color: e.c, fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// Clickable status pill that opens a compact picker
// items: optional [{ code, label, color, bg_color }] from v2 API — falls back to hardcoded STATUS_OPTIONS
export function StatusPicker({ status, onChange, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef();
  const portalRef = useRef();
  const { settings, mode } = useSettings();
  useOutsideClick([ref, portalRef], () => setOpen(false));

  const entries = items
    ? items.map(i => ({ code: i.code, label: i.label, bg: i.bg_color, color: i.color }))
    : (settings.statusOptions ?? STATUS_OPTIONS).map(s => { const ss = getStatusStyle(s, settings, mode); return { code: s, label: s, bg: ss.bg, color: ss.color }; });

  const current = entries.find(e => e.code === status) ?? (() => { const ss = getStatusStyle(status, settings, mode); return { bg: ss.bg, color: ss.color, label: status }; })();

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: status ? current.bg : "var(--subtle)", color: status ? current.color : "var(--tx5)", border: `1px solid ${status ? "transparent" : "var(--border)"}`, borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {current.label ?? "—"}
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "160px" }}>
          <div style={popoverLabel}>Status</div>
          {entries.map(e => (
            <div key={e.code} onClick={() => { onChange(e.code); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: e.code === status ? e.bg : "none" }}
              onMouseEnter={el => { if (e.code !== status) el.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={el => { if (e.code !== status) el.currentTarget.style.background = "none"; }}>
              <span style={{ background: e.bg, color: e.color, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.72rem", minWidth: "90px" }}>{e.label}</span>
              {e.code === status && <span style={{ color: e.color, fontSize: "0.7rem", marginLeft: "auto" }}>✓</span>}
            </div>
          ))}
        </div>,
        document.getElementById("portal-root") ?? document.body
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
  const [pos, setPos] = useState(null);
  const ref = useRef();
  const portalRef = useRef();
  useOutsideClick([ref, portalRef], () => setOpen(false));
  const allOptions = owner && !owners.includes(owner) ? [owner, ...owners] : owners;
  const display = owner || placeholder;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "20px", padding: "0.15rem 0.6rem", fontSize: "0.72rem", color: display ? (owner ? "var(--tx2)" : "var(--tx4)") : "var(--tx5)", fontWeight: owner ? 500 : 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", transition: "border-color 0.15s, background 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
      >
        <span>{display || "No owner"}{!owner && placeholder ? " ↑" : ""}</span>
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "150px" }}>
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
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// Clickable pipeline stage pill that opens a compact picker
// items: optional [{ code, label, color, bg_color }] from v2 API — falls back to hardcoded PIPELINE_STAGES
export function StagePicker({ stage, onChange, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef();
  const portalRef = useRef();
  const { settings } = useSettings();
  const effectiveStages = items
    ? items.map(i => ({ id: i.code, label: i.label, bg: i.bg_color ?? "var(--subtle)", bd: i.color ?? "var(--border)", ac: i.color ?? "var(--tx3)" }))
    : (settings.pipelineStages ?? PIPELINE_STAGES);
  useOutsideClick([ref, portalRef], () => setOpen(false));
  const current = effectiveStages.find(s => s.id === stage);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: current ? current.bg : "var(--subtle)", border: `1px solid ${current ? current.bd : "var(--border)"}`, color: current ? current.ac : "var(--tx4)", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {current ? current.label : "No stage"}
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "170px" }}>
          <div style={popoverLabel}>Pipeline Stage</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: !stage ? "var(--subtle)" : "none" }}
            onMouseEnter={e => { if (stage) e.currentTarget.style.background = "var(--hover)"; }}
            onMouseLeave={e => { if (stage) e.currentTarget.style.background = "none"; }}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None</span>
            {!stage && <span style={{ marginLeft: "auto", color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
          </div>
          {effectiveStages.map(s => (
            <div key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s.id === stage ? s.bg : "none" }}
              onMouseEnter={e => { if (s.id !== stage) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (s.id !== stage) e.currentTarget.style.background = "none"; }}>
              <span style={{ background: s.bg, color: s.ac, border: `1px solid ${s.bd}`, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{s.label}</span>
              {s.id === stage && <span style={{ color: s.ac, fontSize: "0.7rem", marginLeft: "auto" }}>✓</span>}
            </div>
          ))}
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// Clickable strategy picker
// items: optional [{ code, label }] from v2 taxonomy — falls back to hardcoded STRATEGY_OPTIONS
export function StrategyPicker({ strategy, onChange, items }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef();
  const portalRef = useRef();
  const { settings } = useSettings();
  const effectiveStrategies = items
    ? items.map(i => i.code ?? i.name)
    : (settings.strategies ?? STRATEGY_OPTIONS);
  useOutsideClick([ref, portalRef], () => setOpen(false));

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: "var(--subtle)", border: "1px solid var(--border)", color: strategy ? "var(--tx2)" : "var(--tx5)", borderRadius: "4px", padding: "0.15rem 0.55rem", fontSize: "0.78rem", fontWeight: strategy ? 600 : 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {strategy || "—"}
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "190px", maxHeight: "280px", overflowY: "auto" }}>
          <div style={popoverLabel}>Strategy</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None</span>
          </div>
          {effectiveStrategies.map(s => (
            <div key={s} onClick={() => { onChange(s); setOpen(false); }}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: s === strategy ? "var(--subtle)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onMouseEnter={e => { if (s !== strategy) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (s !== strategy) e.currentTarget.style.background = "none"; }}>
              <span style={{ color: s === strategy ? "var(--tx1)" : "var(--tx3)", fontSize: "0.8rem" }}>{s}</span>
              {s === strategy && <span style={{ color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// Clickable sub-strategy picker — presets from selected strategy + free-text input
export function SubStrategyPicker({ strategy, subStrategy, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [text, setText] = useState(subStrategy || "");
  const ref = useRef();
  const portalRef = useRef();
  const inputRef = useRef();
  const { settings } = useSettings();
  const effectivePresets = settings.subStrategyPresets ?? SUB_STRATEGY_PRESETS;
  useOutsideClick([ref, portalRef], () => setOpen(false));
  useEffect(() => { if (open) { setText(subStrategy || ""); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  const options = strategy ? (effectivePresets[strategy] || []) : [];
  const save = (val) => { onChange(val || null); setOpen(false); };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ display: "inline-block" }}>
      <span onClick={handleToggle}
        style={{ background: "var(--subtle)", border: "1px solid var(--border)", color: subStrategy ? "var(--tx3)" : "var(--tx5)", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", fontWeight: 400, cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center" }}>
        {subStrategy || "—"}
      </span>
      {open && pos && createPortal(
        <div ref={portalRef} onClick={e => e.stopPropagation()} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9000, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "210px", maxHeight: "300px", overflowY: "auto" }}>
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
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// Shared context so only one InlineMetric can be open at a time.
// registerMetric / unregisterMetric / nextMetricId enable Tab-to-next navigation.
export const EditingContext = React.createContext({
  editingId: null,
  setEditingId: () => {},
  registerMetric: () => {},
  unregisterMetric: () => {},
  nextMetricId: () => null,
});

// Inline-editable metric card — Enter/Tab to save, Esc/blur to cancel, only one open at a time
export function InlineMetric({ id, label, value, displayValue, onSave, placeholder = "", type = "text" }) {
  const { editingId, setEditingId, registerMetric, unregisterMetric, nextMetricId } = React.useContext(EditingContext);
  const editing = editingId === id;
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef();

  // Register this metric in the ordered registry for Tab navigation
  useEffect(() => {
    registerMetric(id);
    return () => unregisterMetric(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
              onSave(draft.trim());
              setEditingId(nextMetricId(id));
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

// ── ProvenanceMetric ──────────────────────────────────────────────────────────
// Wraps InlineMetric with Preqin suggestion display when own value is missing.
// Shows amber value + "Preqin" badge; Accept button appears on hover only.
// Shared by FundDetailOverlay and GPDetailOverlay.
export function ProvenanceMetric({ fieldName, provenanceRows, onAcceptProvenance, value, displayValue, ...rest }) {
  const [hovered, setHovered] = useState(false);
  const pending = provenanceRows?.find(r => r.field_name === fieldName && r.status === "pending");
  const showSuggestion = !!pending && !value;

  // displayValue may be a precomputed string OR a format function (v) => string
  // Using a function allows suggestion values to be formatted the same way as own values
  const fmt = (v) => typeof displayValue === 'function' ? displayValue(v) : displayValue;

  const suggestionDisplay = showSuggestion ? (
    <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.2rem" }}>
      <span style={{ color: "#f59e0b", opacity: 0.85, fontWeight: 600 }}>{fmt(pending.value) || pending.value}</span>
      <span style={{ fontSize: "0.52rem", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)", borderRadius: "3px", padding: "0.05rem 0.3rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, flexShrink: 0 }}>Preqin</span>
    </span>
  ) : fmt(value);

  return (
    <div style={{ position: "relative", minWidth: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <InlineMetric value={showSuggestion ? pending.value : value} displayValue={suggestionDisplay} {...rest} />
      {showSuggestion && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onAcceptProvenance && onAcceptProvenance(pending.id); }}
          style={{ position: "absolute", top: "5px", right: "5px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "4px", padding: "0.12rem 0.45rem", fontSize: "0.62rem", cursor: "pointer", fontWeight: 700, zIndex: 2, lineHeight: 1.4 }}>
          ✓ Accept
        </button>
      )}
    </div>
  );
}

// Human-readable labels for Preqin provenance field names (fund + org)
export const PROVENANCE_FIELD_LABELS = {
  // Fund fields
  net_irr:           "Net IRR",
  net_moic:          "Net MOIC",
  tvpi:              "TVPI",
  gross_irr:         "Gross IRR",
  gross_moic:        "Gross MOIC",
  dpi:               "DPI",
  rvpi:              "RVPI",
  nav:               "NAV",
  undrawn_value:     "Undrawn Value",
  perf_date:         "Performance Date",
  vintage:           "Vintage",
  target_size:       "Target Size",
  final_size:        "Final Size",
  currency:          "Currency",
  quartile_ranking:  "Quartile",
  benchmark_name:    "Benchmark",
  pme:               "PME (S&P 500 LN)",
  pme_index:         "PME+ (S&P 500)",
  // Org fields
  name:                  "Firm Name",
  website:               "Website",
  aum:                   "AUM (USD M)",
  aum_date:              "AUM Date",
  aum_currency:          "AUM Currency",
  founded_year:          "Year Founded",
  investment_team_size:  "Investment Team",
  total_team_size:       "Total Staff",
};
