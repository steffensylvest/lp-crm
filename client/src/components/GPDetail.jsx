import React, { useState, useEffect } from "react";
import { IS, ISFilled, btnBase, btnGhost, btnDanger, btnPrimary } from '../theme.js';
import { uid, now, fmt, fmtTs } from '../utils.js';
import { loadAuditLog, loadMeetings, saveMeeting as apiSaveMeeting, updateMeeting as apiUpdateMeeting, deleteMeeting as apiDeleteMeeting, patchOrganizationField, patchFundField, savePerson } from '../api.js';
import { PersonDetailOverlay, PersonRow } from './PersonDetail.jsx';
import { ScoreBadge, StatusPill, Chip, SectorChip, SubStratChip, InvestedBadge } from './Badges.jsx';
import { ScorePicker, OwnerPicker, EditingContext, ProvenanceMetric, PROVENANCE_FIELD_LABELS } from './Pickers.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { GPForm, FundForm, MeetingForm } from './Forms.jsx';

const GP_CHANGE_FIELD_LABELS = { score: "Rating", owner: "Responsible" };

const MEETING_TYPE_ID = {
  "Virtual": "li_meeting_virtual",
  "In-Person": "li_meeting_in_person",
  "Phone Call": "li_meeting_phone",
  "Phone": "li_meeting_phone",
  "Conference": "li_meeting_conference",
};

