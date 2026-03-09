import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadLookups, loadTaxonomy, loadOrganizations, patchOrganizationField, patchFundField, loadMeetings, loadPendingProvenance, acceptProvenance, rejectProvenance } from "./api.js";
import { DARK, LIGHT, btnGhost } from './theme.js';
import { SCORE_CONFIG, PIPELINE_STAGES, STATUS_OPTIONS, SHORTCUTS } from './constants.js';
import { uid, now } from './utils.js';

import { Overlay, OverlayHeader } from './components/Overlay.jsx';
import { GPDetailOverlay } from './components/GPDetail.jsx';
import { FundDetailOverlay } from './components/FundDetail.jsx';
import { MeetingDetailOverlay } from './components/MeetingDetail.jsx';
import { PipelineBoard } from './components/PipelineBoard.jsx';
import { FilterDropdown } from './components/FilterDropdown.jsx';
import { DenseTable } from './components/DenseTable.jsx';
import { AllMeetingsView, AllFundsView, TagFilterView, GradeAView, FundraisingView } from './components/Views.jsx';
import { DashboardView } from './components/DashboardView.jsx';
import { GlobalSearch } from './components/GlobalSearch.jsx';
import { SmartAddModal, StatCard } from './components/SmartAdd.jsx';
import { GPForm, MeetingForm } from './components/Forms.jsx';
import { SettingsContext } from './settingsContext.js';
import { SettingsView } from './components/SettingsView.jsx';
import { PlacementAgentDetailOverlay } from './components/PlacementAgentDetail.jsx';
import { DataReviewView, ProvenanceBanner } from './components/DataReview.jsx';

// ─── v2 → display-compatible normalizers ─────────────────────────────────────
// These convert v2 API shapes to the format DenseTable/GPDetail expect.
// Old-format data passes through unchanged (the fields it needs already exist).

function normalizeV2Fund(f) {
  return {
    ...f,
    _v2: true,
    // Flatten lookup objects → primitives (legacy rendering compat)
    score:  f.rating?.code  ?? f.score  ?? null,
    status: f.status?.label ?? (typeof f.status === 'string' ? f.status : null),
    // Preserved lookup objects for item-aware pickers/badges
    _rating:        f.rating,
    _status:        f.status,
    _pipelineStage: f.pipeline_stage,
    // camelCase aliases for v2 snake_case fields
    raisedSize:       f.raised_size       ?? f.raisedSize       ?? null,
    targetSize:       f.target_size       ?? f.targetSize       ?? null,
    hardCap:          f.hard_cap          ?? f.hardCap          ?? null,
    finalSize:        f.final_size        ?? f.finalSize        ?? null,
    launchDate:       f.launch_date       ?? f.launchDate       ?? null,
    firstCloseDate:   f.first_close_date  ?? f.firstCloseDate   ?? null,
    nextCloseDate:    f.next_close_date   ?? f.nextCloseDate    ?? null,
    finalCloseDate:   f.final_close_date  ?? f.finalCloseDate   ?? null,
    raisedDate:       f.raised_date       ?? f.raisedDate       ?? null,
    netIrr:           f.net_irr           ?? f.netIrr           ?? null,
    netMoic:          f.net_moic          ?? f.netMoic          ?? null,
    grossIrr:         f.gross_irr         ?? f.grossIrr         ?? null,
    grossMoic:        f.gross_moic        ?? f.grossMoic        ?? null,
    undrawnValue:     f.undrawn_value     ?? f.undrawnValue     ?? null,
    perfDate:         f.perf_date         ?? f.perfDate         ?? null,
    icDate:           f.ic_date           ?? f.icDate           ?? null,
    expectedAmount:   f.expected_amount   ?? f.expectedAmount   ?? null,
    investmentAmount: f.investment_amount ?? f.investmentAmount ?? null,
    nextMarket:       f.next_market       ?? f.nextMarket       ?? null,
    subStrategy:      f.sub_strategy      ?? f.subStrategy      ?? null,
  };
}

