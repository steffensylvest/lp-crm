import React, { useState, useEffect, useRef } from "react";
import { btnGhost } from '../theme.js';

export function FilterDropdown({ label, options, selected, onChange, renderOption, accentColor = "#60a5fa" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const active = selected.length > 0;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: active ? "var(--subtle)" : "var(--card)",
          border: `1px solid ${active ? accentColor + "80" : "var(--border)"}`,
          borderRadius: "6px",
          color: active ? accentColor : "var(--tx4)",
          padding: "0.35rem 0.65rem",
          fontSize: "0.78rem",
          fontWeight: active ? 600 : 400,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          whiteSpace: "nowrap",
          transition: "all 0.12s",
          userSelect: "none",
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--tx2)"; }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--tx4)"; }}}
      >
        {label}
        {active && (
          <span style={{ background: accentColor, color: "#fff", borderRadius: "10px", padding: "0 0.35rem", fontSize: "0.65rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: "0.55rem", opacity: 0.5, marginLeft: "1px" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 600,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)", minWidth: "160px", padding: "0.4rem",
          }}
        >
          {options.map(opt => {
            const val = typeof opt === "string" ? opt : opt.value;
            const isSelected = selected.includes(val);
            return (
              <div
                key={val}
                onClick={() => toggle(val)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.55rem",
                  padding: "0.38rem 0.6rem", borderRadius: "6px", cursor: "pointer",
                  background: isSelected ? "var(--subtle)" : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--hover)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "none"; }}
              >
                <span style={{
                  width: "13px", height: "13px", borderRadius: "3px", flexShrink: 0,
                  border: `1.5px solid ${isSelected ? accentColor : "var(--border-hi)"}`,
                  background: isSelected ? accentColor : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", color: isSelected ? "#fff" : "transparent",
                }}>✓</span>
                {renderOption ? renderOption(opt, isSelected) : (
                  <span style={{ color: isSelected ? accentColor : "var(--tx2)", fontSize: "0.8rem" }}>{val}</span>
                )}
              </div>
            );
          })}
          {selected.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.3rem", paddingTop: "0.3rem" }}>
              <div onClick={() => onChange([])} style={{ padding: "0.3rem 0.6rem", color: "var(--tx4)", fontSize: "0.72rem", cursor: "pointer", borderRadius: "4px" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--tx2)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--tx5)"}
              >Clear</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
