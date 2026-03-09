import React, { useState, useEffect } from "react";
import { btnGhost, btnPrimary } from '../theme.js';
import { fmtTs } from '../utils.js';
import { loadPendingProvenance, acceptProvenance, rejectProvenance, triggerPreqinSync } from '../api.js';

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

// ── DataReviewView ─────────────────────────────────────────────────────────────
// Global view: all pending Preqin suggestions grouped by entity.
// Allows bulk review + sync trigger.

export function DataReviewView({ onBack, displayOrgs = [], onEntityClick }) {
  const [rows, setRows]       = useState(null); // null = loading
  const [syncing, setSyncing] = useState(false);
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

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await triggerPreqinSync();
      setSyncMsg(result?.message ?? "Sync complete");
      load();
    } catch (err) {
      setSyncMsg("Sync failed — check server logs");
    } finally {
      setSyncing(false);
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>Data Review</h2>
          <div style={{ color: "var(--tx4)", fontSize: "0.8125rem" }}>
            {rows === null ? "Loading…" : `${pending.length} pending suggestion${pending.length !== 1 ? "s" : ""} from Preqin`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {syncMsg && <span style={{ color: "var(--tx4)", fontSize: "0.78rem" }}>{syncMsg}</span>}
          <button onClick={handleSync} disabled={syncing}
            style={{ ...btnPrimary, opacity: syncing ? 0.6 : 1, cursor: syncing ? "wait" : "pointer" }}>
            {syncing ? "Syncing…" : "Sync Preqin"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {rows === null && (
        <div style={{ color: "var(--tx5)", textAlign: "center", padding: "3rem" }}>Loading…</div>
      )}

      {/* Empty */}
      {rows !== null && groupList.length === 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
          <div style={{ color: "var(--tx2)", fontWeight: 600, marginBottom: "0.3rem" }}>No pending suggestions</div>
          <div style={{ color: "var(--tx4)", fontSize: "0.825rem" }}>Run "Sync Preqin" to import new suggestions from the Preqin export.</div>
        </div>
      )}

      {/* Groups */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {groupList.map(group => {
          const name = entityName(group.entity_type, group.entity_id);
          const entity = group.entity_type === "fund"
            ? allFunds.find(f => String(f.id) === String(group.entity_id))
            : displayOrgs.find(o => String(o.id) === String(group.entity_id));
          return (
            <div key={`${group.entity_type}::${group.entity_id}`}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
              {/* Group header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1.25rem",
                            borderBottom: "1px solid var(--border)", background: "var(--subtle)" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem" }}>{name}</span>
                  <span style={{ color: "var(--tx4)", fontSize: "0.72rem", marginLeft: "0.5rem",
                                 background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px",
                                 padding: "0.05rem 0.4rem" }}>
                    {group.rows.length} pending
                  </span>
                  <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "0.5rem", textTransform: "capitalize" }}>
                    {group.entity_type}
                  </span>
                </div>
                {onEntityClick && entity && (
                  <button onClick={() => onEntityClick(group.entity_type, entity)}
                    style={{ ...btnGhost, fontSize: "0.75rem" }}>
                    Open →
                  </button>
                )}
              </div>

              {/* Field rows */}
              {group.rows.map((row, i) => (
                <div key={row.id}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1.25rem",
                           borderBottom: i < group.rows.length - 1 ? "1px solid var(--border)" : "none",
                           flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                    <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600,
                                  textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {row.field_name.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 0", minWidth: 0 }}>
                    <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.825rem" }}>{row.value}</span>
                    {row.proposed_at && (
                      <span style={{ color: "var(--tx5)", fontSize: "0.68rem", marginLeft: "0.5rem" }}>
                        {fmtTs(row.proposed_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    <button onClick={() => handleAccept(row.id)}
                      style={{ background: "#22c55e", border: "none", borderRadius: "5px", color: "#fff",
                               padding: "0.25rem 0.65rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                      ✓ Accept
                    </button>
                    <button onClick={() => handleReject(row.id)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: "5px",
                               color: "var(--tx4)", padding: "0.25rem 0.65rem", fontSize: "0.75rem", cursor: "pointer" }}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
