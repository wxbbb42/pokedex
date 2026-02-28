/**
 * Card.jsx — Individual Pokémon card, memoized for performance.
 */
import { memo } from 'react';
import { FALLBACK, getShinySprite } from '../data.js';

const Card = memo(function Card({ p, isCollected, isShiny, isBatchSelected, isSearchMatch, searchActive, onClick }) {
  const numStr = '#' + String(p.numInt || parseInt(p.num) || 0).padStart(4, '0');
  const sprite = isShiny ? (getShinySprite(p._sprite) || FALLBACK) : (p._sprite || FALLBACK);
  const label = `${p.zh || p.en || ''} ${numStr}`.trim();
  const isDist = !!p.distEvent;

  const cls = [
    'card',
    isCollected && 'collected',
    isBatchSelected && 'batch-selected',
    isSearchMatch && 'search-match',
    isDist && 'dist-card',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onClick(p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(p);
        }
      }}
    >
      <div className="num">{numStr}</div>
      <img
        loading="lazy"
        alt={p.en || ''}
        src={sprite}
        onError={(e) => { e.target.src = FALLBACK; }}
      />
      <div className="name-zh">{p.zh || ''}</div>
      {isDist
        ? <div className="dist-ot">{p.distEvent.ot}</div>
        : <div className="name-en">{p.en || ''}</div>
      }
    </div>
  );
});

export default Card;
