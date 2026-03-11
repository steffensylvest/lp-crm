import React, { useState, useEffect, useRef } from "react";
import { btnGhost, btnPrimary } from '../theme.js';
import { fmtTs } from '../utils.js';
import {
  loadPendingProvenance, acceptProvenance, rejectProvenance, triggerPreqinSync,
  triggerPreqinPerformanceSync, triggerPreqinManagersSync,
  loadPreqinLinkSuggestions, ignorePreqinLinkSuggestion, patchFundField, searchPreqin, loadPreqinSeries,
  loadIgnoredPreqinSuggestions, unignorePreqinLinkSuggestion,
  getDuplicatePeople, mergePeople, getDuplicateFunds, mergeFunds,
} from '../api.js';

// ── ProvenancePill ─────────────────────────────────────────────────────────────
// Small badge shown after an accepted field value to indicate its source

export function ProvenancePill({ source = "Preqin" }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.6rem", fontWeight: 600, color: "var(--tx4)",
      border: "1px solid var(--border)", borderRadius: "4px", padding: "0.05rem 0.35rem",
      letterSpacing: "0.04em", verticalAlign: "middle", userSelect: "none",
    }}>
      {source}
    </span>
  );
}

// ── ProvenanceBanner ───────────────────────────────────────────────────────────
// Shown at the top of FundDetail / OrgDetail when the entity has pending suggestions

export function ProvenanceBanner({ rows = [] }) {
  const pending = rows.filter(r => r.status === "pending");
  if (pending.length === 0) return null;
  return (
    <div style={{
      background: "color-mix(in srgb, #f59e0b 8%, var(--card))",
      border: "1px solid color-mix(in srgb, #f59e0b 40%, var(--border))",
      borderRadius: "8px", padding: "0.55rem 1rem", marginBottom: "1rem",
      display: "flex", alignItems: "center", gap: "0.75rem",
    }}>
      <span style={{ color: "#f59e0b", fontSize: "0.85rem" }}>⚡</span>
      <span style={{ color: "var(--tx2)", fontSize: "0.8rem", flex: 1 }}>
        <strong style={{ color: "#f59e0b" }}>{pending.length}</strong>
        {" Preqin suggestion"}{pending.length !== 1 ? "s" : ""}{" pending review"}
      </span>
    </div>
  );
}

// ── Provenance ─────────────────────────────────────────────────────────────────
// Wraps any field value. Shows suggestion strip when a pending row exists for
// this field, and a source pill when accepted.
//
// Usage:
//   <Provenance rows={entityProvenanceRows} fieldName="net_irr"
//               onAccept={handleAccept} onReject={handleReject}>
//     <span>{fund.net_irr}%</span>
//   </Provenance>

export function Provenance({ rows = [], fieldName, onAccept, onReject, children }) {
  const pending  = rows.find(r => r.field_name === fieldName && r.status === "pending");
  const accepted = rows.find(r => r.field_name === fieldName && r.status === "accepted");
  const [acting, setActing] = useState(false);

  const handleAccept = async () => {
    if (!pending || acting) return;
    setActing(true);
    try { await onAccept(pending.id); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!pending || acting) return;
    setActing(true);
    try { await onReject(pending.id); }
    finally { setActing(false); }
  };

  return (
    <div>
      {/* Current value + optional accepted pill */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        {children}
        {accepted && !pending && <ProvenancePill />}
      </div>

      {/* Pending suggestion strip */}
      {pending && (
        <div style={{
          marginTop: "0.3rem", background: "color-mix(in srgb, #f59e0b 8%, var(--card))",
          border: "1px solid color-mix(in srgb, #f59e0b 35%, var(--border))",
          borderRadius: "6px", padding: "0.4rem 0.65rem",
          display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap",
        }}>
          <span style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>↳</span>
          <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>Preqin suggests:</span>
          <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.78rem" }}>{pending.value}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem", flexShrink: 0 }}>
            <button onClick={handleAccept} disabled={acting}
              style={{ background: "#22c55e", border: "none", borderRadius: "4px", color: "#fff",
                       padding: "0.2rem 0.55rem", fontSize: "0.7rem", fontWeight: 600, cursor: acting ? "wait" : "pointer", opacity: acting ? 0.6 : 1 }}>
              ✓ Accept
            </button>
            <button onClick={handleReject} disabled={acting}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: "4px",
                       color: "var(--tx4)", padding: "0.2rem 0.55rem", fontSize: "0.7rem", cursor: acting ? "wait" : "pointer", opacity: acting ? 0.6 : 1 }}>
              ✗ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PreqinLinkSuggestions ──────────────────────────────────────────────────────
// Suggests Preqin fund matches for unlinked funds.

function ConfidenceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.75 ? "#22c55e" : score >= 0.55 ? "#f59e0b" : "#94a3b8";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ width: "48px", height: "4px", borderRadius: "2px", background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px" }} />
      </div>
      <span style={{ color: "var(--tx5)", fontSize: "0.65rem", fontFamily: "monospace" }}>{pct}%</span>
    </div>
  );
}

// ── PreqinManualSearch ─────────────────────────────────────────────────────────
// Inline search panel shown when user clicks "Override" on a suggestion card.

function PreqinDetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.73rem" }}>
      <span style={{ color: "var(--tx5)", minWidth: "110px", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--tx2)" }}>{String(value)}</span>
    </div>
  );
}

function PreqinManualSearch({ fund, onAccept, onAssignSeries, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);      // fund_id of expanded details row
  const [seriesView, setSeriesView] = useState(null);  // { id, name, funds } | null
  const [seriesLoading, setSeriesLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setSeriesView(null); return; }
    timerRef.current = setTimeout(() => {
      setLoading(true);
      setSeriesView(null);
      searchPreqin(query)
        .then(r => setResults(r ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSeriesClick = (seriesId, seriesLabel) => {
    if (seriesView?.id === seriesId) { setSeriesView(null); return; }
    setSeriesLoading(true);
    loadPreqinSeries(seriesId)
      .then(funds => setSeriesView({ id: seriesId, name: seriesLabel, funds: funds ?? [] }))
      .catch(() => setSeriesView({ id: seriesId, name: seriesLabel, funds: [] }))
      .finally(() => setSeriesLoading(false));
  };

  return (
    <div style={{
      borderTop: "2px solid var(--border-hi)",
      background: "var(--subtle)",
    }}>
      {/* Search header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem 0.5rem" }}>
        <span style={{ color: "var(--tx3)", fontSize: "0.82rem", fontWeight: 600 }}>
          Search Preqin for "{fund.fund_name}"
        </span>
        <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: "0 1rem 0.75rem" }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by fund name or manager…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "6px", color: "var(--tx1)", padding: "0.5rem 0.85rem",
            fontSize: "0.88rem", outline: "none",
          }}
        />
      </div>

      {loading && <div style={{ color: "var(--tx5)", fontSize: "0.82rem", padding: "0.5rem 1rem 0.75rem" }}>Searching…</div>}
      {!loading && results.length === 0 && query.length >= 2 && !seriesView && (
        <div style={{ color: "var(--tx5)", fontSize: "0.82rem", padding: "0.5rem 1rem 0.75rem" }}>No results found.</div>
      )}

      {/* Series view: shown when user clicks a series badge */}
      {seriesView && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1rem", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--tx3)", fontSize: "0.78rem" }}>
              Series <strong>{seriesView.id}</strong> — {seriesView.funds.length} fund{seriesView.funds.length !== 1 ? "s" : ""}
            </span>
            {onAssignSeries && (
              <button
                onClick={() => onAssignSeries(seriesView.id)}
                title="Assign this series to the fund (no specific fund linked yet)"
                style={{ background: "#3b82f6", border: "none", borderRadius: "4px", color: "#fff", padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                Assign Series
              </button>
            )}
            <button onClick={() => setSeriesView(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.78rem" }}>← Back</button>
          </div>
          <div style={{ maxHeight: "480px", overflowY: "auto" }}>
            {seriesLoading && <div style={{ color: "var(--tx5)", fontSize: "0.82rem", padding: "1rem" }}>Loading…</div>}
            {seriesView.funds.map((r, i) => (
              <div key={r.fund_id} style={{ borderBottom: i < seriesView.funds.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.45rem 1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--tx1)", fontSize: "0.8rem", fontWeight: 600 }}>{r.name}</div>
                    <div style={{ color: "var(--tx4)", fontSize: "0.68rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.1rem" }}>
                      {r.vintage && <span>{r.vintage}</span>}
                      {r.strategy && <span>{r.strategy}</span>}
                      {r.asset_class && r.asset_class !== r.strategy && <span>{r.asset_class}</span>}
                      {r.final_size_usd && <span>${r.final_size_usd}M</span>}
                      <span style={{ color: "var(--tx5)" }}>#{r.fund_id}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onAccept(r)}
                    style={{ background: "#22c55e", border: "none", borderRadius: "4px", color: "#fff", padding: "0.15rem 0.6rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    ✓ Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal search results — grouped by series */}
      {!seriesView && results.length > 0 && (() => {
        // Build ordered groups: series funds sorted by vintage, ungrouped last
        const seriesMap = {};
        results.forEach(r => {
          const key = r.series_id || "__none__";
          if (!seriesMap[key]) seriesMap[key] = [];
          seriesMap[key].push(r);
        });
        // Within each group: sort by vintage ascending
        Object.values(seriesMap).forEach(funds =>
          funds.sort((a, b) => (parseInt(a.vintage) || 0) - (parseInt(b.vintage) || 0))
        );
        // Sort groups by their max relevance score (highest first), then alphabetically by manager
        const seriesOrder = Object.keys(seriesMap).sort((ka, kb) => {
          const maxRel = funds => Math.max(...funds.map(r => r.relevance ?? 0));
          const diff = maxRel(seriesMap[kb]) - maxRel(seriesMap[ka]);
          if (Math.abs(diff) > 0.01) return diff;
          return (seriesMap[ka][0]?.manager || "").localeCompare(seriesMap[kb][0]?.manager || "");
        });
        return (
          <div style={{ maxHeight: "520px", overflowY: "auto", borderTop: "1px solid var(--border)" }}>
            {seriesOrder.map(key => {
              const funds = seriesMap[key];
              const hasSeries = key !== "__none__";
              const manager = funds[0]?.manager;
              return (
                <div key={key}>
                  {/* Series header */}
                  {hasSeries && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.3rem 1rem", background: "var(--card)",
                      borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)",
                      position: "sticky", top: 0, zIndex: 1,
                    }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "var(--tx4)", background: "var(--subtle)", border: "1px solid var(--border-hi)", borderRadius: "3px", padding: "0.1rem 0.35rem" }}>
                        series:{key}
                      </span>
                      {manager && <span style={{ color: "var(--tx3)", fontSize: "0.72rem" }}>{manager}</span>}
                      <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "auto" }}>{funds.length} fund{funds.length !== 1 ? "s" : ""}</span>
                      <button
                        onClick={() => handleSeriesClick(key, manager || key)}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--tx4)", padding: "0.1rem 0.45rem", fontSize: "0.68rem", cursor: "pointer" }}>
                        Show all
                      </button>
                    </div>
                  )}
                  {/* Fund rows */}
                  {funds.map((r, i) => {
                    const isOpen = expanded === r.fund_id;
                    return (
                      <div key={r.fund_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.45rem 1rem", paddingLeft: hasSeries ? "1.5rem" : "1rem" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "var(--tx1)", fontSize: "0.8rem", fontWeight: 600 }}>{r.name}</div>
                            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.1rem" }}>
                              {!hasSeries && r.manager && <span style={{ color: "var(--tx3)" }}>{r.manager}</span>}
                              {r.vintage && <span>{r.vintage}</span>}
                              {r.strategy && <span>{r.strategy}</span>}
                              {r.asset_class && r.asset_class !== r.strategy && <span>{r.asset_class}</span>}
                              {r.final_size_usd && <span>${r.final_size_usd}M</span>}
                              <span style={{ color: "var(--tx5)" }}>#{r.fund_id}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                            <button
                              onClick={() => setExpanded(isOpen ? null : r.fund_id)}
                              style={{ background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--tx4)", padding: "0.15rem 0.45rem", fontSize: "0.68rem", cursor: "pointer" }}>
                              {isOpen ? "▲" : "▼"}
                            </button>
                            <button
                              onClick={() => onAccept(r)}
                              style={{ background: "#22c55e", border: "none", borderRadius: "4px", color: "#fff", padding: "0.15rem 0.6rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                              ✓ Link
                            </button>
                          </div>
                        </div>
                        {isOpen && (
                          <div style={{
                            borderTop: "1px solid var(--border)", padding: "0.5rem 1rem",
                            background: "var(--card)",
                            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.2rem 2rem",
                          }}>
                            <PreqinDetailRow label="Fund ID"          value={r.fund_id} />
                            <PreqinDetailRow label="Firm ID"          value={r.firm_id} />
                            <PreqinDetailRow label="Series ID"        value={r.series_id} />
                            <PreqinDetailRow label="Manager"          value={r.manager} />
                            <PreqinDetailRow label="Strategy"         value={r.strategy} />
                            <PreqinDetailRow label="Asset Class"      value={r.asset_class} />
                            <PreqinDetailRow label="Status"           value={r.status} />
                            <PreqinDetailRow label="Vintage"          value={r.vintage} />
                            <PreqinDetailRow label="Currency"         value={r.currency} />
                            <PreqinDetailRow label="Final Size (USD)" value={r.final_size_usd ? `$${r.final_size_usd}M` : null} />
                            <PreqinDetailRow label="Target Size"      value={r.target_size_usd ? `$${r.target_size_usd}M` : null} />
                            <PreqinDetailRow label="Geography"        value={r.geo_focus} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function PreqinLinkSuggestions({ onAccepted, displayOrgs = [] }) {
  const [suggestions, setSuggestions] = useState(null);
  const [acting, setActing] = useState({});
  const [overrideFor, setOverrideFor] = useState(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [ignoredItems, setIgnoredItems] = useState(null); // null = not loaded
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [searchingUnlinked, setSearchingUnlinked] = useState(null); // fund.id
  const [linkedInSession, setLinkedInSession] = useState(new Set()); // fund ids linked this session

  const load = () => {
    loadPreqinLinkSuggestions()
      .then(d => setSuggestions(d ?? []))
      .catch(() => setSuggestions([]));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showIgnored && ignoredItems === null) {
      loadIgnoredPreqinSuggestions()
        .then(d => setIgnoredItems(d ?? []))
        .catch(() => setIgnoredItems([]));
    }
  }, [showIgnored]);

  const linkFund = async (fundId, preqin) => {
    await patchFundField(fundId, 'preqin_fund_id', preqin.fund_id);
    await patchFundField(fundId, 'preqin_series_id', preqin.series_id);
    setSuggestions(prev => (prev ?? []).filter(x => x.fund_id !== fundId));
    setLinkedInSession(prev => new Set([...prev, fundId]));
    setOverrideFor(null);
    onAccepted && onAccepted(fundId, preqin.fund_id, preqin.series_id);
  };

  const linkUnlinkedFund = async (fund, preqin) => {
    await patchFundField(fund.id, 'preqin_fund_id', preqin.fund_id);
    if (preqin.series_id) await patchFundField(fund.id, 'preqin_series_id', preqin.series_id);
    setLinkedInSession(prev => new Set([...prev, fund.id]));
    setSearchingUnlinked(null);
    load(); // reload — siblings may now match via series chain
    onAccepted && onAccepted(fund.id, preqin.fund_id, preqin.series_id);
  };

  const assignUnlinkedSeries = async (fund, seriesId) => {
    await patchFundField(fund.id, 'preqin_series_id', seriesId);
    setSearchingUnlinked(null);
    load();
  };

  const assignSeries = async (fundId, seriesId) => {
    await patchFundField(fundId, 'preqin_series_id', seriesId);
    setOverrideFor(null);
    // Re-load suggestions — the fund now has a series, may change matches
    load();
  };

  const handleAccept = async (s) => {
    setActing(a => ({ ...a, [s.fund_id]: "accept" }));
    try { await linkFund(s.fund_id, s.preqin); }
    catch (err) { console.error("Accept failed", err); }
    finally { setActing(a => { const n = { ...a }; delete n[s.fund_id]; return n; }); }
  };

  const handleIgnore = async (s) => {
    setActing(a => ({ ...a, [s.fund_id]: "ignore" }));
    try {
      await ignorePreqinLinkSuggestion(s.fund_id, s.preqin.fund_id);
      setSuggestions(prev => (prev ?? []).filter(x => x.fund_id !== s.fund_id));
      setIgnoredItems(null); // reset so it reloads if panel reopened
    } catch (err) {
      console.error("Ignore failed", err);
    } finally {
      setActing(a => { const n = { ...a }; delete n[s.fund_id]; return n; });
    }
  };

  const handleUnignore = async (item) => {
    await unignorePreqinLinkSuggestion(item.fund_id, item.preqin_fund_id).catch(() => {});
    setIgnoredItems(prev => (prev ?? []).filter(x => x.id !== item.id));
    // Re-load suggestions so the un-ignored pair may reappear
    load();
  };

  const sectionHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", marginTop: "2rem" }}>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
      <span style={{ color: "var(--tx3)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        Preqin Fund Mapping Suggestions
      </span>
      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
    </div>
  );

  if (suggestions === null) return <>{sectionHeader}<div style={{ color: "var(--tx5)", fontSize: "0.82rem", padding: "1rem 0" }}>Loading suggestions…</div></>;

  return (
    <>
      {sectionHeader}

      {/* Toolbar row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <span style={{ color: "var(--tx4)", fontSize: "0.78rem" }}>
          {suggestions.length === 0 ? "No mapping suggestions — all funds are linked or no matches found." : `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} · sorted by confidence`}
        </span>
        <button
          onClick={() => setShowIgnored(v => !v)}
          style={{ marginLeft: "auto", background: showIgnored ? "var(--subtle)" : "none", border: "1px solid var(--border)", borderRadius: "5px", color: showIgnored ? "var(--tx2)" : "var(--tx4)", padding: "0.2rem 0.6rem", fontSize: "0.72rem", cursor: "pointer" }}>
          {showIgnored ? "Hide ignored" : "Show ignored"}
        </button>
      </div>

      {/* Ignored items panel */}
      {showIgnored && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", marginBottom: "1rem", overflow: "hidden" }}>
          <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)", background: "var(--subtle)" }}>
            <span style={{ color: "var(--tx3)", fontSize: "0.75rem", fontWeight: 600 }}>Ignored suggestions</span>
            <span style={{ color: "var(--tx5)", fontSize: "0.7rem", marginLeft: "0.5rem" }}>· re-surface automatically after 90 days</span>
          </div>
          {ignoredItems === null && <div style={{ color: "var(--tx5)", fontSize: "0.78rem", padding: "0.75rem 1rem" }}>Loading…</div>}
          {ignoredItems !== null && ignoredItems.length === 0 && (
            <div style={{ color: "var(--tx5)", fontSize: "0.78rem", padding: "0.75rem 1rem" }}>No ignored suggestions.</div>
          )}
          {(ignoredItems ?? []).map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.45rem 1rem", borderBottom: i < ignoredItems.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: "var(--tx2)", fontSize: "0.78rem", fontWeight: 600 }}>{item.fund_name}</span>
                <span style={{ color: "var(--tx5)", fontSize: "0.72rem", margin: "0 0.4rem" }}>→</span>
                <span style={{ color: "var(--tx3)", fontSize: "0.78rem" }}>{item.preqin_name}</span>
                {item.stale && <span title="Ignored >90 days ago — will resurface on next load" style={{ marginLeft: "0.5rem", color: "#f59e0b", fontSize: "0.65rem", fontWeight: 600 }}>⚠ stale</span>}
              </div>
              <span style={{ color: "var(--tx5)", fontSize: "0.68rem", flexShrink: 0 }}>
                {item.ignored_at ? new Date(item.ignored_at).toLocaleDateString() : ""}
              </span>
              <button
                onClick={() => handleUnignore(item)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--tx4)", padding: "0.15rem 0.5rem", fontSize: "0.68rem", cursor: "pointer", flexShrink: 0 }}>
                Un-ignore
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Suggestion cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {suggestions.map(s => {
          const busy = !!acting[s.fund_id];
          const p = s.preqin;
          const isOverriding = overrideFor === s.fund_id;
          return (
            <div key={s.fund_id} style={{
              background: "var(--card)", border: `1px solid ${isOverriding ? "var(--border-hi)" : "var(--border)"}`,
              borderRadius: "10px", overflow: "hidden",
              opacity: busy ? 0.5 : 1,
            }}>
              {/* Main row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "center", padding: "0.75rem 1rem" }}>
                {/* Left: our fund */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "var(--tx5)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.15rem" }}>Our fund</div>
                  <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.fund_name}</div>
                  <div style={{ color: "var(--tx4)", fontSize: "0.72rem", marginTop: "0.1rem" }}>
                    {s.org_name && <span style={{ marginRight: "0.5rem" }}>{s.org_name}</span>}
                    {s.fund_series && <span style={{ marginRight: "0.5rem" }}>Series: <strong>{s.fund_series}</strong></span>}
                    {s.fund_vintage && <span>Vintage: {s.fund_vintage}</span>}
                    {s.preqin_series_id && <span style={{ marginLeft: "0.5rem", fontFamily: "monospace", fontSize: "0.65rem", color: "var(--tx5)" }}>series:{s.preqin_series_id}</span>}
                  </div>
                </div>

                {/* Middle: Preqin candidate */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
                    <div style={{ color: "var(--tx5)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Suggested match</div>
                    <ConfidenceBar score={s.score} />
                  </div>
                  <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ color: "var(--tx4)", fontSize: "0.72rem", marginTop: "0.1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {p.manager && <span>{p.manager}</span>}
                    {p.vintage && <span>· {p.vintage}</span>}
                    {p.strategy && <span>· {p.strategy}</span>}
                    {p.asset_class && p.asset_class !== p.strategy && <span>· {p.asset_class}</span>}
                    {p.final_size_usd && <span>· ${p.final_size_usd}M</span>}
                  </div>
                  <div style={{ color: "var(--tx5)", fontSize: "0.65rem", marginTop: "0.15rem", fontStyle: "italic" }}>{s.reason}</div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "stretch", flexShrink: 0, minWidth: "84px" }}>
                  <button
                    onClick={() => handleAccept(s)} disabled={busy}
                    style={{ background: "#22c55e", border: "none", borderRadius: "5px", color: "#fff",
                             padding: "0.3rem 0.6rem", fontSize: "0.72rem", fontWeight: 600,
                             cursor: busy ? "wait" : "pointer" }}>
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => setOverrideFor(isOverriding ? null : s.fund_id)} disabled={busy}
                    style={{ background: isOverriding ? "var(--subtle)" : "none",
                             border: `1px solid ${isOverriding ? "var(--border-hi)" : "var(--border)"}`,
                             borderRadius: "5px", color: isOverriding ? "var(--tx2)" : "var(--tx4)",
                             padding: "0.3rem 0.6rem", fontSize: "0.72rem", cursor: busy ? "wait" : "pointer" }}>
                    {isOverriding ? "✕ Cancel" : "Search"}
                  </button>
                  <button
                    onClick={() => handleIgnore(s)} disabled={busy}
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "5px",
                             color: "var(--tx5)", padding: "0.3rem 0.6rem", fontSize: "0.72rem",
                             cursor: busy ? "wait" : "pointer" }}>
                    Ignore
                  </button>
                </div>
              </div>

              {/* Inline manual search panel */}
              {isOverriding && (
                <PreqinManualSearch
                  fund={s}
                  onAccept={(preqinRow) => linkFund(s.fund_id, preqinRow)}
                  onAssignSeries={(seriesId) => assignSeries(s.fund_id, seriesId)}
                  onClose={() => setOverrideFor(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Unlinked funds section ─────────────────────────────────────────── */}
      {(() => {
        const suggestionIds = new Set((suggestions ?? []).map(s => String(s.fund_id)));
        const unlinkedFunds = displayOrgs
          .flatMap(org => (org.funds || []).map(f => ({ ...f, orgName: org.name })))
          .filter(f => !f.preqinFundId && !suggestionIds.has(String(f.id)) && !linkedInSession.has(f.id))
          .sort((a, b) => (a.orgName + a.name).localeCompare(b.orgName + b.name));

        if (unlinkedFunds.length === 0) return null;
        return (
          <>
            {/* Section divider + toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "2rem", marginBottom: "0.75rem" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <button
                onClick={() => setShowUnlinked(v => !v)}
                style={{ background: showUnlinked ? "var(--subtle)" : "none", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--tx4)", padding: "0.25rem 0.75rem", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                {showUnlinked ? "Hide" : "Show"} {unlinkedFunds.length} fund{unlinkedFunds.length !== 1 ? "s" : ""} with no Preqin match
              </button>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            {showUnlinked && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                {unlinkedFunds.map((f, i) => {
                  const isSearching = searchingUnlinked === f.id;
                  const pseudoFund = { fund_id: f.id, fund_name: f.name, fund_series: f.series, fund_vintage: f.vintage };
                  return (
                    <div key={f.id} style={{ borderBottom: i < unlinkedFunds.length - 1 ? "1px solid var(--border)" : "none" }}>
                      {/* Fund row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: "var(--tx1)", fontSize: "0.82rem", fontWeight: 600 }}>{f.name}</span>
                          <span style={{ color: "var(--tx5)", fontSize: "0.72rem", margin: "0 0.4rem" }}>·</span>
                          <span style={{ color: "var(--tx4)", fontSize: "0.75rem" }}>{f.orgName}</span>
                          <span style={{ color: "var(--tx5)", fontSize: "0.72rem", marginLeft: "0.6rem" }}>
                            {[f.vintage, f.series].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        <button
                          onClick={() => setSearchingUnlinked(isSearching ? null : f.id)}
                          style={{ background: isSearching ? "var(--subtle)" : "none", border: `1px solid ${isSearching ? "var(--border-hi)" : "var(--border)"}`, borderRadius: "5px", color: isSearching ? "var(--tx2)" : "var(--tx4)", padding: "0.2rem 0.6rem", fontSize: "0.72rem", cursor: "pointer", flexShrink: 0 }}>
                          {isSearching ? "✕ Cancel" : "Search"}
                        </button>
                      </div>
                      {/* Inline search */}
                      {isSearching && (
                        <PreqinManualSearch
                          fund={pseudoFund}
                          onAccept={preqinRow => linkUnlinkedFund(f, preqinRow)}
                          onAssignSeries={seriesId => assignUnlinkedSeries(f, seriesId)}
                          onClose={() => setSearchingUnlinked(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </>
  );
}

// ── PeopleMergeTab ─────────────────────────────────────────────────────────────

function PeopleMergeTab() {
  const [groups, setGroups] = useState(null);
  const [merging, setMerging] = useState({}); // groupKey → true

  useEffect(() => {
    getDuplicatePeople()
      .then(data => setGroups((data ?? []).map(g => g.people)))
      .catch(() => setGroups([]));
  }, []);

  const handleMerge = async (group, keepId) => {
    const key = group.map(p => p.id).join(",");
    setMerging(m => ({ ...m, [key]: true }));
    try {
      const mergeIds = group.filter(p => p.id !== keepId).map(p => p.id);
      await mergePeople(keepId, mergeIds);
      setGroups(prev => (prev ?? []).filter(g => g.map(p => p.id).join(",") !== key));
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setMerging(m => { const n = { ...m }; delete n[key]; return n; });
    }
  };

  if (groups === null) return <div style={{ color: "var(--tx5)", textAlign: "center", padding: "3rem" }}>Loading…</div>;
  if (groups.length === 0) return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
      <div style={{ color: "var(--tx2)", fontWeight: 600, marginBottom: "0.3rem" }}>No duplicate people found</div>
      <div style={{ color: "var(--tx4)", fontSize: "0.825rem" }}>Duplicates are detected by matching normalized full names.</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {groups.map(group => {
        const key = group.map(p => p.id).join(",");
        const busy = !!merging[key];
        return (
          <MergeGroupCard key={key} busy={busy}
            title={`${group[0].first_name ?? ""} ${group[0].last_name ?? ""}`.trim() || "Unknown"}
            subtitle={`${group.length} duplicates`}
            items={group}
            renderItem={p => (
              <div>
                <span style={{ color: "var(--tx1)", fontWeight: 500, fontSize: "0.825rem" }}>
                  {p.first_name ?? ""} {p.last_name ?? ""}
                </span>
                {p.title && <span style={{ color: "var(--tx4)", fontSize: "0.75rem", marginLeft: "0.4rem" }}>· {p.title}</span>}
                {p.email && <span style={{ color: "var(--tx5)", fontSize: "0.7rem", marginLeft: "0.4rem" }}>{p.email}</span>}
                {p.org_name && <span style={{ color: "var(--tx4)", fontSize: "0.7rem", marginLeft: "0.4rem" }}>@ {p.org_name}</span>}
              </div>
            )}
            getItemId={p => p.id}
            onMerge={(keepId) => handleMerge(group, keepId)}
          />
        );
      })}
    </div>
  );
}

// ── FundsMergeTab ──────────────────────────────────────────────────────────────

function FundsMergeTab() {
  const [groups, setGroups] = useState(null);
  const [merging, setMerging] = useState({});

  useEffect(() => {
    getDuplicateFunds()
      .then(data => setGroups((data ?? []).map(g => g.funds)))
      .catch(() => setGroups([]));
  }, []);

  const handleMerge = async (group, keepId) => {
    const key = group.map(f => f.id).join(",");
    setMerging(m => ({ ...m, [key]: true }));
    try {
      const mergeIds = group.filter(f => f.id !== keepId).map(f => f.id);
      await mergeFunds(keepId, mergeIds);
      setGroups(prev => (prev ?? []).filter(g => g.map(f => f.id).join(",") !== key));
    } catch (err) {
      console.error("Fund merge failed:", err);
    } finally {
      setMerging(m => { const n = { ...m }; delete n[key]; return n; });
    }
  };

  if (groups === null) return <div style={{ color: "var(--tx5)", textAlign: "center", padding: "3rem" }}>Loading…</div>;
  if (groups.length === 0) return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
      <div style={{ color: "var(--tx2)", fontWeight: 600, marginBottom: "0.3rem" }}>No duplicate funds found</div>
      <div style={{ color: "var(--tx4)", fontSize: "0.825rem" }}>Duplicates are detected by matching normalized fund names.</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {groups.map(group => {
        const key = group.map(f => f.id).join(",");
        const busy = !!merging[key];
        return (
          <MergeGroupCard key={key} busy={busy}
            title={group[0].name ?? "Unknown"}
            subtitle={`${group.length} duplicates`}
            items={group}
            renderItem={f => (
              <div>
                <span style={{ color: "var(--tx1)", fontWeight: 500, fontSize: "0.825rem" }}>{f.name}</span>
                {f.vintage && <span style={{ color: "var(--tx5)", fontSize: "0.7rem", marginLeft: "0.4rem" }}>{f.vintage}</span>}
                {f.org?.name && <span style={{ color: "var(--tx4)", fontSize: "0.7rem", marginLeft: "0.4rem" }}>· {f.org.name}</span>}
              </div>
            )}
            getItemId={f => f.id}
            onMerge={(keepId) => handleMerge(group, keepId)}
          />
        );
      })}
    </div>
  );
}

// ── MergeGroupCard ─────────────────────────────────────────────────────────────
// Reusable card for showing a group of duplicates with radio-select + merge button

function MergeGroupCard({ title, subtitle, items, renderItem, getItemId, onMerge, busy }) {
  const [keepId, setKeepId] = useState(getItemId(items[0]));
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem",
                    borderBottom: "1px solid var(--border)", background: "var(--subtle)" }}>
        <div style={{ flex: 1 }}>
          <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem" }}>{title}</span>
          <span style={{ color: "var(--tx4)", fontSize: "0.72rem", marginLeft: "0.5rem",
                         background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px",
                         padding: "0.05rem 0.4rem" }}>{subtitle}</span>
        </div>
        <button onClick={() => onMerge(keepId)} disabled={busy}
          style={{ background: busy ? "var(--subtle)" : "#3b82f6", border: "none", borderRadius: "6px", color: busy ? "var(--tx4)" : "#fff",
                   padding: "0.3rem 0.85rem", fontSize: "0.78rem", fontWeight: 600, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Merging…" : "Merge →"}
        </button>
      </div>
      <div>
        {items.map((item, i) => {
          const id = getItemId(item);
          const isKeep = keepId === id;
          return (
            <div key={id} onClick={() => setKeepId(id)}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 1.25rem",
                       borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none",
                       cursor: "pointer", background: isKeep ? "color-mix(in srgb, #3b82f6 6%, var(--card))" : "transparent" }}>
              <div style={{ flexShrink: 0, width: "14px", height: "14px", borderRadius: "50%",
                             border: `2px solid ${isKeep ? "#3b82f6" : "var(--border)"}`,
                             background: isKeep ? "#3b82f6" : "transparent",
                             display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isKeep && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fff" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item)}</div>
              {isKeep && <span style={{ color: "#3b82f6", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0 }}>KEEP</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DataReviewView ─────────────────────────────────────────────────────────────
// Global view: all pending Preqin suggestions grouped by entity.
// Allows bulk review + sync trigger.

export function DataReviewView({ onBack, displayOrgs = [], onEntityClick, onFundLinked }) {
  const [tab, setTab] = useState("provenance"); // provenance | links | people | funds
  const [rows, setRows]       = useState(null); // null = loading
  const [syncing, setSyncing] = useState(null); // null | "Funds" | "Performance" | "Managers"
  const [syncMsg, setSyncMsg] = useState(null);

  const load = () => {
    loadPendingProvenance()
      .then(data => setRows(data ?? []))
      .catch(() => setRows([]));
  };

  useEffect(() => { load(); }, []);

  // All funds flat (to look up names)
  const allFunds = displayOrgs.flatMap(o => (o.funds || []).map(f => ({ ...f, orgName: o.name })));

  // Entity name lookup
  const entityName = (entityType, entityId) => {
    if (entityType === "fund") {
      const f = allFunds.find(f => String(f.id) === String(entityId));
      return f ? `${f.orgName} — ${f.name}` : `Fund ${entityId}`;
    }
    const o = displayOrgs.find(o => String(o.id) === String(entityId));
    return o ? o.name : `Org ${entityId}`;
  };

  // Group pending rows by entity
  const pending = (rows ?? []).filter(r => r.status === "pending");
  const groups = pending.reduce((acc, row) => {
    const key = `${row.entity_type}::${row.entity_id}`;
    if (!acc[key]) acc[key] = { entity_type: row.entity_type, entity_id: row.entity_id, rows: [] };
    acc[key].rows.push(row);
    return acc;
  }, {});
  const groupList = Object.values(groups);

  const handleSync = async (syncFn, label) => {
    setSyncing(label);
    setSyncMsg(null);
    try {
      const result = await syncFn();
      const created = result?.provenance_created ?? 0;
      const updated = result?.provenance_updated ?? 0;
      const matched = (result?.rows_matched_fund ?? 0) + (result?.rows_matched_org ?? 0);
      setSyncMsg(`${label}: ${matched} matched · ${created} new · ${updated} updated`);
      load();
    } catch (err) {
      setSyncMsg(`${label} failed — check server logs`);
    } finally {
      setSyncing(null);
    }
  };

  const handleAccept = async (id) => {
    await acceptProvenance(id, "Me").catch(() => {});
    setRows(prev => (prev ?? []).map(r => r.id === id ? { ...r, status: "accepted", accepted_at: new Date().toISOString() } : r));
  };

  const handleReject = async (id) => {
    await rejectProvenance(id, "Me").catch(() => {});
    setRows(prev => (prev ?? []).filter(r => r.id !== id));
  };

  const TAB = (id, label) => (
    <button onClick={() => setTab(id)} style={{
      background: tab === id ? "var(--subtle)" : "none",
      border: tab === id ? "1px solid var(--border-hi)" : "1px solid transparent",
      borderRadius: "6px", color: tab === id ? "var(--tx1)" : "var(--tx4)",
      padding: "0.35rem 0.9rem", fontSize: "0.8125rem", cursor: "pointer", fontWeight: tab === id ? 600 : 400,
    }}>{label}</button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>Data Review</h2>
          <div style={{ color: "var(--tx4)", fontSize: "0.8125rem" }}>
            {tab === "provenance" && (rows === null ? "Loading…" : `${pending.length} pending suggestion${pending.length !== 1 ? "s" : ""} from Preqin`)}
          </div>
        </div>
        {tab === "provenance" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {syncMsg && <span style={{ color: "var(--tx4)", fontSize: "0.78rem" }}>{syncMsg}</span>}
            {[
              ["Funds",       triggerPreqinSync],
              ["Performance", triggerPreqinPerformanceSync],
              ["Managers",    triggerPreqinManagersSync],
            ].map(([label, fn]) => (
              <button key={label} onClick={() => handleSync(fn, label)} disabled={!!syncing}
                style={{ ...btnPrimary, opacity: syncing ? 0.6 : 1, cursor: syncing ? "wait" : "pointer" }}>
                {syncing === label ? "Syncing…" : `Sync ${label}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {TAB("provenance", `Provenance${pending.length > 0 ? ` (${pending.length})` : ""}`)}
        {TAB("links", "Link Suggestions")}
        {TAB("people", "People")}
        {TAB("funds", "Funds")}
      </div>

      {/* Provenance tab */}
      {tab === "provenance" && <>
        {rows === null && (
          <div style={{ color: "var(--tx5)", textAlign: "center", padding: "3rem" }}>Loading…</div>
        )}
        {rows !== null && groupList.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
            <div style={{ color: "var(--tx2)", fontWeight: 600, marginBottom: "0.3rem" }}>No pending suggestions</div>
            <div style={{ color: "var(--tx4)", fontSize: "0.825rem" }}>Use the Sync buttons above to import suggestions from Preqin.</div>
          </div>
        )}
        <div style={{ display: "grid", gap: "1rem" }}>
          {groupList.map(group => {
            const name = entityName(group.entity_type, group.entity_id);
            const entity = group.entity_type === "fund"
              ? allFunds.find(f => String(f.id) === String(group.entity_id))
              : displayOrgs.find(o => String(o.id) === String(group.entity_id));
            return (
              <div key={`${group.entity_type}::${group.entity_id}`}
                style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem",
                              borderBottom: "1px solid var(--border)", background: "var(--subtle)" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem" }}>{name}</span>
                    <span style={{ color: "var(--tx4)", fontSize: "0.72rem", marginLeft: "0.5rem",
                                   background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px",
                                   padding: "0.05rem 0.4rem" }}>{group.rows.length} pending</span>
                    <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "0.5rem", textTransform: "capitalize" }}>{group.entity_type}</span>
                  </div>
                  {onEntityClick && entity && (
                    <button onClick={() => onEntityClick(group.entity_type, entity)} style={{ ...btnGhost, fontSize: "0.75rem" }}>Open →</button>
                  )}
                </div>
                {group.rows.map((row, i) => (
                  <div key={row.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1.25rem",
                             borderBottom: i < group.rows.length - 1 ? "1px solid var(--border)" : "none", flexWrap: "wrap" }}>
                    <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                      <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {row.field_name.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div style={{ flex: "1 1 0", minWidth: 0 }}>
                      <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.825rem" }}>{row.value}</span>
                      {row.proposed_at && (
                        <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "0.5rem" }}>{fmtTs(row.proposed_at)}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <button onClick={() => handleAccept(row.id)}
                        style={{ background: "#22c55e", border: "none", borderRadius: "5px", color: "#fff",
                                 padding: "0.25rem 0.65rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>✓ Accept</button>
                      <button onClick={() => handleReject(row.id)}
                        style={{ background: "none", border: "1px solid var(--border)", borderRadius: "5px",
                                 color: "var(--tx4)", padding: "0.25rem 0.65rem", fontSize: "0.75rem", cursor: "pointer" }}>✗ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </>}

      {/* Link suggestions tab */}
      {tab === "links" && <PreqinLinkSuggestions displayOrgs={displayOrgs} onAccepted={onFundLinked} />}

      {/* People merge tab */}
      {tab === "people" && <PeopleMergeTab />}

      {/* Funds merge tab */}
      {tab === "funds" && <FundsMergeTab />}
    </div>
  );
}
