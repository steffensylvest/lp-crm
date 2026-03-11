import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { fmt, fmtM } from "../utils.js";
import { loadMeetings } from "../api.js";
import { ScoreBadge, StatusPill } from "./Badges.jsx";
import { ScorePicker, StatusPicker, OwnerPicker, StagePicker, StrategyPicker, SubStrategyPicker } from "./Pickers.jsx";
import { PIPELINE_STAGES, CURRENCIES } from "../constants.js";

// ─── FX Rates (approximate, EUR base) ─────────────────────────────────────────
const EUR_RATE = {
  EUR: 1, USD: 0.92, GBP: 1.16, CHF: 1.03,
  SEK: 0.088, NOK: 0.086, DKK: 0.134,
  JPY: 0.0061, AUD: 0.59, CAD: 0.68,
  SGD: 0.69, HKD: 0.12,
};
function toEur(amount, currency) {
  if (!amount) return null;
  const rate = EUR_RATE[currency] ?? 1;
  return parseFloat(amount) * rate;
}
function fmtEur(amount, currency) {
  const eur = toEur(amount, currency);
  if (!eur) return null;
  if (eur >= 1000) return `€${(eur / 1000).toFixed(1)}B`;
  return `€${Math.round(eur)}M`;
}

// ─── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { id: "fund",          label: "Fund",             w: 200, sticky: true  },
  { id: "gp",            label: "GP",               w: 150 },
  { id: "series",        label: "Fund Series",      w: 150 },
  { id: "vintage",       label: "Vintage",          w: 70,  align: "center" },
  { id: "assetClass",    label: "Asset Class",      w: 135 },
  { id: "strategy",      label: "Strategy",         w: 155 },
  { id: "subStrategy",   label: "Sub-Strategy",     w: 165 },
  { id: "targetMarkets", label: "Target Market",    w: 130 },
  { id: "impact",        label: "Impact",           w: 62,  align: "center" },
  { id: "sectors",       label: "Sectors",          w: 175 },
  { id: "subSectors",    label: "Sub-Sectors",      w: 120 },
  { id: "geographies",   label: "Geography",        w: 130 },
  { id: "currency",      label: "Currency",         w: 78,  align: "center" },
  { id: "targetSize",    label: "Fund Target",      w: 110, align: "right" },
  { id: "targetEur",     label: "Target (EUR)",     w: 110, align: "right" },
  { id: "hardCap",       label: "Hard Cap",         w: 100, align: "right" },
  { id: "raisedSize",    label: "Raised",           w: 100, align: "right" },
  { id: "raisedDate",    label: "Raised Date",      w: 100 },
  { id: "lastMtg",       label: "Last Meeting",     w: 120 },
  { id: "status",        label: "Status",           w: 120 },
  { id: "firstClose",    label: "1st Close",        w: 100 },
  { id: "nextClose",     label: "Next Close",       w: 100 },
  { id: "finalClose",    label: "Final Close",      w: 100 },
  { id: "score",         label: "Score",            w: 62,  align: "center" },
  { id: "pipeline",      label: "Pipeline",         w: 130 },
  { id: "owner",         label: "Responsible",      w: 120 },
];

