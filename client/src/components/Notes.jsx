import React, { useState, useEffect, useRef, useCallback } from "react";
import { btnGhost, btnDanger, btnPrimary } from '../theme.js';
import { fmtTs } from '../utils.js';
import { renderMarkdown } from '../markdown.jsx';
import { loadNotes, saveNote, updateNote, deleteNote } from '../api.js';

// ── NotesList ──────────────────────────────────────────────────────────────────
// Entity-attached notes panel. Pass entityType ('fund'|'organization'|'person')
// and entityId. Loads notes on mount, allows create/edit/delete.

export function NotesList({ entityType, entityId, createdBy = "Me" }) {
  const [notes, setNotes] = useState(null); // null = loading
  const [composing, setComposing] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // note object being edited

  useEffect(() => {
    let cancelled = false;
    loadNotes(entityType, entityId)
      .then(res => { if (!cancelled) setNotes(res ?? []); })
      .catch(() => { if (!cancelled) setNotes([]); });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  const handleSaved = (note) => {
    setNotes(prev => {
      const existing = (prev ?? []).findIndex(n => n.id === note.id);
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = note;
        return copy;
      }
      return [note, ...(prev ?? [])];
    });
    setComposing(false);
    setEditingNote(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this note?")) return;
    await deleteNote(id).catch(() => {});
    setNotes(prev => (prev ?? []).filter(n => n.id !== id));
  };

  const pinned = (notes ?? []).filter(n => n.is_pinned);
  const unpinned = (notes ?? []).filter(n => !n.is_pinned);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes{notes !== null ? ` (${notes.length})` : ""}
        </div>
        {!composing && !editingNote && (
          <button onClick={() => setComposing(true)}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
            + Add Note
          </button>
        )}
      </div>

      {/* New note editor */}
      {composing && (
        <NoteEditor
          entityType={entityType}
          entityId={entityId}
          createdBy={createdBy}
          onSaved={handleSaved}
          onDiscard={() => setComposing(false)}
        />
      )}

      {/* Loading state */}
      {notes === null && (
        <div style={{ color: "var(--tx5)", fontSize: "0.75rem", padding: "0.5rem 0" }}>Loading…</div>
      )}

      {/* Empty state */}
      {notes !== null && notes.length === 0 && !composing && (
        <div style={{ color: "var(--tx5)", fontSize: "0.75rem", padding: "0.5rem 0" }}>No notes yet.</div>
      )}

      {/* Pinned notes */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          {pinned.map(note => (
            editingNote?.id === note.id
              ? <NoteEditor key={note.id} note={note} entityType={entityType} entityId={entityId} createdBy={createdBy}
                  onSaved={handleSaved} onDiscard={() => setEditingNote(null)} />
              : <NoteCard key={note.id} note={note} onEdit={() => setEditingNote(note)} onDelete={() => handleDelete(note.id)} />
          ))}
        </div>
      )}

      {/* Regular notes */}
      {unpinned.map(note => (
        editingNote?.id === note.id
          ? <NoteEditor key={note.id} note={note} entityType={entityType} entityId={entityId} createdBy={createdBy}
              onSaved={handleSaved} onDiscard={() => setEditingNote(null)} />
          : <NoteCard key={note.id} note={note} onEdit={() => setEditingNote(note)} onDelete={() => handleDelete(note.id)} />
      ))}
    </div>
  );
}

// ── NoteCard ───────────────────────────────────────────────────────────────────

function NoteCard({ note, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: note.is_pinned ? "color-mix(in srgb, var(--accent) 6%, var(--card))" : "var(--card)",
               border: `1px solid ${note.is_pinned ? "color-mix(in srgb, var(--accent) 25%, var(--border))" : "var(--border)"}`,
               borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.5rem", position: "relative" }}>
      {note.is_pinned && (
        <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", fontSize: "0.6rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Pinned
        </div>
      )}
      <div style={{ color: "var(--tx2)", fontSize: "0.825rem", lineHeight: 1.65 }}>
        {renderMarkdown(note.body) ?? note.body}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
        <div style={{ color: "var(--tx5)", fontSize: "0.68rem" }}>
          {note.created_by && <span>{note.created_by}</span>}
          {note.updated_at && <span style={{ marginLeft: "0.4rem" }}>{fmtTs(note.updated_at ?? note.created_at)}</span>}
        </div>
        {hovered && (
          <div style={{ display: "flex", gap: "0.3rem" }}>
            <button onClick={onEdit}
              style={{ background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "0.72rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }}>
              Edit
            </button>
            <button onClick={onDelete}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.72rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }}>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── NoteEditor ─────────────────────────────────────────────────────────────────
// Create or edit a single note. Auto-saves 1s after typing stops.
// Discard button reverts to original content.

function NoteEditor({ note, entityType, entityId, createdBy, onSaved, onDiscard }) {
  const isNew = !note;
  const [body, setBody] = useState(note?.body ?? "");
  const [isPinned, setIsPinned] = useState(note?.is_pinned ?? false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef(null);
  const savedNoteRef = useRef(note ?? null); // track server-saved state for auto-save

  // Auto-save on body change (1 second debounce), only for existing notes
  useEffect(() => {
    if (isNew) return;
    if (!dirty) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSaving(true);
      updateNote(savedNoteRef.current.id, { body, is_pinned: isPinned })
        .then(updated => {
          savedNoteRef.current = updated;
          setSaving(false);
          setDirty(false);
        })
        .catch(() => setSaving(false));
    }, 1000);
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, isPinned, dirty]);

  const handleSave = async () => {
    clearTimeout(timerRef.current);
    if (!body.trim()) return;
    setSaving(true);
    try {
      let result;
      if (isNew) {
        result = await saveNote({ entity_type: entityType, entity_id: entityId, body, is_pinned: isPinned, created_by: createdBy });
      } else {
        result = await updateNote(note.id, { body, is_pinned: isPinned });
      }
      onSaved(result);
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    clearTimeout(timerRef.current);
    onDiscard();
  };

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border-hi)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
      <textarea
        autoFocus
        value={body}
        onChange={e => { setBody(e.target.value); setDirty(true); }}
        placeholder="Write a note… Supports **bold** and *italic* markdown."
        style={{ width: "100%", minHeight: "90px", background: "transparent", border: "none", outline: "none", resize: "vertical",
                 color: "var(--tx1)", fontSize: "0.825rem", lineHeight: 1.65, fontFamily: "inherit", boxSizing: "border-box", padding: 0 }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "var(--tx4)", fontSize: "0.75rem" }}>
          <input type="checkbox" checked={isPinned} onChange={e => { setIsPinned(e.target.checked); setDirty(true); }} />
          Pin
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {saving && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>Saving…</span>}
          {!isNew && !saving && dirty && <span style={{ color: "var(--tx5)", fontSize: "0.7rem" }}>Unsaved</span>}
          <button onClick={handleDiscard}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
            {isNew ? "Cancel" : "Discard"}
          </button>
          <button onClick={handleSave} disabled={!body.trim() || saving}
            style={{ background: "var(--accent)", border: "none", borderRadius: "6px", color: "#fff", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer", opacity: (!body.trim() || saving) ? 0.5 : 1 }}>
            {isNew ? "Add Note" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
