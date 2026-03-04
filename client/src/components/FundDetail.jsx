import React, { useState, useEffect, useRef, useCallback } from "react";
import { SCORE_CONFIG, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS, SECTOR_OPTIONS, CURRENCIES, STATUS_OPTIONS, PIPELINE_STAGES } from '../constants.js';
import { IS, ISFilled, TA, TAFilled, btnBase, btnPrimary, btnGhost, btnDanger } from '../theme.js';
import { fmt, fmtM } from '../utils.js';
import { loadFundPerformanceHistory, loadFundRaisedHistory, loadFundChangeHistory } from '../api.js';
import { ScoreBadge, StatusPill, SectorChip } from './Badges.jsx';
import { ScorePicker, StatusPicker, OwnerPicker, StagePicker, StrategyPicker, SubStrategyPicker, EditingContext, InlineMetric } from './Pickers.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { FundForm } from './Forms.jsx';
import { NoteField } from './Forms.jsx';

// Human-readable labels for change-log field names
const CHANGE_FIELD_LABELS = { score: "Rating", status: "Status", stage: "Pipeline Stage", owner: "Responsible" };

// ─── Segmented Date Input (DD / MM / YYYY with auto-advance) ─────────────────
function DateSegmentInput({ defaultValue, onCommit, onCancel }) {
  const [yy, mm, dd] = defaultValue ? defaultValue.split("-") : ["", "", ""];
  const [day,   setDay]   = useState(dd || "");
  const [month, setMonth] = useState(mm || "");
  const [year,  setYear]  = useState(yy || "");
  const dayRef   = useRef();
  const monthRef = useRef();
  const yearRef  = useRef();
  const doneRef  = useRef(false);

  const finish = (d, m, y) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (d && m && y.length === 4) onCommit(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    else onCancel();
  };
  const cancel = () => { if (!doneRef.current) { doneRef.current = true; onCancel(); } };
  const keyDown = (e, d, m, y) => {
    if (e.key === "Enter")  { e.preventDefault(); finish(d, m, y); }
    if (e.key === "Escape") { e.stopPropagation(); cancel(); }
  };
  const seg = { ...IS, textAlign: "center", padding: "0.25rem 0.15rem", fontSize: "0.8rem" };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "1px" }}
      onBlur={e => { const ct = e.currentTarget; setTimeout(() => { if (!ct.contains(document.activeElement)) finish(day, month, year); }, 0); }}
    >
      <input ref={dayRef} autoFocus type="text" inputMode="numeric"
        value={day} placeholder="DD" style={{ ...seg, width: "32px" }}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setDay(v);
          if (v.length === 2 || (v.length === 1 && +v > 3)) { monthRef.current?.focus(); monthRef.current?.select(); }
        }}
        onKeyDown={e => { keyDown(e, day, month, year); if (e.key === "ArrowRight") { e.preventDefault(); monthRef.current?.focus(); } }}
      />
      <span style={{ color: "var(--tx5)", userSelect: "none", fontSize: "0.75rem" }}>/</span>
      <input ref={monthRef} type="text" inputMode="numeric"
        value={month} placeholder="MM" style={{ ...seg, width: "32px" }}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2);
          setMonth(v);
          if (v.length === 2 || (v.length === 1 && +v > 1)) { yearRef.current?.focus(); yearRef.current?.select(); }
        }}
        onKeyDown={e => {
          keyDown(e, day, month, year);
          if (e.key === "ArrowRight") { e.preventDefault(); yearRef.current?.focus(); }
          if ((e.key === "Backspace" || e.key === "ArrowLeft") && !month) { e.preventDefault(); dayRef.current?.focus(); dayRef.current?.select(); }
        }}
      />
      <span style={{ color: "var(--tx5)", userSelect: "none", fontSize: "0.75rem" }}>/</span>
      <input ref={yearRef} type="text" inputMode="numeric"
        value={year} placeholder="YYYY" style={{ ...seg, width: "44px" }}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          setYear(v);
          if (v.length === 4 && day && month) finish(day, month, v);
        }}
        onKeyDown={e => {
          keyDown(e, day, month, year);
          if ((e.key === "Backspace" || e.key === "ArrowLeft") && !year) { e.preventDefault(); monthRef.current?.focus(); monthRef.current?.select(); }
        }}
      />
    </div>
  );
}

