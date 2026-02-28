/**
 * BottomBar.jsx — Fixed bottom bar with progress and action buttons.
 */
import { BarChart3, CheckSquare } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';

export default function BottomBar() {
  const {
    progress, batchMode,
    setStatsOpen, enterBatchMode,
  } = usePokedex();

  if (batchMode) return null;

  const pct = progress.total
    ? (progress.have / progress.total * 100) + '%'
    : '0%';

  return (
    <div id="bottom-bar">
      <div className="bottom-lens" aria-hidden="true" />

      <div id="progress-section">
        <span id="progress-text" role="status" aria-live="polite">
          已收集 {progress.have} / {progress.total}
        </span>
        <div id="progress-bar-bg">
          <div id="progress-bar" style={{ width: pct }} />
        </div>
      </div>

      <div id="bottom-actions">
        <button
          className="bottom-btn"
          title="统计"
          onClick={() => setStatsOpen(true)}
        >
          <BarChart3 size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          统计
        </button>
        <button
          className="bottom-btn"
          title="批量"
          onClick={enterBatchMode}
        >
          <CheckSquare size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          批量
        </button>
      </div>
    </div>
  );
}
