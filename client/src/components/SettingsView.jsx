import React, { useState, useRef } from "react";
import { useSettings } from "../settingsContext.js";
import {
  SCORE_CONFIG, SECTOR_OPTIONS, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS,
  STATUS_OPTIONS, PIPELINE_STAGES,
} from "../constants.js";
import { DARK, LIGHT, IS, btnGhost, btnPrimary, btnDanger } from "../theme.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid8 = () => Math.random().toString(36).slice(2, 10);

function sectionTitle(label) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem", marginTop: "1.5rem" }}>
      <span style={{ color: "var(--tx2)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );
}

// Simple editable chip list with add input
function ChipList({ items, onAdd, onRemove, placeholder = "Add…" }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onAdd(v);
    setDraft("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
        {items.map(item => (
          <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "var(--subtle)", color: "var(--tx2)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.15rem 0.5rem 0.15rem 0.65rem", fontSize: "0.78rem" }}>
            {item}
            <span onClick={() => onRemove(item)} style={{ cursor: "pointer", color: "var(--tx5)", fontSize: "0.85rem", lineHeight: 1, paddingLeft: "0.15rem" }}>×</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} style={{ ...IS, maxWidth: "220px", fontSize: "0.82rem" }} />
        <button onClick={add} style={{ ...btnGhost, fontSize: "0.8rem" }}>+ Add</button>
      </div>
    </div>
  );
}

// Color picker row: one colour in both dark and light mode
function ColorField({ label, darkVal, lightVal, onChangeDark, onChangeLight }) {
  const fi = { border: "none", borderRadius: "4px", cursor: "pointer", width: "32px", height: "28px", padding: "0", background: "none" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--tx3)", fontSize: "0.78rem", minWidth: "120px" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>Dark</span>
        <input type="color" value={darkVal || "#000000"} onChange={e => onChangeDark(e.target.value)} style={fi} title="Dark mode colour" />
        <input value={darkVal || ""} onChange={e => onChangeDark(e.target.value)} style={{ ...IS, width: "80px", fontSize: "0.75rem", padding: "0.25rem 0.4rem", fontFamily: "monospace" }} placeholder="#hex" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>Light</span>
        <input type="color" value={lightVal || "#000000"} onChange={e => onChangeLight(e.target.value)} style={fi} title="Light mode colour" />
        <input value={lightVal || ""} onChange={e => onChangeLight(e.target.value)} style={{ ...IS, width: "80px", fontSize: "0.75rem", padding: "0.25rem 0.4rem", fontFamily: "monospace" }} placeholder="#hex" />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function SettingsView({ onBack }) {
  const { settings, setSettings } = useSettings();
  const [tab, setTab] = useState("lists");
  const [subStratStrategy, setSubStratStrategy] = useState(null);

  // Effective values (settings override defaults)
  const sectors          = settings.sectors          ?? [...SECTOR_OPTIONS];
  const strategies       = settings.strategies       ?? [...STRATEGY_OPTIONS];
  const subPresets       = settings.subStrategyPresets ?? { ...SUB_STRATEGY_PRESETS };
  const statusOptions    = settings.statusOptions    ?? [...STATUS_OPTIONS];
  const pipelineStages   = settings.pipelineStages   ?? PIPELINE_STAGES.map(s => ({ ...s }));
  const people           = settings.people           ?? [];
  const scoreColors      = settings.scoreColors      ?? {};
  const statusColors     = settings.statusColors     ?? {};
  const sectorColors     = settings.sectorColors     ?? {};

  const patch = (fields) => setSettings({ ...settings, ...fields });

  // ── LISTS helpers ───────────────────────────────────────────────────────────
  const selectedStrategy = subStratStrategy ?? strategies[0];
  const currentSubList = subPresets[selectedStrategy] || [];

  const updateSubPresets = (strat, newList) =>
    patch({ subStrategyPresets: { ...subPresets, [strat]: newList } });

  const addPipelineStage = () => {
    const id = `stage-${uid8()}`;
    patch({
      pipelineStages: [...pipelineStages, {
        id, label: "New Stage",
        bg: "var(--subtle)", bd: "var(--border)", ac: "var(--tx3)",
      }]
    });
  };

  const updateStageLabel = (id, label) =>
    patch({ pipelineStages: pipelineStages.map(s => s.id === id ? { ...s, label } : s) });

  const removePipelineStage = (id) =>
    patch({ pipelineStages: pipelineStages.filter(s => s.id !== id) });

  // ── COLORS helpers ─────────────────────────────────────────────────────────
  const setScoreColor = (grade, themeMode, field, val) =>
    patch({ scoreColors: { ...scoreColors, [grade]: { ...scoreColors[grade], [themeMode]: { ...(scoreColors[grade]?.[themeMode] || {}), [field]: val } } } });

  const resetScoreColor = (grade) =>
    patch({ scoreColors: { ...scoreColors, [grade]: undefined } });

  const setStatusColor = (status, themeMode, field, val) =>
    patch({ statusColors: { ...statusColors, [status]: { ...statusColors[status], [themeMode]: { ...(statusColors[status]?.[themeMode] || {}), [field]: val } } } });

  const resetStatusColor = (status) =>
    patch({ statusColors: { ...statusColors, [status]: undefined } });

  const setSectorColor = (themeMode, field, val) =>
    patch({ sectorColors: { ...sectorColors, [themeMode]: { ...(sectorColors[themeMode] || {}), [field]: val } } });

  // ── Default colors from theme for placeholders ─────────────────────────────
  const scoreDefaults = {
    dark:  { A: { bg: DARK['--sb-A-bg'], color: DARK['--sb-A-c'] }, B: { bg: DARK['--sb-B-bg'], color: DARK['--sb-B-c'] }, C: { bg: DARK['--sb-C-bg'], color: DARK['--sb-C-c'] }, D: { bg: DARK['--sb-D-bg'], color: DARK['--sb-D-c'] }, E: { bg: DARK['--sb-E-bg'], color: DARK['--sb-E-c'] }, U: { bg: DARK['--sb-U-bg'], color: DARK['--sb-U-c'] } },
    light: { A: { bg: LIGHT['--sb-A-bg'], color: LIGHT['--sb-A-c'] }, B: { bg: LIGHT['--sb-B-bg'], color: LIGHT['--sb-B-c'] }, C: { bg: LIGHT['--sb-C-bg'], color: LIGHT['--sb-C-c'] }, D: { bg: LIGHT['--sb-D-bg'], color: LIGHT['--sb-D-c'] }, E: { bg: LIGHT['--sb-E-bg'], color: LIGHT['--sb-E-c'] }, U: { bg: LIGHT['--sb-U-bg'], color: LIGHT['--sb-U-c'] } },
  };

  const sectorDefaults = {
    dark:  { bg: DARK['--sector-bg'],  color: DARK['--sector-c'],  border: DARK['--sector-bd'] },
    light: { bg: LIGHT['--sector-bg'], color: LIGHT['--sector-c'], border: LIGHT['--sector-bd'] },
  };

  // pill CSS var slot defaults (dark & light, for positions 1–12)
  const pillVarsDark  = [DARK['--pill-bg-1'],DARK['--pill-bg-2'],DARK['--pill-bg-3'],DARK['--pill-bg-4'],DARK['--pill-bg-5'],DARK['--pill-bg-6'],DARK['--pill-bg-7'],DARK['--pill-bg-8'],DARK['--pill-bg-9'],DARK['--pill-bg-10'],DARK['--pill-bg-11'],DARK['--pill-bg-12']];
  const pillTextDark  = [DARK['--pill-c-1'],DARK['--pill-c-2'],DARK['--pill-c-3'],DARK['--pill-c-4'],DARK['--pill-c-5'],DARK['--pill-c-6'],DARK['--pill-c-7'],DARK['--pill-c-8'],DARK['--pill-c-9'],DARK['--pill-c-10'],DARK['--pill-c-11'],DARK['--pill-c-12']];
  const pillVarsLight = [LIGHT['--pill-bg-1'],LIGHT['--pill-bg-2'],LIGHT['--pill-bg-3'],LIGHT['--pill-bg-4'],LIGHT['--pill-bg-5'],LIGHT['--pill-bg-6'],LIGHT['--pill-bg-7'],LIGHT['--pill-bg-8'],LIGHT['--pill-bg-9'],LIGHT['--pill-bg-10'],LIGHT['--pill-bg-11'],LIGHT['--pill-bg-12']];
  const pillTextLight = [LIGHT['--pill-c-1'],LIGHT['--pill-c-2'],LIGHT['--pill-c-3'],LIGHT['--pill-c-4'],LIGHT['--pill-c-5'],LIGHT['--pill-c-6'],LIGHT['--pill-c-7'],LIGHT['--pill-c-8'],LIGHT['--pill-c-9'],LIGHT['--pill-c-10'],LIGHT['--pill-c-11'],LIGHT['--pill-c-12']];

  const TAB = (id, label) => (
    <button onClick={() => setTab(id)} style={{ background: tab === id ? "var(--subtle)" : "none", border: tab === id ? "1px solid var(--border-hi)" : "1px solid transparent", borderRadius: "6px", color: tab === id ? "var(--tx1)" : "var(--tx4)", padding: "0.35rem 0.9rem", fontSize: "0.8125rem", cursor: "pointer", fontWeight: tab === id ? 600 : 400 }}>{label}</button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={{ ...btnGhost, fontSize: "0.8125rem" }}>← Back</button>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Settings</h2>
        <span style={{ color: "var(--tx5)", fontSize: "0.78rem" }}>Changes save automatically</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.5rem" }}>
        {TAB("lists", "Lists")}
        {TAB("people", "People")}
        {TAB("colors", "Colors")}
      </div>

      {/* ── LISTS TAB ───────────────────────────────────────────────────────── */}
      {tab === "lists" && (
        <div style={{ maxWidth: "760px" }}>

          {sectionTitle("Sectors")}
          <ChipList items={sectors}
            onAdd={v => patch({ sectors: [...sectors, v] })}
            onRemove={v => patch({ sectors: sectors.filter(x => x !== v) })}
            placeholder="e.g. Aerospace" />

          {sectionTitle("Strategies")}
          <ChipList items={strategies}
            onAdd={v => patch({ strategies: [...strategies, v] })}
            onRemove={v => patch({ strategies: strategies.filter(x => x !== v) })}
            placeholder="e.g. Hybrid" />

          {sectionTitle("Sub-Strategies")}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {/* Left: strategy selector */}
            <div style={{ borderRight: "1px solid var(--border)", padding: "0.5rem 0" }}>
              {strategies.map(s => (
                <div key={s} onClick={() => setSubStratStrategy(s)}
                  style={{ padding: "0.45rem 0.85rem", cursor: "pointer", background: selectedStrategy === s ? "var(--subtle)" : "none", color: selectedStrategy === s ? "var(--tx1)" : "var(--tx3)", fontSize: "0.82rem", fontWeight: selectedStrategy === s ? 600 : 400 }}>
                  {s}
                </div>
              ))}
            </div>
            {/* Right: sub-strategy list */}
            <div style={{ padding: "0.75rem" }}>
              <div style={{ color: "var(--tx4)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>{selectedStrategy}</div>
              <ChipList
                items={currentSubList}
                onAdd={v => updateSubPresets(selectedStrategy, [...currentSubList, v])}
                onRemove={v => updateSubPresets(selectedStrategy, currentSubList.filter(x => x !== v))}
                placeholder="e.g. Turnaround" />
            </div>
          </div>

          {sectionTitle("Status Options")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.5rem", marginTop: 0 }}>Order determines the display colour in the Status picker.</p>
          <ChipList items={statusOptions}
            onAdd={v => patch({ statusOptions: [...statusOptions, v] })}
            onRemove={v => patch({ statusOptions: statusOptions.filter(x => x !== v) })}
            placeholder="e.g. Monitoring" />

          {sectionTitle("Pipeline Stages")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.5rem", marginTop: 0 }}>Stage IDs are fixed. Only labels can be renamed. Colours are set in the Colors tab.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {pipelineStages.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.45rem 0.75rem" }}>
                <span style={{ background: s.bg, color: s.ac, border: `1px solid ${s.bd}`, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.72rem", flexShrink: 0, minWidth: "90px", textAlign: "center" }}>{s.label}</span>
                <input value={s.label} onChange={e => updateStageLabel(s.id, e.target.value)}
                  style={{ ...IS, flex: 1, fontSize: "0.82rem" }} placeholder="Label" />
                <span style={{ color: "var(--tx5)", fontSize: "0.7rem", fontFamily: "monospace" }}>{s.id}</span>
                {!PIPELINE_STAGES.find(d => d.id === s.id) && (
                  <button onClick={() => removePipelineStage(s.id)} style={{ ...btnDanger, padding: "0.2rem 0.5rem", fontSize: "0.72rem" }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addPipelineStage} style={{ ...btnGhost, alignSelf: "flex-start", fontSize: "0.8rem" }}>+ Add Stage</button>
          </div>
        </div>
      )}

      {/* ── PEOPLE TAB ──────────────────────────────────────────────────────── */}
      {tab === "people" && (
        <div style={{ maxWidth: "520px" }}>
          {sectionTitle("Internal Team")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.75rem", marginTop: 0 }}>
            These names appear in the Responsible picker for GPs & funds, and in the Attendees (Us) section when logging meetings.
          </p>
          <ChipList items={people}
            onAdd={v => patch({ people: [...people, v] })}
            onRemove={v => patch({ people: people.filter(x => x !== v) })}
            placeholder="e.g. Alice" />
        </div>
      )}

      {/* ── COLORS TAB ──────────────────────────────────────────────────────── */}
      {tab === "colors" && (
        <div style={{ maxWidth: "720px" }}>

          {/* Score Badges */}
          {sectionTitle("Score Badges")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.75rem", marginTop: 0 }}>Set background and text colours for each rating grade.</p>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 70px", gap: "0.5rem", padding: "0.4rem 0.75rem", background: "var(--subtle)", color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <span>Grade</span><span>Background</span><span>Text</span><span>Preview</span>
            </div>
            {Object.keys(SCORE_CONFIG).map(grade => {
              const dBg  = scoreColors[grade]?.dark?.bg    ?? scoreDefaults.dark[grade]?.bg;
              const dCol = scoreColors[grade]?.dark?.color  ?? scoreDefaults.dark[grade]?.color;
              const lBg  = scoreColors[grade]?.light?.bg   ?? scoreDefaults.light[grade]?.bg;
              const lCol = scoreColors[grade]?.light?.color ?? scoreDefaults.light[grade]?.color;
              const fi = { border: "none", borderRadius: "4px", cursor: "pointer", width: "28px", height: "24px", padding: 0, background: "none" };
              return (
                <div key={grade} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 70px", gap: "0.5rem", padding: "0.5rem 0.75rem", borderTop: "1px solid var(--border)", alignItems: "center" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", background: `var(--sb-${grade}-bg)`, color: `var(--sb-${grade}-c)`, borderRadius: "4px", padding: "0.1rem 0.45rem", display: "inline-block" }}>{grade}</span>
                  {/* Background column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Dark</span>
                      <input type="color" value={dBg || "#000000"} onChange={e => setScoreColor(grade, "dark", "bg", e.target.value)} style={fi} />
                      <input value={dBg || ""} onChange={e => setScoreColor(grade, "dark", "bg", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Light</span>
                      <input type="color" value={lBg || "#ffffff"} onChange={e => setScoreColor(grade, "light", "bg", e.target.value)} style={fi} />
                      <input value={lBg || ""} onChange={e => setScoreColor(grade, "light", "bg", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                  </div>
                  {/* Text column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Dark</span>
                      <input type="color" value={dCol || "#ffffff"} onChange={e => setScoreColor(grade, "dark", "color", e.target.value)} style={fi} />
                      <input value={dCol || ""} onChange={e => setScoreColor(grade, "dark", "color", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Light</span>
                      <input type="color" value={lCol || "#000000"} onChange={e => setScoreColor(grade, "light", "color", e.target.value)} style={fi} />
                      <input value={lCol || ""} onChange={e => setScoreColor(grade, "light", "color", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                  </div>
                  {/* Preview + reset */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
                    <span style={{ background: `var(--sb-${grade}-bg)`, color: `var(--sb-${grade}-c)`, border: `1px solid var(--sb-${grade}-bd)`, borderRadius: "4px", padding: "0.1rem 0.45rem", fontSize: "0.72rem", fontWeight: 700, fontFamily: "monospace" }}>{grade}</span>
                    {scoreColors[grade] && <button onClick={() => resetScoreColor(grade)} style={{ background: "none", border: "none", color: "var(--tx5)", fontSize: "0.65rem", cursor: "pointer", padding: 0 }}>Reset</button>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Pills */}
          {sectionTitle("Status Pills")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.75rem", marginTop: 0 }}>Customise pill colours per status. Custom statuses use slot colours by default.</p>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 70px", gap: "0.5rem", padding: "0.4rem 0.75rem", background: "var(--subtle)", color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <span>Status</span><span>Background</span><span>Text</span><span>Preview</span>
            </div>
            {statusOptions.map((status, i) => {
              const slot = Math.min(i, 11);
              const dBg  = statusColors[status]?.dark?.bg    ?? pillVarsDark[slot];
              const dCol = statusColors[status]?.dark?.color  ?? pillTextDark[slot];
              const lBg  = statusColors[status]?.light?.bg   ?? pillVarsLight[slot];
              const lCol = statusColors[status]?.light?.color ?? pillTextLight[slot];
              const fi = { border: "none", borderRadius: "4px", cursor: "pointer", width: "28px", height: "24px", padding: 0, background: "none" };
              return (
                <div key={status} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 70px", gap: "0.5rem", padding: "0.5rem 0.75rem", borderTop: "1px solid var(--border)", alignItems: "center" }}>
                  <span style={{ color: "var(--tx2)", fontSize: "0.8rem", fontWeight: 500 }}>{status}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Dark</span>
                      <input type="color" value={dBg?.startsWith("#") ? dBg : "#1e293b"} onChange={e => setStatusColor(status, "dark", "bg", e.target.value)} style={fi} />
                      <input value={dBg || ""} onChange={e => setStatusColor(status, "dark", "bg", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Light</span>
                      <input type="color" value={lBg?.startsWith("#") ? lBg : "#f1f5f9"} onChange={e => setStatusColor(status, "light", "bg", e.target.value)} style={fi} />
                      <input value={lBg || ""} onChange={e => setStatusColor(status, "light", "bg", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Dark</span>
                      <input type="color" value={dCol?.startsWith("#") ? dCol : "#94a3b8"} onChange={e => setStatusColor(status, "dark", "color", e.target.value)} style={fi} />
                      <input value={dCol || ""} onChange={e => setStatusColor(status, "dark", "color", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", width: "28px" }}>Light</span>
                      <input type="color" value={lCol?.startsWith("#") ? lCol : "#64748b"} onChange={e => setStatusColor(status, "light", "color", e.target.value)} style={fi} />
                      <input value={lCol || ""} onChange={e => setStatusColor(status, "light", "color", e.target.value)} style={{ ...IS, width: "76px", fontSize: "0.72rem", padding: "0.2rem 0.35rem", fontFamily: "monospace" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
                    <span style={{ background: dBg, color: dCol, borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{status}</span>
                    {statusColors[status] && <button onClick={() => resetStatusColor(status)} style={{ background: "none", border: "none", color: "var(--tx5)", fontSize: "0.65rem", cursor: "pointer", padding: 0 }}>Reset</button>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sector Chips */}
          {sectionTitle("Sector Chips")}
          <p style={{ color: "var(--tx5)", fontSize: "0.75rem", marginBottom: "0.75rem", marginTop: 0 }}>One global colour used for all sector tags.</p>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
            <ColorField
              label="Background"
              darkVal={sectorColors.dark?.bg ?? DARK['--sector-bg']}
              lightVal={sectorColors.light?.bg ?? LIGHT['--sector-bg']}
              onChangeDark={v => setSectorColor("dark", "bg", v)}
              onChangeLight={v => setSectorColor("light", "bg", v)} />
            <ColorField
              label="Text"
              darkVal={sectorColors.dark?.color ?? DARK['--sector-c']}
              lightVal={sectorColors.light?.color ?? LIGHT['--sector-c']}
              onChangeDark={v => setSectorColor("dark", "color", v)}
              onChangeLight={v => setSectorColor("light", "color", v)} />
            <ColorField
              label="Border"
              darkVal={sectorColors.dark?.border ?? DARK['--sector-bd']}
              lightVal={sectorColors.light?.border ?? LIGHT['--sector-bd']}
              onChangeDark={v => setSectorColor("dark", "border", v)}
              onChangeLight={v => setSectorColor("light", "border", v)} />
            <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ background: "var(--sector-bg)", color: "var(--sector-c)", border: "1px solid var(--sector-bd)", borderRadius: "4px", padding: "0.15rem 0.55rem", fontSize: "0.72rem" }}>Technology</span>
              {Object.keys(sectorColors).length > 0 && (
                <button onClick={() => patch({ sectorColors: {} })} style={{ background: "none", border: "none", color: "var(--tx5)", fontSize: "0.72rem", cursor: "pointer", padding: 0 }}>Reset to defaults</button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
