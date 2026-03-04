import React, { useState } from "react";
import { btnGhost, btnPrimary, btnDanger } from '../theme.js';
import { uid } from '../utils.js';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { PAForm } from './Forms.jsx';
import { ScoreBadge, StatusPill, Chip } from './Badges.jsx';

// Picker: select an existing fund to associate with this PA
function FundPicker({ allGps, excludeIds, onSelect, onClose, zIndex = 2200 }) {
  const [search, setSearch] = useState("");
  const s = search.toLowerCase();
  const opts = allGps.flatMap(gp =>
    (gp.funds || [])
      .filter(f => !excludeIds.includes(f.id))
      .filter(f => !s || f.name.toLowerCase().includes(s) || gp.name.toLowerCase().includes(s))
      .map(f => ({ fund: f, gp }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "460px", maxHeight: "520px", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
        <div style={{ padding: "1rem 1.25rem 0.75rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "var(--tx1)", fontWeight: 700, fontSize: "0.9rem" }}>Add Existing Fund</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "0.75rem 1.25rem 0.5rem" }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search funds…"
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx1)", padding: "0.45rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 0.5rem 0.75rem" }}>
          {opts.length === 0 && <div style={{ color: "var(--tx4)", fontSize: "0.8rem", textAlign: "center", padding: "1.5rem" }}>No matching funds.</div>}
          {opts.map(({ fund, gp }) => (
            <div key={fund.id} onClick={() => { onSelect(fund.id); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.55rem 0.75rem", borderRadius: "6px", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fund.name}</div>
                <div style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>{gp.name}{fund.vintage ? ` · ${fund.vintage}` : ""}{fund.strategy ? ` · ${fund.strategy}` : ""}</div>
              </div>
              {fund.score && <ScoreBadge score={fund.score} />}
              {fund.status && <StatusPill status={fund.status} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlacementAgentDetailOverlay({ pa, allGps, onClose, onUpdate, onFundClick, onDeletePA, zIndex = 1000 }) {
  const [editPA, setEditPA] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Collect all funds associated with this PA from allGps
  const representedFunds = allGps.flatMap(gp =>
    (gp.funds || [])
      .filter(f => f.placementAgentId === pa.id)
      .map(f => ({ fund: f, gp }))
  );

  const associatedFundIds = representedFunds.map(({ fund }) => fund.id);

  if (editPA) return (
    <Overlay onClose={() => setEditPA(false)} width="580px" zIndex={zIndex}>
      <OverlayHeader title="Edit Placement Agent" onClose={() => setEditPA(false)} />
      <div style={{ padding: "1.5rem" }}>
        <PAForm initial={pa} onSave={d => { onUpdate({ ...pa, ...d }); setEditPA(false); }} onClose={() => setEditPA(false)}
          onDelete={() => { setEditPA(false); onClose(); onDeletePA && onDeletePA(pa.id); }} />
      </div>
    </Overlay>
  );

  return (
    <>
      <Overlay onClose={onClose} width="680px" zIndex={zIndex}>
        <OverlayHeader
          title={pa.name}
          subtitle={<>
            {pa.hq || ""}
            {pa.contact ? ` · ${pa.contact}` : ""}
            {pa.contactEmail ? ` · ${pa.contactEmail}` : ""}
            {pa.website ? <>{" · "}<a href={pa.website.startsWith("http") ? pa.website : `https://${pa.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tx3)", textDecoration: "underline dotted" }}>{pa.website}</a></> : ""}
          </>}
          onClose={onClose}
          actions={<button onClick={() => setEditPA(true)} style={btnGhost}>Edit</button>}
        />
        <div style={{ padding: "1.5rem" }}>
          {/* PA badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "20px", padding: "0.15rem 0.6rem 0.15rem 0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.7rem" }}>🤝</span>
            <span style={{ color: "#a78bfa", fontSize: "0.72rem", fontWeight: 600 }}>Placement Agent</span>
          </div>

          {pa.notes && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "var(--tx2)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              {pa.notes}
            </div>
          )}

          {/* Represented Funds */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ color: "var(--tx3)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Represented Funds ({representedFunds.length})
            </div>
            <button onClick={() => setShowPicker(true)} style={{ ...btnPrimary, fontSize: "0.75rem", padding: "0.25rem 0.7rem" }}>+ Add Fund</button>
          </div>

          {representedFunds.length === 0 && (
            <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.875rem" }}>
              No funds associated yet. Click "+ Add Fund" to link existing funds.
            </div>
          )}

          {representedFunds.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              {representedFunds.map(({ fund, gp }, i) => {
                const sizeLabel = fund.finalSize ? `${fund.currency || ""} ${Number(fund.finalSize).toLocaleString()}M final`
                  : fund.raisedSize ? `${fund.currency || ""} ${Number(fund.raisedSize).toLocaleString()}M raised`
                  : fund.targetSize ? `${fund.currency || ""} ${Number(fund.targetSize).toLocaleString()}M target` : null;
                return (
                  <div key={fund.id} onClick={() => onFundClick && onFundClick(fund, gp)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.85rem", borderBottom: i < representedFunds.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ flex: "1 1 0", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{fund.name}</span>
                        {fund.score && <ScoreBadge score={fund.score} />}
                        {fund.status && <StatusPill status={fund.status} />}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                        <span style={{ color: "var(--tx4)", fontSize: "0.7rem" }}>{gp.name}</span>
                        {fund.vintage && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>· {fund.vintage}</span>}
                        {sizeLabel && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>· {sizeLabel.trim()}</span>}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onUpdate({ __removeFund: fund.id })}
                        style={{ background: "none", border: "none", color: "var(--tx5)", cursor: "pointer", fontSize: "0.75rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }}
                        title="Remove from this placement agent"
                        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--tx5)"}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Overlay>
      {showPicker && (
        <FundPicker
          allGps={allGps}
          excludeIds={associatedFundIds}
          onSelect={(fundId) => onUpdate({ __addFund: fundId })}
          onClose={() => setShowPicker(false)}
          zIndex={zIndex + 200}
        />
      )}
    </>
  );
}
