export const DARK = {
  '--bg': '#020617', '--surface': '#0b1120', '--card': '#0f172a',
  '--row': '#080f1e', '--hover': '#141f35', '--subtle': '#1e293b',
  '--border': '#243347', '--border-hi': '#384f68',
  '--tx1': '#f1f5f9', '--tx2': '#a8bbc8', '--tx3': '#7e99ac',
  '--tx4': '#627d92', '--tx5': '#475569',
  // Score badges  A=green · B=cyan · C=amber · D=orange · E=red
  '--sb-A-bg': '#052e16', '--sb-A-c': '#4ade80', '--sb-A-bd': '#4ade8040',
  '--sb-B-bg': '#083344', '--sb-B-c': '#22d3ee', '--sb-B-bd': '#22d3ee40',
  '--sb-C-bg': '#2d2000', '--sb-C-c': '#fbbf24', '--sb-C-bd': '#fbbf2440',
  '--sb-D-bg': '#3d1608', '--sb-D-c': '#fb923c', '--sb-D-bd': '#fb923c40',
  '--sb-E-bg': '#450a0a', '--sb-E-c': '#f87171', '--sb-E-bd': '#f8717140',
  // Status pills
  '--pill-bg-1': '#1e3a5f', '--pill-c-1': '#60a5fa',   // Fundraising
  '--pill-bg-2': '#1c2a40', '--pill-c-2': '#93c5fd',   // Pre-Marketing
  '--pill-bg-3': '#1e293b', '--pill-c-3': '#94a3b8',   // Closed
  '--pill-bg-4': '#14532d', '--pill-c-4': '#4ade80',   // Deployed
  '--pill-bg-5': '#1e293b', '--pill-c-5': '#64748b',   // Monitoring
  '--pill-bg-6': '#451a03', '--pill-c-6': '#fbbf24',   // Exiting
  // Chips
  '--chip-bg': '#1e293b', '--chip-c': '#94a3b8',
  '--sector-bg': '#0c1829', '--sector-c': '#93b4cc', '--sector-bd': '#1a3550',
  '--invested-bg': '#052e16', '--invested-c': '#4ade80', '--invested-bd': '#22c55e40',
  // Pipeline stage columns
  '--pl-watching-bg': '#111827', '--pl-watching-bd': '#2d3748', '--pl-watching-ac': '#9ca3af',
  '--pl-first-look-bg': '#0c1a2e', '--pl-first-look-bd': '#1e3a5f', '--pl-first-look-ac': '#60a5fa',
  '--pl-diligence-bg': '#0c1628', '--pl-diligence-bd': '#1e3349', '--pl-diligence-ac': '#818cf8',
  '--pl-ic-review-bg': '#150e2e', '--pl-ic-review-bd': '#2d1b69', '--pl-ic-review-ac': '#a78bfa',
  '--pl-committed-bg': '#071a0e', '--pl-committed-bd': '#1a4d28', '--pl-committed-ac': '#22c55e',
  '--pl-passed-bg': '#1c0808', '--pl-passed-bd': '#5f1a1a', '--pl-passed-ac': '#f87171',
};
export const LIGHT = {
  '--bg': '#f1f5f9', '--surface': '#ffffff', '--card': '#ffffff',
  '--row': '#f8fafc', '--hover': '#e2e8f0', '--subtle': '#e8eef5',
  '--border': '#d1dae6', '--border-hi': '#94a3b8',
  '--tx1': '#0f172a', '--tx2': '#334155', '--tx3': '#475569',
  '--tx4': '#64748b', '--tx5': '#94a3b8',
  // Score badges  A=green · B=cyan · C=amber · D=orange · E=red
  '--sb-A-bg': '#dcfce7', '--sb-A-c': '#166534', '--sb-A-bd': '#16653440',
  '--sb-B-bg': '#cffafe', '--sb-B-c': '#0e7490', '--sb-B-bd': '#0e749040',
  '--sb-C-bg': '#fef9c3', '--sb-C-c': '#92400e', '--sb-C-bd': '#92400e40',
  '--sb-D-bg': '#ffedd5', '--sb-D-c': '#c2410c', '--sb-D-bd': '#c2410c40',
  '--sb-E-bg': '#fef2f2', '--sb-E-c': '#dc2626', '--sb-E-bd': '#dc262640',
  // Status pills
  '--pill-bg-1': '#dbeafe', '--pill-c-1': '#1d4ed8',   // Fundraising
  '--pill-bg-2': '#eff6ff', '--pill-c-2': '#2563eb',   // Pre-Marketing
  '--pill-bg-3': '#f1f5f9', '--pill-c-3': '#64748b',   // Closed
  '--pill-bg-4': '#dcfce7', '--pill-c-4': '#166534',   // Deployed
  '--pill-bg-5': '#f8fafc', '--pill-c-5': '#64748b',   // Monitoring
  '--pill-bg-6': '#fef9c3', '--pill-c-6': '#92400e',   // Exiting
  // Chips
  '--chip-bg': '#e2e8f0', '--chip-c': '#64748b',
  '--sector-bg': '#e0f2fe', '--sector-c': '#0369a1', '--sector-bd': '#7dd3fc',
  '--invested-bg': '#dcfce7', '--invested-c': '#166534', '--invested-bd': '#16653440',
  // Pipeline stage columns
  '--pl-watching-bg': '#f8fafc', '--pl-watching-bd': '#cbd5e1', '--pl-watching-ac': '#64748b',
  '--pl-first-look-bg': '#eff6ff', '--pl-first-look-bd': '#93c5fd', '--pl-first-look-ac': '#2563eb',
  '--pl-diligence-bg': '#eef2ff', '--pl-diligence-bd': '#a5b4fc', '--pl-diligence-ac': '#4338ca',
  '--pl-ic-review-bg': '#f5f3ff', '--pl-ic-review-bd': '#c4b5fd', '--pl-ic-review-ac': '#7c3aed',
  '--pl-committed-bg': '#f0fdf4', '--pl-committed-bd': '#86efac', '--pl-committed-ac': '#16a34a',
  '--pl-passed-bg': '#fef2f2', '--pl-passed-bd': '#fca5a5', '--pl-passed-ac': '#dc2626',
};

export const IS = { width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx4)", padding: "0.55rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
// Use ISFilled when field has a value — brighter border + text
export const ISFilled = { ...IS, border: "1px solid var(--border-hi)", color: "var(--tx1)" };
export const TA = { ...IS, resize: "vertical", minHeight: "72px" };
export const TAFilled = { ...ISFilled, resize: "vertical", minHeight: "72px" };
export const btnBase = { border: "1px solid var(--border-hi)", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", padding: "0.3rem 0.6rem", background: "none", color: "var(--tx2)" };
export const btnPrimary = { ...btnBase, background: "#1d4ed8", border: "none", color: "#fff", padding: "0.5rem 1.1rem", fontSize: "0.875rem", fontWeight: 600 };
export const btnGhost = { ...btnBase };
export const btnDanger = { ...btnBase, color: "#ef4444" };
