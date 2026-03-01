import React from "react";
import { fmt, fmtTs } from '../utils.js';
import { renderMarkdown } from '../markdown.jsx';
import { btnGhost, btnDanger } from '../theme.js';
import { Chip } from './Badges.jsx';
import { Overlay, OverlayHeader } from './Overlay.jsx';

export function MeetingDetailOverlay({ meeting, fundName, gpName, onClose, onEdit, onDelete, zIndex = 1000 }) {
  return (
    <Overlay onClose={onClose} width="580px" zIndex={zIndex}>
      <OverlayHeader
        title={meeting.topic || "Meeting"}
        subtitle={`${gpName}${fundName ? " · " + fundName : ""}`}
        onClose={onClose}
        actions={
          <>
            <button onClick={() => onEdit(meeting)} style={btnGhost}>Edit</button>
            <button onClick={() => { if (confirm("Delete this meeting?")) onDelete(meeting.id); onClose(); }} style={btnDanger}>Delete</button>
          </>
        }
      />
      <div style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.65rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Date", value: fmt(meeting.date) },
            { label: "Type", value: meeting.type },
            { label: "Location", value: meeting.location || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.65rem 0.9rem" }}>
              <div style={{ color: "var(--tx4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.875rem" }}>{value}</div>
            </div>
          ))}
        </div>
        {fundName && (
          <div style={{ marginBottom: "1rem" }}>
            <Chip label={fundName} color="#7c3aed" bg="#ede9fe" />
          </div>
        )}
        {meeting.notes && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
            <div style={{ color: "var(--tx4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Notes</div>
            <div style={{ color: "#cbd5e1", fontSize: "0.875rem" }}>{renderMarkdown(meeting.notes) ?? meeting.notes}</div>
          </div>
        )}
        <div style={{ color: "var(--tx5)", fontSize: "0.72rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          Logged by <span style={{ color: "var(--tx4)" }}>{meeting.loggedBy || "Unknown"}</span>
          {meeting.loggedAt && <> · <span style={{ color: "var(--tx4)" }}>{fmtTs(meeting.loggedAt)}</span></>}
        </div>
      </div>
    </Overlay>
  );
}
