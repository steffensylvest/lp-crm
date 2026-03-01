import React from "react";
import { STATUS_PILL_KEY } from '../constants.js';

export function ScoreBadge({ score, size = "sm" }) {
  return <span style={{ background: `var(--sb-${score}-bg)`, color: `var(--sb-${score}-c)`, border: `1px solid var(--sb-${score}-bd)`, borderRadius: "4px", padding: size === "lg" ? "0.3rem 0.8rem" : "0.1rem 0.45rem", fontSize: size === "lg" ? "0.95rem" : "0.72rem", fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{score}</span>;
}
export function StatusPill({ status }) {
  const k = STATUS_PILL_KEY[status] || 3;
  return <span style={{ background: `var(--pill-bg-${k})`, color: `var(--pill-c-${k})`, borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{status}</span>;
}
export function Chip({ label, color, bg, onClick }) {
  const c = color ?? "var(--chip-c)";
  const b = bg ?? "var(--chip-bg)";
  const bdr = (color && /^#/.test(color)) ? `1px solid ${color}25` : "1px solid var(--border)";
  return <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: b, color: c, border: bdr, borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.72rem", fontWeight: 500, cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap" }}>{label}</span>;
}
export function SectorChip({ label, onClick }) {
  return <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", background: "var(--sector-bg)", color: "var(--sector-c)", border: "1px solid var(--sector-bd)", borderRadius: "4px", padding: "0.15rem 0.55rem", fontSize: "0.72rem", fontWeight: 500, cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap" }}>{label}</span>;
}
export function SubStratChip({ label, onClick }) { return <Chip label={label} onClick={onClick} />; }
export function InvestedBadge({ amount, currency }) {
  return <span style={{ background: "var(--invested-bg)", color: "var(--invested-c)", border: "1px solid var(--invested-bd)", borderRadius: "4px", padding: "0.1rem 0.55rem", fontSize: "0.72rem", fontWeight: 600 }}>✓ {amount ? `${currency} ${amount}M` : "Invested"}</span>;
}
