import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadData, saveData } from "./api.js";
import { mkSeed } from './seed.js';
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
import { SmartAddModal, DataMenu, StatCard } from './components/SmartAdd.jsx';
import { GPForm, MeetingForm } from './components/Forms.jsx';
import { SettingsContext } from './settingsContext.js';
import { SettingsView } from './components/SettingsView.jsx';
import { PlacementAgentDetailOverlay } from './components/PlacementAgentDetail.jsx';

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('lp-crm-theme') !== 'light');
  const theme = darkMode ? DARK : LIGHT;
  useEffect(() => { localStorage.setItem('lp-crm-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);

  const [data, setData] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [view, setView] = useState("home"); // home | allMeetings | allFunds | gradeA | fundraising | pipeline | tagFilter | dashboard
  const [prevView, setPrevView] = useState("home");
  const [tagFilter, setTagFilter] = useState(null); // { type, value }
  const [loaded, setLoaded] = useState(false);
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
  const fileInputRef = useRef(null);
  // Tracks whether a fund overlay inline card is currently being edited
  // so Esc can cancel just that edit without closing anything else
  const fundInlineEditingRef = useRef(false);

  const exportData = useCallback(() => {
    if (!data) return;
    const exportPayload = {
      meta: { version: "1.0", exportedAt: now(), exportedBy: "LP CRM v1" },
      gps: data.gps.map(g => ({
        ...g,
        updatedAt: now(),
        funds: (g.funds || []).map(f => ({ ...f, gpId: g.id })),
        meetings: (g.meetings || []).map(m => ({ ...m, gpId: g.id })),
      })),
      pipeline: data.pipeline,
      settings: data.settings,
    };
    // Use data URI — works in sandboxed iframes where createObjectURL may not
    const json = JSON.stringify(exportPayload, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(json);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = dataUri;
    a.download = `lp-crm-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [data]);

  const importData = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.gps || !Array.isArray(parsed.gps)) throw new Error("Missing gps array");
        if (!parsed.pipeline || !Array.isArray(parsed.pipeline)) throw new Error("Missing pipeline array");
        const cleaned = {
          gps: parsed.gps.map(g => ({
            ...g,
            funds: (g.funds || []).map(({ gpId: _g, ...f }) => f),
            meetings: (g.meetings || []).map(({ gpId: _g, ...m }) => m),
          })),
          pipeline: parsed.pipeline,
        };
        if (confirm(`Import ${cleaned.gps.length} GP(s) and ${cleaned.pipeline.length} pipeline item(s)? This will replace your current data.`)) {
          setData(cleaned);
        }
      } catch (err) {
        alert(`Import failed: ${err.message}\n\nMake sure you're using a valid LP CRM export file.`);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => { loadData().then(d => { setIsFallback(!!d?.__isFallback); setData(d || mkSeed()); setLoaded(true); }); }, []);

  // ── Auto-save with 800ms debounce — fast enough to feel instant, won't ──
  // ── fire on every keystroke while typing in a form field              ──
  const saveTimer = useRef(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "saving" | "unsaved"
  useEffect(() => {
    if (!loaded || !data) return;
    setSaveStatus("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      await saveData(data);
      setSaveStatus("saved");
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

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

  const updateGP = useCallback((updated) => {
    setGPs(gps => gps.map(g => g.id === updated.id ? updated : g));
    if (gpOverlay?.id === updated.id) setGpOverlay(updated);
    if (fundOverlay?.gp?.id === updated.id) setFundOverlay(fov => fov ? { ...fov, gp: updated, fund: (updated.funds||[]).find(f=>f.id===fov.fund.id) || fov.fund } : null);
  }, [gpOverlay, fundOverlay]);

  const saveLoggedMeeting = useCallback((m) => {
    if (!logMeeting?.gp) return;
    // Get fresh GP from store to avoid stale reference
    const freshGP = data?.gps?.find(g => g.id === logMeeting.gp.id) || logMeeting.gp;
    const newMeeting = { ...m, id: uid() };
    updateGP({ ...freshGP, meetings: [newMeeting, ...(freshGP.meetings || [])] });
    setLogMeeting(null);
  }, [logMeeting, updateGP, data]);

  const saveEditedMeeting = useCallback((m) => {
    if (!editMeeting?.gp) return;
    const freshGP = data?.gps?.find(g => g.id === editMeeting.gp.id) || editMeeting.gp;
    updateGP({ ...freshGP, meetings: (freshGP.meetings || []).map(em => em.id === m.id ? m : em) });
    setEditMeeting(null);
  }, [editMeeting, updateGP, data]);

  if (!data) return <div style={{ ...theme, background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx3)", fontFamily: "system-ui" }}>Loading…</div>;

  const { gps, pipeline, todos = [], settings = {}, placementAgents = [] } = data;
  const allFunds = gps.flatMap(g => g.funds || []);
  const allMeetings = gps.flatMap(g => g.meetings || []);
  const fundraising = allFunds.filter(f => f.status === "Fundraising").length;
  const aGPsCount = gps.filter(g => g.score === "A").length;
  const allStrats = [...new Set(allFunds.map(f => f.strategy))].sort();
  const allOwners = [...new Set([
    ...gps.map(g => g.owner).filter(Boolean),
    ...allFunds.map(f => f.owner).filter(Boolean),
    ...(settings.people ?? []),
  ])].sort();

  const handleTagClick = (type, value) => { setPrevView(view); setTagFilter({ type, value }); setView("tagFilter"); if (fundOverlay) { setFundOverlay(null); closeModal('fund'); } if (gpOverlay) { setGpOverlay(null); closeModal('gp'); } };
  const handleFundClick    = (fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); };
  const handleMeetingClick = (meeting, gp) => { setMeetingOverlay({ meeting, gp }); openModal('meeting'); };
  const handleGpClick      = (gp) => { setGpOverlay(gp); openModal('gp'); };
  const goHome = () => { setView("home"); };

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

  // Filtered GP list for home
  const filtered = gps.filter(g => {
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
    <SettingsContext.Provider value={{ settings, mode, setSettings: (s) => setData(d => ({ ...d, settings: s })) }}>
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
            <span style={{ fontSize: "0.7rem", color: saveStatus === "saved" ? "var(--tx5)" : saveStatus === "saving" ? "var(--tx4)" : "var(--tx3)", transition: "color 0.4s", minWidth: "55px", textAlign: "right" }}>
              {saveStatus === "saving" ? "saving…" : saveStatus === "unsaved" ? "unsaved" : "✓ saved"}
            </span>
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
            <DataMenu exportData={exportData} fileInputRef={fileInputRef} importData={importData} onLoadSeed={() => setData(mkSeed())} />
            <input ref={fileInputRef} type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
            <button onClick={() => { setShowAddNew(true); openModal('addNew'); }} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: "7px", color: "#fff", padding: "0.55rem 1.1rem", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>+ Add New</button>
          </div>
        </div>
        {isFallback && (
          <div style={{ background: "#431407", border: "1px solid #ea580c", borderRadius: "10px", padding: "0.9rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.3rem" }}>⚠</span>
            <div>
              <div style={{ color: "#fb923c", fontWeight: 700, fontSize: "0.9rem" }}>Backend not reachable — showing dummy data only</div>
              <div style={{ color: "#c2410c", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                Nothing you see here is real. Start the server with <code style={{ background: "#7c2d12", padding: "0.1rem 0.4rem", borderRadius: "3px", fontFamily: "monospace" }}>npm run dev</code> then refresh.
              </div>
            </div>
          </div>
        )}
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
          onUpdate={updateGP} onTagClick={handleTagClick}
          onFundClick={(fund, gp) => { setFundOverlay({ fund, gp }); openModal('fund'); }}
          onMeetingClick={(m, gp) => { setMeetingOverlay({ meeting: m, gp }); openModal('meeting'); }}
          onLogMeeting={(gp, fundId) => { setLogMeeting({ gp, fundId }); openModal('logMeeting'); }}
          onDeleteGP={(id) => { setGpOverlay(null); closeModal('gp'); setFundOverlay(null); closeModal('fund'); setGPs(g => g.filter(x => x.id !== id)); }}
        />
      )}
      {fundOverlay && (
        <FundDetailOverlay
          fund={fundOverlay.fund} gp={fundOverlay.gp} owners={allOwners}
          meetings={(fundOverlay.gp?.meetings || [])}
          pipeline={pipeline}
          onPipelineStage={(fundId, stage) => {
            setPipeline(pl => {
              const existing = pl.find(p => p.fundId === fundId);
              if (!stage) return pl.filter(p => p.fundId !== fundId);
              if (existing) return pl.map(p => p.fundId === fundId ? { ...p, stage } : p);
              return [...pl, { id: uid(), fundId, gpName: fundOverlay.gp?.name || "", stage, addedAt: now() }];
            });
          }}
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
            updateGP(updatedGP);
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
          gps={gps}
          onClose={() => { setShowAddNew(false); closeModal('addNew'); }}
          onAddGP={(d) => { setGPs(gs => [{ ...d, id: uid(), funds: [], meetings: [] }, ...gs]); }}
          onAddFund={(gpId, d) => {
            const gp = gps.find(g => g.id === gpId);
            if (gp) updateGP({ ...gp, funds: [...(gp.funds||[]), { ...d, id: uid() }] });
          }}
          onLogMeeting={(gp, fundId, m) => {
            if (m) {
              // Direct save from inline meeting form in SmartAddModal
              const freshGP = gps.find(g => g.id === gp.id) || gp;
              updateGP({ ...freshGP, meetings: [{ ...m, id: uid() }, ...(freshGP.meetings||[])] });
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
  if (view === "pipeline") return wrap(<><PipelineBoard pipeline={pipeline} gps={gps} onUpdate={setPipeline} onFundClick={handleFundClick} onBack={goHome} />{renderOverlays()}</>);
  if (view === "allMeetings") return wrap(<><AllMeetingsView gps={gps} onBack={goHome} onMeetingClick={handleMeetingClick} />{renderOverlays()}</>);
  if (view === "allFunds") return wrap(<><AllFundsView gps={gps} onBack={goHome} onFundClick={handleFundClick} onTagClick={handleTagClick} />{renderOverlays()}</>);
  if (view === "tagFilter") return wrap(<><TagFilterView type={tagFilter?.type} value={tagFilter?.value} gps={gps} onBack={() => setView(prevView || "home")} onFundClick={handleFundClick} />{renderOverlays()}</>);
  if (view === "gradeA") return wrap(<><GradeAView gps={gps} onBack={goHome} onGpClick={handleGpClick} />{renderOverlays()}</>);
  if (view === "fundraising") return wrap(<><FundraisingView gps={gps} onBack={goHome} onFundClick={handleFundClick} />{renderOverlays()}</>);

  // HOME
  return wrap(
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <StatCard label="Total GPs" value={gps.length} onClick={goHome} sub="All GPs" shortcut={SHORTCUTS.find(s=>s.view==="home")?.key} />
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
          {filtered.length}/{gps.length}
        </span>
      </div>

      {/* ── Dense Table ───────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
      <DenseTable
        filtered={filtered}
        allGps={gps}
        pipeline={pipeline}
        onGpClick={(gp) => setGpOverlay(gp)}
        onFundClick={(fund, gp) => handleFundClick(fund, gp)}
        onMeetingClick={handleMeetingClick}
        autoExpand={!!(search || scoreF.length || stratF.length || statusF.length)}
        owners={allOwners}
        onUpdateGP={updateGP}
        onUpdatePipeline={(fundId, stage, gp) => {
          setPipeline(pl => {
            const existing = pl.find(p => p.fundId === fundId);
            if (!stage) return pl.filter(p => p.fundId !== fundId);
            if (existing) return pl.map(p => p.fundId === fundId ? { ...p, stage } : p);
            return [...pl, { id: uid(), fundId, gpName: gp?.name || "", stage, addedAt: now() }];
          });
        }}
        placementAgents={filteredPAs}
        onPaClick={(pa) => setPaOverlay(pa)}
      />
      </div>
      {renderOverlays()}
    </div>
  );
}
