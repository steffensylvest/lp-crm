import React, { useState, useEffect, useRef } from "react";
import { fmt } from "../utils.js";

const TYPE_STYLES = {
  gp:      { label: "GP",      color: "#60a5fa", bg: "#1e3a5f" },
  fund:    { label: "Fund",    color: "#a78bfa", bg: "#2e1a5f" },
  meeting: { label: "Meeting", color: "#fbbf24", bg: "#3d2f00" },
};

export function GlobalSearch({ gps, onClose, onGpClick, onFundClick, onMeetingClick, query, onQueryChange }) {
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 0); }, []);

  // Build results — GPs first, then funds, then meetings, cap at 10 total
  const results = [];
  if (query.trim().length >= 1) {
    const q = query.toLowerCase();
    for (const gp of gps) {
      if (results.length >= 10) break;
      if ([gp.name, gp.hq, gp.contact, gp.notes].some(v => v?.toLowerCase().includes(q))) {
        results.push({
          type: "gp", id: `gp-${gp.id}`,
          label: gp.name,
          sub: [gp.hq, gp.score ? `Score ${gp.score}` : null].filter(Boolean).join(" · "),
          action: () => { onGpClick(gp); },
        });
      }
      for (const f of gp.funds || []) {
        if (results.length >= 10) break;
        if ([f.name, f.strategy, f.subStrategy, f.status, f.notes, ...(f.sectors || [])].some(v => v?.toLowerCase().includes(q))) {
          results.push({
            type: "fund", id: `fund-${f.id}`,
            label: f.name,
            sub: [gp.name, f.strategy, f.status].filter(Boolean).join(" · "),
            action: () => { onFundClick(f, gp); },
          });
        }
      }
      for (const m of gp.meetings || []) {
        if (results.length >= 10) break;
        if ([m.topic, m.notes, m.location].some(v => v?.toLowerCase().includes(q))) {
          const fundName = m.fundId ? (gp.funds || []).find(f => f.id === m.fundId)?.name : null;
          results.push({
            type: "meeting", id: `mtg-${m.id}`,
            label: m.topic || "(no topic)",
            sub: [gp.name, fundName, fmt(m.date)].filter(Boolean).join(" · "),
            action: () => { onMeetingClick(m, gp); },
          });
        }
      }
    }
  }

  useEffect(() => { setFocusIdx(0); }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocusIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && results[focusIdx]) { results[focusIdx].action(); }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2999, backdropFilter: "blur(3px)" }} />

      {/* Search panel */}
      <div style={{ position: "fixed", top: "14vh", left: "50%", transform: "translateX(-50%)", width: "min(640px, 92vw)", background: "var(--surface)", border: "1px solid var(--border-hi)", borderRadius: "16px", zIndex: 3000, boxShadow: "0 32px 100px rgba(0,0,0,0.95)", overflow: "hidden" }}>

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--tx4)", fontSize: "1.15rem", flexShrink: 0 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search GPs, funds, meetings…"
            style={{ flex: 1, fontSize: "1rem", background: "none", border: "none", color: "var(--tx1)", outline: "none" }}
          />
          <kbd onClick={onClose}
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontFamily: "monospace", fontSize: "0.65rem", color: "var(--tx5)", cursor: "pointer", flexShrink: 0 }}>
            esc
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div style={{ padding: "0.4rem 0.5rem", maxHeight: "390px", overflowY: "auto" }}>
            {results.map((r, i) => {
              const ts = TYPE_STYLES[r.type];
              return (
                <div key={r.id} onClick={r.action}
                  onMouseEnter={() => setFocusIdx(i)}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: "9px", cursor: "pointer", background: i === focusIdx ? "var(--subtle)" : "transparent", transition: "background 0.1s" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, background: ts.bg, color: ts.color, borderRadius: "4px", padding: "0.1rem 0.45rem", flexShrink: 0 }}>
                    {ts.label}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--tx1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--tx4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "0.05rem" }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--tx5)", flexShrink: 0 }}>↵</span>
                </div>
              );
            })}
          </div>
        ) : query.length > 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--tx5)", fontSize: "0.85rem" }}>No results for "{query}"</div>
        ) : (
          <div style={{ padding: "1.75rem", textAlign: "center", color: "var(--tx5)", fontSize: "0.82rem" }}>Type to search across all GPs, funds and meetings</div>
        )}

        {/* Footer hint */}
        {results.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "0.5rem 1.25rem", display: "flex", gap: "1rem" }}>
            {[["↑↓", "navigate"], ["↵", "open"], ["esc", "close"]].map(([key, hint]) => (
              <span key={key} style={{ fontSize: "0.65rem", color: "var(--tx5)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <kbd style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.05rem 0.35rem", fontFamily: "monospace" }}>{key}</kbd>
                {hint}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