// ─── Cell value extractor (for sorting + filtering) ───────────────────────────
function getCellValue(row, colId) {
  switch (colId) {
    case "gp":            return row.gpName ?? "";
    case "fund":          return row.name ?? "";
    case "series":        return row.series ?? "";
    case "vintage":       return row.vintage ?? null;
    case "assetClass":    return row.assetClass ?? "";
    case "strategy":      return row.strategy ?? "";
    case "subStrategy":   return row.subStrategy ?? "";
    case "targetMarkets": return row.targetMarkets ?? [];
    case "impact":        return row.impactFlag ? "Yes" : "No";
    case "sectors":       return row.sectors ?? [];
    case "subSectors":    return [];
    case "geographies":   return row.geographies ?? [];
    case "currency":      return row.currency ?? "";
    case "targetSize":    return row.targetSize ? parseFloat(row.targetSize) : null;
    case "targetEur":     return toEur(row.targetSize, row.currency);
    case "hardCap":       return row.hardCap ? parseFloat(row.hardCap) : null;
    case "raisedSize":    return row.raisedSize ? parseFloat(row.raisedSize) : null;
    case "raisedDate":    return row.raisedDate ?? "";
    case "lastMtg":       return row._lastMtgDate ?? "";
    case "status":        return row.status ?? "";
    case "firstClose":    return row.firstCloseDate ?? "";
    case "nextClose":     return row.nextCloseDate ?? "";
    case "finalClose":    return row.finalCloseDate ?? "";
    case "score":         return row.score ?? "";
    case "pipeline":      return row._pipelineStage?.label ?? row._pipelineStage?.code ?? "";
    case "owner":         return row.owner ?? "";
    default:              return "";
  }
}

