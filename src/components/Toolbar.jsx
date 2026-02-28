/**
 * Toolbar.jsx — Top bar with gen select, view toggle, shiny, search, filter, dark mode, sync.
 */
import { usePokedex } from '../hooks/usePokedex.jsx';
import {
  List, LayoutGrid, Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export default function Toolbar() {
  const {
    activeGen, setActiveGen,
    viewMode, setViewMode,
    shinyMode, setShinyMode,
    searchQuery, setSearchQuery,
    filterPanelOpen, setFilterPanelOpen,
  } = usePokedex();

  return (
    <div id="topbar">
      <div id="toolbar">
        {/* Gen select */}
        <select
          id="gen-select"
          aria-label="世代筛选"
          value={activeGen}
          onChange={(e) => setActiveGen(e.target.value)}
        >
          <option value="all">全部世代</option>
          <option value="1">Gen 1 — 关都</option>
          <option value="2">Gen 2 — 城都</option>
          <option value="3">Gen 3 — 丰缘</option>
          <option value="4">Gen 4 — 神奥</option>
          <option value="5">Gen 5 — 合众</option>
          <option value="6">Gen 6 — 卡洛斯</option>
          <option value="7">Gen 7 — 阿罗拉</option>
          <option value="8">Gen 8 — 伽勒尔</option>
          <option value="9">Gen 9 — 帕底亚</option>
          <option value="gmax">⚡ 超极巨化</option>
          <option value="event">🌟 配信</option>
          <option value="distributions">📦 配信历史</option>
        </select>

        {/* View toggle */}
        <div className="toolbar-group">
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            title="列表视图"
            onClick={() => setViewMode('list')}
          >
            <List size={15} />
          </button>
          <button
            className={`view-btn ${viewMode === 'box' ? 'active' : ''}`}
            title="Box 视图"
            onClick={() => setViewMode('box')}
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        {/* Shiny toggle */}
        <label className="shiny-switch" title="闪光模式">
          <input
            type="checkbox"
            checked={shinyMode}
            onChange={(e) => setShinyMode(e.target.checked)}
          />
          <span><Sparkles size={16} /></span>
        </label>

        {/* Search */}
        <div className="toolbar-search">
          <input
            id="search-bar"
            type="text"
            placeholder="搜索宝可梦…"
            aria-label="搜索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter toggle */}
        <button
          id="btn-filter-toggle"
          className={`icon-btn ${filterPanelOpen ? 'active' : ''}`}
          title="筛选"
          aria-expanded={filterPanelOpen}
          onClick={() => setFilterPanelOpen(prev => !prev)}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
