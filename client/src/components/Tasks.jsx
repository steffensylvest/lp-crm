import React, { useState, useEffect } from "react";
import { fmt } from '../utils.js';
import { loadTasks, saveTask, updateTask, deleteTask } from '../api.js';

const PRIORITY_COLORS = {
  high:   { color: "#ef4444", bg: "#fef2f2" },
  medium: { color: "#f59e0b", bg: "#fffbeb" },
  low:    { color: "#6b7280", bg: "var(--subtle)" },
};

// ── TaskList ───────────────────────────────────────────────────────────────────
// Entity-attached task list. Pass entityType ('fund'|'organization'|'person'|'meeting')
// and entityId. Loads tasks on mount, allows create/complete/delete.

export function TaskList({ entityType, entityId, assignedTo = "Me" }) {
  const [tasks, setTasks] = useState(null); // null = loading
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTasks(entityType, entityId)
      .then(res => { if (!cancelled) setTasks(res ?? []); })
      .catch(() => { if (!cancelled) setTasks([]); });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  const handleToggle = async (task) => {
    const isDone = !task.is_done;
    const updated = await updateTask(task.id, { is_done: isDone, completed_at: isDone ? new Date().toISOString() : null }).catch(() => null);
    if (updated) setTasks(prev => (prev ?? []).map(t => t.id === task.id ? updated : t));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    await deleteTask(id).catch(() => {});
    setTasks(prev => (prev ?? []).filter(t => t.id !== id));
  };

  const handleCreated = (task) => {
    setTasks(prev => [...(prev ?? []), task]);
    setComposing(false);
  };

  const pending  = (tasks ?? []).filter(t => !t.is_done);
  const done     = (tasks ?? []).filter(t => t.is_done);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ color: "var(--tx4)", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Tasks{tasks !== null ? ` (${pending.length} open)` : ""}
        </div>
        {!composing && (
          <button onClick={() => setComposing(true)}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
            + Add Task
          </button>
        )}
      </div>

      {/* New task form */}
      {composing && (
        <TaskForm
          entityType={entityType}
          entityId={entityId}
          assignedTo={assignedTo}
          onCreated={handleCreated}
          onClose={() => setComposing(false)}
        />
      )}

      {/* Loading */}
      {tasks === null && (
        <div style={{ color: "var(--tx5)", fontSize: "0.75rem", padding: "0.5rem 0" }}>Loading…</div>
      )}

      {/* Empty */}
      {tasks !== null && tasks.length === 0 && !composing && (
        <div style={{ color: "var(--tx5)", fontSize: "0.75rem", padding: "0.5rem 0" }}>No tasks yet.</div>
      )}

      {/* Pending tasks */}
      {pending.map(task => (
        <TaskRow key={task.id} task={task} onToggle={() => handleToggle(task)} onDelete={() => handleDelete(task.id)} />
      ))}

      {/* Completed tasks (collapsed section) */}
      {done.length > 0 && (
        <CompletedSection tasks={done} onToggle={handleToggle} onDelete={handleDelete} />
      )}
    </div>
  );
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const priority = task.priority ?? "medium";
  const pc = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
  const isOverdue = !task.is_done && task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.4rem 0.5rem",
               borderRadius: "6px", marginBottom: "0.2rem",
               background: hovered ? "var(--hover)" : "transparent",
               opacity: task.is_done ? 0.55 : 1 }}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        title={task.is_done ? "Mark incomplete" : "Mark done"}
        style={{ flexShrink: 0, width: "16px", height: "16px", borderRadius: "4px", marginTop: "2px",
                 border: `2px solid ${task.is_done ? "var(--accent)" : "var(--border-hi)"}`,
                 background: task.is_done ? "var(--accent)" : "transparent",
                 cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        {task.is_done && <span style={{ color: "#fff", fontSize: "0.55rem", lineHeight: 1 }}>✓</span>}
      </button>

      {/* Text */}
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <div style={{ color: "var(--tx1)", fontSize: "0.825rem", lineHeight: 1.45,
                      textDecoration: task.is_done ? "line-through" : "none" }}>
          {task.text}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem", flexWrap: "wrap" }}>
          {priority !== "medium" && (
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: pc.color, background: pc.bg,
                           borderRadius: "4px", padding: "0.05rem 0.3rem", textTransform: "capitalize" }}>
              {priority}
            </span>
          )}
          {task.due_date && (
            <span style={{ fontSize: "0.68rem", color: isOverdue ? "#ef4444" : "var(--tx5)" }}>
              Due {fmt(task.due_date)}{isOverdue ? " !" : ""}
            </span>
          )}
          {task.assigned_to && task.assigned_to !== "Me" && (
            <span style={{ fontSize: "0.68rem", color: "var(--tx5)" }}>{task.assigned_to}</span>
          )}
        </div>
      </div>

      {/* Delete */}
      {hovered && (
        <button onClick={onDelete}
          style={{ flexShrink: 0, background: "none", border: "none", color: "#ef4444", cursor: "pointer",
                   fontSize: "0.72rem", padding: "0.15rem 0.35rem", borderRadius: "4px" }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ── CompletedSection ───────────────────────────────────────────────────────────

function CompletedSection({ tasks, onToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: "none", border: "none", color: "var(--tx5)", cursor: "pointer", fontSize: "0.72rem", padding: "0.15rem 0", display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>›</span>
        {tasks.length} completed
      </button>
      {open && tasks.map(task => (
        <TaskRow key={task.id} task={task} onToggle={() => onToggle(task)} onDelete={() => onDelete(task.id)} />
      ))}
    </div>
  );
}

// ── TaskForm ───────────────────────────────────────────────────────────────────

function TaskForm({ entityType, entityId, assignedTo, onCreated, onClose }) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  const inp = { background: "var(--input)", border: "1px solid var(--border)", borderRadius: "6px",
                color: "var(--tx1)", padding: "0.4rem 0.6rem", fontSize: "0.825rem", boxSizing: "border-box" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const task = await saveTask({
        entity_type: entityType,
        entity_id: entityId,
        text: text.trim(),
        due_date: dueDate || null,
        priority,
        assigned_to: assignedTo,
        is_done: false,
      });
      onCreated(task);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      style={{ background: "var(--card)", border: "1px solid var(--border-hi)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Task description…"
        style={{ ...inp, width: "100%", marginBottom: "0.5rem" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          style={{ ...inp, fontSize: "0.775rem", color: dueDate ? "var(--tx1)" : "var(--tx5)" }} />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          style={{ ...inp, fontSize: "0.775rem" }}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onClose}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={!text.trim() || saving}
          style={{ background: "var(--accent)", border: "none", borderRadius: "6px", color: "#fff", padding: "0.25rem 0.7rem", fontSize: "0.75rem", cursor: "pointer", opacity: (!text.trim() || saving) ? 0.5 : 1 }}>
          {saving ? "Saving…" : "Add Task"}
        </button>
      </div>
    </form>
  );
}
