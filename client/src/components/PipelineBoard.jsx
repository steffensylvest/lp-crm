import React, { useState } from "react";
import { PIPELINE_STAGES, STATUS_OPTIONS, SECTOR_OPTIONS, CURRENCIES, STRATEGY_OPTIONS, SUB_STRATEGY_PRESETS } from '../constants.js';
import { btnGhost, btnPrimary, btnDanger, IS, TA } from '../theme.js';
import { uid, now } from '../utils.js';
import { ScoreBadge, StatusPill, SubStratChip, SectorChip, Chip } from './Badges.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { Field } from './Forms.jsx';

export function PipelineBoard({ pipeline, gps, onUpdate, onFundClick, onBack }) {
  const allFunds = gps.flatMap(g => (g.funds||[]).map(f => ({ ...f, gpName: g.name, gpId: g.id })));
  const [dragging, setDragging] = useState(null); // { itemId }
  const [dragOverStage, setDragOverStage] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addStage, setAddStage] = useState("watching");
  const [editItem, setEditItem] = useState(null);
  const [pipelineNote, setPipelineNote] = useState("");
  const [selectedFundId, setSelectedFundId] = useState("");

  const getPipelineItemFund = (item) => allFunds.find(f => f.id === item.fundId);

  const addToPipeline = () => {
    if (!selectedFundId) return;
    const fund = allFunds.find(f => f.id === selectedFundId);
    if (!fund) return;
    const already = pipeline.find(p => p.fundId === selectedFundId);
    if (already) { alert("This fund is already in the pipeline."); return; }
    onUpdate([...pipeline, { id: uid(), fundId: selectedFundId, gpName: fund.gpName, stage: addStage, addedAt: now(), pipelineNotes: pipelineNote }]);
    setShowAdd(false); setSelectedFundId(""); setPipelineNote("");
  };

  const removeItem = (id) => { if (!confirm("Remove from pipeline?")) return; onUpdate(pipeline.filter(p => p.id !== id)); };
  const moveItem = (id, stage) => onUpdate(pipeline.map(p => p.id === id ? { ...p, stage } : p));
  const saveNotes = (id, notes) => { onUpdate(pipeline.map(p => p.id === id ? { ...p, pipelineNotes: notes } : p)); setEditItem(null); };

  const onDragStart = (e, itemId) => { setDragging(itemId); e.dataTransfer.effectAllowed = "move"; };
  const onDrop = (e, stageId) => { e.preventDefault(); if (dragging) { moveItem(dragging, stageId); } setDragging(null); setDragOverStage(null); };
  const onDragOver = (e, stageId) => { e.preventDefault(); setDragOverStage(stageId); };

  const notInPipeline = allFunds.filter(f => !pipeline.find(p => p.fundId === f.id));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>Investment Pipeline</h2>
          <div style={{ color: "var(--tx4)", fontSize: "0.8125rem" }}>{pipeline.length} fund{pipeline.length!==1?"s":""} in pipeline · drag cards to move stages</div>
        </div>
        <button onClick={() => setShowAdd(true)} style={btnPrimary}>+ Add to Pipeline</button>
      </div>

      {/* Kanban */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`, gap: "0.75rem", overflowX: "auto", minWidth: "900px" }}>
        {PIPELINE_STAGES.map(stage => {
          const items = pipeline.filter(p => p.stage === stage.id);
          const isOver = dragOverStage === stage.id;
          return (
            <div key={stage.id}
              onDragOver={e => onDragOver(e, stage.id)}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={e => onDrop(e, stage.id)}
              style={{ background: stage.bg, border: `2px solid ${isOver ? stage.ac : stage.bd}`, borderRadius: "10px", padding: "0.75rem", minHeight: "300px", transition: "border-color 0.15s", boxShadow: isOver ? `inset 0 0 0 1px ${stage.ac}` : "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: stage.ac, flexShrink: 0 }} />
                <span style={{ color: stage.ac, fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>{stage.label}</span>
                <span style={{ marginLeft: "auto", background: "none", color: stage.ac, border: `1px solid ${stage.bd}`, borderRadius: "10px", padding: "0.05rem 0.45rem", fontSize: "0.7rem", fontWeight: 600 }}>{items.length}</span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {items.map(item => {
                  const fund = getPipelineItemFund(item);
                  if (!fund) return null;
                  return (
                    <div key={item.id}
                      draggable
                      onDragStart={e => onDragStart(e, item.id)}
                      onDragEnd={() => { setDragging(null); setDragOverStage(null); }}
                      style={{ background: "var(--card)", border: `1px solid ${dragging===item.id?"#7c3aed":"var(--border)"}`, borderRadius: "8px", padding: "0.75rem", cursor: "grab", userSelect: "none", opacity: dragging===item.id?0.5:1 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                        <span onClick={() => onFundClick && onFundClick(fund, gps.find(g=>g.id===fund.gpId))} style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", lineHeight: 1.3, flex: 1 }}>{fund.name}</span>
                        <button onClick={e => { e.stopPropagation(); removeItem(item.id); }} style={{ ...btnDanger, padding: "0.1rem 0.3rem", fontSize: "0.65rem", marginLeft: "0.3rem", flexShrink: 0 }}>✕</button>
                      </div>
                      <div style={{ color: "var(--tx3)", fontSize: "0.72rem", marginBottom: "0.35rem" }}>{fund.gpName}</div>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                        <ScoreBadge score={fund.score} />
                        <StatusPill status={fund.status} />
                      </div>
                      {fund.subStrategy && <div style={{ marginBottom: "0.35rem" }}><SubStratChip label={fund.subStrategy} /></div>}
                      {fund.targetSize && <div style={{ color: "var(--tx4)", fontSize: "0.7rem" }}>{fund.currency} {Number(fund.targetSize).toLocaleString()}M target</div>}
                      {item.pipelineNotes && <div style={{ color: "var(--tx4)", fontSize: "0.7rem", marginTop: "0.35rem", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: "0.35rem" }}>{item.pipelineNotes}</div>}
                      {editItem === item.id ? (
                        <div style={{ marginTop: "0.5rem" }} onClick={e => e.stopPropagation()}>
                          <textarea defaultValue={item.pipelineNotes || ""} id={`pn-${item.id}`} style={{ ...TA, minHeight: "50px", fontSize: "0.75rem", marginBottom: "0.3rem" }} />
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button onClick={() => saveNotes(item.id, document.getElementById(`pn-${item.id}`).value)} style={{ ...btnPrimary, padding: "0.2rem 0.6rem", fontSize: "0.72rem" }}>Save</button>
                            <button onClick={() => setEditItem(null)} style={{ ...btnGhost, padding: "0.2rem 0.6rem", fontSize: "0.72rem" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setEditItem(item.id); }} style={{ ...btnGhost, marginTop: "0.4rem", padding: "0.15rem 0.5rem", fontSize: "0.68rem", color: "var(--tx4)" }}>Edit notes</button>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ color: "var(--tx5)", fontSize: "0.75rem", textAlign: "center", padding: "1.5rem 0.5rem", borderRadius: "6px", border: "1px dashed var(--border)" }}>Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add to pipeline modal */}
      {showAdd && (
        <Overlay onClose={() => setShowAdd(false)} width="500px">
          <OverlayHeader title="Add Fund to Pipeline" onClose={() => setShowAdd(false)} />
          <div style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
            <Field label="Fund">
              <select style={IS} value={selectedFundId} onChange={e => setSelectedFundId(e.target.value)}>
                <option value="">— Select a fund —</option>
                {notInPipeline.map(f => <option key={f.id} value={f.id}>{f.gpName} — {f.name}</option>)}
              </select>
            </Field>
            <Field label="Initial Stage">
              <select style={IS} value={addStage} onChange={e => setAddStage(e.target.value)}>
                {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <textarea style={TA} value={pipelineNote} onChange={e => setPipelineNote(e.target.value)} placeholder="Initial thoughts, rationale…" />
            </Field>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
              <button onClick={addToPipeline} style={btnPrimary} disabled={!selectedFundId}>Add to Pipeline</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
