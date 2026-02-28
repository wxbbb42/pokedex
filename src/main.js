/**
 * main.js — Application entry point.
 */
import './style.css';
import { state, loadPokemonData, GEN_RANGES } from './data.js';
import { loadLocal, loadUIState, saveUIState, loadFromRemote } from './storage.js';
import {
  renderCards, updateProgress, applySearch,
  initPopoverListeners, closePopover, esc,
} from './ui.js';

// ============================================================
// BOOT
// ============================================================
async function init() {
  await loadPokemonData();

  loadLocal();
  loadUIState();

  // Hide loader, show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = '';

  // Restore UI from persisted state
  document.querySelectorAll('.gen-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.gen === state.activeGen),
  );
  document.getElementById('btn-view-list').classList.toggle('active', state.viewMode === 'list');
  document.getElementById('btn-view-box').classList.toggle('active', state.viewMode === 'box');
  document.getElementById('list-view').style.display  = state.viewMode === 'list' ? '' : 'none';
  document.getElementById('box-view').style.display   = state.viewMode === 'box'  ? '' : 'none';
  document.getElementById('shiny-mode').checked = document.body.classList.contains('shiny');
  if (state.searchQuery) document.getElementById('search-bar').value = state.searchQuery;

  renderCards();
  updateProgress();

  // Sync from remote (non‑blocking)
  loadFromRemote().then(() => { renderCards(); updateProgress(); });
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Gen filter buttons
document.querySelectorAll('.gen-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gen-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeGen = btn.dataset.gen;
    renderCards();
    updateProgress();
    saveUIState();
  }),
);

// Shiny toggle
document.getElementById('shiny-mode').addEventListener('change', e => {
  document.body.classList.toggle('shiny', e.target.checked);
  renderCards();
  updateProgress();
  saveUIState();
});

// View: List
document.getElementById('btn-view-list').addEventListener('click', () => {
  state.viewMode = 'list';
  document.getElementById('btn-view-list').classList.add('active');
  document.getElementById('btn-view-box').classList.remove('active');
  document.getElementById('list-view').style.display = '';
  document.getElementById('box-view').style.display = 'none';
  renderCards();
  updateProgress();
  saveUIState();
});

// View: Box
document.getElementById('btn-view-box').addEventListener('click', () => {
  state.viewMode = 'box';
  document.getElementById('btn-view-box').classList.add('active');
  document.getElementById('btn-view-list').classList.remove('active');
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('box-view').style.display = '';
  renderCards();
  updateProgress();
  saveUIState();
});

// Search
document.getElementById('search-bar').addEventListener('input', e => {
  state.searchQuery = e.target.value;
  applySearch();
  saveUIState();
});

// Popover listeners
initPopoverListeners();

// ============================================================
// GO
// ============================================================
init().catch(e => {
  document.getElementById('loading').innerHTML =
    `<div style="color:#dc2626;padding:20px">加载失败：${esc(e.message)}` +
    `<br><pre style="font-size:11px;margin-top:8px;white-space:pre-wrap;color:#57534e">${esc(e.stack)}</pre></div>`;
});
