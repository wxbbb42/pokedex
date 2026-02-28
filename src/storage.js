/**
 * storage.js — LocalStorage persistence & server‑side Gist sync.
 */
import { PROGRESS_KEY, UI_KEY, SYNC_ENDPOINT, state } from './data.js';

// ============================================================
// LOCAL STORAGE — Collection
// ============================================================
export function saveLocal() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...state.collected]));
}

export function loadLocal() {
  try {
    state.collected = new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'));
  } catch { /* ignore corrupt data */ }
}

// ============================================================
// LOCAL STORAGE — UI State
// ============================================================
export function saveUIState() {
  const uiState = {
    gen: state.activeGen,
    view: state.viewMode,
    shiny: document.body.classList.contains('shiny'),
    search: state.searchQuery,
  };
  localStorage.setItem(UI_KEY, JSON.stringify(uiState));
}

export function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.gen) state.activeGen = s.gen;
    if (s.view) state.viewMode = s.view;
    if (typeof s.shiny === 'boolean') document.body.classList.toggle('shiny', s.shiny);
    if (typeof s.search === 'string') state.searchQuery = s.search;
  } catch { /* ignore */ }
}

// ============================================================
// SYNC STATUS HELPER
// ============================================================
export function setStatus(text, cls) {
  const el = document.getElementById('sync-status');
  el.textContent = text;
  el.className = cls;
  el.title = text;
}

// ============================================================
// REMOTE SYNC (Vercel → Gist)
// ============================================================
export async function loadFromRemote() {
  try {
    setStatus('● 同步中…', 'syncing');
    const r = await fetch(SYNC_ENDPOINT, { cache: 'no-store' });
    if (r.status === 404 || r.status === 405 || r.status === 501) {
      setStatus('● 未配置同步', 'error');
      return;
    }
    if (!r.ok) throw new Error(r.status);
    const remote = await r.json();
    if (Array.isArray(remote)) {
      state.collected = new Set(remote);
      saveLocal();
    }
    setStatus('● 已同步', 'ok');
  } catch {
    setStatus('● 离线', 'error');
  }
}

export async function saveToRemote() {
  try {
    setStatus('● 保存中…', 'syncing');
    const r = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...state.collected]),
    });
    if (r.status === 404 || r.status === 405 || r.status === 501) {
      setStatus('● 未配置同步', 'error');
      return;
    }
    if (!r.ok) throw new Error(r.status);
    setStatus('● 已同步', 'ok');
  } catch {
    setStatus('● 保存失败', 'error');
  }
}

export function scheduleSyncRemote() {
  clearTimeout(state.syncTimer);
  state.syncTimer = setTimeout(saveToRemote, 2000);
}
