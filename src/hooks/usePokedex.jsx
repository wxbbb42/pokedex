/**
 * usePokedex.jsx — Central state management via React Context.
 * Single source of truth for the entire Pokédex app.
 */
import {
  createContext, useContext, useState, useEffect,
  useMemo, useRef, useCallback,
} from 'react';
import {
  fetchPokemonData, fetchPokemonDetails, fetchEventDistributions,
  getVisibleLists, getCollectionKey, GEN_RANGES,
} from '../data.js';
import {
  saveCollected, loadCollected,
  saveUIState, loadUIState,
  loadFromRemote, saveToRemote,
} from '../storage.js';

const PokedexContext = createContext(null);

export function PokedexProvider({ children }) {
  // ---- Core data ----
  const [pokemonData, setPokemonData] = useState([]);
  const [details, setDetails] = useState(null);
  const [eventDistributions, setEventDistributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Collection ----
  const [collected, setCollected] = useState(() => loadCollected());

  // ---- UI state ----
  const [activeGen, setActiveGen] = useState('all');
  const [viewMode, setViewMode] = useState('box');
  const [shinyMode, setShinyMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [filterType, setFilterType] = useState('');

  // ---- Overlays ----
  const [popoverEntry, setPopoverEntry] = useState(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // ---- Batch ----
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState(new Set());

  // ---- Sync ----
  const [syncStatus, setSyncStatus] = useState({ text: '●', cls: 'ok' });
  const syncTimerRef = useRef(null);
  const collectedRef = useRef(collected);
  collectedRef.current = collected;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  // Load data on mount
  useEffect(() => {
    fetchPokemonData()
      .then(data => {
        setPokemonData(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e);
        setLoading(false);
      });
    fetchPokemonDetails()
      .then(d => { if (d) setDetails(d); })
      .catch(() => { /* details are optional */ });
    fetchEventDistributions()
      .then(d => { if (d) setEventDistributions(d); })
      .catch(() => { /* event data is optional */ });
  }, []);

  // Restore UI state from localStorage on mount
  useEffect(() => {
    const saved = loadUIState();
    if (!saved) return;
    if (saved.gen) setActiveGen(saved.gen);
    if (saved.view) setViewMode(saved.view);
    if (typeof saved.shiny === 'boolean') setShinyMode(saved.shiny);
    if (typeof saved.dark === 'boolean') setDarkMode(saved.dark);
    if (typeof saved.search === 'string') setSearchQuery(saved.search);
    if (saved.filter) setFilterMode(saved.filter);
    if (saved.filterType) setFilterType(saved.filterType);
    // Open filter panel if filters were active
    if (saved.filter && saved.filter !== 'all' || saved.filterType) {
      setFilterPanelOpen(true);
    }
  }, []);

  // Sync from remote on first load
  const didSyncRef = useRef(false);
  useEffect(() => {
    if (!pokemonData.length || didSyncRef.current) return;
    didSyncRef.current = true;
    const onStatus = (text, cls) => setSyncStatus({ text, cls });
    loadFromRemote(onStatus).then(remote => {
      if (remote) {
        setCollected(remote);
        saveCollected(remote);
      }
    });
  }, [pokemonData.length]);

  // ============================================================
  // SIDE EFFECTS
  // ============================================================

  // Dark mode body class
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Shiny mode body class
  useEffect(() => {
    document.body.classList.toggle('shiny', shinyMode);
  }, [shinyMode]);

  // Batch mode body class
  useEffect(() => {
    document.body.classList.toggle('batch-mode', batchMode);
  }, [batchMode]);

  // Persist UI state on change
  useEffect(() => {
    if (loading) return; // Don't save during initial load
    saveUIState({
      gen: activeGen,
      view: viewMode,
      shiny: shinyMode,
      dark: darkMode,
      search: searchQuery,
      filter: filterMode,
      filterType,
    });
  }, [activeGen, viewMode, shinyMode, darkMode, searchQuery, filterMode, filterType, loading]);

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const visibleLists = useMemo(
    () => getVisibleLists(pokemonData, activeGen),
    [pokemonData, activeGen],
  );

  const progress = useMemo(() => {
    if (activeGen === 'distributions') {
      // For distribution view, show total individual events
      if (!eventDistributions) return { have: 0, total: 0 };
      let total = 0;
      for (const entry of eventDistributions.values()) {
        total += entry.events.length;
      }
      return { have: 0, total };
    }
    const { main, gmax, event } = visibleLists;
    const relevant = [...main, ...gmax, ...event];
    const total = relevant.length;
    const have = relevant.filter(p =>
      collected.has(getCollectionKey(p.id, shinyMode)),
    ).length;
    return { have, total };
  }, [visibleLists, collected, shinyMode, activeGen, eventDistributions, pokemonData]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const scheduleSyncRemote = useCallback(() => {
    clearTimeout(syncTimerRef.current);
    const onStatus = (text, cls) => setSyncStatus({ text, cls });
    syncTimerRef.current = setTimeout(() => {
      saveToRemote(collectedRef.current, onStatus);
    }, 2000);
  }, []);

  const toggleCollected = useCallback((key) => {
    setCollected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCollected(next);
      return next;
    });
    scheduleSyncRemote();
  }, [scheduleSyncRemote]);

  const handleCardClick = useCallback((p) => {
    if (batchMode) {
      // Toggle batch selection
      const key = getCollectionKey(p.id, shinyMode);
      setBatchSelected(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      setPopoverEntry(p);
    }
  }, [batchMode, shinyMode]);

  const enterBatchMode = useCallback(() => {
    setBatchMode(true);
    setBatchSelected(new Set());
  }, []);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setBatchSelected(new Set());
  }, []);

  const batchSelectAllUncollected = useCallback(() => {
    const { main, gmax, event } = visibleLists;
    const all = [...main, ...gmax, ...event];
    const newSelected = new Set();
    for (const p of all) {
      const key = getCollectionKey(p.id, shinyMode);
      if (!collected.has(key)) newSelected.add(key);
    }
    setBatchSelected(newSelected);
  }, [visibleLists, collected, shinyMode]);

  const batchMarkCollected = useCallback(() => {
    if (!batchSelected.size) return;
    setCollected(prev => {
      const next = new Set(prev);
      for (const key of batchSelected) next.add(key);
      saveCollected(next);
      return next;
    });
    scheduleSyncRemote();
    exitBatchMode();
  }, [batchSelected, scheduleSyncRemote, exitBatchMode]);

  const batchUnmarkCollected = useCallback(() => {
    if (!batchSelected.size) return;
    setCollected(prev => {
      const next = new Set(prev);
      for (const key of batchSelected) next.delete(key);
      saveCollected(next);
      return next;
    });
    scheduleSyncRemote();
    exitBatchMode();
  }, [batchSelected, scheduleSyncRemote, exitBatchMode]);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = useMemo(() => ({
    // Data
    pokemonData, details, eventDistributions, loading, error,
    // Collection
    collected, toggleCollected,
    // UI state + setters
    activeGen, setActiveGen,
    viewMode, setViewMode,
    shinyMode, setShinyMode,
    darkMode, setDarkMode,
    searchQuery, setSearchQuery,
    filterMode, setFilterMode,
    filterType, setFilterType,
    // Overlays
    popoverEntry, setPopoverEntry,
    statsOpen, setStatsOpen,
    filterPanelOpen, setFilterPanelOpen,
    // Batch
    batchMode, batchSelected, setBatchSelected,
    enterBatchMode, exitBatchMode,
    batchSelectAllUncollected, batchMarkCollected, batchUnmarkCollected,
    // Sync
    syncStatus,
    // Computed
    visibleLists, progress,
    // Actions
    handleCardClick,
  }), [
    pokemonData, details, eventDistributions, loading, error,
    collected, toggleCollected,
    activeGen, viewMode, shinyMode, darkMode, searchQuery,
    filterMode, filterType,
    popoverEntry, statsOpen, filterPanelOpen,
    batchMode, batchSelected,
    enterBatchMode, exitBatchMode,
    batchSelectAllUncollected, batchMarkCollected, batchUnmarkCollected,
    syncStatus, visibleLists, progress, handleCardClick,
  ]);

  return (
    <PokedexContext.Provider value={value}>
      {children}
    </PokedexContext.Provider>
  );
}

/** Consume the Pokédex context. Must be used within PokedexProvider. */
export function usePokedex() {
  const ctx = useContext(PokedexContext);
  if (!ctx) throw new Error('usePokedex must be used within PokedexProvider');
  return ctx;
}
