import React, { useState, useEffect, useRef } from "react";
import { btnGhost, btnDanger, btnPrimary } from '../theme.js';
import { fmt } from '../utils.js';
import { Overlay, OverlayHeader } from './Overlay.jsx';
import { updatePerson, loadPeople, mergePeople } from '../api.js';

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

// ── MergePersonPanel ───────────────────────────────────────────────────────────
// Inline panel in PersonDetailOverlay to merge with another person

function MergePersonPanel({ person, onMerged, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // person to merge into this one
  const [keepSelf, setKeepSelf] = useState(true); // true = keep current person, false = keep other
  const [merging, setMerging] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(() => {
      setLoading(true);
      loadPeople({ q: query, limit: 10 })
        .then(r => setResults((r ?? []).filter(p => p.id !== person.id)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, person.id]);

  const handleMerge = async () => {
    if (!selected) return;
    setMerging(true);
    try {
      const keepId = keepSelf ? person.id : selected.id;
      const mergeId = keepSelf ? selected.id : person.id;
      await mergePeople(keepId, [mergeId]);
      onMerged(keepId, mergeId);
    } catch (err) {
      console.error("Merge failed:", err);
    } finally {
      setMerging(false);
    }
  };

  const fullName = p => [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
  const inp = { background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx1)", padding: "0.4rem 0.7rem", fontSize: "0.825rem", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <div style={{ color: "var(--tx3)", fontWeight: 600, fontSize: "0.8125rem", flex: 1 }}>Merge with another person</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.85rem", padding: "0.1rem 0.3rem" }}>✕</button>
      </div>

      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setSelected(null); }}
        placeholder="Search by name…"
        style={inp}
        autoFocus
      />

      {loading && <div style={{ color: "var(--tx5)", fontSize: "0.75rem", marginTop: "0.4rem" }}>Searching…</div>}

      {!selected && results.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", marginTop: "0.4rem" }}>
          {results.map((p, i) => (
            <div key={p.id} onClick={() => { setSelected(p); setQuery(fullName(p)); setResults([]); }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.75rem",
                       borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                       cursor: "pointer", background: "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ color: "var(--tx1)", fontSize: "0.8rem", fontWeight: 500 }}>{fullName(p)}</span>
              {p.title && <span style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>· {p.title}</span>}
              {p.email && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{p.email}</span>}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: "0.75rem" }}>
          {/* Side-by-side comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {[
              { p: person, label: "Current", isSelf: true },
              { p: selected, label: "Other", isSelf: false },
            ].map(({ p: pr, label, isSelf }) => {
              const isKeep = keepSelf === isSelf;
              return (
                <div key={label} onClick={() => setKeepSelf(isSelf)}
                  style={{ border: `2px solid ${isKeep ? "#3b82f6" : "var(--border)"}`, borderRadius: "8px",
                           padding: "0.65rem 0.8rem", cursor: "pointer",
                           background: isKeep ? "color-mix(in srgb, #3b82f6 6%, var(--card))" : "var(--card)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                    <div style={{ color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    {isKeep && <span style={{ color: "#3b82f6", fontSize: "0.65rem", fontWeight: 700 }}>KEEP</span>}
                  </div>
                  <div style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem" }}>{fullName(pr)}</div>
                  {pr.title && <div style={{ color: "var(--tx4)", fontSize: "0.72rem" }}>{pr.title}</div>}
                  {pr.email && <div style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>{pr.email}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button onClick={() => { setSelected(null); setQuery(""); }} style={btnGhost}>Cancel</button>
            <button onClick={handleMerge} disabled={merging}
              style={{ background: merging ? "var(--subtle)" : "#ef4444", border: "none", borderRadius: "6px", color: merging ? "var(--tx4)" : "#fff",
                       padding: "0.4rem 1rem", fontSize: "0.825rem", fontWeight: 600, cursor: merging ? "wait" : "pointer" }}>
              {merging ? "Merging…" : "Merge →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PersonDetailOverlay ────────────────────────────────────────────────────────

export function PersonDetailOverlay({ orgPerson, orgName, onClose, onUpdated, onMerged, zIndex = 1050 }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState(orgPerson.person ?? orgPerson);
  const [showMerge, setShowMerge] = useState(false);
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

  const handleMerged = (keepId, mergeId) => {
    setShowMerge(false);
    onMerged && onMerged(keepId, mergeId);
    onClose();
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
        actions={<>
          <button onClick={() => setShowMerge(v => !v)} style={{ ...btnGhost, fontSize: "0.75rem" }}>Merge…</button>
          <button onClick={() => setEditing(true)} style={btnGhost}>Edit</button>
        </>}
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

        {/* Merge panel */}
        {showMerge && (
          <MergePersonPanel
            person={person}
            onMerged={handleMerged}
            onClose={() => setShowMerge(false)}
          />
        )}
      </div>
    </Overlay>
  );
}

// ── PeopleView ─────────────────────────────────────────────────────────────────
// People Book — searchable table of all people, editable inline

export function PeopleView({ onBack, zIndex = 1000 }) {
  const [people, setPeople] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    loadPeople()
      .then(data => setPeople(data ?? []))
      .catch(() => setPeople([]));
  }, []);

  const filtered = (people ?? []).filter(p => {
    const s = search.toLowerCase();
    if (!s) return true;
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
    return name.includes(s) || (p.email ?? "").toLowerCase().includes(s) || (p.title ?? "").toLowerCase().includes(s);
  });

  // Sort by last name, then first name
  const sorted = [...filtered].sort((a, b) => {
    const ln = (a.last_name ?? "").localeCompare(b.last_name ?? "");
    if (ln !== 0) return ln;
    return (a.first_name ?? "").localeCompare(b.first_name ?? "");
  });

  const handleMerged = (keepId, mergeId) => {
    setPeople(prev => (prev ?? []).filter(p => p.id !== mergeId));
    setSelectedPerson(null);
  };

  if (selectedPerson) {
    return (
      <PersonDetailOverlay
        orgPerson={selectedPerson}
        orgName={selectedPerson.org_name ?? null}
        zIndex={zIndex + 50}
        onClose={() => setSelectedPerson(null)}
        onUpdated={(updated) => {
          setPeople(prev => (prev ?? []).map(p => p.id === updated.id ? { ...p, ...updated } : p));
          setSelectedPerson(null);
        }}
        onMerged={handleMerged}
      />
    );
  }

  const col = (label, w) => (
    <div style={{ flex: `0 0 ${w}`, minWidth: 0, color: "var(--tx4)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>People Book</h2>
          <div style={{ color: "var(--tx4)", fontSize: "0.8125rem" }}>
            {people === null ? "Loading…" : `${sorted.length} contact${sorted.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, title…"
          style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--tx1)", padding: "0.45rem 0.85rem", fontSize: "0.825rem", width: "240px", outline: "none" }}
        />
      </div>

      {people === null && <div style={{ color: "var(--tx5)", textAlign: "center", padding: "3rem" }}>Loading…</div>}
      {people !== null && sorted.length === 0 && (
        <div style={{ color: "var(--tx4)", textAlign: "center", padding: "3rem" }}>No contacts found.</div>
      )}

      {people !== null && sorted.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 1rem", background: "var(--subtle)", borderBottom: "1px solid var(--border)" }}>
            {col("Name", "200px")}
            {col("Title", "160px")}
            {col("Org", "160px")}
            {col("Email", "200px")}
            {col("Mobile", "130px")}
          </div>
          {/* Rows */}
          {sorted.map((p, i) => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
            return (
              <div key={p.id} onClick={() => setSelectedPerson(p)}
                style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.5rem 1rem",
                         borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                         cursor: "pointer", background: "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ flex: "0 0 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "var(--subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--tx3)", fontSize: "0.62rem", fontWeight: 700 }}>
                      {[p.first_name?.[0], p.last_name?.[0]].filter(Boolean).join("") || "?"}
                    </div>
                    <span style={{ color: "var(--tx1)", fontWeight: 600, fontSize: "0.825rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</span>
                  </div>
                </div>
                <div style={{ flex: "0 0 160px", minWidth: 0, color: "var(--tx3)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "—"}</div>
                <div style={{ flex: "0 0 160px", minWidth: 0, color: "var(--tx4)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.org_name || "—"}</div>
                <div style={{ flex: "0 0 200px", minWidth: 0, color: "var(--tx4)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email || "—"}</div>
                <div style={{ flex: "0 0 130px", minWidth: 0, color: "var(--tx5)", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.mobile || p.phone || "—"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
