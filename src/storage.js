/**
 * storage.js — LocalStorage persistence & server-side Gist sync.
 * Framework-agnostic: no DOM access, no global state mutation.
 */
import { PROGRESS_KEY, UI_KEY, SYNC_ENDPOINT } from './data.js';

// ============================================================
// LOCAL STORAGE — Collection
// ============================================================
export function saveCollected(collected) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...collected]));
}

export function loadCollected() {
  try {
    return new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]'));
  } catch { /* ignore corrupt data */ return new Set(); }
}

// ============================================================
// LOCAL STORAGE — UI State
// ============================================================
export function saveUIState(uiState) {
  localStorage.setItem(UI_KEY, JSON.stringify(uiState));
}

export function loadUIState() {
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { /* ignore */ return null; }
}

// ============================================================
// REMOTE SYNC (Vercel → Gist)
// ============================================================

/**
 * Load collection from remote Gist.
 * @param {function} onStatus - Callback (text, cls) for sync status updates.
 * @returns {Set|null} Remote collection set, or null on failure.
 */
export async function loadFromRemote(onStatus) {
  try {
    onStatus('● 同步中…', 'syncing');
    const r = await fetch(SYNC_ENDPOINT, { cache: 'no-store' });
    if (r.status === 404 || r.status === 405 || r.status === 501) {
      onStatus('● 未配置同步', 'error');
      return null;
    }
    if (!r.ok) throw new Error(String(r.status));
    const remote = await r.json();
    if (Array.isArray(remote)) {
      onStatus('● 已同步', 'ok');
      return new Set(remote);
    }
    onStatus('● 已同步', 'ok');
    return null;
  } catch {
    onStatus('● 离线', 'error');
    return null;
  }
}

/**
 * Save collection to remote Gist.
 * @param {Set} collected - Current collection set.
 * @param {function} onStatus - Callback (text, cls) for sync status updates.
 */
export async function saveToRemote(collected, onStatus) {
  try {
    onStatus('● 保存中…', 'syncing');
    const r = await fetch(SYNC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...collected]),
    });
    if (r.status === 404 || r.status === 405 || r.status === 501) {
      onStatus('● 未配置同步', 'error');
      return;
    }
    if (!r.ok) throw new Error(String(r.status));
    onStatus('● 已同步', 'ok');
  } catch {
    onStatus('● 保存失败', 'error');
  }
}
