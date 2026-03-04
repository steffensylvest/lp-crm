import React, { useState, useEffect } from "react";
import { IS, ISFilled, btnBase, btnGhost, btnDanger, btnPrimary } from '../theme.js';
import { uid, now, fmt, fmtTs } from '../utils.js';
import { loadGpChangeHistory } from '../api.js';

const GP_CHANGE_FIELD_LABELS = { score: "Rating", owner: "Responsible" };
import { ScoreBadge, StatusPill, Chip, SectorChip, SubStratChip, InvestedBadge } from './Badges.jsx';
import { ScorePicker, OwnerPicker, EditingContext } from './Pickers.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { GPForm, FundForm, MeetingForm } from './Forms.jsx';

export function GPDetailOverlay({ gp, onClose, onUpdate, onTagClick, onFundClick, onMeetingClick, onLogMeeting, onDeleteGP, owners = [], zIndex = 1000 }) {
  const [tab, setTab] = useState("funds");
  const [editGP, setEditGP] = useState(false);
  const [addFund, setAddFund] = useState(false);
  const [editFund, setEditFund] = useState(null);
  const [addMeeting, setAddMeeting] = useState(false);
  const [prefillFundId, setPrefillFundId] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null);
  const [meetingFilter, setMeetingFilter] = useState(null);
  const [gpChangeHistory, setGpChangeHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadGpChangeHistory(gp.id).then(h => { if (!cancelled) setGpChangeHistory(h); });
    return () => { cancelled = true; };
  }, [gp.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGpChangeHistory(gp.id).then(setGpChangeHistory);
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gp.score, gp.owner]);

  const funds = gp.funds || [];
  const meetings = gp.meetings || [];
  const sortedMeetings = [...meetings].sort((a,b) => new Date(b.date)-new Date(a.date));

  // Group funds by series
  const seriesGroups = {};
  funds.forEach(f => {
    const key = f.series || "__none__";
    if (!seriesGroups[key]) seriesGroups[key] = [];
    seriesGroups[key].push(f);
  });

  const saveFund = (fData) => {
    if (editFund) {
      onUpdate({ ...gp, funds: funds.map(f => f.id === fData.id ? fData : f) });
      setEditFund(null);
    } else {
      onUpdate({ ...gp, funds: [...funds, { ...fData, id: uid() }] });
      setAddFund(false);
    }
  };
  const deleteFund = (id) => { onUpdate({ ...gp, funds: funds.filter(f => f.id !== id) }); };
  const saveMeeting = (m) => {
    if (editMeeting) {
      onUpdate({ ...gp, meetings: meetings.map(x => x.id === m.id ? m : x) });
      setEditMeeting(null);
    } else {
      onUpdate({ ...gp, meetings: [{ ...m, id: uid() }, ...meetings] });
      setAddMeeting(false); setPrefillFundId(null);
    }
  };
  const deleteMeeting = (id) => { onUpdate({ ...gp, meetings: meetings.filter(m => m.id !== id) }); };

  const filteredMeetings = meetingFilter === null ? sortedMeetings
    : meetingFilter === "__gp__" ? sortedMeetings.filter(m => !m.fundId)
    : sortedMeetings.filter(m => m.fundId === meetingFilter);

  const lastMeeting = sortedMeetings[0];

  if (editGP) return <Overlay onClose={() => setEditGP(false)} width="580px" zIndex={zIndex}><OverlayHeader title="Edit GP" onClose={() => setEditGP(false)} /><div style={{ padding: "1.5rem" }}><GPForm initial={gp} onSave={(d) => { onUpdate({ ...gp, ...d }); setEditGP(false); }} onClose={() => setEditGP(false)} onDelete={() => { setEditGP(false); onClose(); onDeleteGP && onDeleteGP(gp.id); }} owners={owners} /></div></Overlay>;
  if (addFund || editFund) return <Overlay onClose={() => { setAddFund(false); setEditFund(null); }} width="680px" zIndex={zIndex}><OverlayHeader title={editFund ? "Edit Fund" : "Add Fund"} onClose={() => { setAddFund(false); setEditFund(null); }} /><div style={{ padding: "1.5rem" }}><FundForm initial={editFund} onSave={saveFund} onClose={() => { setAddFund(false); setEditFund(null); }} onDelete={editFund ? () => { deleteFund(editFund.id); setEditFund(null); } : undefined} owners={owners} gpOwner={gp.owner} /></div></Overlay>;
  if (addMeeting || editMeeting) return (
    <Overlay onClose={() => { setAddMeeting(false); setEditMeeting(null); setPrefillFundId(null); }} width="580px" zIndex={zIndex}>
      <OverlayHeader title={editMeeting ? "Edit Meeting" : "Log Meeting"} onClose={() => { setAddMeeting(false); setEditMeeting(null); }} />
      <div style={{ padding: "1.5rem" }}><MeetingForm initial={editMeeting || (prefillFundId ? { date:"",type:"Virtual",location:"",topic:"",notes:"",fundId:prefillFundId,loggedBy:"Me",loggedAt:now() } : undefined)} funds={funds} onSave={saveMeeting} onClose={() => { setAddMeeting(false); setEditMeeting(null); }} /></div>
    </Overlay>
  );

  const TAB = (id, label) => <button onClick={() => setTab(id)} style={{ background: tab===id?"var(--subtle)":"none", border: tab===id?"1px solid var(--border-hi)":"1px solid transparent", borderRadius:"6px", color:tab===id?"var(--tx1)":"var(--tx4)", padding:"0.35rem 0.9rem", fontSize:"0.8125rem", cursor:"pointer", fontWeight:tab===id?600:400 }}>{label}</button>;

  return (
    <Overlay onClose={onClose} width="780px" zIndex={zIndex}>
      <OverlayHeader
        title={gp.name}
        subtitle={<>
          {gp.hq || ""}
          {gp.contact ? ` · ${gp.contact}` : ""}
          {gp.contactEmail ? ` · ${gp.contactEmail}` : ""}
          {gp.website ? <>{" · "}<a href={gp.website.startsWith("http") ? gp.website : `https://${gp.website}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tx3)", textDecoration: "underline dotted" }}>{gp.website}</a></> : ""}
        </>}
        onClose={onClose}
        actions={<button onClick={() => setEditGP(true)} style={btnGhost}>Edit GP</button>}
      />
      <div style={{ padding: "1.5rem" }}>
        {/* GP summary row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <ScorePicker score={gp.score} size="lg" onChange={v => onUpdate({ ...gp, score: v })} />
          <OwnerPicker owner={gp.owner} owners={owners} onChange={v => onUpdate({ ...gp, owner: v })} />
          <span style={{ color: "var(--tx3)", fontSize: "0.8125rem" }}>🏦 {funds.length} funds</span>
          <span style={{ color: "var(--tx3)", fontSize: "0.8125rem" }}>📅 {meetings.length} meetings</span>
          {lastMeeting && <span onClick={() => onMeetingClick && onMeetingClick(lastMeeting, gp)} style={{ color: "var(--tx3)", fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline dotted" }}>Last: {fmt(lastMeeting.date)} — {lastMeeting.topic}</span>}
        </div>
        {gp.notes && <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "var(--tx2)", fontSize: "0.875rem", lineHeight: 1.6 }}>{gp.notes}</div>}

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>{TAB("funds",`Funds (${funds.length})`)}{TAB("meetings",`Meetings (${meetings.length})`)}{TAB("history", `History${gpChangeHistory.length > 0 ? ` (${gpChangeHistory.length})` : ""}`)}</div>

        {/* FUNDS TAB — grouped by series */}
        {tab === "funds" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button onClick={() => setAddFund(true)} style={btnPrimary}>+ Add Fund</button>
            </div>
            {funds.length === 0 && <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem" }}>No funds added yet.</div>}
            {Object.entries(seriesGroups).map(([series, seriesFunds]) => {
              const sorted = [...seriesFunds].sort((a,b) => (b.vintage||"").localeCompare(a.vintage||""));
              return (
                <div key={series} style={{ marginBottom: "1rem" }}>
                  {series !== "__none__" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                      <div style={{ color: "var(--tx3)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{series}</div>
                      <div style={{ flex: 1, height: "1px", background: "var(--subtle)" }} />
                    </div>
                  )}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                    {sorted.map((f, i) => {
                      const sizeLabel = f.finalSize ? `${f.currency} ${Number(f.finalSize).toLocaleString()}M final`
                        : f.raisedSize ? `${f.currency} ${Number(f.raisedSize).toLocaleString()}M raised`
                        : f.targetSize ? `${f.currency} ${Number(f.targetSize).toLocaleString()}M target` : null;
                      return (
                        <div key={f.id} onClick={() => onFundClick && onFundClick(f, gp)}
                          style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "transparent" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          {/* Two-line content block */}
                          <div style={{ flex: "1 1 0", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                              {f.score && <ScoreBadge score={f.score} />}
                              {f.status && <StatusPill status={f.status} />}
                              {f.invested && <InvestedBadge amount={f.investmentAmount} currency={f.investmentCurrency} />}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                              {f.vintage && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{f.vintage}</span>}
                              {sizeLabel && <span style={{ color: "var(--tx4)", fontSize: "0.7rem", whiteSpace: "nowrap" }}>{sizeLabel}</span>}
                              {f.strategy && <Chip label={f.strategy} onClick={e => { e.stopPropagation(); onTagClick && onTagClick("strategy", f.strategy); }} />}
                              {f.subStrategy && <SubStratChip label={f.subStrategy} onClick={e => { e.stopPropagation(); onTagClick && onTagClick("subStrategy", f.subStrategy); }} />}
                            </div>
                          </div>
                          <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => setEditFund(f)} style={{ background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.75rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }} title="Edit">✎</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div>
            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>Change History</div>
            {gpChangeHistory.length === 0 ? (
              <div style={{ color: "var(--tx5)", fontSize: "0.75rem" }}>No changes tracked yet — edits to Rating and Responsible will appear here.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {gpChangeHistory.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.775rem" }}>
                    <span style={{ color: "var(--tx5)", flexShrink: 0, minWidth: "76px", fontSize: "0.72rem" }}>{c.changedAt ? fmt(c.changedAt.slice(0, 10)) : "—"}</span>
                    <span style={{ color: "var(--tx4)", fontSize: "0.7rem", flexShrink: 0 }}>{GP_CHANGE_FIELD_LABELS[c.fieldName] || c.fieldName}</span>
                    <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>·</span>
                    {c.oldValue && <span style={{ color: "var(--tx4)", textDecoration: "line-through", fontSize: "0.72rem" }}>{c.oldValue}</span>}
                    {c.oldValue && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>→</span>}
                    <span style={{ color: "var(--tx1)", fontWeight: 500 }}>{c.newValue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEETINGS TAB */}
        {tab === "meetings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {[{ id: null, label: `All (${meetings.length})` }, { id: "__gp__", label: `GP (${meetings.filter(m=>!m.fundId).length})` }, ...funds.map(f => ({ id: f.id, label: `${f.name.split(" ").slice(-2).join(" ")} (${meetings.filter(m=>m.fundId===f.id).length})` }))].map(c => (
                  <button key={String(c.id)} onClick={() => setMeetingFilter(c.id)} style={{ background: meetingFilter===c.id?"var(--subtle)":"none", border:`1px solid ${meetingFilter===c.id?"var(--border-hi)":"var(--border)"}`, borderRadius:"20px", color:meetingFilter===c.id?"var(--tx1)":"var(--tx4)", padding:"0.2rem 0.7rem", cursor:"pointer", fontSize:"0.72rem", fontWeight:meetingFilter===c.id?600:400 }}>{c.label}</button>
                ))}
              </div>
              <button onClick={() => { onLogMeeting ? onLogMeeting(gp, null) : setAddMeeting(true); }} style={btnPrimary}>+ Log Meeting</button>
            </div>
            {filteredMeetings.length === 0 && <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem" }}>No meetings.</div>}
            {filteredMeetings.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                {filteredMeetings.map((m, i) => {
                  const fund = funds.find(f => f.id === m.fundId);
                  return (
                    <div key={m.id} onClick={() => onMeetingClick && onMeetingClick(m, gp)}
                      style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.75rem", borderBottom: i < filteredMeetings.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: "var(--tx4)", flexShrink: 0, minWidth: "68px", fontSize: "0.72rem" }}>{fmt(m.date)}</span>
                      <span style={{ color: "var(--tx1)", fontWeight: 500, flex: "1 1 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.775rem" }}>{m.topic || "—"}</span>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>{m.type}</span>
                      {m.location && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.location}</span>}
                      {m.attendeesUs?.length > 0 && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.attendeesUs.join(", ")}</span>}
                      {fund ? <Chip label={fund.name.split(" ").slice(-2).join(" ")} /> : <Chip label="GP" />}
                      <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setPrefillFundId(null); setEditMeeting(m); }} style={{ background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.75rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }} title="Edit">✎</button>
                        <button onClick={() => { if(confirm("Delete?")) deleteMeeting(m.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }} title="Delete">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}