// ─── useOutsideClick (accepts single ref or array of refs) ────────────────────
function useOutsideClick(refs, cb) {
  useEffect(() => {
    const refsArr = Array.isArray(refs) ? refs : [refs];
    const handler = (e) => {
      if (refsArr.every(r => !r.current?.contains(e.target))) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [refs, cb]);
}

// ─── ColumnFilter component (portal-based dropdown) ───────────────────────────
function ColumnFilter({ colId, rows, filters, onFiltersChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState(null);
  const triggerRef = useRef();
  const portalRef = useRef();
  useOutsideClick([triggerRef, portalRef], useCallback(() => setOpen(false), []));

  const allValues = useMemo(() => {
    const vals = new Set();
    rows.forEach(row => {
      const v = getCellValue(row, colId);
      if (Array.isArray(v)) v.forEach(i => { if (i) vals.add(String(i)); });
      else if (v !== null && v !== undefined && v !== "") vals.add(String(v));
    });
    return [...vals].sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [rows, colId]);

  const activeFilter = filters[colId];
  const isFiltered = !!activeFilter;
  const selected = activeFilter ?? new Set(allValues);

  const visibleValues = search
    ? allValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
    : allValues;

  function toggle(v, checked) {
    const next = new Set(selected);
    if (checked) next.add(v); else next.delete(v);
    onFiltersChange(colId, next.size === 0 ? new Set() : next.size === allValues.length ? undefined : next);
  }

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  if (allValues.length === 0) return null;

  return (
    <div style={{ display: "inline-block", marginLeft: "2px" }}>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        title="Filter column"
        style={{
          background: isFiltered ? "#3b82f620" : "transparent",
          border: "none", cursor: "pointer", padding: "1px 3px",
          color: isFiltered ? "#60a5fa" : "var(--tx5)",
          fontSize: "0.6rem", borderRadius: "3px", lineHeight: 1,
        }}>
        {isFiltered ? "▼●" : "▼"}
      </button>
      {open && pos && createPortal(
        <div
          ref={portalRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 9000,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            minWidth: "180px", maxWidth: "260px",
            padding: "0.5rem",
          }}>
          {allValues.length > 8 && (
            <input
              autoFocus
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", marginBottom: "0.35rem", padding: "0.25rem 0.4rem", fontSize: "0.72rem", background: "var(--row)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--tx1)", boxSizing: "border-box" }}
            />
          )}
          <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.35rem" }}>
            <button onClick={() => onFiltersChange(colId, undefined)} style={{ fontSize: "0.65rem", background: "none", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.1rem 0.4rem", cursor: "pointer", color: "var(--tx3)" }}>All</button>
            <button onClick={() => onFiltersChange(colId, new Set())} style={{ fontSize: "0.65rem", background: "none", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.1rem 0.4rem", cursor: "pointer", color: "var(--tx3)" }}>None</button>
          </div>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {visibleValues.map(v => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.15rem 0", cursor: "pointer", fontSize: "0.72rem", color: "var(--tx2)" }}>
                <input type="checkbox" checked={selected.has(v)} onChange={e => toggle(v, e.target.checked)} style={{ accentColor: "#3b82f6", width: "12px", height: "12px", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
              </label>
            ))}
            {visibleValues.length === 0 && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>No matches</span>}
          </div>
        </div>,
        document.getElementById("portal-root") ?? document.body
      )}
    </div>
  );
}

// ─── Main PipelineView ────────────────────────────────────────────────────────
export function PipelineView({
  organizations,
  onFundClick,
  onGpClick,
  onUpdateFund,
  onMeetingClick,
  owners = [],
}) {
  const [allMeetings, setAllMeetings] = useState(null);
  const [sortKeys, setSortKeys] = useState([{ col: "gp", dir: "asc" }]);
  const [filters, setFilters]     = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowId, col }
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadMeetings()
      .then(ms => { if (!cancelled) setAllMeetings(ms ?? []); })
      .catch(() => { if (!cancelled) setAllMeetings([]); });
    return () => { cancelled = true; };
  }, []);

  // ── Flatten all funds ─────────────────────────────────────────────────────
  const allFunds = useMemo(() => {
    const rows = [];
    (organizations || []).forEach(org => {
      (org.funds || []).forEach(f => {
        rows.push({ ...f, gpName: org.name, gpId: org.id, _org: org });
      });
    });
    return rows;
  }, [organizations]);

  // ── Annotate each fund with fund-series-scoped meeting data ───────────────
  const rows = useMemo(() => {
    if (!allMeetings) return allFunds.map(f => ({ ...f, _lastMtgDate: null, _seriesMtgCount: 0, _lastMtgObj: null }));

    // fund_id → meetings map
    const fundMtgs = {};
    allMeetings.forEach(m => {
      (m.entities || []).forEach(e => {
        if (e.entity_type === "fund") {
          if (!fundMtgs[e.entity_id]) fundMtgs[e.entity_id] = [];
          fundMtgs[e.entity_id].push(m);
        }
      });
    });

    // series key → fund IDs (group by series label, not strategy)
    const seriesFundMap = {};
    allFunds.forEach(f => {
      const key = f.series || `__solo_${f.id}`;
      if (!seriesFundMap[key]) seriesFundMap[key] = [];
      seriesFundMap[key].push(f.id);
    });

    return allFunds.map(f => {
      const seriesKey = f.series || `__solo_${f.id}`;
      const seriesFundIds = seriesFundMap[seriesKey] ?? [f.id];
      const seriesMtgs = seriesFundIds.flatMap(fid => fundMtgs[fid] ?? []);
      // Deduplicate by meeting id
      const unique = [...new Map(seriesMtgs.map(m => [m.id, m])).values()];
      const sorted = unique.sort((a, b) => new Date(b.date) - new Date(a.date));
      return {
        ...f,
        _lastMtgDate: sorted[0]?.date ?? null,
        _seriesMtgCount: sorted.length,
        _lastMtgObj: sorted[0] ?? null,
      };
    });
  }, [allFunds, allMeetings]);

  // ── Global text search ────────────────────────────────────────────────────
  const afterSearch = useMemo(() => {
    if (!globalSearch.trim()) return rows;
    const s = globalSearch.toLowerCase();
    return rows.filter(f =>
      (f.gpName ?? "").toLowerCase().includes(s) ||
      (f.name ?? "").toLowerCase().includes(s) ||
      (f.series ?? "").toLowerCase().includes(s) ||
      (f.strategy ?? "").toLowerCase().includes(s) ||
      (f.subStrategy ?? "").toLowerCase().includes(s) ||
      (f.assetClass ?? "").toLowerCase().includes(s) ||
      (f.sectors ?? []).some(sec => sec.toLowerCase().includes(s)) ||
      (f.owner ?? "").toLowerCase().includes(s)
    );
  }, [rows, globalSearch]);

  // ── Column filters ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return afterSearch.filter(row =>
      Object.entries(filters).every(([colId, allowed]) => {
        if (!allowed) return true;
        if (allowed.size === 0) return false;
        const v = getCellValue(row, colId);
        if (Array.isArray(v)) return v.some(x => allowed.has(String(x)));
        return allowed.has(String(v ?? ""));
      })
    );
  }, [afterSearch, filters]);

  // ── Multi-column sort ─────────────────────────────────────────────────────
  const scoreOrder = { A: 0, B: 1, C: 2, D: 3, E: 4, U: 5 };
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      for (const { col, dir } of sortKeys) {
        const mult = dir === "asc" ? 1 : -1;

        if (col === "score") {
          const va = scoreOrder[a.score] ?? 9;
          const vb = scoreOrder[b.score] ?? 9;
          const cmp = (va - vb) * mult;
          if (cmp !== 0) return cmp;
          continue;
        }

        let va = getCellValue(a, col);
        let vb = getCellValue(b, col);
        if (Array.isArray(va)) va = va[0] ?? "";
        if (Array.isArray(vb)) vb = vb[0] ?? "";

        const aEmpty = va === null || va === undefined || va === "";
        const bEmpty = vb === null || vb === undefined || vb === "";
        if (aEmpty && bEmpty) continue;
        if (aEmpty) return 1;
        if (bEmpty) return -1;

        let cmp;
        if (typeof va === "number" && typeof vb === "number") cmp = (va - vb) * mult;
        else cmp = String(va).localeCompare(String(vb)) * mult;
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }, [filtered, sortKeys]);

  // Shift-click to add secondary/tertiary sort; plain click resets
  const handleSort = useCallback((e, colId) => {
    if (e.shiftKey) {
      setSortKeys(prev => {
        const idx = prev.findIndex(k => k.col === colId);
        if (idx >= 0) {
          return prev.map((k, i) => i === idx ? { ...k, dir: k.dir === "asc" ? "desc" : "asc" } : k);
        }
        if (prev.length >= 3) return prev;
        return [...prev, { col: colId, dir: "asc" }];
      });
    } else {
      setSortKeys(prev => {
        if (prev.length === 1 && prev[0].col === colId) {
          return [{ col: colId, dir: prev[0].dir === "asc" ? "desc" : "asc" }];
        }
        return [{ col: colId, dir: "asc" }];
      });
    }
  }, []);

  const handleFiltersChange = (colId, newVal) => {
    setFilters(prev => {
      const next = { ...prev };
      if (newVal === undefined) delete next[colId];
      else next[colId] = newVal;
      return next;
    });
  };

  const clearAllFilters = () => setFilters({});
  const activeFilterCount = Object.keys(filters).length;

  // ── Styles ────────────────────────────────────────────────────────────────
  const td = {
    padding: "0.28rem 0.55rem",
    fontSize: "0.72rem",
    borderBottom: "1px solid var(--border)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    height: "36px",
    maxHeight: "36px",
  };

  const inpStyle = {
    background: "var(--card)",
    border: "1px solid #3b82f6",
    borderRadius: "3px",
    padding: "0.1rem 0.3rem",
    fontSize: "0.72rem",
    color: "var(--tx1)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const stickyLeft = (() => {
    const m = {};
    let x = 0;
    COLS.forEach(c => { if (c.sticky) { m[c.id] = x; x += c.w; } });
    return m;
  })();

  const thStyle = (col) => {
    const sortIdx = sortKeys.findIndex(k => k.col === col.id);
    const isSorted = sortIdx >= 0;
    return {
      padding: "0.35rem 0.55rem",
      fontSize: "0.63rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: isSorted ? "var(--tx1)" : "var(--tx4)",
      background: "var(--row)",
      borderBottom: "1px solid var(--border)",
      whiteSpace: "nowrap",
      textAlign: col.align || "left",
      userSelect: "none",
      cursor: "pointer",
      position: "sticky",
      top: 0,
      zIndex: col.sticky ? 5 : 2,
      ...(col.sticky ? { left: stickyLeft[col.id], boxShadow: Object.keys(stickyLeft).at(-1) === col.id ? "2px 0 4px rgba(0,0,0,0.15)" : "none" } : {}),
      minWidth: `${col.w}px`,
    };
  };

  // ── Click-to-edit helpers ─────────────────────────────────────────────────
  const isEditing = (rowId, col) => editingCell?.rowId === rowId && editingCell?.col === col;
  const startEdit = (e, rowId, col) => {
    e.stopPropagation();
    if (onUpdateFund) setEditingCell({ rowId, col });
  };
  const stopEdit = () => setEditingCell(null);

  // ── Render a single cell ──────────────────────────────────────────────────
  function renderCell(f, colId) {
    switch (colId) {
      case "gp":
        return (
          <span
            onClick={e => { e.stopPropagation(); onGpClick && onGpClick(f._org); }}
            style={{ fontWeight: 600, color: "var(--tx1)", cursor: "pointer", textDecoration: "underline dotted", textDecorationColor: "var(--tx5)", textUnderlineOffset: "2px" }}>
            {f.gpName}
          </span>
        );
      case "fund":
        return <span style={{ color: "var(--tx2)", fontWeight: 500 }}>{f.name}</span>;
      case "series":
        return <span style={{ color: "var(--tx4)" }}>{f.series || "—"}</span>;

      case "vintage":
        if (isEditing(f.id, "vintage")) {
          return (
            <input
              autoFocus
              style={{ ...inpStyle, width: "55px", textAlign: "center" }}
              defaultValue={f.vintage || ""}
              onBlur={e => { const v = e.target.value.trim(); if (v !== (f.vintage || "")) onUpdateFund(f, { vintage: v }); stopEdit(); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { stopEdit(); } e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "vintage")}
            style={{ color: "var(--tx3)", cursor: onUpdateFund ? "text" : "default" }}>
            {f.vintage || "—"}
          </span>
        );

      case "assetClass":
        return <span style={{ color: "var(--tx3)" }}>{f.assetClass || "—"}</span>;

      case "strategy":
        if (isEditing(f.id, "strategy") && onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <StrategyPicker strategy={f.strategy} onChange={v => { onUpdateFund(f, { strategy: v }); stopEdit(); }} onClose={stopEdit} />
            </div>
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "strategy")}
            style={{ color: "var(--tx2)", cursor: onUpdateFund ? "pointer" : "default" }}>
            {f.strategy || "—"}
          </span>
        );

      case "subStrategy":
        if (isEditing(f.id, "subStrategy") && onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <SubStrategyPicker strategy={f.strategy} subStrategy={f.subStrategy} onChange={v => { onUpdateFund(f, { subStrategy: v, sub_strategy: v }); stopEdit(); }} onClose={stopEdit} />
            </div>
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "subStrategy")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "pointer" : "default" }}>
            {f.subStrategy || "—"}
          </span>
        );

      case "targetMarkets":
        return <span style={{ color: "var(--tx4)" }}>{(f.targetMarkets || []).join(", ") || "—"}</span>;

      case "impact":
        return f.impactFlag
          ? (
            <span
              onClick={e => { e.stopPropagation(); onUpdateFund && onUpdateFund(f, { impactFlag: false, impact_flag: false }); }}
              title="Click to remove ESG flag"
              style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.7rem", cursor: onUpdateFund ? "pointer" : "default" }}>
              ESG
            </span>
          ) : (
            <span
              onClick={e => { e.stopPropagation(); onUpdateFund && onUpdateFund(f, { impactFlag: true, impact_flag: true }); }}
              title="Click to add ESG flag"
              style={{ color: "var(--tx5)", cursor: onUpdateFund ? "pointer" : "default" }}>
              —
            </span>
          );

      case "sectors":
        return (
          <span style={{ color: "var(--tx3)" }}>
            {(f.sectors || []).slice(0, 2).join(", ")}
            {(f.sectors || []).length > 2 && <span style={{ color: "var(--tx5)" }}> +{f.sectors.length - 2}</span>}
            {!(f.sectors || []).length && "—"}
          </span>
        );
      case "subSectors":
        return <span style={{ color: "var(--tx5)" }}>—</span>;
      case "geographies":
        return (
          <span style={{ color: "var(--tx4)" }}>
            {(f.geographies || []).slice(0, 2).join(", ") || "—"}
          </span>
        );

      case "currency":
        if (isEditing(f.id, "currency") && onUpdateFund) {
          return (
            <select
              autoFocus
              style={{ ...inpStyle, padding: "0.1rem 0.15rem", textAlign: "center", cursor: "pointer" }}
              value={f.currency || ""}
              onChange={e => { e.stopPropagation(); onUpdateFund(f, { currency: e.target.value }); stopEdit(); }}
              onBlur={stopEdit}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            >
              <option value="">—</option>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "currency")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "pointer" : "default" }}>
            {f.currency || "—"}
          </span>
        );

      case "targetSize":
        if (isEditing(f.id, "targetSize")) {
          return (
            <input
              autoFocus
              style={{ ...inpStyle, textAlign: "right" }}
              defaultValue={f.targetSize || ""}
              placeholder="M"
              onBlur={e => { const v = e.target.value.trim(); onUpdateFund(f, { targetSize: v, target_size: v }); stopEdit(); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "targetSize")}
            style={{ color: "var(--tx3)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmtM(f.targetSize, f.currency) ?? "—"}
          </span>
        );

      case "targetEur": {
        const eur = fmtEur(f.targetSize, f.currency);
        return <span style={{ color: "var(--tx4)" }}>{eur ?? "—"}</span>;
      }

      case "hardCap":
        if (isEditing(f.id, "hardCap")) {
          return (
            <input
              autoFocus
              style={{ ...inpStyle, textAlign: "right" }}
              defaultValue={f.hardCap || ""}
              placeholder="M"
              onBlur={e => { const v = e.target.value.trim(); onUpdateFund(f, { hardCap: v, hard_cap: v }); stopEdit(); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "hardCap")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmtM(f.hardCap, f.currency) ?? "—"}
          </span>
        );

      case "raisedSize":
        if (isEditing(f.id, "raisedSize")) {
          return (
            <input
              autoFocus
              style={{ ...inpStyle, textAlign: "right" }}
              defaultValue={f.raisedSize || ""}
              placeholder="M"
              onBlur={e => { const v = e.target.value.trim(); onUpdateFund(f, { raisedSize: v, raised_size: v }); stopEdit(); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "raisedSize")}
            style={{ color: "var(--tx3)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmtM(f.raisedSize, f.currency) ?? "—"}
          </span>
        );

      case "raisedDate":
        if (isEditing(f.id, "raisedDate")) {
          return (
            <input
              autoFocus
              type="date"
              style={{ ...inpStyle, colorScheme: "dark" }}
              defaultValue={f.raisedDate || ""}
              onBlur={e => { onUpdateFund(f, { raisedDate: e.target.value, raised_date: e.target.value }); stopEdit(); }}
              onChange={e => { e.stopPropagation(); onUpdateFund(f, { raisedDate: e.target.value, raised_date: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "raisedDate")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmt(f.raisedDate) ?? "—"}
          </span>
        );

      case "lastMtg": {
        const count = f._seriesMtgCount || 0;
        const last = f._lastMtgDate;
        if (!count) return <span style={{ color: "var(--tx5)" }}>—</span>;
        return (
          <span style={{ color: "var(--tx3)", fontSize: "0.68rem" }}>
            <span style={{ fontWeight: 600, color: "var(--tx2)" }}>{count}</span>
            {last && (
              <span
                onClick={e => { e.stopPropagation(); f._lastMtgObj && onMeetingClick && onMeetingClick(f._lastMtgObj, f._org); }}
                style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: "2px" }}>
                {" · "}{fmt(last)}
              </span>
            )}
          </span>
        );
      }

      case "status":
        if (onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <StatusPicker status={f.status} onChange={v => onUpdateFund(f, { status: v })} />
            </div>
          );
        }
        return f.status ? <StatusPill status={f.status} /> : <span style={{ color: "var(--tx5)" }}>—</span>;

      case "firstClose":
        if (isEditing(f.id, "firstClose")) {
          return (
            <input
              autoFocus
              type="date"
              style={{ ...inpStyle, colorScheme: "dark" }}
              defaultValue={f.firstCloseDate || ""}
              onBlur={e => { onUpdateFund(f, { firstCloseDate: e.target.value, first_close_date: e.target.value }); stopEdit(); }}
              onChange={e => { e.stopPropagation(); onUpdateFund(f, { firstCloseDate: e.target.value, first_close_date: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "firstClose")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmt(f.firstCloseDate) ?? "—"}
          </span>
        );

      case "nextClose":
        if (isEditing(f.id, "nextClose")) {
          return (
            <input
              autoFocus
              type="date"
              style={{ ...inpStyle, colorScheme: "dark" }}
              defaultValue={f.nextCloseDate || ""}
              onBlur={e => { onUpdateFund(f, { nextCloseDate: e.target.value, next_close_date: e.target.value }); stopEdit(); }}
              onChange={e => { e.stopPropagation(); onUpdateFund(f, { nextCloseDate: e.target.value, next_close_date: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "nextClose")}
            style={{ color: "var(--tx4)", fontWeight: f.nextCloseDate ? 500 : 400, cursor: onUpdateFund ? "text" : "default" }}>
            {fmt(f.nextCloseDate) ?? "—"}
          </span>
        );

      case "finalClose":
        if (isEditing(f.id, "finalClose")) {
          return (
            <input
              autoFocus
              type="date"
              style={{ ...inpStyle, colorScheme: "dark" }}
              defaultValue={f.finalCloseDate || ""}
              onBlur={e => { onUpdateFund(f, { finalCloseDate: e.target.value, final_close_date: e.target.value }); stopEdit(); }}
              onChange={e => { e.stopPropagation(); onUpdateFund(f, { finalCloseDate: e.target.value, final_close_date: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === "Escape") stopEdit(); e.stopPropagation(); }}
            />
          );
        }
        return (
          <span
            onClick={e => startEdit(e, f.id, "finalClose")}
            style={{ color: "var(--tx4)", cursor: onUpdateFund ? "text" : "default" }}>
            {fmt(f.finalCloseDate) ?? "—"}
          </span>
        );

      case "score":
        if (onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <ScorePicker score={f.score} onChange={v => onUpdateFund(f, { score: v })} />
            </div>
          );
        }
        return <ScoreBadge score={f.score} />;

      case "pipeline": {
        const stage = f._pipelineStage;
        if (onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <StagePicker
                stage={f._pipelineStage?.code ?? null}
                onChange={v => onUpdateFund(f, { pipeline_stage_id: v, _pipelineStage: PIPELINE_STAGES.find(s => s.id === v) ?? null })}
              />
            </div>
          );
        }
        if (!stage) return <span style={{ color: "var(--tx5)" }}>—</span>;
        return (
          <span style={{ background: stage.bg ?? "var(--subtle)", color: stage.ac ?? "var(--tx2)", border: `1px solid ${stage.bd ?? "var(--border)"}`, borderRadius: "3px", padding: "0.05rem 0.4rem", fontSize: "0.67rem", whiteSpace: "nowrap" }}>
            {stage.label}
          </span>
        );
      }

      case "owner":
        if (onUpdateFund) {
          return (
            <div onClick={e => e.stopPropagation()}>
              <OwnerPicker owner={f.owner} owners={owners} onChange={v => onUpdateFund(f, { owner: v })} />
            </div>
          );
        }
        return f.owner
          ? <span style={{ background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.05rem 0.3rem", fontSize: "0.65rem", color: "var(--tx4)" }}>{f.owner}</span>
          : <span style={{ color: "var(--tx5)" }}>—</span>;

      default:
        return "—";
    }
  }

  const totalWidth = COLS.reduce((s, c) => s + c.w, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <input
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          placeholder="Search funds, GPs, strategy…"
          style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px",
            padding: "0.35rem 0.7rem", fontSize: "0.8rem", color: "var(--tx1)",
            width: "240px", outline: "none",
          }}
        />
        <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>
          <strong style={{ color: "var(--tx2)" }}>{sorted.length}</strong> fund{sorted.length !== 1 ? "s" : ""}
          {sorted.length !== rows.length && ` of ${rows.length}`}
        </span>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            style={{ background: "#3b82f620", border: "1px solid #3b82f660", borderRadius: "4px", color: "#60a5fa", padding: "0.2rem 0.55rem", fontSize: "0.7rem", cursor: "pointer" }}>
            ✕ Clear {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
          </button>
        )}
        {sortKeys.length > 1 && (
          <button
            onClick={() => setSortKeys([sortKeys[0]])}
            style={{ background: "#a78bfa20", border: "1px solid #7c3aed60", borderRadius: "4px", color: "#a78bfa", padding: "0.2rem 0.55rem", fontSize: "0.7rem", cursor: "pointer" }}>
            ✕ Clear {sortKeys.length - 1} extra sort{sortKeys.length > 2 ? "s" : ""}
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {allMeetings === null && (
            <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>Loading meetings…</span>
          )}
          {sortKeys.length > 1 && (
            <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>
              Shift+click headers to add sort levels
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "10px", minHeight: 0 }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", minWidth: `${totalWidth}px`, width: "100%" }}>
          <colgroup>
            {COLS.map(c => <col key={c.id} style={{ width: `${c.w}px`, minWidth: `${c.w}px` }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLS.map(col => {
                const sortIdx = sortKeys.findIndex(k => k.col === col.id);
                const isSorted = sortIdx >= 0;
                const sortDir = isSorted ? sortKeys[sortIdx].dir : null;
                return (
                  <th key={col.id} onClick={e => handleSort(e, col.id)} style={thStyle(col)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "2px", justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start" }}>
                      <span>{col.label}</span>
                      {isSorted && (
                        <span style={{ fontSize: "0.55rem", display: "inline-flex", alignItems: "center", gap: "1px" }}>
                          {sortDir === "asc" ? "↑" : "↓"}
                          {sortKeys.length > 1 && <sup style={{ fontSize: "0.5rem", lineHeight: 1 }}>{sortIdx + 1}</sup>}
                        </span>
                      )}
                      <ColumnFilter
                        colId={col.id}
                        rows={rows}
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <tr
                key={f.id}
                onClick={() => onFundClick && onFundClick(f, f._org)}
                style={{ cursor: "pointer", background: i % 2 === 0 ? "var(--row)" : "transparent" }}
                onMouseEnter={e => { Array.from(e.currentTarget.cells).forEach(c => { c.style.background = "var(--hover)"; }); }}
                onMouseLeave={e => { Array.from(e.currentTarget.cells).forEach((c, ci) => { const col = COLS[ci]; c.style.background = col?.sticky ? (i % 2 === 0 ? "var(--row)" : "var(--bg)") : ""; }); }}
              >
                {COLS.map(col => (
                  <td
                    key={col.id}
                    style={{
                      ...td,
                      textAlign: col.align || "left",
                      maxWidth: `${col.w}px`,
                      ...(col.sticky ? {
                        position: "sticky",
                        left: stickyLeft[col.id],
                        zIndex: 1,
                        background: i % 2 === 0 ? "var(--row)" : "var(--bg)",
                        boxShadow: Object.keys(stickyLeft).at(-1) === col.id ? "2px 0 4px rgba(0,0,0,0.12)" : "none",
                      } : {}),
                    }}>
                    {renderCell(f, col.id)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{ ...td, textAlign: "center", color: "var(--tx4)", padding: "3rem" }}>
                  No funds match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sort hint */}
      {sortKeys.length === 1 && (
        <div style={{ textAlign: "right", color: "var(--tx5)", fontSize: "0.65rem", paddingTop: "0.3rem" }}>
          Shift+click a column header to add a secondary sort
        </div>
      )}
    </div>
  );
}
