/**
 * FilterPanel.jsx — Collapsible filter panel for collection status + type.
 */
import { usePokedex } from '../hooks/usePokedex.jsx';

const FILTER_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'uncollected', label: '未收集' },
  { key: 'collected', label: '已收集' },
];

export default function FilterPanel() {
  const {
    filterPanelOpen,
    filterMode, setFilterMode,
    filterType, setFilterType,
    details,
  } = usePokedex();

  const typeMeta = details?.meta?.types;

  return (
    <div
      id="filter-panel"
      className={filterPanelOpen ? 'open' : ''}
      aria-hidden={!filterPanelOpen}
    >
      <div className="filter-panel-inner">
        {/* Collection status filter */}
        <div className="filter-group">
          <span className="filter-group-label">收集状态</span>
          {FILTER_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn ${filterMode === key ? 'active' : ''}`}
              onClick={() => setFilterMode(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="filter-group">
          <span className="filter-group-label">属性</span>
          <select
            id="type-filter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">全部属性</option>
            {typeMeta && Object.entries(typeMeta).map(([en, info]) => (
              <option key={en} value={en}>{info.zh}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