function normalizeV2Org(org) {
  return {
    ...org,
    // DenseTable / GPDetail compat fields
    score:         org.rating?.code ?? null,
    hq:            null,   // v2 stores geography as a taxonomy FK, not plain text
    contact:       null,
    contactEmail:  null,
    notes:         org.notes_text ?? "",
    meetings:      [],     // loaded lazily in OrgDetail
    funds:         (org.funds || []).map(normalizeV2Fund),
    // v2 extras preserved for OrgDetail
    _rating:       org.rating,
    _v2:           true,
  };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lp-crm-theme') !== 'light');
  const theme = darkMode ? DARK : LIGHT;
  useEffect(() => { localStorage.setItem('lp-crm-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);

  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lp-crm-settings') ?? '{}'); } catch { return {}; }
  });
  // Legacy data stub — gps/pipeline/placementAgents used only when !useV2; no API call
  const [data, setData] = useState({ gps: [], pipeline: [], todos: [], placementAgents: [] });
  const [view, setView] = useState("home"); // home | allMeetings | allFunds | gradeA | fundraising | pipeline | tagFilter | dashboard
  const [prevView, setPrevView] = useState("home");
  const [tagFilter, setTagFilter] = useState(null); // { type, value }

  // v2 API state — loaded alongside legacy data
  const [lookups, setLookups] = useState(null);       // { categories: [...], items_by_category: {...} }
  const [taxonomy, setTaxonomy] = useState(null);     // { geography: [...], strategy: [...], sector: [...], target_market: [...] }
  const [organizations, setOrganizations] = useState(null); // [org, ...]
  const [provenance, setProvenance] = useState([]);   // FieldProvenance rows (all statuses)
  // Derived: true when v2 organizations have loaded — drives dual-track UI
  const useV2 = !!organizations;

  const [search, setSearch] = useState("");
  const [scoreF, setScoreF] = useState([]);    // multi-select arrays; empty = all
  const [stratF, setStratF] = useState([]);
  const [statusF, setStatusF] = useState([]);
  const [ownerF, setOwnerF] = useState([]);
  const [condensed, setCondensed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Overlays
  const [gpOverlay, setGpOverlay] = useState(null);    // gp object
  const [fundOverlay, setFundOverlay] = useState(null); // { fund, gp }
  const [meetingOverlay, setMeetingOverlay] = useState(null); // { meeting, gp }
  const [paOverlay, setPaOverlay] = useState(null);     // placement agent object
  const [showAddNew, setShowAddNew] = useState(false); // replaces showAddGP
  const [showAddGP, setShowAddGP] = useState(false);
  const [logMeeting, setLogMeeting] = useState(null); // { gp, fundId? } — app-level meeting logger
  const [editMeeting, setEditMeeting] = useState(null); // { gp, meeting } — edit existing meeting

  // Z-index stack — tracks which modal opened last so it's always on top
  const [modalZs, setModalZs] = useState({});
  const zSeq = useRef(1000);
  const openModal  = (name) => { zSeq.current += 500; setModalZs(prev => ({ ...prev, [name]: zSeq.current })); };
  const closeModal = (name) => { setModalZs(prev => { const n = { ...prev }; delete n[name]; return n; }); };
  const zOf = (name) => modalZs[name] ?? 1000;

  const searchRef = useRef(null);
  // Tracks whether a fund overlay inline card is currently being edited
  // so Esc can cancel just that edit without closing anything else
  const fundInlineEditingRef = useRef(false);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lp-crm-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Load v2 data — failures are non-fatal (UI falls back to hardcoded constants)
    loadLookups().then(cats => {
      // Index items by slug: "lc_pipeline_stage" → "pipeline-stage"
      const byCategory = {};
      cats.forEach(cat => {
        const key = cat.id.replace(/^lc_/, '').replace(/_/g, '-');
        byCategory[key] = cat.items;
      });
      setLookups({ categories: cats, items_by_category: byCategory });
    }).catch(() => {});
    Promise.all([
      loadTaxonomy('geography'),
      loadTaxonomy('strategy'),
      loadTaxonomy('sector'),
      loadTaxonomy('target_market'),
    ]).then(([geography, strategy, sector, target_market]) =>
      setTaxonomy({ geography, strategy, sector, target_market })
    ).catch(() => {});
    loadOrganizations().then(setOrganizations).catch(() => {});
    loadPendingProvenance().then(rows => setProvenance(rows ?? [])).catch(() => {});
  }, []);


  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        // If an inline metric card is open, let it handle Esc itself (it has onKeyDown)
        // We only close the *next* layer if nothing inline is being edited
        if (fundInlineEditingRef.current) {
          // The InlineMetric's own onKeyDown will cancel — don't do anything else
          return;
        }
        // Close whatever is topmost in the z-index stack
        const _entries = Object.entries(modalZs).filter(([,z]) => z > 0).sort(([,a],[,b]) => b - a);
        const _top = _entries[0]?.[0];
        if (_top) {
          setModalZs(prev => { const n = { ...prev }; delete n[_top]; return n; });
          if (_top === 'search')      { setShowSearch(false); setSearchQuery(""); }
          else if (_top === 'gp')         { setGpOverlay(null); }
          else if (_top === 'fund')        { setFundOverlay(null); fundInlineEditingRef.current = false; }
          else if (_top === 'meeting')     { setMeetingOverlay(null); }
          else if (_top === 'pa')          { setPaOverlay(null); }
          else if (_top === 'logMeeting')  { setLogMeeting(null); }
          else if (_top === 'editMeeting') { setEditMeeting(null); }
          else if (_top === 'addNew')      { setShowAddNew(false); }
          else if (_top === 'addGP')       { setShowAddGP(false); }
          return;
        }
        if (view !== "home") {
          setView(view === "tagFilter" ? (prevView || "home") : "home");
        }
      }

      if (e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select";
        if (typing) return;
        e.preventDefault();
        setShowSearch(true); openModal('search');
      }

      if (e.key === "*") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select";
        if (typing) return;
        e.preventDefault();
        if (view === "home") setTimeout(() => searchRef.current?.focus(), 50);
      }

      // F-key view shortcuts (reconfigure in constants.js SHORTCUTS)
      const sc = SHORTCUTS.find(s => s.key === e.key);
      if (sc && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select";
        if (!typing) { e.preventDefault(); setView(sc.view); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalZs, showSearch, showAddGP, showAddNew, editMeeting, logMeeting, paOverlay, meetingOverlay, fundOverlay, gpOverlay, view, prevView]);

  const setGPs = useCallback((fn) => setData(d => ({ ...d, gps: typeof fn === "function" ? fn(d.gps) : fn })), []);
  const setPipeline = useCallback((fn) => setData(d => ({ ...d, pipeline: typeof fn === "function" ? fn(d.pipeline) : fn })), []);
  const setTodos = useCallback((fn) => setData(d => ({ ...d, todos: typeof fn === "function" ? fn(d.todos || []) : fn })), []);
  const setPAs = useCallback((fn) => setData(d => ({ ...d, placementAgents: typeof fn === "function" ? fn(d.placementAgents || []) : fn })), []);

  const updatePA = useCallback((updated) => {
    if (updated.__addFund) {
      // Associate a fund with this PA
      const fundId = updated.__addFund;
      setGPs(gps => gps.map(g => ({ ...g, funds: (g.funds || []).map(f => f.id === fundId ? { ...f, placementAgentId: updated.id ?? paOverlay?.id } : f) })));
      return;
    }
    if (updated.__removeFund) {
      const fundId = updated.__removeFund;
      setGPs(gps => gps.map(g => ({ ...g, funds: (g.funds || []).map(f => f.id === fundId ? { ...f, placementAgentId: null } : f) })));
      return;
    }
    setPAs(pas => pas.map(p => p.id === updated.id ? updated : p));
    if (paOverlay?.id === updated.id) setPaOverlay(updated);
  }, [paOverlay, setGPs, setPAs]);

  const handleAddTodo = useCallback((todoData) => {
    setTodos(ts => [...ts, { ...todoData, id: uid(), done: false, createdAt: now() }]);
  }, [setTodos]);
  const handleToggleTodo = useCallback((id) => {
    setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, [setTodos]);
  const handleDeleteTodo = useCallback((id) => {
    setTodos(ts => ts.filter(t => t.id !== id));
  }, [setTodos]);

  const saveLoggedMeeting = useCallback((m) => {
    if (!logMeeting?.gp) return;
    const freshGP = data.gps.find(g => g.id === logMeeting.gp.id) || logMeeting.gp;
    const newMeeting = { ...m, id: uid() };
    if (!useV2) {
      setGPs(gs => gs.map(g => g.id === freshGP.id ? { ...freshGP, meetings: [newMeeting, ...(freshGP.meetings || [])] } : g));
    }
    setLogMeeting(null);
  }, [logMeeting, data, useV2]);

  const saveEditedMeeting = useCallback((m) => {
    if (!editMeeting?.gp) return;
    const freshGP = data.gps.find(g => g.id === editMeeting.gp.id) || editMeeting.gp;
    if (!useV2) {
      setGPs(gs => gs.map(g => g.id === freshGP.id ? { ...freshGP, meetings: (freshGP.meetings || []).map(em => em.id === m.id ? m : em) } : g));
    }
    setEditMeeting(null);
  }, [editMeeting, data, useV2]);

  const { gps, pipeline: legacyPipeline, todos = [], placementAgents = [] } = data;

  // ── v2 data takes priority over old gps when available ─────────────────────
  // Normalized orgs: v2 when loaded, old gps as fallback
  const displayOrgs = useV2
    ? organizations.filter(o => o.org_type === 'gp').map(normalizeV2Org)
    : gps;
  // Pipeline derived from v2 fund fields when available, otherwise legacy table
  const pipeline = useV2
    ? organizations.flatMap(o => (o.funds || [])
        .filter(f => f.pipeline_stage_id)
        .map(f => ({ id: f.id, fundId: f.id, stage: f.pipeline_stage?.code ?? String(f.pipeline_stage_id) })))
    : legacyPipeline;

  const allFunds     = displayOrgs.flatMap(g => g.funds || []);
  const allMeetings  = displayOrgs.flatMap(g => g.meetings || []);
  const fundraising  = allFunds.filter(f => f.status === "Fundraising").length;
  const aGPsCount    = displayOrgs.filter(g => g.score === "A").length;
  const allStrats    = [...new Set(allFunds.map(f => f.strategy))].sort();
  const allOwners    = [...new Set([
    ...displayOrgs.map(g => g.owner).filter(Boolean),
    ...allFunds.map(f => f.owner).filter(Boolean),
    ...(settings.people ?? []),
  ])].sort();

  const handleTagClick = (type, value) => { setPrevView(view); setTagFilter({ type, value }); setView("tagFilter"); if (fundOverlay) { setFundOverlay(null); closeModal('fund'); } if (gpOverlay) { setGpOverlay(null); closeModal('gp'); } };
  const handleFundClick    = (fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); };
  const handleMeetingClick = (meeting, gp) => { setMeetingOverlay({ meeting, gp }); openModal('meeting'); };
  const handleGpClick      = (gp) => { setGpOverlay(gp); openModal('gp'); };
  const goHome = () => { setView("home"); };

  // ── v2 update callbacks ────────────────────────────────────────────────────
  // For v2 mode, optimistically update organizations state and call API.
  // For legacy mode, fall through to old setGPs/setPipeline.
  const updateOrg = useCallback((updated) => {
    if (useV2) {
      setOrganizations(orgs => orgs.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    } else {
      setGPs(gps => gps.map(g => g.id === updated.id ? updated : g));
    }
    if (gpOverlay?.id === updated.id) setGpOverlay(updated);
    if (fundOverlay?.gp?.id === updated.id) setFundOverlay(fov => fov ? { ...fov, gp: updated } : null);
  }, [useV2, gpOverlay, fundOverlay]);

  // ── Provenance helpers ────────────────────────────────────────────────────
  const provenanceFor = (entityType, entityId) =>
    provenance.filter(r => r.entity_type === entityType && String(r.entity_id) === String(entityId));

  const handleAcceptProvenance = useCallback(async (id) => {
    await acceptProvenance(id, "Me").catch(() => {});
    setProvenance(prev => prev.map(r => r.id === id ? { ...r, status: "accepted" } : r));
  }, []);

  const handleRejectProvenance = useCallback(async (id) => {
    await rejectProvenance(id, "Me").catch(() => {});
    setProvenance(prev => prev.filter(r => r.id !== id));
  }, []);

  const handlePipelineStage = useCallback((fundId, stage, gp) => {
    if (useV2) {
      // stage is a code ("watching"); look up the full item ID for the DB FK
      const stageItems = lookups?.items_by_category?.['pipeline-stage'] ?? [];
      const stageItem = stage ? stageItems.find(i => i.code === stage) : null;
      const stageId = stageItem?.id ?? null;
      patchFundField(fundId, 'pipeline_stage_id', stageId, null, null).catch(console.error);
      setOrganizations(orgs => orgs.map(o => o.id === gp?.id
        ? { ...o, funds: (o.funds || []).map(f => f.id === fundId
            ? { ...f, pipeline_stage_id: stageId, pipeline_stage: stageItem ?? null }
            : f) }
        : o));
    } else {
      setData(d => {
        const pl = d.pipeline || [];
        const existing = pl.find(p => p.fundId === fundId);
        const newPl = !stage ? pl.filter(p => p.fundId !== fundId)
          : existing ? pl.map(p => p.fundId === fundId ? { ...p, stage } : p)
          : [...pl, { id: uid(), fundId, gpName: gp?.name || "", stage, addedAt: now() }];
        return { ...d, pipeline: newPl };
      });
    }
  }, [useV2, lookups]);

  // ─── Universal search across all entities ─────────────────────────────────
  const universalFilter = (gp) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const inGP = gp.name.toLowerCase().includes(s) ||
      (gp.hq||"").toLowerCase().includes(s) ||
      (gp.contact||"").toLowerCase().includes(s) ||
      (gp.notes||"").toLowerCase().includes(s);
    const inFunds = (gp.funds||[]).some(f =>
      f.name.toLowerCase().includes(s) ||
      (f.strategy||"").toLowerCase().includes(s) ||
      (f.subStrategy||"").toLowerCase().includes(s) ||
      (f.status||"").toLowerCase().includes(s) ||
      (f.sectors||[]).some(sec => sec.toLowerCase().includes(s)) ||
      (f.notes||"").toLowerCase().includes(s)
    );
    const inMeetings = (gp.meetings||[]).some(m =>
      (m.topic||"").toLowerCase().includes(s) ||
      (m.notes||"").toLowerCase().includes(s) ||
      (m.location||"").toLowerCase().includes(s)
    );
    return inGP || inFunds || inMeetings;
  };

  // Filtered org list for home
  const filtered = displayOrgs.filter(g => {
    return universalFilter(g) &&
      (scoreF.length === 0 || scoreF.includes(g.score)) &&
      (stratF.length === 0 || (g.funds||[]).some(f => stratF.includes(f.strategy))) &&
      (statusF.length === 0 || (g.funds||[]).some(f => statusF.includes(f.status))) &&
      (ownerF.length === 0 || ownerF.includes(g.owner) || (g.funds||[]).some(f => ownerF.includes(f.owner || g.owner)));
  }).sort((a,b) => { const o={A:0,B:1,C:2,D:3,E:4,U:5}; return (o[a.score]??99)-(o[b.score]??99)||a.name.localeCompare(b.name); });

  const filteredPAs = search
    ? placementAgents.filter(pa => {
        const s = search.toLowerCase();
        return pa.name.toLowerCase().includes(s) ||
          (pa.hq||"").toLowerCase().includes(s) ||
          (pa.contact||"").toLowerCase().includes(s) ||
          (pa.contactEmail||"").toLowerCase().includes(s);
      })
    : placementAgents;

  const mode = darkMode ? 'dark' : 'light';
  const customVars = {};
  Object.keys(SCORE_CONFIG).forEach(grade => {
    const c = settings.scoreColors?.[grade]?.[mode];
    if (c?.bg) customVars[`--sb-${grade}-bg`] = c.bg;
    if (c?.color) { customVars[`--sb-${grade}-c`] = c.color; customVars[`--sb-${grade}-bd`] = c.color + '40'; }
  });
  const sc = settings.sectorColors?.[mode];
  if (sc?.bg) customVars['--sector-bg'] = sc.bg;
  if (sc?.color) customVars['--sector-c'] = sc.color;
  if (sc?.border) customVars['--sector-bd'] = sc.border;

  const wrap = (children) => (
    <SettingsContext.Provider value={{ settings, mode, setSettings }}>
    <div style={{ ...theme, ...customVars, background: "var(--bg)", height: "100vh", boxSizing: "border-box", overflowY: "auto", display: "flex", flexDirection: "column", padding: "2rem 2rem 1.25rem", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: "var(--tx1)" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>◈</div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>LP CRM</h1>
          </div>
          {/* Primary nav tabs */}
          <div style={{ display: "flex", background: "var(--subtle)", borderRadius: "9px", padding: "0.2rem", gap: "0.1rem" }}>
            {[
              { label: "Overview", active: view !== "dashboard" },
              { label: "My Dashboard", active: view === "dashboard" },
            ].map(({ label, active }) => (
              <button key={label}
                onClick={() => label === "My Dashboard" ? setView("dashboard") : goHome()}
                style={{ background: active ? "var(--card)" : "transparent", border: "none", borderRadius: "7px", color: active ? "var(--tx1)" : "var(--tx4)", padding: "0.35rem 0.9rem", fontSize: "0.8125rem", fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.15s", boxShadow: active ? "0 1px 4px rgba(0,0,0,0.25)" : "none", whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ color: "var(--tx5)", fontSize: "0.7rem", display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
              {["/", "*", "esc", ...SHORTCUTS.map(s => s.key)].map(k => (
                <kbd key={k} title={k === "/" ? "Global search" : k === "*" ? "Filter (home)" : k === "esc" ? "Close / back" : (SHORTCUTS.find(s=>s.key===k)?.label)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.1rem 0.35rem", fontFamily: "monospace", color: "var(--tx5)", cursor: "default" }}>{k}</kbd>
              ))}
            </span>
            <button onClick={() => setDarkMode(d => !d)} style={{ ...btnGhost, fontSize: "1rem", padding: "0.25rem 0.55rem" }} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? "☀" : "☾"}</button>
            <button onClick={() => setView("settings")} style={{ ...btnGhost, fontSize: "1rem", padding: "0.25rem 0.55rem" }} title="Settings">⚙</button>
            <button onClick={() => setView("pipeline")} style={{ ...btnGhost, color: "#a78bfa", borderColor: "#7c3aed", fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Pipeline Board
              <kbd style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.05rem 0.3rem", fontFamily: "monospace", fontSize: "0.65rem", color: "var(--tx5)" }}>{SHORTCUTS.find(s=>s.view==="pipeline")?.key}</kbd>
            </button>
            {useV2 && (() => {
              const pendingCount = provenance.filter(r => r.status === "pending").length;
              return (
                <button onClick={() => setView("dataReview")} style={{ ...btnGhost, fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.4rem", position: "relative" }}>
                  Data Review
                  {pendingCount > 0 && (
                    <span style={{ background: "#f59e0b", color: "#fff", borderRadius: "10px", padding: "0 0.35rem", fontSize: "0.65rem", fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })()}
            <button onClick={() => { setShowAddNew(true); openModal('addNew'); }} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: "7px", color: "#fff", padding: "0.55rem 1.1rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>+ Add New</button>
          </div>
        </div>
        {children}
      </div>
    </div>
    </SettingsContext.Provider>
  );

  const renderOverlays = () => (
    <>
      {showSearch && (
        <GlobalSearch
          gps={gps}
          placementAgents={placementAgents}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          zIndex={zOf('search')}
          active={Object.entries(modalZs).filter(([,z]) => z > 0).sort(([,a],[,b]) => b - a)[0]?.[0] === 'search'}
          onClose={() => { setShowSearch(false); setSearchQuery(""); closeModal('search'); }}
          onGpClick={(gp) => { setGpOverlay(gp); openModal('gp'); }}
          onFundClick={(fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); }}
          onMeetingClick={(m, gp) => { setMeetingOverlay({ meeting: m, gp }); openModal('meeting'); }}
          onPaClick={(pa) => { setPaOverlay(pa); openModal('pa'); }}
        />
      )}
      {gpOverlay && (
        <GPDetailOverlay gp={gpOverlay} owners={allOwners} zIndex={zOf('gp')}
          onClose={() => { setGpOverlay(null); closeModal('gp'); setFundOverlay(null); closeModal('fund'); }}
          onUpdate={updateOrg} onTagClick={handleTagClick}
          onFundClick={(fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); }}
          onMeetingClick={(m, gp) => { setMeetingOverlay({ meeting: m, gp }); openModal('meeting'); }}
          onLogMeeting={(gp, fundId) => { setLogMeeting({ gp, fundId }); openModal('logMeeting'); }}
          onDeleteGP={(id) => {
            setGpOverlay(null); closeModal('gp'); setFundOverlay(null); closeModal('fund');
            if (useV2) setOrganizations(orgs => orgs.filter(o => o.id !== id));
            else setGPs(g => g.filter(x => x.id !== id));
          }}
        />
      )}
      {fundOverlay && (
        <FundDetailOverlay
          fund={fundOverlay.fund} gp={fundOverlay.gp} owners={allOwners}
          meetings={(fundOverlay.gp?.meetings || [])}
          pipeline={pipeline}
          provenanceRows={provenanceFor("fund", fundOverlay.fund?.id)}
          onAcceptProvenance={handleAcceptProvenance}
          onRejectProvenance={handleRejectProvenance}
          onPipelineStage={(fundId, stage) => handlePipelineStage(fundId, stage, fundOverlay.gp)}
          onClose={() => { setFundOverlay(null); closeModal('fund'); fundInlineEditingRef.current = false; }}
          zIndex={zOf('fund')}
          onEditingChange={(id) => { fundInlineEditingRef.current = !!id; }}
          onGpClick={(gp) => {
            if (gpOverlay?.id === gp.id) {
              setFundOverlay(null); closeModal('fund');
            } else {
              setGpOverlay(gp); openModal('gp');
              setFundOverlay(null); closeModal('fund');
            }
          }}
          onSaveFund={(updated) => {
            const gp = fundOverlay.gp;
            const updatedGP = { ...gp, funds: (gp.funds||[]).map(f => f.id === updated.id ? updated : f) };
            updateOrg(updatedGP);
            setFundOverlay({ ...fundOverlay, fund: updated, gp: updatedGP });
          }}
          onAddMeeting={(fid) => { setLogMeeting({ gp: fundOverlay.gp, fundId: fid }); openModal('logMeeting'); }}
          onTagClick={handleTagClick}
          onMeetingClick={(m) => { setMeetingOverlay({ meeting: m, gp: fundOverlay.gp }); openModal('meeting'); }}
          placementAgents={placementAgents}
          onPlacementAgentClick={(pa) => { setPaOverlay(pa); openModal('pa'); }}
        />
      )}
      {paOverlay && (
        <PlacementAgentDetailOverlay
          pa={paOverlay}
          allGps={gps}
          zIndex={zOf('pa')}
          onClose={() => { setPaOverlay(null); closeModal('pa'); }}
          onUpdate={(updated) => {
            if (updated.__addFund) {
              const fid = updated.__addFund;
              setGPs(gs => gs.map(g => ({ ...g, funds: (g.funds||[]).map(f => f.id === fid ? { ...f, placementAgentId: paOverlay.id } : f) })));
              return;
            }
            if (updated.__removeFund) {
              const fid = updated.__removeFund;
              setGPs(gs => gs.map(g => ({ ...g, funds: (g.funds||[]).map(f => f.id === fid ? { ...f, placementAgentId: null } : f) })));
              return;
            }
            setPAs(pas => pas.map(p => p.id === updated.id ? updated : p));
            setPaOverlay(updated);
          }}
          onFundClick={(fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); }}
          onDeletePA={(id) => { setPaOverlay(null); closeModal('pa'); setPAs(pas => pas.filter(p => p.id !== id)); }}
        />
      )}
      {meetingOverlay && (
        <MeetingDetailOverlay
          meeting={meetingOverlay.meeting}
          gpName={meetingOverlay.gp?.name}
          fundName={(meetingOverlay.gp?.funds||[]).find(f=>f.id===meetingOverlay.meeting.fundId)?.name}
          onClose={() => { setMeetingOverlay(null); closeModal('meeting'); }}
          zIndex={zOf('meeting')}
          onEdit={(m) => { setMeetingOverlay(null); closeModal('meeting'); setEditMeeting({ gp: meetingOverlay.gp, meeting: m }); openModal('editMeeting'); }}
          onDelete={(id) => {
            const gp = meetingOverlay.gp;
            updateGP({ ...gp, meetings: (gp.meetings||[]).filter(m => m.id !== id) });
            setMeetingOverlay(null);
          }}
        />
      )}
      {logMeeting && (
        <Overlay onClose={() => { setLogMeeting(null); closeModal('logMeeting'); }} width="580px" zIndex={zOf('logMeeting')}>
          <OverlayHeader title="Log Meeting" subtitle={logMeeting.gp?.name} onClose={() => { setLogMeeting(null); closeModal('logMeeting'); }} />
          <div style={{ padding: "1.5rem" }}>
            <MeetingForm
              initial={{ date: "", type: "Virtual", location: "", topic: "", notes: "", fundId: logMeeting.fundId || null, loggedBy: "Me", loggedAt: now() }}
              funds={logMeeting.gp?.funds || []}
              showFundPicker={!logMeeting.fundId}
              unitMembers={allOwners}
              onSave={saveLoggedMeeting}
              onClose={() => { setLogMeeting(null); closeModal('logMeeting'); }}
            />
          </div>
        </Overlay>
      )}
      {editMeeting && (
        <Overlay onClose={() => { setEditMeeting(null); closeModal('editMeeting'); }} width="580px" zIndex={zOf('editMeeting')}>
          <OverlayHeader title="Edit Meeting" subtitle={editMeeting.gp?.name} onClose={() => { setEditMeeting(null); closeModal('editMeeting'); }} />
          <div style={{ padding: "1.5rem" }}>
            <MeetingForm
              initial={editMeeting.meeting}
              funds={editMeeting.gp?.funds || []}
              unitMembers={allOwners}
              onSave={saveEditedMeeting}
              onClose={() => { setEditMeeting(null); closeModal('editMeeting'); }}
            />
          </div>
        </Overlay>
      )}
      {showAddNew && (
        <SmartAddModal
          gps={displayOrgs}
          onClose={() => { setShowAddNew(false); closeModal('addNew'); }}
          onAddGP={(d) => { setGPs(gs => [{ ...d, id: uid(), funds: [], meetings: [] }, ...gs]); }}
          onAddFund={(gpId, d) => {
            const gp = displayOrgs.find(g => g.id === gpId);
            if (gp) updateOrg({ ...gp, funds: [...(gp.funds||[]), { ...d, id: uid() }] });
          }}
          onLogMeeting={(gp, fundId, m) => {
            if (m) {
              const freshGP = displayOrgs.find(g => g.id === gp.id) || gp;
              updateOrg({ ...freshGP, meetings: [{ ...m, id: uid() }, ...(freshGP.meetings||[])] });
            } else {
              setLogMeeting({ gp, fundId }); openModal('logMeeting');
            }
          }}
          onAddPA={(d) => { setPAs(pas => [{ ...d, id: uid() }, ...(pas || [])]);  }}
        />
      )}
      {showAddGP && (
        <Overlay onClose={() => { setShowAddGP(false); closeModal('addGP'); }} width="580px" zIndex={zOf('addGP')}>
          <OverlayHeader title="Add New GP" onClose={() => { setShowAddGP(false); closeModal('addGP'); }} />
          <div style={{ padding: "1.5rem" }}>
            <GPForm onSave={(d) => { setGPs(gps => [{ ...d, id: uid(), funds: [], meetings: [] }, ...gps]); setShowAddGP(false); closeModal('addGP'); }} onClose={() => { setShowAddGP(false); closeModal('addGP'); }} />
          </div>
        </Overlay>
      )}
    </>
  );

  // Sub-views
  if (view === "settings") return wrap(<><SettingsView onBack={goHome} />{renderOverlays()}</>);
  if (view === "dashboard") return wrap(<><DashboardView gps={gps} pipeline={pipeline} todos={todos} owners={allOwners} onBack={goHome} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} onMeetingClick={handleMeetingClick} onFundClick={handleFundClick} />{renderOverlays()}</>);
  if (view === "dataReview") return wrap(<>
    <DataReviewView
      onBack={goHome}
      displayOrgs={displayOrgs}
      onEntityClick={(entityType, entity) => {
        if (entityType === "fund") {
          const gp = displayOrgs.find(o => (o.funds||[]).some(f => f.id === entity.id));
          if (gp) handleFundClick(entity, gp);
        } else {
          handleGpClick(entity);
        }
        setView("home");
      }}
    />
    {renderOverlays()}
  </>);
  if (view === "pipeline") return wrap(<><PipelineBoard
    pipeline={pipeline} gps={displayOrgs}
    onUpdate={useV2 ? null : setPipeline}
    onMoveStage={useV2 ? (fundId, stage) => handlePipelineStage(fundId, stage, displayOrgs.find(o => (o.funds||[]).some(f => f.id === fundId))) : null}
    onFundClick={handleFundClick} onBack={goHome}
    stageItems={lookups?.items_by_category?.['pipeline-stage']}
  />{renderOverlays()}</>);
  if (view === "allMeetings") return wrap(<><AllMeetingsView gps={displayOrgs} onBack={goHome} onMeetingClick={handleMeetingClick} />{renderOverlays()}</>);
  if (view === "allFunds") return wrap(<><AllFundsView gps={displayOrgs} onBack={goHome} onFundClick={handleFundClick} onTagClick={handleTagClick} />{renderOverlays()}</>);
  if (view === "tagFilter") return wrap(<><TagFilterView type={tagFilter?.type} value={tagFilter?.value} gps={displayOrgs} onBack={() => setView(prevView || "home")} onFundClick={handleFundClick} />{renderOverlays()}</>);
  if (view === "gradeA") return wrap(<><GradeAView gps={displayOrgs} onBack={goHome} onGpClick={handleGpClick} />{renderOverlays()}</>);
  if (view === "fundraising") return wrap(<><FundraisingView gps={displayOrgs} onBack={goHome} onFundClick={handleFundClick} />{renderOverlays()}</>);

  // HOME
  return wrap(
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <StatCard label="Total GPs" value={displayOrgs.length} onClick={goHome} sub="All GPs" shortcut={SHORTCUTS.find(s=>s.view==="home")?.key} />
        <StatCard label="Grade A GPs" value={aGPsCount} accent="#22c55e" sub="Likely to invest" onClick={() => setView("gradeA")} shortcut={SHORTCUTS.find(s=>s.view==="gradeA")?.key} />
        <StatCard label="Funds Tracked" value={allFunds.length} accent="#a78bfa" sub="All strategies" onClick={() => setView("allFunds")} shortcut={SHORTCUTS.find(s=>s.view==="allFunds")?.key} />
        <StatCard label="Meetings Logged" value={allMeetings.length} accent="#fbbf24" sub="All GPs & funds" onClick={() => setView("allMeetings")} shortcut={SHORTCUTS.find(s=>s.view==="allMeetings")?.key} />
      </div>
      {fundraising > 0 && (
        <div onClick={() => setView("fundraising")} style={{ background:"var(--card)",border:"1px solid var(--pill-bg-1)",borderRadius:"10px",padding:"0.8rem 1.25rem",marginBottom:"1.25rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"1rem",transition:"border-color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--pill-c-1)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--pill-bg-1)"}>
          <span style={{color:"var(--pill-c-1)",fontSize:"1.4rem",fontWeight:700}}>{fundraising}</span>
          <div><div style={{color:"var(--pill-c-1)",fontWeight:600,fontSize:"0.875rem"}}>Funds currently in market</div><div style={{color:"var(--tx4)",fontSize:"0.75rem"}}>Click to see fundraising pipeline →</div></div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button onClick={e=>{e.stopPropagation();setView("pipeline");}} style={{ ...btnGhost, color: "#a78bfa", borderColor: "#7c3aed", fontSize: "0.75rem" }}>Pipeline Board →</button>
          </div>
        </div>
      )}
      {/* ── Search + Filters ─────────────────────────── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <span style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--tx5)", fontSize: "0.8rem", pointerEvents: "none" }}>⌕</span>
          <input ref={searchRef}
            style={{ width: "100%", background: "var(--card)", border: search ? "1px solid var(--border-hi)" : "1px solid var(--border)", borderRadius: "6px", color: search ? "var(--tx1)" : "var(--tx4)", padding: "0.55rem 0.75rem", paddingLeft: "1.85rem", paddingRight: search ? "1.75rem" : undefined, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            placeholder="Search everything…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: "0.55rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}>×</button>}
        </div>

        {/* Score filter */}
        <FilterDropdown
          label="Score"
          options={Object.entries(SCORE_CONFIG).map(([k, v]) => ({ value: k, label: k, color: v.color, bg: v.bg, desc: v.desc }))}
          selected={scoreF} onChange={setScoreF}
          accentColor="#22c55e"
          renderOption={(opt, isSelected) => (
            <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ background: `var(--sb-${opt.value}-bg)`, color: `var(--sb-${opt.value}-c)`, borderRadius: "3px", padding: "0.05rem 0.35rem", fontSize: "0.72rem", fontWeight: 700, fontFamily: "monospace" }}>{opt.value}</span>
              <span style={{ color: isSelected ? `var(--sb-${opt.value}-c)` : "var(--tx4)", fontSize: "0.78rem" }}>{opt.desc}</span>
            </span>
          )}
        />

        {/* Strategy filter */}
        <FilterDropdown
          label="Strategy"
          options={allStrats}
          selected={stratF} onChange={setStratF}
          accentColor="#60a5fa"
        />

        {/* Status filter */}
        <FilterDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selected={statusF} onChange={setStatusF}
          accentColor="#a78bfa"
        />

        {/* Owner filter — only when multiple owners exist */}
        {allOwners.length > 1 && (
          <FilterDropdown
            label="Owner"
            options={allOwners}
            selected={ownerF} onChange={setOwnerF}
            accentColor="#f472b6"
          />
        )}

        {/* Clear all — only when any active */}
        {(scoreF.length > 0 || stratF.length > 0 || statusF.length > 0 || ownerF.length > 0 || search) && (
          <button onClick={() => { setScoreF([]); setStratF([]); setStatusF([]); setOwnerF([]); setSearch(""); }}
            style={{ background: "none", border: "none", color: "var(--tx4)", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap", padding: "0.35rem 0.4rem", borderRadius: "4px" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--tx2)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--tx5)"}
          >clear ×</button>
        )}

        {/* Result count */}
        <span style={{ color: "var(--tx5)", fontSize: "0.72rem", whiteSpace: "nowrap", flexShrink: 0 }}>
          {filtered.length}/{displayOrgs.length}
        </span>
      </div>

      {/* ── Dense Table ───────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
      <DenseTable
        filtered={filtered}
        allGps={displayOrgs}
        pipeline={pipeline}
        onGpClick={(gp) => { setGpOverlay(gp); openModal('gp'); }}
        onFundClick={(fund, gp) => handleFundClick(fund, gp)}
        onMeetingClick={handleMeetingClick}
        autoExpand={!!(search || scoreF.length || stratF.length || statusF.length)}
        owners={allOwners}
        onUpdateGP={updateOrg}
        onUpdatePipeline={handlePipelineStage}
        placementAgents={filteredPAs}
        onPaClick={(pa) => setPaOverlay(pa)}
      />
      </div>
      {renderOverlays()}
    </div>
  );
}
