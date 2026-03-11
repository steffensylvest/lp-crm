import React, { useState, useEffect } from "react";
import { PIPELINE_STAGES } from '../constants.js';
import { fmt, fmtM } from '../utils.js';
import { ScoreBadge, StatusPill } from './Badges.jsx';
import { ScorePicker, StatusPicker, OwnerPicker, StagePicker } from './Pickers.jsx';
import { patchOrganizationField } from '../api.js';

const COL = {
  name:     { label: "Name",         w: "auto",   align: "left"  },
  score:    { label: "Score",        w: "58px",   align: "center"},
  status:   { label: "Status",       w: "110px",  align: "left"  },
  pipeline: { label: "Pipeline",     w: "110px",  align: "left"  },
  strategy: { label: "Strategy",     w: "120px",  align: "left"  },
  substrat: { label: "Sub-Strategy", w: "120px",  align: "left"  },
  vintage:  { label: "Vintage",      w: "68px",   align: "center"},
  size:     { label: "Fund Size",     w: "120px",  align: "right" },
  mtgs:     { label: "Mtgs",         w: "50px",   align: "center"},
  last:     { label: "Last Meeting", w: "110px",  align: "left"  },
};

export function DenseTable({ filtered, allGps, pipeline = [], onGpClick, onFundClick, onMeetingClick, autoExpand, onUpdateGP, onUpdatePipeline, owners = [], placementAgents = [], onPaClick }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [sortCol, setSortCol] = useState("score");
  const [sortDir, setSortDir] = useState("asc");
  const [globalExpand, setGlobalExpand] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Reset focus when filtered list changes
  useEffect(() => { setFocusedIdx(null); }, [filtered]);

  // When search/filter active, auto-expand all
  useEffect(() => {
    if (autoExpand) {
      setExpanded(new Set(filtered.map(g => g.id)));
    }
  }, [autoExpand, filtered]);

  const toggleGP = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (globalExpand) { setExpanded(new Set()); setGlobalExpand(false); }
    else { setExpanded(new Set(filtered.map(g => g.id))); setGlobalExpand(true); }
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const scoreOrder = { A: 0, B: 1, C: 2, D: 3, E: 4 };
  const sorted = [...filtered].sort((a, b) => {
    let va, vb;
    if (sortCol === "score")   { va = scoreOrder[a.score] ?? 9; vb = scoreOrder[b.score] ?? 9; }
    else if (sortCol === "name") { va = a.name; vb = b.name; return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
    else if (sortCol === "mtgs") { va = (a.meetings||[]).length; vb = (b.meetings||[]).length; }
    else if (sortCol === "last") {
      const la = [...(a.meetings||[])].sort((x,y)=>new Date(y.date)-new Date(x.date))[0]?.date || "";
      const lb = [...(b.meetings||[])].sort((x,y)=>new Date(y.date)-new Date(x.date))[0]?.date || "";
      return sortDir === "asc" ? la.localeCompare(lb) : lb.localeCompare(la);
    }
    else return 0;
    return sortDir === "asc" ? va - vb : vb - va;
  });

  // Flat list of visible rows for keyboard navigation
  const visibleRows = [];
  sorted.forEach(gp => {
    visibleRows.push({ type: "gp", id: gp.id, gp });
    if (expanded.has(gp.id)) {
      (gp.funds || []).forEach(f => visibleRows.push({ type: "fund", id: f.id, gp, fund: f }));
    }
  });

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx(i => i === null ? 0 : Math.min(i + 1, visibleRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(i => Math.max((i ?? 1) - 1, 0));
    } else if (e.key === "Enter" && focusedIdx !== null) {
      e.preventDefault();
      const row = visibleRows[focusedIdx];
      if (!row) return;
      if (row.type === "gp") onGpClick(row.gp);
      else if (!editMode) onFundClick(row.fund, row.gp);
    } else if ((e.key === " " || e.key === "ArrowRight") && focusedIdx !== null) {
      const row = visibleRows[focusedIdx];
      if (row?.type !== "gp") return;
      e.preventDefault();
      if (!expanded.has(row.gp.id)) toggleGP(row.gp.id);
    } else if (e.key === "ArrowLeft" && focusedIdx !== null) {
      const row = visibleRows[focusedIdx];
      if (!row) return;
      e.preventDefault();
      if (row.type === "fund") {
        const gpIdx = visibleRows.findIndex(r => r.type === "gp" && r.id === row.gp.id);
        setFocusedIdx(gpIdx >= 0 ? gpIdx : focusedIdx);
        if (expanded.has(row.gp.id)) toggleGP(row.gp.id);
      } else if (row.type === "gp" && expanded.has(row.gp.id)) {
        toggleGP(row.gp.id);
      }
    }
  };

  const TH = ({ col, children, sticky }) => {
    const active = sortCol === col;
    return (
      <th onClick={() => handleSort(col)} style={{
        width: COL[col]?.w, minWidth: COL[col]?.w,
        textAlign: COL[col]?.align || "left",
        padding: "0.5rem 0.75rem",
        color: active ? "var(--tx1)" : "var(--tx4)",
        fontSize: "0.68rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.07em",
        whiteSpace: "nowrap", cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: "var(--row)",
        userSelect: "none",
        position: "sticky", top: 0, zIndex: sticky ? 4 : 2,
        ...(sticky ? { left: 0 } : {}),
      }}>
        {children}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  };

  const tdBase = { padding: "0.42rem 0.75rem", fontSize: "0.8rem", borderBottom: "1px solid var(--border)", verticalAlign: "middle" };
  const tdStickyBase = { position: "sticky", left: 0, zIndex: 1 };

  // Helper: update a single fund within its GP
  const patchFund = (gp, fundId, patch) => {
    if (!onUpdateGP) return;
    onUpdateGP({ ...gp, funds: (gp.funds || []).map(f => f.id === fundId ? { ...f, ...patch } : f) });
  };

  if (filtered.length === 0 && placementAgents.length === 0) return (
    <div style={{ textAlign: "center", color: "var(--tx4)", padding: "4rem" }}>No results found.</div>
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Table toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "0.6rem 0.75rem", background: "var(--row)", borderBottom: "1px solid var(--border)", gap: "0.75rem" }}>
        <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>
          <strong style={{ color: "var(--tx2)" }}>{filtered.length}</strong> GP{filtered.length !== 1 ? "s" : ""}
          {" · "}
          <strong style={{ color: "var(--tx2)" }}>{filtered.reduce((s, g) => s + (g.funds||[]).length, 0)}</strong> funds
        </span>
        <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "0.5rem" }}>↑↓ navigate · Enter open · ← collapse</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setEditMode(m => !m)}
            style={{ background: editMode ? "#1d4ed820" : "none", border: `1px solid ${editMode ? "#3b82f6" : "var(--border)"}`, borderRadius: "5px", color: editMode ? "#60a5fa" : "var(--tx4)", padding: "0.2rem 0.6rem", fontSize: "0.7rem", cursor: "pointer", fontWeight: editMode ? 600 : 400 }}>
            {editMode ? "✓ Done editing" : "✏ Edit"}
          </button>
          <button onClick={toggleAll}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--tx4)", padding: "0.2rem 0.55rem", fontSize: "0.7rem", cursor: "pointer" }}>
            {globalExpand ? "⊟ Collapse all" : "⊞ Expand all"}
          </button>
        </div>
      </div>

      {/* Scrollable table */}
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: "300px", outline: "none" }}
      >
        <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ minWidth: "180px", width: "auto" }} />
            <col style={{ width: "58px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "68px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "50px" }} />
            <col style={{ width: "110px" }} />
          </colgroup>
          <thead>
            <tr>
              <TH col="name" sticky>Name</TH>
              <TH col="score">Score</TH>
              <TH col="status">Status</TH>
              <TH col="pipeline">Pipeline</TH>
              <TH col="strategy">Strategy</TH>
              <TH col="substrat">Sub-Strategy</TH>
              <TH col="vintage">Vintage</TH>
              <TH col="size">Fund Size</TH>
              <TH col="mtgs">Mtgs</TH>
              <TH col="last">Last Meeting</TH>
            </tr>
          </thead>
          <tbody>
            {sorted.map(gp => {
              const funds = gp.funds || [];
              const meetings = gp.meetings || [];
              const isOpen = expanded.has(gp.id);
              const lastMtg = [...meetings].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
              const fundraisingCount = funds.filter(f => f.status === "Fundraising").length;
              const gpStrategies = [...new Set(funds.map(f => f.strategy).filter(Boolean))];
              const gpFocused = focusedIdx !== null && visibleRows[focusedIdx]?.type === "gp" && visibleRows[focusedIdx]?.id === gp.id;

              return (
                <React.Fragment key={gp.id}>
                  {/* ── GP group row ── */}
                  <tr
                    onClick={() => {
                      setFocusedIdx(visibleRows.findIndex(r => r.type === "gp" && r.id === gp.id));
                      toggleGP(gp.id);
                    }}
                    style={{ cursor: "pointer", background: gpFocused ? "var(--subtle)" : "var(--card)" }}
                    onMouseEnter={e => { Array.from(e.currentTarget.cells).forEach(c => { c.style.background = "var(--hover)"; }); }}
                    onMouseLeave={e => { Array.from(e.currentTarget.cells).forEach((c, i) => { c.style.background = i === 0 ? (gpFocused ? "var(--subtle)" : "var(--card)") : (gpFocused ? "var(--subtle)" : ""); }); }}
                  >
                    {/* Name — sticky */}
                    <td style={{ ...tdBase, ...tdStickyBase, paddingLeft: "0.75rem", background: gpFocused ? "var(--subtle)" : "var(--card)", boxShadow: gpFocused ? "inset 3px 0 0 #3b82f6" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, overflow: "hidden" }}>
                        <span style={{ color: "var(--tx5)", fontSize: "0.62rem", flexShrink: 0, width: "10px" }}>
                          {isOpen ? "▼" : "▶"}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--tx1)", fontSize: "0.8375rem", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          onClick={e => { e.stopPropagation(); onGpClick(gp); }}>
                          {gp.name}
                          {gp.hq && <span style={{ color: "var(--tx5)", fontSize: "0.7rem", fontWeight: 400, marginLeft: "0.4rem" }}>{gp.hq}</span>}
                        </span>
                        {/* Owner — picker in edit mode, badge otherwise */}
                        <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                          {editMode && onUpdateGP ? (
                            <OwnerPicker owner={gp.owner} owners={owners} onChange={async v => {
                              onUpdateGP({ ...gp, owner: v });
                              await patchOrganizationField(gp.id, "owner", v || null, null, "Me").catch(console.error);
                            }} />
                          ) : gp.owner ? (
                            <span style={{ background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.05rem 0.3rem", fontSize: "0.62rem", color: "var(--tx4)", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                              {gp.owner}
                            </span>
                          ) : null}
                        </div>
                        {fundraisingCount > 0 && (
                          <span style={{ background: "var(--pill-bg-1)", color: "var(--pill-c-1)", borderRadius: "3px", padding: "0.05rem 0.35rem", fontSize: "0.62rem", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                            {fundraisingCount} ↑
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Score — picker in edit mode */}
                    <td style={{ ...tdBase, textAlign: "center", background: gpFocused ? "var(--subtle)" : "" }}
                      onClick={e => e.stopPropagation()}>
                      {editMode && onUpdateGP
                        ? <ScorePicker score={gp.rating?.code ?? gp.score} onChange={async v => {
                            const ratingId = v ? `li_gp_rating_${v.toLowerCase()}` : null;
                            const updatedRating = ratingId ? { ...(gp.rating ?? {}), id: ratingId, code: v } : null;
                            onUpdateGP({ ...gp, rating_id: ratingId, rating: updatedRating, score: v });
                            await patchOrganizationField(gp.id, "rating_id", ratingId, null, "Me").catch(console.error);
                          }} />
                        : <ScoreBadge score={gp.score} />}
                    </td>
                    {/* Status — show fund count */}
                    <td style={{ ...tdBase, background: gpFocused ? "var(--subtle)" : "" }}>
                      <span style={{ color: "var(--tx4)", fontSize: "0.75rem" }}>
                        {funds.length} fund{funds.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    {/* Pipeline — GP level: blank */}
                    <td style={{ ...tdBase, background: gpFocused ? "var(--subtle)" : "" }} />
                    {/* Strategy */}
                    <td style={{ ...tdBase, background: gpFocused ? "var(--subtle)" : "" }}>
                      <span style={{ color: "var(--tx3)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {gpStrategies.slice(0, 2).join(", ")}
                        {gpStrategies.length > 2 && <span style={{ color: "var(--tx5)" }}> +{gpStrategies.length - 2}</span>}
                      </span>
                    </td>
                    {/* Sub-Strategy — GP level: blank */}
                    <td style={{ ...tdBase, background: gpFocused ? "var(--subtle)" : "" }} />
                    <td style={{ ...tdBase, textAlign: "center", color: "var(--tx5)", background: gpFocused ? "var(--subtle)" : "" }}>—</td>
                    <td style={{ ...tdBase, textAlign: "right", color: "var(--tx5)", background: gpFocused ? "var(--subtle)" : "" }}>—</td>
                    <td style={{ ...tdBase, textAlign: "center", color: meetings.length ? "var(--tx2)" : "var(--tx4)", fontWeight: meetings.length ? 600 : 400, background: gpFocused ? "var(--subtle)" : "" }}>
                      {meetings.length || "—"}
                    </td>
                    <td style={{ ...tdBase, background: gpFocused ? "var(--subtle)" : "" }}>
                      {lastMtg ? (
                        <span
                          onClick={e => { e.stopPropagation(); onMeetingClick(lastMtg, gp); }}
                          style={{ color: "var(--tx3)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline dotted" }}>
                          {fmt(lastMtg.date)}
                        </span>
                      ) : <span style={{ color: "var(--tx5)" }}>—</span>}
                    </td>
                  </tr>

                  {/* ── Fund sub-rows ── */}
                  {isOpen && funds.map(f => {
                    const fMtgs = meetings.filter(m => m.fundId === f.id);
                    const lastFMtg = [...fMtgs].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
                    const activelyRaising = ["Fundraising", "Pre-Marketing"].includes(f.status);
                    const sizeVal = activelyRaising ? f.targetSize : (f.finalSize || f.targetSize);
                    const sizeStr = fmtM(sizeVal, f.currency) ?? "—";
                    const isFundraising = f.status === "Fundraising";
                    const pct = isFundraising && f.raisedSize && f.targetSize
                      ? Math.min(100, Math.round(parseFloat(f.raisedSize) / parseFloat(f.targetSize) * 100))
                      : null;
                    const fundFocused = focusedIdx !== null && visibleRows[focusedIdx]?.type === "fund" && visibleRows[focusedIdx]?.id === f.id;
                    const stageId = pipeline.find(p => p.fundId === f.id)?.stage;
                    const stage = stageId ? PIPELINE_STAGES.find(s => s.id === stageId) : null;

                    return (
                      <tr key={f.id}
                        onClick={e => {
                          e.stopPropagation();
                          setFocusedIdx(visibleRows.findIndex(r => r.type === "fund" && r.id === f.id));
                          if (!editMode) onFundClick(f, gp);
                        }}
                        style={{ cursor: editMode ? "default" : "pointer", background: fundFocused ? "var(--subtle)" : "var(--row)" }}
                        onMouseEnter={e => { Array.from(e.currentTarget.cells).forEach(c => { c.style.background = "var(--hover)"; }); }}
                        onMouseLeave={e => { Array.from(e.currentTarget.cells).forEach((c, i) => { c.style.background = i === 0 ? (fundFocused ? "var(--subtle)" : "var(--row)") : (fundFocused ? "var(--subtle)" : ""); }); }}
                      >
                        {/* Name — indented, sticky */}
                        <td style={{ ...tdBase, ...tdStickyBase, paddingLeft: "2rem", background: fundFocused ? "var(--subtle)" : "var(--row)", boxShadow: fundFocused ? "inset 3px 0 0 #3b82f6" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                            <span style={{ color: "var(--border-hi)", fontSize: "0.68rem", flexShrink: 0 }}>└</span>
                            <span
                              style={{ color: "var(--tx2)", fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500, cursor: "pointer", textDecoration: editMode ? "none" : undefined }}
                              onClick={e => { e.stopPropagation(); onFundClick(f, gp); }}>
                              {f.name}
                            </span>
                            {f.invested && <span style={{ color: "var(--invested-c)", fontSize: "0.65rem", flexShrink: 0 }}>✓</span>}
                            {f.owner && f.owner !== gp.owner && (
                              <span style={{ background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.05rem 0.3rem", fontSize: "0.62rem", color: "var(--tx4)", flexShrink: 0, maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {f.owner}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Score — picker in edit mode */}
                        <td style={{ ...tdBase, textAlign: "center", background: fundFocused ? "var(--subtle)" : "" }}
                          onClick={e => e.stopPropagation()}>
                          {editMode && onUpdateGP
                            ? <ScorePicker score={f.score} onChange={v => patchFund(gp, f.id, { score: v })} />
                            : <ScoreBadge score={f.score} />}
                        </td>
                        {/* Status — picker in edit mode */}
                        <td style={{ ...tdBase, background: fundFocused ? "var(--subtle)" : "" }}
                          onClick={e => e.stopPropagation()}>
                          {editMode && onUpdateGP ? (
                            <StatusPicker status={f.status} onChange={v => patchFund(gp, f.id, { status: v })} />
                          ) : (
                            <div>
                              <StatusPill status={f.status} />
                              {pct !== null && (
                                <div style={{ marginTop: "0.2rem", background: "var(--subtle)", borderRadius: "2px", height: "3px", width: "80px", overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: "2px" }} />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Pipeline stage — picker in edit mode */}
                        <td style={{ ...tdBase, background: fundFocused ? "var(--subtle)" : "" }}
                          onClick={e => e.stopPropagation()}>
                          {editMode && onUpdatePipeline ? (
                            <StagePicker stage={stageId} onChange={v => onUpdatePipeline(f.id, v, gp)} />
                          ) : stage ? (
                            <span style={{ background: stage.bg, color: stage.ac, border: `1px solid ${stage.bd}`, borderRadius: "3px", padding: "0.05rem 0.45rem", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{stage.label}</span>
                          ) : (
                            <span style={{ color: "var(--tx5)" }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdBase, background: fundFocused ? "var(--subtle)" : "" }}>
                          <span style={{ color: "var(--tx3)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {f.strategy || "—"}
                          </span>
                        </td>
                        <td style={{ ...tdBase, background: fundFocused ? "var(--subtle)" : "" }}>
                          <span style={{ color: "var(--tx5)", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {f.subStrategy || "—"}
                          </span>
                        </td>
                        <td style={{ ...tdBase, textAlign: "center", color: "var(--tx3)", fontSize: "0.75rem", background: fundFocused ? "var(--subtle)" : "" }}>
                          {f.vintage || "—"}
                        </td>
                        <td style={{ ...tdBase, textAlign: "right", color: "var(--tx3)", fontSize: "0.75rem", whiteSpace: "nowrap", background: fundFocused ? "var(--subtle)" : "" }}>
                          {sizeStr}
                        </td>
                        <td style={{ ...tdBase, textAlign: "center", color: fMtgs.length ? "var(--tx2)" : "var(--tx4)", fontWeight: fMtgs.length ? 600 : 400, background: fundFocused ? "var(--subtle)" : "" }}>
                          {fMtgs.length || "—"}
                        </td>
                        <td style={{ ...tdBase, background: fundFocused ? "var(--subtle)" : "" }}>
                          {lastFMtg ? (
                            <span
                              onClick={e => { e.stopPropagation(); onMeetingClick(lastFMtg, gp); }}
                              style={{ color: "var(--tx4)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline dotted" }}>
                              {fmt(lastFMtg.date)}
                            </span>
                          ) : <span style={{ color: "var(--tx5)" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* ── Placement Agent rows (flat, no drilldown) ── */}
            {placementAgents.length > 0 && (
              <>
                <tr>
                  <td colSpan={10} style={{ ...tdBase, background: "var(--subtle)", padding: "0.3rem 0.75rem" }}>
                    <span style={{ color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Placement Agents</span>
                  </td>
                </tr>
                {placementAgents.map(pa => {
                  // Count funds represented
                  const fundCount = allGps.reduce((n, g) => n + (g.funds||[]).filter(f => f.placementAgentId === pa.id).length, 0);
                  return (
                    <tr key={pa.id}
                      onClick={() => onPaClick && onPaClick(pa)}
                      style={{ cursor: "pointer", background: "transparent" }}
                      onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c => { c.style.background = "var(--hover)"; })}
                      onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c => { c.style.background = ""; })}
                    >
                      <td style={{ ...tdBase, ...tdStickyBase, paddingLeft: "0.75rem", background: "transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.65rem" }}>🤝</span>
                          <span style={{ fontWeight: 600, color: "var(--tx1)", fontSize: "0.8375rem" }}>{pa.name}</span>
                          {pa.hq && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{pa.hq}</span>}
                        </div>
                      </td>
                      <td style={tdBase} />
                      <td style={{ ...tdBase, color: "var(--tx4)", fontSize: "0.75rem" }}>
                        {fundCount > 0 ? `${fundCount} fund${fundCount !== 1 ? "s" : ""}` : "—"}
                      </td>
                      <td colSpan={7} style={{ ...tdBase, color: "var(--tx5)", fontSize: "0.75rem" }}>
                        {pa.contact || ""}
                        {pa.contactEmail ? (pa.contact ? ` · ${pa.contactEmail}` : pa.contactEmail) : ""}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
