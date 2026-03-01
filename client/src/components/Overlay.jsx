import React from "react";
import { btnGhost } from '../theme.js';

export function Overlay({ onClose, children, width = "680px", zIndex = 1000 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2rem 1rem", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", width: "100%", maxWidth: width, boxShadow: "0 30px 80px rgba(0,0,0,0.9)", position: "relative", marginTop: "2rem" }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
export function OverlayHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid var(--border)" }}>
      <div>
        <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.15rem", fontWeight: 700 }}>{title}</h2>
        {subtitle && <div style={{ color: "var(--tx3)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>{actions}</div>}
    </div>
  );
}
