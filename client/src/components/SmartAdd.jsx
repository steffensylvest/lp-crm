import React, { useState, useEffect, useRef } from "react";
import { SCORE_CONFIG, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS, SECTOR_OPTIONS, CURRENCIES, STATUS_OPTIONS, PIPELINE_STAGES } from '../constants.js';
import { IS, ISFilled, btnBase, btnPrimary, btnGhost } from '../theme.js';
import { uid, now } from '../utils.js';
import { Chip } from './Badges.jsx';
import { GPForm, FundForm, MeetingForm } from './Forms.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';

// ─── Smart Add Modal (AI-powered intent detection) ───────────────────────────
export function SmartAddModal({ gps, onClose, onAddGP, onAddFund, onLogMeeting }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(null); // null | "gp" | "fund" | "meeting"
  const [detecting, setDetecting] = useState(false);
  const [selectedGPId, setSelectedGPId] = useState(gps.length === 1 ? gps[0].id : "");
  const inputRef = useRef();
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  // Heuristic intent detection (fast, no API needed for common cases)
  const detectIntent = (text) => {
    const t = text.toLowerCase();
    if (/meeting|met |met with|call|spoke|talked|lunch|conference|zoom|visit|saw|attended/.test(t)) return "meeting";
    if (/fund|vintage|raise|raising|strategy|buyout|credit|equity|infrastructure|real estate|venture|growth/.test(t)) return "fund";
    if (/gp|manager|firm|partner|hq|headquarter|new gp|add gp/.test(t)) return "gp";
    return null;
  };

  const handleDetect = async () => {
    if (!query.trim()) return;
    setDetecting(true);
    const local = detectIntent(query);
    setMode(local || "gp");
    setDetecting(false);
  };

  const selectedGP = gps.find(g => g.id === selectedGPId);

  return (
    <Overlay onClose={onClose} width="580px" zIndex={1300}>
      <OverlayHeader title="Add New" onClose={onClose} />
      <div style={{ padding: "1.5rem" }}>
        {!mode ? (
          <>
            <p style={{ color: "var(--tx3)", fontSize: "0.875rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
              Describe what you want to add and I'll figure it out, or choose below.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleDetect()}
                style={{ ...ISFilled, flex: 1 }}
                placeholder="e.g. 'met with Blackstone last Tuesday' or 'new fund for Apollo'" />
              <button onClick={handleDetect} disabled={detecting || !query.trim()}
                style={{ ...btnPrimary, whiteSpace: "nowrap", opacity: detecting ? 0.6 : 1 }}>
                {detecting ? "…" : "↵ Detect"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.65rem" }}>
              {[["gp","🏦","GP / Manager","New fund manager"],["fund","📊","Fund","New fund vehicle"],["meeting","📅","Meeting","Log an interaction"]].map(([key,icon,label,sub]) => (
                <button key={key} onClick={() => setMode(key)}
                  style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem 0.75rem", cursor: "pointer", textAlign: "center", transition: "border-color 0.15s, background 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.background = "var(--hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{icon}</div>
                  <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{label}</div>
                  <div style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>{sub}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem", padding: "0.6rem 0.75rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <span style={{ fontSize: "1rem" }}>{mode === "gp" ? "🏦" : mode === "fund" ? "📊" : "📅"}</span>
              <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem" }}>{mode === "gp" ? "Add GP / Manager" : mode === "fund" ? "Add Fund" : "Log Meeting"}</span>
              <button onClick={() => setMode(null)} style={{ ...btnGhost, marginLeft: "auto", fontSize: "0.72rem" }}>← back</button>
            </div>

            {mode === "gp" && (
              <GPForm onSave={(d) => { onAddGP(d); onClose(); }} onClose={onClose} />
            )}

            {mode === "fund" && (
              <div>
                {gps.length > 1 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Which GP is this fund for?</label>
                    <select style={selectedGPId ? ISFilled : IS} value={selectedGPId} onChange={e => setSelectedGPId(e.target.value)}>
                      <option value="">— Select GP —</option>
                      {gps.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}
                {selectedGPId ? (
                  <FundForm onSave={(d) => { onAddFund(selectedGPId, d); onClose(); }} onClose={onClose} />
                ) : (
                  <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>Select a GP above to continue</div>
                )}
              </div>
            )}

            {mode === "meeting" && (
              <div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Which GP is this meeting with?</label>
                  <select style={selectedGPId ? ISFilled : IS} value={selectedGPId} onChange={e => setSelectedGPId(e.target.value)}>
                    <option value="">— Select GP —</option>
                    {gps.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                {selectedGPId ? (
                  <MeetingForm
                    initial={{ date: "", type: "Virtual", location: "", topic: "", notes: "", fundId: null, loggedBy: "Me", loggedAt: now() }}
                    funds={selectedGP?.funds || []}
                    onSave={(m) => { onLogMeeting(selectedGP, null, m); onClose(); }}
                    onClose={onClose}
                  />
                ) : (
                  <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>Select a GP above to continue</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Overlay>
  );
}

// ─── Data Menu (export / import bundled) ─────────────────────────────────────
export function DataMenu({ exportData, fileInputRef, onLoadSeed }) {
  const [open, setOpen] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirmSeed(false); } };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => { setOpen(o => !o); setConfirmSeed(false); }} style={{ ...btnGhost, padding: "0.35rem 0.6rem", fontSize: "0.9rem", letterSpacing: "0.05em" }} title="Data options">⋯</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.4rem", zIndex: 500, boxShadow: "0 12px 40px rgba(0,0,0,0.8)", minWidth: "200px" }}>
          <div style={{ color: "var(--tx5)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", padding: "0.3rem 0.6rem 0.4rem" }}>Data</div>
          {[
            { icon: "↓", label: "Export JSON", action: () => { exportData(); setOpen(false); } },
            { icon: "↑", label: "Import JSON", action: () => { fileInputRef.current?.click(); setOpen(false); } },
          ].map(({ icon, label, action }) => (
            <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", background: "none", border: "none", borderRadius: "6px", padding: "0.45rem 0.6rem", cursor: "pointer", color: "var(--tx2)", fontSize: "0.8125rem", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ color: "var(--tx4)", width: "14px", textAlign: "center" }}>{icon}</span>{label}
            </button>
          ))}
          {/* Divider */}
          <div style={{ height: "1px", background: "var(--border)", margin: "0.35rem 0.4rem" }} />
          {!confirmSeed ? (
            <button onClick={() => setConfirmSeed(true)} style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", background: "none", border: "none", borderRadius: "6px", padding: "0.45rem 0.6rem", cursor: "pointer", color: "var(--tx3)", fontSize: "0.8125rem", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ color: "var(--tx4)", width: "14px", textAlign: "center" }}>⬡</span>Load Demo Data
            </button>
          ) : (
            <div style={{ padding: "0.5rem 0.6rem" }}>
              <div style={{ color: "var(--tx3)", fontSize: "0.78rem", lineHeight: 1.45, marginBottom: "0.6rem" }}>
                <span style={{ color: "#f59e0b", marginRight: "0.3rem" }}>⚠</span>
                This will <strong style={{ color: "var(--tx1)" }}>replace all current data</strong> with 20 demo GPs and funds. This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button onClick={() => { onLoadSeed(); setOpen(false); setConfirmSeed(false); }}
                  style={{ flex: 1, background: "#b45309", border: "none", borderRadius: "5px", color: "#fff", padding: "0.35rem 0.5rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                  Yes, load demo
                </button>
                <button onClick={() => setConfirmSeed(false)}
                  style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--tx3)", padding: "0.35rem 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, accent, sub, onClick, shortcut }) {
  return (
    <div onClick={onClick} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"10px",padding:"1rem 1.25rem",cursor:onClick?"pointer":"default",transition:"border-color 0.15s,transform 0.1s",position:"relative",overflow:"hidden" }}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor=accent||"#3b82f6";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor = "var(--border)";e.currentTarget.style.transform="none";}}>
      <div style={{color:accent||"#60a5fa",fontSize:"1.6rem",fontWeight:700}}>{value}</div>
      <div style={{color:"var(--tx4)",fontSize:"0.7rem",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginTop:"0.1rem"}}>{label}</div>
      {sub&&<div style={{color:"var(--tx5)",fontSize:"0.7rem",marginTop:"0.1rem"}}>{sub}</div>}
      {shortcut && (
        <kbd style={{position:"absolute",bottom:"0.6rem",right:"0.6rem",background:"var(--subtle)",border:"1px solid var(--border-hi)",borderRadius:"3px",padding:"0.1rem 0.35rem",fontFamily:"monospace",fontSize:"0.62rem",color:"var(--tx4)",userSelect:"none"}}>{shortcut}</kbd>
      )}
    </div>
  );
}
