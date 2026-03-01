// ─── API client ───────────────────────────────────────────────────────────────
// All calls go to /api/* which Vite proxies to http://localhost:3001 in dev.

import { FALLBACK_DATA } from './fallback.js';

const BASE = '/api';

/**
 * Load the full CRM dataset from the server.
 * If the server is unreachable, returns FALLBACK_DATA with __isFallback: true
 * so the UI can warn the user they are seeing dummy data.
 */
export async function loadData() {
  try {
    const res = await fetch(`${BASE}/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return FALLBACK_DATA;
  }
}

/**
 * Persist the full CRM dataset to the server (JSON file).
 * Called by the frontend auto-save debounce.
 * Silently skips if we are in fallback mode (no backend to save to).
 */
export async function saveData(data) {
  if (data?.__isFallback) return; // never try to persist dummy data
  try {
    const res = await fetch(`${BASE}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('saveData failed:', err);
    throw err;
  }
}

// ─── History API ───────────────────────────────────────────────────────────────

async function _historyFetch(path) {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return [];
  }
}

export const loadFundPerformanceHistory = (fundId) =>
  _historyFetch(`/history/fund/${fundId}/performance`);

export const loadFundRaisedHistory = (fundId) =>
  _historyFetch(`/history/fund/${fundId}/raised`);

export const loadFundChangeHistory = (fundId) =>
  _historyFetch(`/history/fund/${fundId}/changes`);

export const loadGpChangeHistory = (gpId) =>
  _historyFetch(`/history/gp/${gpId}/changes`);