export function GPDetailOverlay({ gp, onClose, onUpdate, onTagClick, onFundClick, onMeetingClick, onLogMeeting, onDeleteGP, owners = [], zIndex = 1000, provenanceRows = [], onAcceptProvenance, onRejectProvenance, onFieldCleared, placementAgents = [] }) {
  const [tab, setTab] = useState("funds");
  const [editGP, setEditGP] = useState(false);
  const [addFund, setAddFund] = useState(false);
  const [editFund, setEditFund] = useState(null);
  const [addMeeting, setAddMeeting] = useState(false);
  const [prefillFundId, setPrefillFundId] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null);
  const [meetingFilter, setMeetingFilter] = useState(null);
  const [gpChangeHistory, setGpChangeHistory] = useState([]);
  // v2 orgs have _v2=true and no embedded meetings — fetch them lazily
  const isV2 = !!gp._v2;
  const [v2Meetings, setV2Meetings] = useState(null); // null = not yet loaded
  // People (org_person join objects with nested .person)
  const [people, setPeople] = useState(() => gp.people ?? []);
  const [selectedPerson, setSelectedPerson] = useState(null); // orgPerson being viewed
  const [addingPerson, setAddingPerson] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAuditLog('organization', gp.id)
      .then(h => { if (!cancelled) setGpChangeHistory(h); })
      .catch(() => {});
    if (isV2) {
      loadMeetings({ org_id: gp.id }).then(ms => { if (!cancelled) setV2Meetings(ms || []); }).catch(() => setV2Meetings([]));
    }
    return () => { cancelled = true; };
  }, [gp.id, isV2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuditLog('organization', gp.id).then(setGpChangeHistory).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gp.score, gp.owner]);

  const funds = gp.funds || [];
  // Use lazily-loaded v2 meetings if available; fall back to embedded meetings
  const meetings = v2Meetings ?? (gp.meetings || []);
  const sortedMeetings = [...meetings].sort((a,b) => new Date(b.date)-new Date(a.date));

  // v2 meetings store entity links in m.entities[] instead of m.fundId
  const getMtgFundId = (m) => m.fundId ?? m.entities?.find(e => e.entity_type === "fund")?.entity_id ?? null;
  // v2 meetings store attendees as m.attendees[{person, side}] instead of m.attendeesUs[]
  const getMtgUsNames = (m) => m.attendeesUs ?? m.attendees?.filter(a => a.side === "us").map(a => a.person ? `${a.person.first_name ?? ""} ${a.person.last_name ?? ""}`.trim() : null).filter(Boolean) ?? [];

  // Group funds by series
  const seriesGroups = {};
  funds.forEach(f => {
    const key = f.series || "__none__";
    if (!seriesGroups[key]) seriesGroups[key] = [];
    seriesGroups[key].push(f);
  });

  const saveFund = (fData, createdOrgId) => {
    if (editFund) {
      onUpdate({ ...gp, funds: funds.map(f => f.id === fData.id ? fData : f) });
      setEditFund(null);
    } else {
      // Prepend new fund directly; fData is the API-created fund response
      onUpdate({ ...gp, funds: [fData, ...funds] });
      setAddFund(false);
    }
  };
  const deleteFund = (id) => { onUpdate({ ...gp, funds: funds.filter(f => f.id !== id) }); };

  const saveMeeting = async (m) => {
    if (isV2) {
      const fundId = m.fundId ?? null;
      const payload = {
        date: m.date || null,
        type_id: MEETING_TYPE_ID[m.type] ?? null,
        location: m.location || null,
        topic: m.topic || null,
        notes: m.notes || null,
        created_by: m.loggedBy || m.created_by || "Me",
        entities: [
          { entity_type: "organization", entity_id: gp.id, is_primary: true },
          ...(fundId ? [{ entity_type: "fund", entity_id: String(fundId) }] : []),
        ],
        attendees: m.attendees || [],
      };
      try {
        if (editMeeting) {
          const result = await apiUpdateMeeting(editMeeting.id, payload);
          setV2Meetings(prev => (prev ?? []).map(x => x.id === editMeeting.id ? result : x));
          setEditMeeting(null);
        } else {
          const result = await apiSaveMeeting(payload);
          setV2Meetings(prev => [result, ...(prev ?? [])]);
          setAddMeeting(false); setPrefillFundId(null);
          // Link fund to placement agent(s) if PA attendees were added
          if (fundId && m._paOrgIds?.length > 0) {
            patchFundField(String(fundId), "placement_agent_id", m._paOrgIds[0]).catch(() => {});
          }
        }
      } catch (err) { console.error("Meeting save failed", err); }
      return;
    }
    // Legacy path
    if (editMeeting) {
      onUpdate({ ...gp, meetings: meetings.map(x => x.id === m.id ? m : x) });
      setEditMeeting(null);
    } else {
      onUpdate({ ...gp, meetings: [{ ...m, id: uid() }, ...meetings] });
      setAddMeeting(false); setPrefillFundId(null);
    }
  };

  const deleteMeeting = async (id) => {
    if (isV2) {
      await apiDeleteMeeting(id).catch(() => {});
      setV2Meetings(prev => (prev ?? []).filter(m => m.id !== id));
      return;
    }
    onUpdate({ ...gp, meetings: meetings.filter(m => m.id !== id) });
  };

  const filteredMeetings = meetingFilter === null ? sortedMeetings
    : meetingFilter === "__gp__" ? sortedMeetings.filter(m => !getMtgFundId(m))
    : sortedMeetings.filter(m => getMtgFundId(m) === meetingFilter);

  const lastMeeting = sortedMeetings[0];

  if (selectedPerson) return <PersonDetailOverlay orgPerson={selectedPerson} orgName={gp.name} zIndex={zIndex + 50}
    onClose={() => setSelectedPerson(null)}
    onUpdated={(updatedPerson) => {
      setPeople(prev => prev.map(op => (op.person?.id ?? op.id) === updatedPerson.id
        ? { ...op, person: updatedPerson }
        : op));
    }} />;
  if (editGP) return <Overlay onClose={() => setEditGP(false)} width="580px" zIndex={zIndex}><OverlayHeader title="Edit GP" onClose={() => setEditGP(false)} /><div style={{ padding: "1.5rem" }}><GPForm initial={gp} onSave={(d) => { onUpdate({ ...gp, ...d }); setEditGP(false); }} onClose={() => setEditGP(false)} onDelete={() => { setEditGP(false); onClose(); onDeleteGP && onDeleteGP(gp.id); }} owners={owners} /></div></Overlay>;
  if (addFund || editFund) return <Overlay onClose={() => { setAddFund(false); setEditFund(null); }} width="680px" zIndex={zIndex}><OverlayHeader title={editFund ? "Edit Fund" : "Add Fund"} onClose={() => { setAddFund(false); setEditFund(null); }} /><div style={{ padding: "1.5rem" }}><FundForm initial={editFund} onSave={saveFund} onClose={() => { setAddFund(false); setEditFund(null); }} onDelete={editFund ? () => { deleteFund(editFund.id); setEditFund(null); } : undefined} owners={owners} gpOwner={gp.owner} orgId={gp.id} orgName={gp.name} showGPPicker={false} /></div></Overlay>;
  if (addMeeting || editMeeting) return (
    <Overlay onClose={() => { setAddMeeting(false); setEditMeeting(null); setPrefillFundId(null); }} width="580px" zIndex={zIndex}>
      <OverlayHeader title={editMeeting ? "Edit Meeting" : "Log Meeting"} onClose={() => { setAddMeeting(false); setEditMeeting(null); }} />
      <div style={{ padding: "1.5rem" }}><MeetingForm initial={editMeeting || (prefillFundId ? { date:"",type:"Virtual",location:"",topic:"",notes:"",fundId:prefillFundId,loggedBy:"Me",loggedAt:now() } : undefined)} funds={funds} onSave={saveMeeting} onClose={() => { setAddMeeting(false); setEditMeeting(null); }} orgId={gp.id} gpPeople={people.map(op => op.person).filter(Boolean)} placementAgents={placementAgents} /></div>
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
          <ScorePicker score={gp.rating?.code ?? gp.score} size="lg" onChange={async v => {
            const ratingId = v ? `li_gp_rating_${v.toLowerCase()}` : null;
            const updatedRating = ratingId ? { ...(gp.rating ?? {}), id: ratingId, code: v } : null;
            onUpdate({ ...gp, rating_id: ratingId, rating: updatedRating, score: v });
            await patchOrganizationField(gp.id, "rating_id", ratingId, null, "Me").catch(console.error);
          }} />
          <OwnerPicker owner={gp.owner} owners={owners} onChange={async v => {
            onUpdate({ ...gp, owner: v });
            await patchOrganizationField(gp.id, "owner", v || null, null, "Me").catch(console.error);
          }} />
          <span style={{ color: "var(--tx3)", fontSize: "0.8125rem" }}>🏦 {funds.length} funds</span>
          <span style={{ color: "var(--tx3)", fontSize: "0.8125rem" }}>📅 {meetings.length} meetings</span>
          {lastMeeting && <span onClick={() => onMeetingClick && onMeetingClick(lastMeeting, gp)} style={{ color: "var(--tx3)", fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline dotted" }}>Last: {fmt(lastMeeting.date)} — {lastMeeting.topic}</span>}
        </div>
        {gp.notes && <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "var(--tx2)", fontSize: "0.875rem", lineHeight: 1.6 }}>{gp.notes}</div>}

        {/* Details row — org fields with provenance awareness */}
        {isV2 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <ProvenanceMetric id="gp-website" label="Website" value={gp.website ?? null} fieldName="website"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "website", v, null, "Me"); onUpdate({ ...gp, website: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "website"); }} />
            <ProvenanceMetric id="gp-aum" label="AUM (USD M)" value={gp.aum ?? null} fieldName="aum"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "aum", v, null, "Me"); onUpdate({ ...gp, aum: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "aum"); }} />
            <ProvenanceMetric id="gp-aum-date" label="AUM Date" value={gp.aum_date ?? null} fieldName="aum_date"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "aum_date", v, null, "Me"); onUpdate({ ...gp, aum_date: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "aum_date"); }} />
            <ProvenanceMetric id="gp-founded" label="Year Founded" value={gp.founded_year != null ? String(gp.founded_year) : null} fieldName="founded_year"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "founded_year", v, null, "Me"); onUpdate({ ...gp, founded_year: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "founded_year"); }} />
            <ProvenanceMetric id="gp-inv-team" label="Inv. Team" value={gp.investment_team_size != null ? String(gp.investment_team_size) : null} fieldName="investment_team_size"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "investment_team_size", v, null, "Me"); onUpdate({ ...gp, investment_team_size: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "investment_team_size"); }} />
            <ProvenanceMetric id="gp-total-staff" label="Total Staff" value={gp.total_team_size != null ? String(gp.total_team_size) : null} fieldName="total_team_size"
              provenanceRows={provenanceRows} onAcceptProvenance={onAcceptProvenance}
              onSave={async v => { await patchOrganizationField(gp.id, "total_team_size", v, null, "Me"); onUpdate({ ...gp, total_team_size: v }); if ((v ?? null) === null) onFieldCleared?.("organization", gp.id, "total_team_size"); }} />
          </div>
        )}

        {(() => { const pending = provenanceRows.filter(r => r.status === "pending"); return pending.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "0.5rem 0.85rem", marginBottom: "1rem", fontSize: "0.775rem", color: "#f59e0b" }}>
            <span>⚡</span>
            <span><strong>{pending.length}</strong> Preqin suggestion{pending.length !== 1 ? "s" : ""} pending review</span>
            <button onClick={() => setTab("preqin")} style={{ background: "none", border: "1px solid rgba(245,158,11,0.5)", borderRadius: "4px", color: "#f59e0b", fontSize: "0.7rem", padding: "0.15rem 0.5rem", cursor: "pointer", marginLeft: "0.25rem" }}>View →</button>
          </div>
        ); })()}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>{TAB("funds",`Funds (${funds.length})`)}{TAB("meetings",`Meetings (${meetings.length})`)}{isV2 && TAB("people",`People (${people.length})`)}{TAB("history", `History${gpChangeHistory.length > 0 ? ` (${gpChangeHistory.length})` : ""}`)}{isV2 && provenanceRows.length > 0 && TAB("preqin", `Preqin${provenanceRows.filter(r=>r.status==="pending").length > 0 ? ` (${provenanceRows.filter(r=>r.status==="pending").length})` : ""}`)}</div>

        {/* FUNDS TAB — grouped by series */}
        {tab === "funds" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button onClick={() => setAddFund(true)} style={btnPrimary}>+ Add Fund</button>
            </div>
            {funds.length === 0 && <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem" }}>No funds added yet.</div>}
            {Object.entries(seriesGroups).map(([series, seriesFunds]) => {
              const sorted = [...seriesFunds].sort((a,b) => String(b.vintage||"").localeCompare(String(a.vintage||"")));
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
                              {(f.rating || f.score) && <ScoreBadge item={f._rating} score={f.rating?.code ?? f.score} />}
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

        {/* PEOPLE TAB */}
        {tab === "people" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
              <button onClick={() => setAddingPerson(true)} style={btnPrimary}>+ Add Person</button>
            </div>
            {people.length === 0 && !addingPerson && (
              <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem" }}>No contacts added yet.</div>
            )}
            {people.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", marginBottom: "1rem" }}>
                {people.map((op, i) => (
                  <PersonRow key={op.id ?? i} orgPerson={op} isLast={i === people.length - 1}
                    onClick={() => setSelectedPerson(op)} />
                ))}
              </div>
            )}
            {/* Inline add-person form */}
            {addingPerson && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1.25rem", marginTop: "0.5rem" }}>
                <div style={{ color: "var(--tx2)", fontWeight: 600, fontSize: "0.875rem", marginBottom: "1rem" }}>New Contact</div>
                <AddPersonForm
                  orgId={gp.id}
                  onSaved={(op) => { setPeople(prev => [...prev, op]); setAddingPerson(false); }}
                  onClose={() => setAddingPerson(false)}
                />
              </div>
            )}
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
                {gpChangeHistory.map(c => {
                  // Support both old change_log shape and v2 audit_log shape
                  const date    = c.changed_at ?? c.changedAt;
                  const field   = c.field_name  ?? c.fieldName;
                  const oldVal  = c.old_value   ?? c.oldValue;
                  const newVal  = c.new_value   ?? c.newValue;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.775rem" }}>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, minWidth: "76px", fontSize: "0.72rem" }}>{date ? fmt(date.slice(0, 10)) : "—"}</span>
                      <span style={{ color: "var(--tx4)", fontSize: "0.7rem", flexShrink: 0 }}>{GP_CHANGE_FIELD_LABELS[field] || field}</span>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>·</span>
                      {oldVal && <span style={{ color: "var(--tx4)", textDecoration: "line-through", fontSize: "0.72rem" }}>{oldVal}</span>}
                      {oldVal && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>→</span>}
                      <span style={{ color: "var(--tx1)", fontWeight: 500 }}>{newVal}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PREQIN TAB */}
        {tab === "preqin" && (
          <div>
            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>Preqin Suggestions</div>
            {provenanceRows.filter(r => r.status === "pending").length === 0 ? (
              <div style={{ color: "var(--tx5)", fontSize: "0.75rem" }}>No pending suggestions.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {provenanceRows.filter(r => r.status === "pending").map(r => (
                  <ProvenanceMetric
                    key={r.id}
                    label={PROVENANCE_FIELD_LABELS[r.field_name] ?? r.field_name}
                    value={gp[r.field_name] ?? null}
                    fieldName={r.field_name}
                    provenanceRows={provenanceRows}
                    onAcceptProvenance={onAcceptProvenance}
                  />
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
                {[{ id: null, label: `All (${meetings.length})` }, { id: "__gp__", label: `GP (${meetings.filter(m=>!getMtgFundId(m)).length})` }, ...funds.map(f => ({ id: f.id, label: `${f.name.split(" ").slice(-2).join(" ")} (${meetings.filter(m=>getMtgFundId(m)===f.id).length})` }))].map(c => (
                  <button key={String(c.id)} onClick={() => setMeetingFilter(c.id)} style={{ background: meetingFilter===c.id?"var(--subtle)":"none", border:`1px solid ${meetingFilter===c.id?"var(--border-hi)":"var(--border)"}`, borderRadius:"20px", color:meetingFilter===c.id?"var(--tx1)":"var(--tx4)", padding:"0.2rem 0.7rem", cursor:"pointer", fontSize:"0.72rem", fontWeight:meetingFilter===c.id?600:400 }}>{c.label}</button>
                ))}
              </div>
              <button onClick={() => setAddMeeting(true)} style={btnPrimary}>+ Log Meeting</button>
            </div>
            {filteredMeetings.length === 0 && <div style={{ color: "var(--tx4)", textAlign: "center", padding: "2rem" }}>No meetings.</div>}
            {filteredMeetings.length > 0 && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                {filteredMeetings.map((m, i) => {
                  const fund = funds.find(f => f.id === getMtgFundId(m));
                  const usNames = getMtgUsNames(m);
                  return (
                    <div key={m.id} onClick={() => onMeetingClick && onMeetingClick(m, gp)}
                      style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.75rem", borderBottom: i < filteredMeetings.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: "var(--tx4)", flexShrink: 0, minWidth: "68px", fontSize: "0.72rem" }}>{fmt(m.date)}</span>
                      <span style={{ color: "var(--tx1)", fontWeight: 500, flex: "1 1 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.775rem" }}>{m.topic || "—"}</span>
                      <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem" }}>{m.type?.label ?? m.type ?? "—"}</span>
                      {m.location && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.location}</span>}
                      {usNames.length > 0 && <span style={{ color: "var(--tx5)", flexShrink: 0, fontSize: "0.7rem", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usNames.join(", ")}</span>}
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

// ── AddPersonForm ──────────────────────────────────────────────────────────────
// Inline form in GPDetail People tab — creates person + org_person link

function AddPersonForm({ orgId, onSaved, onClose }) {
  const [d, setD] = useState({ first_name: "", last_name: "", email: "", title: "", role: "", mobile: "", is_primary: false });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setD(p => ({ ...p, [k]: e.target.value }));
  const inp = { background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx1)", padding: "0.4rem 0.6rem", fontSize: "0.825rem", width: "100%", boxSizing: "border-box" };
  const lbl = { color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!d.first_name && !d.last_name) return;
    setSaving(true);
    try {
      const result = await savePerson({ ...d, org_id: orgId });
      onSaved(result);
    } catch (err) {
      console.error("Failed to add person:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
        <div><div style={lbl}>First Name</div><input style={inp} value={d.first_name} onChange={set("first_name")} placeholder="Jane" /></div>
        <div><div style={lbl}>Last Name</div><input style={inp} value={d.last_name} onChange={set("last_name")} placeholder="Smith" /></div>
        <div><div style={lbl}>Title</div><input style={inp} value={d.title} onChange={set("title")} placeholder="Partner" /></div>
        <div><div style={lbl}>Role at Org</div><input style={inp} value={d.role} onChange={set("role")} placeholder="Lead Contact" /></div>
        <div><div style={lbl}>Email</div><input style={inp} type="email" value={d.email} onChange={set("email")} placeholder="jane@firm.com" /></div>
        <div><div style={lbl}>Mobile</div><input style={inp} value={d.mobile} onChange={set("mobile")} placeholder="+1 555 0100" /></div>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
        <button type="button" onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.8rem" }}>Cancel</button>
        <button type="submit" disabled={saving || (!d.first_name && !d.last_name)} style={{ background: "var(--accent)", border: "none", borderRadius: "6px", color: "#fff", padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.8rem", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Add Person"}
        </button>
      </div>
    </form>
  );
}
