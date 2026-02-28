/**
 * BatchBar.jsx — Fixed bottom bar for batch selection mode.
 */
import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';

export default function BatchBar() {
  const {
    batchMode, batchSelected,
    exitBatchMode, batchSelectAllUncollected,
    batchMarkCollected, batchUnmarkCollected,
  } = usePokedex();

  // Escape key to exit batch mode
  useEffect(() => {
    if (!batchMode) return;
    const handler = (e) => {
      if (e.key === 'Escape') exitBatchMode();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [batchMode, exitBatchMode]);

  if (!batchMode) return null;

  return (
    <div id="batch-bar">
      <span id="batch-count">已选择 {batchSelected.size} 只</span>

      <button className="batch-action" onClick={batchSelectAllUncollected}>
        全选未收集
      </button>

      <button className="batch-action primary" onClick={batchMarkCollected}>
        <Check size={14} style={{ verticalAlign: '-2px', marginRight: '2px' }} />
        标记
      </button>

      <button className="batch-action danger" onClick={batchUnmarkCollected}>
        <X size={14} style={{ verticalAlign: '-2px', marginRight: '2px' }} />
        取消标记
      </button>

      <button className="batch-action" onClick={exitBatchMode}>
        退出
      </button>
    </div>
  );
}
