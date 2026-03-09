// ─── API client ───────────────────────────────────────────────────────────────
// All calls go to /api/v2/* which Vite proxies to http://localhost:3001 in dev.


// ─── v2 API ────────────────────────────────────────────────────────────────────

const V2 = '/api/v2';

async function _v2fetch(path, opts = {}) {
  const res = await fetch(`${V2}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Organizations ──────────────────────────────────────────────────────────────

export const loadOrganizations = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return _v2fetch(`/organizations${q ? `?${q}` : ''}`);
};

export const loadOrganization = (id) => _v2fetch(`/organizations/${id}`);

export const saveOrganization = (id, data) =>
  _v2fetch(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const patchOrganizationField = (id, field, value, note, changedBy) =>
  _v2fetch(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ field, value, note, changed_by: changedBy }),
  });

// ── Funds ──────────────────────────────────────────────────────────────────────

export const loadFunds = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return _v2fetch(`/funds${q ? `?${q}` : ''}`);
};

export const loadFund = (id) => _v2fetch(`/funds/${id}`);

export const saveFund = (id, data) =>
  _v2fetch(`/funds/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const patchFundField = (id, field, value, note, changedBy) =>
  _v2fetch(`/funds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ field, value, note, changed_by: changedBy }),
  });

// ── Taxonomy & Lookups ─────────────────────────────────────────────────────────

export const loadTaxonomy = (type) => _v2fetch(`/taxonomy?type=${type}`);

export const loadLookups = () => _v2fetch('/lookups');

// ── Notes ──────────────────────────────────────────────────────────────────────

export const loadNotes = (entityType, entityId) =>
  _v2fetch(`/notes?entity_type=${entityType}&entity_id=${entityId}`);

export const saveNote = (data) =>
  _v2fetch('/notes', { method: 'POST', body: JSON.stringify(data) });

export const updateNote = (id, data) =>
  _v2fetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteNote = (id) =>
  _v2fetch(`/notes/${id}`, { method: 'DELETE' });

// ── Meetings ───────────────────────────────────────────────────────────────────

export const loadMeetings = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return _v2fetch(`/meetings${q ? `?${q}` : ''}`);
};

export const saveMeeting = (data) =>
  _v2fetch('/meetings', { method: 'POST', body: JSON.stringify(data) });

export const updateMeeting = (id, data) =>
  _v2fetch(`/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteMeeting = (id) =>
  _v2fetch(`/meetings/${id}`, { method: 'DELETE' });

// ── People ─────────────────────────────────────────────────────────────────────

export const loadPeople = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return _v2fetch(`/people${q ? `?${q}` : ''}`);
};

export const savePerson = (data) =>
  _v2fetch('/people', { method: 'POST', body: JSON.stringify(data) });

export const updatePerson = (id, data) =>
  _v2fetch(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Audit ──────────────────────────────────────────────────────────────────────

export const loadAuditLog = (entityType, entityId) =>
  _v2fetch(`/audit?entity_type=${entityType}&entity_id=${entityId}`);

// ── Tasks ──────────────────────────────────────────────────────────────────────

export const loadTasks = (entityType, entityId) =>
  _v2fetch(`/tasks?entity_type=${entityType}&entity_id=${entityId}`);

export const saveTask = (data) =>
  _v2fetch('/tasks', { method: 'POST', body: JSON.stringify(data) });

export const updateTask = (id, data) =>
  _v2fetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteTask = (id) =>
  _v2fetch(`/tasks/${id}`, { method: 'DELETE' });

// ── External / Preqin ─────────────────────────────────────────────────────────

export const searchPreqin = (q) =>
  _v2fetch(`/external/preqin/search?q=${encodeURIComponent(q)}`);

export const triggerPreqinSync = () =>
  _v2fetch('/external/sync', { method: 'POST' });

export const loadPendingProvenance = () => _v2fetch('/external/pending');

export const acceptProvenance = (id, acceptedBy) =>
  _v2fetch(`/external/provenance/${id}/accept`, {
    method: 'PATCH',
    body: JSON.stringify({ accepted_by: acceptedBy }),
  });

export const rejectProvenance = (id, rejectedBy) =>
  _v2fetch(`/external/provenance/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ rejected_by: rejectedBy }),
  });
