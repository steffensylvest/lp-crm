import React, { useState } from "react";
import { btnGhost, btnDanger, btnPrimary } from '../theme.js';
import { fmt } from '../utils.js';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { updatePerson } from '../api.js';

// ── PersonForm ─────────────────────────────────────────────────────────────────

function PersonForm({ initial, onSave, onClose }) {
  const [d, setD] = useState(() => {
    const base = { first_name: "", last_name: "", email: "", phone: "", mobile: "", title: "", linkedin_url: "", investment_focus: "" };
    if (!initial) return base;
    return { ...base, ...initial,
      first_name:       initial.first_name       ?? "",
      last_name:        initial.last_name        ?? "",
      email:            initial.email            ?? "",
      phone:            initial.phone            ?? "",
      mobile:           initial.mobile           ?? "",
      title:            initial.title            ?? "",
      linkedin_url:     initial.linkedin_url     ?? "",
      investment_focus: initial.investment_focus ?? "",
    };
  });
  const set = (k) => (e) => setD(p => ({ ...p, [k]: e.target.value }));
  const inp = { background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx1)", padding: "0.45rem 0.65rem", fontSize: "0.85rem", width: "100%", boxSizing: "border-box" };
  const lbl = { color: "var(--tx4)", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
  const row = { marginBottom: "0.9rem" };
  const half = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.9rem" };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(d); }} style={{ display: "flex", flexDirection: "column" }}>
      <div style={half}>
        <div><div style={lbl}>First Name</div><input style={inp} value={d.first_name} onChange={set("first_name")} placeholder="Jane" /></div>
        <div><div style={lbl}>Last Name</div><input style={inp} value={d.last_name} onChange={set("last_name")} placeholder="Smith" /></div>
      </div>
      <div style={row}><div style={lbl}>Title</div><input style={inp} value={d.title} onChange={set("title")} placeholder="Partner" /></div>
      <div style={row}><div style={lbl}>Email</div><input style={inp} type="email" value={d.email} onChange={set("email")} placeholder="jane@firm.com" /></div>
      <div style={half}>
        <div><div style={lbl}>Mobile</div><input style={inp} value={d.mobile} onChange={set("mobile")} placeholder="+1 555 0100" /></div>
        <div><div style={lbl}>Phone</div><input style={inp} value={d.phone} onChange={set("phone")} placeholder="+1 555 0100" /></div>
      </div>
      <div style={row}><div style={lbl}>LinkedIn URL</div><input style={inp} value={d.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/..." /></div>
      <div style={row}><div style={lbl}>Investment Focus</div><input style={inp} value={d.investment_focus} onChange={set("investment_focus")} placeholder="Venture, Growth Equity..." /></div>
      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
        <button type="submit" style={btnPrimary}>Save</button>
      </div>
    </form>
  );
}

// ── PersonDetailOverlay ────────────────────────────────────────────────────────

export function PersonDetailOverlay({ orgPerson, orgName, onClose, onUpdated, zIndex = 1050 }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState(orgPerson.person ?? orgPerson);
  const role = orgPerson.role ?? null;

  const handleSave = async (d) => {
    setSaving(true);
    try {
      const updated = await updatePerson(person.id, d);
      setPerson(updated);
      onUpdated && onUpdated(updated);
      setEditing(false);
    } catch (err) {
      console.error("Failed to save person:", err);
    } finally {
      setSaving(false);
    }
  };

  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ") || "Unknown";
  const subtitle = [person.title, orgName].filter(Boolean).join(" · ");

  if (editing) return (
    <Overlay onClose={() => setEditing(false)} width="520px" zIndex={zIndex}>
      <OverlayHeader title={`Edit ${fullName}`} onClose={() => setEditing(false)} />
      <div style={{ padding: "1.5rem" }}>
        <PersonForm initial={person} onSave={handleSave} onClose={() => setEditing(false)} />
        {saving && <div style={{ color: "var(--tx4)", fontSize: "0.75rem", marginTop: "0.5rem", textAlign: "center" }}>Saving…</div>}
      </div>
    </Overlay>
  );

  return (
    <Overlay onClose={onClose} width="480px" zIndex={zIndex}>
      <OverlayHeader
        title={fullName}
        subtitle={subtitle}
        onClose={onClose}
        actions={<button onClick={() => setEditing(true)} style={btnGhost}>Edit</button>}
      />
      <div style={{ padding: "1.5rem" }}>
        {/* Detail cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Title",            value: person.title || "—" },
            { label: "Role at Org",      value: role || "—" },
            { label: "Email",            value: person.email || "—", href: person.email ? `mailto:${person.email}` : null },
            { label: "Mobile",           value: person.mobile || person.phone || "—", href: person.mobile ? `tel:${person.mobile}` : null },
          ].map(({ label, value, href }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.65rem 0.9rem" }}>
              <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{label}</div>
              {href
                ? <a href={href} style={{ color: "var(--accent)", fontSize: "0.825rem", fontWeight: 500, textDecoration: "none" }}>{value}</a>
                : <div style={{ color: "var(--tx1)", fontSize: "0.825rem", fontWeight: 500 }}>{value}</div>
              }
            </div>
          ))}
        </div>

        {/* LinkedIn */}
        {person.linkedin_url && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "0.65rem" }}>
            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>LinkedIn</div>
            <a href={person.linkedin_url.startsWith("http") ? person.linkedin_url : `https://${person.linkedin_url}`}
               target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--accent)", fontSize: "0.825rem", textDecoration: "none" }}>
              {person.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "")}
            </a>
          </div>
        )}

        {/* Investment focus */}
        {person.investment_focus && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "0.65rem" }}>
            <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>Investment Focus</div>
            <div style={{ color: "var(--tx2)", fontSize: "0.825rem" }}>{person.investment_focus}</div>
          </div>
        )}

        {/* Primary contact badge */}
        {orgPerson.is_primary && (
          <div style={{ display: "inline-block", background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.2rem 0.65rem", fontSize: "0.7rem", color: "var(--tx3)", fontWeight: 500 }}>
            Primary contact
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ── PersonRow ──────────────────────────────────────────────────────────────────
// Used in GPDetail People tab list

export function PersonRow({ orgPerson, onClick, isLast }) {
  const person = orgPerson.person ?? orgPerson;
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ") || "Unknown";
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem",
               borderBottom: isLast ? "none" : "1px solid var(--border)", cursor: "pointer", background: "transparent" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Avatar initials */}
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--subtle)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    color: "var(--tx3)", fontSize: "0.7rem", fontWeight: 700 }}>
        {[person.first_name?.[0], person.last_name?.[0]].filter(Boolean).join("") || "?"}
      </div>
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{fullName}</span>
          {orgPerson.is_primary && <span style={{ color: "var(--tx4)", fontSize: "0.65rem", background: "var(--subtle)", borderRadius: "4px", padding: "0.1rem 0.35rem" }}>Primary</span>}
        </div>
        <div style={{ color: "var(--tx4)", fontSize: "0.72rem", marginTop: "0.1rem" }}>
          {[person.title, orgPerson.role].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      {person.email && <span style={{ color: "var(--tx5)", fontSize: "0.7rem", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{person.email}</span>}
    </div>
  );
}