// ─── Fundraising Timeline ─────────────────────────────────────────────────────
// Always visible. Markers for Launch, 1st Close, Next Close, Final Close are
// shown even without dates (hollow dot + "—"). Click any to set/clear its date.
function FundraisingTimeline({ fund, onSetDate }) {
  const [openMarker, setOpenMarker] = useState(null);
  const popRef = useRef();
  const todayStr = new Date().toISOString().slice(0, 10);

  const openPop  = (field) => setOpenMarker(field);
  const closePop = () => setOpenMarker(null);
  const commitPop = (field, val) => { if (val) onSetDate(field, val); closePop(); };

  // Close popover on outside click (no save — explicit blur/Enter required)
  useEffect(() => {
    if (!openMarker) return;
    const h = (e) => { if (popRef.current && !popRef.current.contains(e.target)) closePop(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openMarker]);

  const startMs = fund.launchDate      ? new Date(fund.launchDate).getTime()
                : fund.firstCloseDate ? new Date(fund.firstCloseDate).getTime()
                : null;
  const endMs   = fund.finalCloseDate ? new Date(fund.finalCloseDate).getTime() : null;
  const hasRange = startMs && endMs && endMs > startMs;
  const toPos = hasRange
    ? (d) => Math.max(1, Math.min(99, (new Date(d).getTime() - startMs) / (endMs - startMs) * 100))
    : null;

  const todayMs = new Date(todayStr).getTime();
  const elapsedPct = hasRange ? Math.max(0, Math.min(100, (todayMs - startMs) / (endMs - startMs) * 100)) : 0;

  // Default positions when no date range is available
  const DEFAULTS = { launchDate: 0, firstCloseDate: 30, nextCloseDate: 65, finalCloseDate: 100 };

  let markers = [
    { field: "launchDate",     label: "Launch",      color: "#3b82f6", side: "bottom" },
    { field: "firstCloseDate", label: "1st Close",   color: "#8b5cf6", side: "top"    },
    { field: "nextCloseDate",  label: "Next Close",  color: "#f59e0b", side: "bottom" },
    { field: "finalCloseDate", label: "Final Close", color: "#64748b", side: "bottom" },
  ].map(def => {
    const date = fund[def.field] || null;
    const pos  = (hasRange && date) ? toPos(date) : DEFAULTS[def.field];
    return { ...def, date, pos };
  });

  // Add Today only when it falls meaningfully within the range
  const todayPos = hasRange ? Math.max(0, Math.min(100, (todayMs - startMs) / (endMs - startMs) * 100)) : null;
  if (todayPos !== null && todayPos > 2 && todayPos < 98) {
    markers.push({ field: null, label: "Today", color: "#22c55e", date: todayStr, pos: todayPos, side: "top", isToday: true });
  }

  markers.sort((a, b) => a.pos - b.pos);

  // Flip side of second marker in adjacent same-side pairs that are too close
  for (let i = 1; i < markers.length; i++) {
    if (!markers[i].isToday && !markers[i - 1].isToday &&
        markers[i].pos - markers[i - 1].pos < 15 &&
        markers[i].side === markers[i - 1].side) {
      markers[i] = { ...markers[i], side: markers[i].side === "top" ? "bottom" : "top" };
    }
  }

  // Spread label positions on each side to prevent text overlap.
  // HALF_W is the estimated half-width of a label block (name + date, whichever is wider).
  // A left-edge label (translateX(0)) extends its FULL width rightward, needing 2×HALF_W clearance.
  markers = markers.map(m => ({ ...m, labelPos: m.pos }));
  const HALF_W = 8;   // % — half of ~16% label block width at ~600px container
  const LABEL_GAP = 1; // % minimum clearance between adjacent labels
  ["top", "bottom"].forEach(side => {
    const idx = markers.reduce((acc, m, i) => (m.side === side && !m.isToday ? [...acc, i] : acc), []);
    if (idx.length < 2) return;
    for (let k = 1; k < idx.length; k++) {
      const prev = markers[idx[k - 1]].labelPos;
      // Left-edge labels extend rightward by full 2×HALF_W; all others by HALF_W
      const prevRight = prev <= 4 ? prev + 2 * HALF_W : prev + HALF_W;
      const minPos = prevRight + LABEL_GAP + HALF_W;
      if (markers[idx[k]].labelPos < minPos) markers[idx[k]].labelPos = minPos;
    }
    const over = markers[idx[idx.length - 1]].labelPos - 98;
    if (over > 0) idx.forEach(i => { markers[i].labelPos = Math.max(2, markers[i].labelPos - over); });
  });

  // Edge-aware label transforms — prevents text overflowing the container
  const lTx    = (p) => p <= 4 ? "translateX(0)"    : p >= 96 ? "translateX(-100%)" : "translateX(-50%)";
  const lAlign = (p) => p <= 4 ? "left"              : p >= 96 ? "right"             : "center";
  // Popover follows same logic but with wider margins
  const popTx  = (p) => p <= 25 ? "translateX(0)"   : p >= 75 ? "translateX(-100%)" : "translateX(-50%)";

  // Vertical layout: dot centre at 35px, track centre at 35px
  const DOT_TOP       = 30;  // 10px dot → centre 35
  const TRACK_TOP     = 33;  // 4px track → centre 35
  const BOT_LABEL_TOP = 42;  // just below dot bottom (30+10+2)

  return (
    <div style={{ position: "relative", height: 62, marginBottom: "0.75rem", userSelect: "none" }}>
      {/* Track */}
      <div style={{ position: "absolute", top: TRACK_TOP, left: 0, right: 0, height: 4, background: "var(--subtle)", borderRadius: 2 }}>
        {hasRange && elapsedPct > 0 && (
          <div style={{ position: "absolute", left: 0, width: `${elapsedPct}%`, height: "100%", background: "#3b82f645", borderRadius: 2 }} />
        )}
      </div>

      {markers.map((m) => {
        const isOpen = m.field !== null && openMarker === m.field;
        return (
          <React.Fragment key={m.field || "today"}>
            {/* Top label */}
            {m.side === "top" && (
              <div
                onClick={m.isToday ? undefined : (e) => { e.stopPropagation(); isOpen ? closePop() : openPop(m.field); }}
                style={{ position: "absolute", top: 2, left: `${m.labelPos}%`, transform: lTx(m.labelPos), textAlign: lAlign(m.labelPos), cursor: m.isToday ? "default" : "pointer" }}>
                <div style={{ color: m.color, fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.3 }}>{m.label}</div>
                <div style={{ color: "var(--tx5)", fontSize: "0.58rem", whiteSpace: "nowrap", lineHeight: 1.3, opacity: m.date ? 1 : 0.45 }}>{m.date ? fmt(m.date) : "—"}</div>
              </div>
            )}

            {/* Dot */}
            <div
              onClick={m.isToday ? undefined : (e) => { e.stopPropagation(); isOpen ? closePop() : openPop(m.field); }}
              style={{
                position: "absolute",
                top: m.isToday ? DOT_TOP + 1 : DOT_TOP,
                left: `${m.pos}%`, transform: "translateX(-50%)",
                width: m.isToday ? 8 : 10, height: m.isToday ? 8 : 10,
                borderRadius: "50%",
                background: m.date ? m.color : "transparent",
                border: `2px solid ${m.color}`,
                cursor: m.isToday ? "default" : "pointer",
                zIndex: 2,
                boxShadow: m.isToday ? `0 0 0 3px ${m.color}28` : isOpen ? `0 0 0 3px ${m.color}40` : undefined,
                transition: "box-shadow 0.15s",
              }}
            />

            {/* Bottom label */}
            {m.side === "bottom" && (
              <div
                onClick={m.isToday ? undefined : (e) => { e.stopPropagation(); isOpen ? closePop() : openPop(m.field); }}
                style={{ position: "absolute", top: BOT_LABEL_TOP, left: `${m.labelPos}%`, transform: lTx(m.labelPos), textAlign: lAlign(m.labelPos), cursor: m.isToday ? "default" : "pointer" }}>
                <div style={{ color: m.color, fontSize: "0.6rem", fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.3 }}>{m.label}</div>
                <div style={{ color: "var(--tx5)", fontSize: "0.58rem", whiteSpace: "nowrap", lineHeight: 1.3, opacity: m.date ? 1 : 0.45 }}>{m.date ? fmt(m.date) : "—"}</div>
              </div>
            )}

            {/* Date-setting popover */}
            {isOpen && (
              <div
                ref={popRef}
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute", top: 66, left: `${m.pos}%`, transform: popTx(m.pos),
                  background: "var(--surface)", border: "1px solid var(--border-hi)",
                  borderRadius: "10px", padding: "0.6rem 0.75rem",
                  zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.7)", minWidth: "175px",
                }}
              >
                <div style={{ color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Set {m.label}</div>
                <DateSegmentInput
                  defaultValue={m.date || ""}
                  onCommit={val => commitPop(m.field, val)}
                  onCancel={closePop}
                />
                {m.date && (
                  <button
                    onClick={() => { onSetDate(m.field, null); setOpenMarker(null); }}
                    style={{ display: "block", marginTop: "0.4rem", color: "var(--tx5)", fontSize: "0.65rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >× Clear date</button>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Dual-field metric card (e.g. "18.5% / 2.0x") ───────────────────────────
function DualMetric({ id, label, val1, disp1, ph1, onSave1, val2, disp2, ph2, onSave2, readOnly }) {
  const { editingId, setEditingId, registerMetric, unregisterMetric, nextMetricId } = React.useContext(EditingContext);

  useEffect(() => {
    if (readOnly) return;
    registerMetric(id);
    return () => unregisterMetric(id);
  }, [id, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tmp1, setTmp1] = useState(val1 || "");
  const [tmp2, setTmp2] = useState(val2 || "");
  const containerRef = useRef();
  const isEditing = !readOnly && editingId === id;

  const startEdit = () => {
    if (readOnly) return;
    setTmp1(val1 || ""); setTmp2(val2 || "");
    setEditingId(id);
  };
  const commit = () => { onSave1(tmp1); onSave2(tmp2); setEditingId(null); };
  const cancel = () => setEditingId(null);

  return (
    <div ref={containerRef}
      onClick={!isEditing && !readOnly ? startEdit : undefined}
      onBlur={isEditing ? () => {
        setTimeout(() => {
          if (containerRef.current && !containerRef.current.contains(document.activeElement)) commit();
        }, 0);
      } : undefined}
      style={{ background: "var(--card)", border: `1px solid ${isEditing ? "var(--border-hi)" : "var(--border)"}`, borderRadius: "8px", padding: "0.7rem 0.85rem", cursor: (isEditing || readOnly) ? "default" : "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={(!isEditing && !readOnly) ? e => e.currentTarget.style.borderColor = "var(--border-hi)" : undefined}
      onMouseLeave={(!isEditing && !readOnly) ? e => e.currentTarget.style.borderColor = "var(--border)" : undefined}
    >
      <div style={{ color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>{label}</div>
      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.stopPropagation(); cancel(); }
            if (e.key === "Tab") { e.preventDefault(); onSave1(tmp1); onSave2(tmp2); setEditingId(nextMetricId(id)); }
          }}>
          <input autoFocus value={tmp1} onChange={e => setTmp1(e.target.value)}
            style={{ width: "4.5rem", background: "none", border: "none", outline: "none", color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem", fontFamily: "inherit" }}
            placeholder={ph1} />
          <span style={{ color: "var(--tx5)", fontSize: "0.8rem", flexShrink: 0 }}>/</span>
          <input value={tmp2} onChange={e => setTmp2(e.target.value)}
            style={{ width: "4.5rem", background: "none", border: "none", outline: "none", color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem", fontFamily: "inherit" }}
            placeholder={ph2} />
        </div>
      ) : (
        <div style={{ color: (val1 || val2) ? "var(--tx1)" : "var(--tx5)", fontWeight: (val1 || val2) ? 600 : 400, fontSize: "0.875rem" }}>
          {(val1 || val2) ? `${disp1 || "—"} / ${disp2 || "—"}` : `${ph1} / ${ph2}`}
        </div>
      )}
    </div>
  );
}

// ─── Placement Agent tag + picker ─────────────────────────────────────────────
function PATagPicker({ attachedPA, placementAgents, onChange, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "20px", padding: "0.15rem 0.6rem", fontSize: "0.72rem", color: attachedPA ? "#a78bfa" : "var(--tx5)", fontWeight: attachedPA ? 600 : 400, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
        🤝 {attachedPA ? attachedPA.name : "None"}
      </span>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.4rem", zIndex: 2000, boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "200px" }}>
          <div style={{ color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0.2rem 0.4rem 0.5rem" }}>Placement Agent</div>
          <div onClick={() => { onChange(null); setOpen(false); }}
            style={{ display: "flex", alignItems: "center", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: !attachedPA ? "var(--subtle)" : "none" }}
            onMouseEnter={e => { if (attachedPA) e.currentTarget.style.background = "var(--hover)"; }}
            onMouseLeave={e => { if (attachedPA) e.currentTarget.style.background = "none"; }}>
            <span style={{ color: "var(--tx5)", fontSize: "0.8rem", fontStyle: "italic" }}>None</span>
            {!attachedPA && <span style={{ marginLeft: "auto", color: "var(--tx4)", fontSize: "0.7rem" }}>✓</span>}
          </div>
          {placementAgents.map(pa => (
            <div key={pa.id} onClick={() => { onChange(pa.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", background: pa.id === attachedPA?.id ? "rgba(167,139,250,0.15)" : "none" }}
              onMouseEnter={e => { if (pa.id !== attachedPA?.id) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (pa.id !== attachedPA?.id) e.currentTarget.style.background = "none"; }}>
              <span style={{ color: pa.id === attachedPA?.id ? "#a78bfa" : "var(--tx3)", fontSize: "0.8rem", flex: 1 }}>🤝 {pa.name}</span>
              {pa.id === attachedPA?.id && <span style={{ color: "#a78bfa", fontSize: "0.7rem" }}>✓</span>}
            </div>
          ))}
          {attachedPA && (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.25rem", paddingTop: "0.35rem" }}>
              <div onClick={() => { onOpen?.(); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", color: "var(--tx4)", fontSize: "0.75rem" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                Open PA profile →
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FundDetailOverlay({ fund, gp, meetings, pipeline = [], onClose, onSaveFund, onAddMeeting, onTagClick, onMeetingClick, zIndex = 1000, onEditingChange, owners = [], onGpClick, onPipelineStage, placementAgents = [], onPlacementAgentClick }) {
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fundraisingExpanded, setFundraisingExpanded] = useState(null); // null = auto
  const [tab, setTab] = useState("overview");
  const [showCommitment, setShowCommitment] = useState(!!(fund.expectedAmount || fund.icDate));

  // Reset commitment visibility when switching funds
  useEffect(() => { setShowCommitment(!!(fund.expectedAmount || fund.icDate)); }, [fund.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intercept Escape in capture phase when the Edit All form is open,
  // so App's global handler doesn't close the whole fund overlay.
  useEffect(() => {
    if (!editing) return;
    const handler = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editing]);

  // ── History state ──────────────────────────────────────────────────────────
  const [perfHistory,   setPerfHistory]   = useState([]);
  const [raisedHistory, setRaisedHistory] = useState([]);
  const [changeHistory, setChangeHistory] = useState([]);

  const fetchHistory = () => {
    let cancelled = false;
    Promise.all([
      loadFundPerformanceHistory(fund.id),
      loadFundRaisedHistory(fund.id),
      loadFundChangeHistory(fund.id),
    ]).then(([perf, raised, changes]) => {
      if (!cancelled) { setPerfHistory(perf); setRaisedHistory(raised); setChangeHistory(changes); }
    });
    return () => { cancelled = true; };
  };

  // Fetch on mount / fund switch
  useEffect(fetchHistory, [fund.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch 1.5 s after any tracked field changes (after 800 ms auto-save settles)
  useEffect(() => {
    const timer = setTimeout(fetchHistory, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fund.score, fund.status, fund.raisedSize,
      fund.netIrr, fund.netMoic, fund.grossIrr, fund.grossMoic,
      fund.dpi, fund.tvpi, fund.rvpi, fund.nav, fund.undrawnValue, fund.perfDate]);

  const fundMeetings = (meetings || []).filter(m => m.fundId === fund.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const meetingsWithNotes = fundMeetings.filter(m => m.notes?.trim());
  const raised = fund.raisedSize ? parseFloat(fund.raisedSize) : null;
  const target = fund.targetSize ? parseFloat(fund.targetSize) : null;
  const pct = raised && target ? Math.min(100, Math.round(raised / target * 100)) : null;

  const isFundraising = ["Pre-Marketing", "Fundraising"].includes(fund.status);
  const showFundraising = fundraisingExpanded !== null ? fundraisingExpanded : isFundraising;

  // Auto-reset expansion when status changes
  useEffect(() => { setFundraisingExpanded(null); }, [fund.status]);

  const patch = (fields) => onSaveFund({ ...fund, ...fields });
  const currentStage = (pipeline).find(p => p.fundId === fund.id)?.stage || null;

  // Notify parent when an inline card is being edited, so Esc can cancel it
  const setEditingIdWithNotify = (id) => {
    setEditingId(id);
    onEditingChange?.(id);
  };

  // Ordered registry for Tab-to-next navigation across InlineMetric cards
  const metricOrderRef = useRef([]);
  const registerMetric = useCallback((id) => {
    if (!metricOrderRef.current.includes(id)) {
      metricOrderRef.current = [...metricOrderRef.current, id];
    }
  }, []);
  const unregisterMetric = useCallback((id) => {
    metricOrderRef.current = metricOrderRef.current.filter(x => x !== id);
  }, []);
  const nextMetricId = useCallback((currentId) => {
    const idx = metricOrderRef.current.indexOf(currentId);
    if (idx === -1 || idx === metricOrderRef.current.length - 1) return null;
    return metricOrderRef.current[idx + 1];
  }, []);

  if (editing) {
    return (
      <Overlay onClose={() => setEditing(false)} width="680px" zIndex={zIndex}>
        <OverlayHeader title="Edit Fund" subtitle={gp?.name} onClose={() => setEditing(false)} />
        <div style={{ padding: "1.5rem" }}>
          <FundForm initial={fund} onSave={(updated) => { onSaveFund(updated); setEditing(false); }} onClose={() => setEditing(false)} />
        </div>
      </Overlay>
    );
  }

  const totalHistory = changeHistory.length + perfHistory.length + raisedHistory.length;
  const sectionHeader = (label, color, action) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
      <div style={{ width: "3px", height: "15px", background: color, borderRadius: "2px", flexShrink: 0 }} />
      <span style={{ color: "var(--tx2)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      {action}
    </div>
  );

  return (
    <EditingContext.Provider value={{ editingId, setEditingId: setEditingIdWithNotify, registerMetric, unregisterMetric, nextMetricId }}>
    <Overlay onClose={onClose} width="720px" zIndex={zIndex}>
      <OverlayHeader
        title={fund.name}
        subtitle={gp?.name ? (
          <>
            <span
              onClick={onGpClick ? () => onGpClick(gp) : undefined}
              style={{ cursor: onGpClick ? "pointer" : "default", textDecoration: onGpClick ? "underline" : "none", textDecorationColor: "var(--border-hi)", textUnderlineOffset: "2px" }}
            >{gp.name}</span>
            {fund.series ? ` · ${fund.series}` : ""}
          </>
        ) : fund.series}
        onClose={onClose}
        actions={fund.strategy && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <StrategyPicker strategy={fund.strategy} onChange={v => patch({ strategy: v, subStrategy: null })} />
            <SubStrategyPicker strategy={fund.strategy} subStrategy={fund.subStrategy} onChange={v => patch({ subStrategy: v })} />
          </div>
        )}
      />
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 1.5rem" }}>
        {[["overview", "Overview"], ["performance", "Performance"], ["history", `History${totalHistory > 0 ? ` (${totalHistory})` : ""}`], ["insights", `Insights${meetingsWithNotes.length ? ` (${meetingsWithNotes.length})` : ""}`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.6rem 0.75rem", color: tab === t ? "var(--tx1)" : "var(--tx4)", fontWeight: tab === t ? 600 : 400, fontSize: "0.8rem", borderBottom: tab === t ? "2px solid var(--tx1)" : "2px solid transparent", marginBottom: "-1px", letterSpacing: "0.01em" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: "1.5rem" }}>
        {tab === "insights" && (
          <div>
            {meetingsWithNotes.length === 0 ? (
              <div style={{ color: "var(--tx4)", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>No meeting notes for this fund yet.</div>
            ) : meetingsWithNotes.map((m, i) => (
              <div key={m.id} style={{ paddingBottom: "1.25rem", marginBottom: "1.25rem", borderBottom: i < meetingsWithNotes.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontWeight: 700, color: "var(--tx2)", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                  {fmt(m.date)}{m.location ? ` · ${m.location}` : ""}
                </div>
                <div style={{ color: "var(--tx2)", fontSize: "0.875rem", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.notes}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "performance" && (
          <div>
            {/* Header: title + as-of date */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ color: "var(--tx2)", fontWeight: 700, fontSize: "0.9375rem" }}>Performance Metrics</div>
                <div style={{ color: "var(--tx4)", fontSize: "0.73rem", marginTop: "0.15rem" }}>Click any card to edit · all returns net of fees unless labeled gross</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>As of</span>
                <InlineMetric id="perfDate" label="" value={fund.perfDate}
                  displayValue={fmt(fund.perfDate)} placeholder="Set date"
                  onSave={v => patch({ perfDate: v || null })} />
              </div>
            </div>

            {/* Net Returns */}
            <div style={{ marginBottom: "1.5rem" }}>
              {sectionHeader("Net Returns", "#22c55e")}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
                <InlineMetric id="netIrr" label="Net IRR" value={fund.netIrr}
                  displayValue={fund.netIrr ? `${parseFloat(fund.netIrr).toFixed(1)}%` : null}
                  placeholder="—" onSave={v => patch({ netIrr: v || null })} />
                <InlineMetric id="netMoic" label="Net MOIC" value={fund.netMoic}
                  displayValue={fund.netMoic ? `${parseFloat(fund.netMoic).toFixed(2)}x` : null}
                  placeholder="—" onSave={v => patch({ netMoic: v || null })} />
                <InlineMetric id="dpi" label="DPI" value={fund.dpi}
                  displayValue={fund.dpi ? `${parseFloat(fund.dpi).toFixed(2)}x` : null}
                  placeholder="—" onSave={v => patch({ dpi: v || null })} />
                <InlineMetric id="tvpi" label="TVPI" value={fund.tvpi}
                  displayValue={fund.tvpi ? `${parseFloat(fund.tvpi).toFixed(2)}x` : null}
                  placeholder="—" onSave={v => patch({ tvpi: v || null })} />
                <InlineMetric id="rvpi" label="RVPI" value={fund.rvpi}
                  displayValue={fund.rvpi ? `${parseFloat(fund.rvpi).toFixed(2)}x` : null}
                  placeholder="—" onSave={v => patch({ rvpi: v || null })} />
              </div>
            </div>

            {/* Gross Returns + Portfolio side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                {sectionHeader("Gross Returns", "#60a5fa")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <InlineMetric id="grossIrr" label="Gross IRR" value={fund.grossIrr}
                    displayValue={fund.grossIrr ? `${parseFloat(fund.grossIrr).toFixed(1)}%` : null}
                    placeholder="—" onSave={v => patch({ grossIrr: v || null })} />
                  <InlineMetric id="grossMoic" label="Gross MOIC" value={fund.grossMoic}
                    displayValue={fund.grossMoic ? `${parseFloat(fund.grossMoic).toFixed(2)}x` : null}
                    placeholder="—" onSave={v => patch({ grossMoic: v || null })} />
                </div>
              </div>
              <div>
                {sectionHeader("Portfolio Valuation", "#a78bfa")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <InlineMetric id="nav" label="NAV (M)" value={fund.nav}
                    displayValue={fmtM(fund.nav, fund.currency)}
                    placeholder="—" onSave={v => patch({ nav: v || null })} />
                  <InlineMetric id="undrawnValue" label="Undrawn (M)" value={fund.undrawnValue}
                    displayValue={fmtM(fund.undrawnValue, fund.currency)}
                    placeholder="—" onSave={v => patch({ undrawnValue: v || null })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div>
            {/* Change log */}
            <div style={{ marginBottom: "1.75rem" }}>
              {sectionHeader("Change History", "#f59e0b")}
              {changeHistory.length === 0 ? (
                <div style={{ color: "var(--tx5)", fontSize: "0.75rem" }}>No changes tracked yet — edits to Rating, Status, and Pipeline Stage will appear here.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {changeHistory.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.775rem" }}>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, minWidth: "76px", fontSize: "0.72rem" }}>{c.changedAt ? fmt(c.changedAt.slice(0, 10)) : "—"}</span>
                      <span style={{ color: "var(--tx4)", fontSize: "0.7rem", flexShrink: 0 }}>{CHANGE_FIELD_LABELS[c.fieldName] || c.fieldName}</span>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>·</span>
                      {c.oldValue && <span style={{ color: "var(--tx4)", textDecoration: "line-through", fontSize: "0.72rem" }}>{c.oldValue}</span>}
                      {c.oldValue && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>→</span>}
                      <span style={{ color: "var(--tx1)", fontWeight: 500 }}>{c.newValue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance snapshots */}
            {perfHistory.length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                {sectionHeader("Performance History", "#22c55e")}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: "0.72rem", minWidth: "560px", width: "100%" }}>
                    <thead>
                      <tr>
                        {["As of", "Net IRR", "Net MOIC", "Gross IRR", "Gross MOIC", "DPI", "TVPI", "RVPI", "NAV", "Recorded"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "0.2rem 0.55rem", color: "var(--tx4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.62rem", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perfHistory.map((s, i) => {
                        const cell = (v, fmtFn) => <td style={{ padding: "0.3rem 0.55rem", color: v ? "var(--tx1)" : "var(--tx5)", whiteSpace: "nowrap" }}>{v ? fmtFn(v) : "—"}</td>;
                        return (
                          <tr key={s.id} style={{ background: i % 2 === 1 ? "var(--subtle)" : "transparent" }}>
                            <td style={{ padding: "0.3rem 0.55rem", color: "var(--tx2)", fontWeight: 500, whiteSpace: "nowrap" }}>{s.perfDate ? fmt(s.perfDate) : "—"}</td>
                            {cell(s.netIrr,    v => `${parseFloat(v).toFixed(1)}%`)}
                            {cell(s.netMoic,   v => `${parseFloat(v).toFixed(2)}x`)}
                            {cell(s.grossIrr,  v => `${parseFloat(v).toFixed(1)}%`)}
                            {cell(s.grossMoic, v => `${parseFloat(v).toFixed(2)}x`)}
                            {cell(s.dpi,       v => `${parseFloat(v).toFixed(2)}x`)}
                            {cell(s.tvpi,      v => `${parseFloat(v).toFixed(2)}x`)}
                            {cell(s.rvpi,      v => `${parseFloat(v).toFixed(2)}x`)}
                            {cell(s.nav,       v => fmtM(v, fund.currency))}
                            <td style={{ padding: "0.3rem 0.55rem", color: "var(--tx5)", whiteSpace: "nowrap" }}>{s.recordedAt ? fmt(s.recordedAt.slice(0, 10)) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Raised amount history */}
            {raisedHistory.length > 0 && (
              <div>
                {sectionHeader("Amount Raised", "#3b82f6")}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {raisedHistory.map(r => {
                    const pct = target ? Math.round(parseFloat(r.raisedSize) / target * 100) : null;
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "baseline", gap: "0.65rem", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--tx5)", flexShrink: 0, minWidth: "76px" }}>{r.recordedAt ? fmt(r.recordedAt.slice(0, 10)) : "—"}</span>
                        <span style={{ color: "var(--tx2)", fontWeight: 500 }}>{fmtM(r.raisedSize, fund.currency)}</span>
                        {pct !== null && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{pct}% of target</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "overview" && <>
        {/* Labeled pickers — Rating / Responsible / Pipeline / Status */}
        {(() => {
          const lbl = { color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" };
          return (
            <>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div><div style={lbl}>Rating</div><ScorePicker score={fund.score} size="lg" onChange={v => patch({ score: v })} /></div>
                <div><div style={lbl}>Responsible</div><OwnerPicker owner={fund.owner} owners={owners} onChange={v => patch({ owner: v || null })} placeholder={gp?.owner} /></div>
                <div><div style={lbl}>Pipeline</div><StagePicker stage={currentStage} onChange={v => onPipelineStage?.(fund.id, v)} /></div>
                <div><div style={lbl}>Status</div><StatusPicker status={fund.status} onChange={v => patch({ status: v })} /></div>
                {placementAgents.length > 0 && (() => {
                  const attachedPA = placementAgents.find(p => p.id === fund.placementAgentId);
                  return (
                    <div style={{ position: "relative" }}>
                      <div style={lbl}>Placement Agent</div>
                      <PATagPicker
                        attachedPA={attachedPA}
                        placementAgents={placementAgents}
                        onChange={v => patch({ placementAgentId: v || null })}
                        onOpen={() => onPlacementAgentClick && attachedPA && onPlacementAgentClick(attachedPA)}
                      />
                    </div>
                  );
                })()}
              </div>
            </>
          );
        })()}

        {/* Fundraising section */}
        <div style={{ marginBottom: "1.25rem" }}>
          {sectionHeader("Fundraising", "#3b82f6",
            <button onClick={() => setFundraisingExpanded(!showFundraising)}
              style={{ ...btnGhost, padding: "0.1rem 0.45rem", fontSize: "0.65rem", color: "var(--tx5)" }}>
              {showFundraising ? "▲ Hide" : "▼ Show"}
            </button>
          )}
          {showFundraising && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <InlineMetric id="targetSize" label="Target Size (M)" value={fund.targetSize}
                  displayValue={fmtM(fund.targetSize, fund.currency)}
                  placeholder="—" onSave={v => patch({ targetSize: v })} />
                <InlineMetric id="hardCap" label="Hard Cap (M)" value={fund.hardCap}
                  displayValue={fmtM(fund.hardCap, fund.currency)}
                  placeholder="—" onSave={v => patch({ hardCap: v })} />
                <InlineMetric id="raisedSize" label="Amount Raised (M)" value={fund.raisedSize}
                  displayValue={fund.raisedSize ? `${fmtM(fund.raisedSize, fund.currency)}${fund.raisedDate ? ` · ${fmt(fund.raisedDate)}` : ""}` : null}
                  placeholder="—" onSave={v => patch({ raisedSize: v })} />
              </div>
              {pct !== null && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--tx3)", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                    <span>Amount raised</span>
                    <span style={{ color: "var(--tx2)" }}>{pct}% of target</span>
                  </div>
                  <div style={{ background: "var(--subtle)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#22c55e" : "#3b82f6", borderRadius: "4px", transition: "width 0.5s" }} />
                  </div>
                </div>
              )}
              <FundraisingTimeline fund={fund} onSetDate={(field, val) => patch({ [field]: val || null })} />
              {/* Commitment / IC — only shown when planning to invest */}
              <div style={{ marginTop: "0.6rem", paddingTop: "0.6rem", borderTop: "1px solid var(--border)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", marginBottom: showCommitment ? "0.6rem" : 0 }}>
                  <input type="checkbox" checked={showCommitment} onChange={e => setShowCommitment(e.target.checked)}
                    style={{ width: "13px", height: "13px", cursor: "pointer", accentColor: "var(--tx1)" }} />
                  <span style={{ color: "var(--tx3)", fontSize: "0.74rem", fontWeight: 500 }}>Planning to invest</span>
                </label>
                {showCommitment && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <InlineMetric id="expectedAmount" label="Expected Commitment (M)" value={fund.expectedAmount}
                      displayValue={fmtM(fund.expectedAmount, fund.currency)}
                      placeholder="—" onSave={v => patch({ expectedAmount: v })} />
                    <InlineMetric id="icDate" label="IC Date" value={fund.icDate}
                      displayValue={fmt(fund.icDate)} placeholder="YYYY-MM-DD" onSave={v => patch({ icDate: v || null })} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fund Details section */}
        {sectionHeader("Fund Details", "#64748b", <button onClick={() => setEditing(true)} style={{ ...btnGhost, padding: "0.1rem 0.45rem", fontSize: "0.65rem", color: "var(--tx5)" }}>Edit All</button>)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <InlineMetric id="vintage" label="Vintage" value={fund.vintage} placeholder="2024" onSave={v => patch({ vintage: v })} />
          <InlineMetric id="currency" label="Currency" value={fund.currency} placeholder="USD" onSave={v => patch({ currency: v })} />
          <InlineMetric id="fundSize" label="Fund Size (M)"
            value={fund.finalSize || fund.targetSize}
            displayValue={fmtM(fund.finalSize || fund.targetSize, fund.currency)}
            placeholder="—" onSave={v => patch({ finalSize: v })} />
          <DualMetric id="net-perf" label="Net Returns"
            val1={fund.netIrr}  disp1={fund.netIrr  ? `${parseFloat(fund.netIrr).toFixed(1)}%`  : null} ph1="Net IRR"
            val2={fund.netMoic} disp2={fund.netMoic ? `${parseFloat(fund.netMoic).toFixed(2)}x` : null} ph2="MOIC"
            onSave1={v => patch({ netIrr: v || null })} onSave2={v => patch({ netMoic: v || null })} readOnly />
          <DualMetric id="gross-perf" label="Gross Returns"
            val1={fund.grossIrr}  disp1={fund.grossIrr  ? `${parseFloat(fund.grossIrr).toFixed(1)}%`  : null} ph1="Gross IRR"
            val2={fund.grossMoic} disp2={fund.grossMoic ? `${parseFloat(fund.grossMoic).toFixed(2)}x` : null} ph2="MOIC"
            onSave1={v => patch({ grossIrr: v || null })} onSave2={v => patch({ grossMoic: v || null })} readOnly />
          <InlineMetric id="nextMarket" label="Next in Market" value={fund.nextMarket} placeholder="2027-Q2" onSave={v => patch({ nextMarket: v })} />
        </div>
        {fund.sectors?.length > 0 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>Sectors</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {fund.sectors.map(s => <SectorChip key={s} label={s} onClick={() => onTagClick && onTagClick("sector", s)} />)}
            </div>
          </div>
        )}

        {/* Investment */}
        {fund.invested && (
          <div style={{ background: "var(--invested-bg)", border: "1px solid var(--invested-bd)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem", color: "var(--invested-c)" }}>✓</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--invested-c)", fontWeight: 600, fontSize: "0.875rem" }}>
                Invested{fund.icDate ? ` · IC ${fmt(fund.icDate)}` : ""}
              </div>
              {fund.investmentAmount && <div style={{ color: "var(--invested-c)", fontSize: "0.8125rem", opacity: 0.8 }}>{Number(fund.investmentAmount).toLocaleString()}M commitment</div>}
            </div>
          </div>
        )}

        <NoteField value={fund.notes} onSave={v => patch({ notes: v })} />

        {/* Meetings */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ color: "var(--tx3)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Meetings ({fundMeetings.length})</div>
            <button onClick={() => onAddMeeting && onAddMeeting(fund.id)} style={{ ...btnGhost, fontSize: "0.75rem", color: "#60a5fa", borderColor: "#1d4ed8" }}>+ Log Meeting</button>
          </div>
          {fundMeetings.length === 0 && <div style={{ color: "var(--tx4)", fontSize: "0.875rem", textAlign: "center", padding: "1rem" }}>No meetings logged for this fund yet.</div>}
          {fundMeetings.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
              {fundMeetings.map((m, i) => (
                <div key={m.id} onClick={() => onMeetingClick(m)}
                  style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.75rem", borderBottom: i < fundMeetings.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ color: "var(--tx4)", flexShrink: 0, minWidth: "68px", fontSize: "0.72rem" }}>{fmt(m.date)}</span>
                  <span style={{ color: "var(--tx1)", fontWeight: 500, flex: "1 1 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.775rem" }}>{m.topic || "—"}</span>
                  <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>{m.type}</span>
                  {m.location && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.location}</span>}
                  {m.attendeesUs?.length > 0 && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.attendeesUs.join(", ")}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        </>}
      </div>
    </Overlay>
    </EditingContext.Provider>
  );
}
