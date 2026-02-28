/**
 * StatsModal.jsx — Collection statistics modal with per-gen and per-section progress.
 */
import { useEffect } from 'react';
import { X, BarChart3 } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';
import { GEN_RANGES, getCollectionKey } from '../data.js';

function ProgressBar({ have, total }) {
  const pct = total ? Math.round(have / total * 100) : 0;
  return (
    <div className="stats-bar-bg">
      <div className="stats-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StatsModal() {
  const {
    statsOpen, setStatsOpen,
    collected, pokemonData, shinyMode,
  } = usePokedex();

  // Escape key
  useEffect(() => {
    if (!statsOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setStatsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [statsOpen, setStatsOpen]);

  // Body overflow
  useEffect(() => {
    if (statsOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [statsOpen]);

  if (!statsOpen) return null;

  const suffix = shinyMode ? '_shiny' : '';
  const countHave = (list) =>
    list.filter(p => collected.has(p.id + suffix)).length;

  const mainPkm = pokemonData.filter(p => p.section === 'main');
  const gmaxPkm = pokemonData.filter(p => p.section === 'gmax');
  const eventPkm = pokemonData.filter(p => p.section === 'event');

  const overall = { total: pokemonData.length, have: countHave(pokemonData) };
  const pct = (n) => n.total ? Math.round(n.have / n.total * 100) : 0;

  const genStats = Object.entries(GEN_RANGES).map(([gen, [lo, hi]]) => {
    const inGen = mainPkm.filter(p => p.numInt >= lo && p.numInt <= hi);
    return { gen, total: inGen.length, have: countHave(inGen) };
  });

  const sections = [
    { label: '全国图鉴', items: mainPkm },
    { label: '超极巨化', items: gmaxPkm },
    { label: '配信特殊', items: eventPkm },
  ].map(s => ({ label: s.label, total: s.items.length, have: countHave(s.items) }));

  return (
    <div
      id="stats-overlay"
      className="open"
      aria-hidden="false"
      onClick={(e) => { if (e.target.id === 'stats-overlay') setStatsOpen(false); }}
    >
      <div id="stats-panel" role="dialog" aria-modal="true">
        <button
          id="stats-close"
          aria-label="关闭"
          onClick={() => setStatsOpen(false)}
        >
          <X size={18} />
        </button>

        <h2>
          <BarChart3 size={20} style={{ verticalAlign: '-3px', marginRight: '6px' }} />
          收集统计
        </h2>

        <div id="stats-content">
          {/* Overview */}
          <div className="stats-overview">
            <div className="stats-big">
              {overall.have}
              <span className="stats-dim"> / {overall.total}</span>
            </div>
            <div className="stats-pct">
              {pct(overall)}% 完成{shinyMode ? '（闪光）' : ''}
            </div>
            <ProgressBar {...overall} />
          </div>

          {/* Gen progress */}
          <div className="stats-heading">世代进度</div>
          <div className="stats-rows">
            {genStats.map(g => (
              <div className="stats-row" key={g.gen}>
                <span className="stats-label">Gen {g.gen}</span>
                <ProgressBar {...g} />
                <span className="stats-count">{g.have}/{g.total}</span>
              </div>
            ))}
          </div>

          {/* Section progress */}
          <div className="stats-heading">分类进度</div>
          <div className="stats-rows">
            {sections.map(s => (
              <div className="stats-row" key={s.label}>
                <span className="stats-label">{s.label}</span>
                <ProgressBar {...s} />
                <span className="stats-count">{s.have}/{s.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
