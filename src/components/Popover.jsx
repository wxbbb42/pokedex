/**
 * Popover.jsx — Rich detail popover/modal for a Pokémon.
 */
import { useEffect, useRef } from 'react';
import { X, Check, Plus, ChevronRight, Gift } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';
import {
  FALLBACK, R2_BASE, getShinySprite, getCollectionKey,
  getDetail, getEvoChain, getAbilityZh,
  STAT_LABELS, STAT_COLORS, MAX_STAT,
} from '../data.js';

// ============================================================
// Sub-components
// ============================================================

function TypeBadges({ types, typeMeta }) {
  if (!types?.length || !typeMeta) return null;
  return (
    <div id="popover-types">
      {types.map(t => {
        const info = typeMeta[t] || { zh: t, color: '#999' };
        return (
          <span key={t} className="type-badge" style={{ background: info.color }}>
            {info.zh}
          </span>
        );
      })}
    </div>
  );
}

function StatBars({ stats }) {
  if (!stats?.length) return null;
  const total = stats.reduce((s, v) => s + v, 0);
  return (
    <div id="popover-stats-section">
      <div className="detail-label">种族值</div>
      <div id="popover-stats">
        {stats.map((val, i) => {
          const pct = Math.min(val / MAX_STAT * 100, 100);
          return (
            <div className="stat-row" key={i}>
              <span className="stat-label">{STAT_LABELS[i]}</span>
              <span className="stat-value">{val}</span>
              <div className="stat-bar-bg">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${pct}%`, background: STAT_COLORS[i] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div id="popover-stats-total">合计: {total}</div>
    </div>
  );
}

function Abilities({ detail, details }) {
  if (!detail) return null;
  const abilities = detail.abilities || [];
  const hasAny = abilities.length > 0 || detail.hiddenAbility;
  if (!hasAny) return null;
  return (
    <div id="popover-abilities-section">
      <div className="detail-label">特性</div>
      <div id="popover-abilities">
        {abilities.map(a => (
          <span key={a} className="ability-tag">{getAbilityZh(a, details)}</span>
        ))}
        {detail.hiddenAbility && (
          <span className="ability-tag hidden-ability">
            {getAbilityZh(detail.hiddenAbility, details)}
            <small>隐藏</small>
          </span>
        )}
      </div>
    </div>
  );
}

function EvoChain({ chain }) {
  if (!chain?.length || chain.length <= 1) return null;
  return (
    <div id="popover-evo-section">
      <div className="detail-label">进化链</div>
      <div id="popover-evo-chain">
        {chain.map((stage, i) => {
          const sprite = stage.id ? `${R2_BASE}/${stage.id}.png` : '';
          return (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && (
                <span className="evo-arrow">
                  <ChevronRight size={16} />
                </span>
              )}
              <div className="evo-stage">
                {sprite && (
                  <img
                    src={sprite}
                    alt=""
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <span className="evo-name">{stage.zh || ''}</span>
                {stage.trigger && (
                  <span className="evo-trigger">{stage.trigger}</span>
                )}
              </div>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EventHistory({ events }) {
  if (!events?.length) return null;
  return (
    <div id="popover-event-section">
      <div className="detail-label">
        <Gift size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
        配信历史 ({events.length})
      </div>
      <div id="popover-events">
        {events.slice(0, 10).map((ev, i) => (
          <div className="event-row" key={i}>
            <span className="event-ot">{ev.ot}</span>
            <span className="event-meta">
              {ev.level != null && <span className="event-level">Lv.{ev.level}</span>}
              <span className="event-method">{ev.method}</span>
            </span>
            <span className="event-games">{ev.games}</span>
            {ev.date && <span className="event-date">{ev.date}</span>}
          </div>
        ))}
        {events.length > 10 && (
          <div className="event-more">还有 {events.length - 10} 条配信记录…</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Popover
// ============================================================

export default function Popover() {
  const {
    popoverEntry, setPopoverEntry,
    collected, toggleCollected,
    shinyMode, details, eventDistributions,
  } = usePokedex();

  const closeRef = useRef(null);
  const lastFocusRef = useRef(null);
  const p = popoverEntry;
  const isOpen = !!p;

  // Focus management
  useEffect(() => {
    if (isOpen) {
      lastFocusRef.current = document.activeElement;
      closeRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (lastFocusRef.current?.focus) lastFocusRef.current.focus();
      lastFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') setPopoverEntry(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, setPopoverEntry]);

  if (!p) return null;

  // Distribution-specific entry: show single event details
  const isDist = !!p.distEvent;
  const distEv = p.distEvent;

  const key = getCollectionKey(p.id, shinyMode);
  const isCollected = collected.has(key);
  const sprite = shinyMode ? (getShinySprite(p._sprite) || FALLBACK) : (p._sprite || FALLBACK);
  const numStr = '#' + String(p.numInt || parseInt(p.num) || 0).padStart(4, '0');
  const detail = getDetail(p, details);
  const chain = detail ? getEvoChain(detail, details) : null;
  const typeMeta = details?.meta?.types;
  // For normal entries, show all events; for dist entries, skip (shown inline)
  const eventData = isDist ? null : eventDistributions?.get(p.numInt || parseInt(p.num) || 0);
  const sectionMap = { main: '全国图鉴', gmax: '⚡ 超极巨化', event: '🌟 配信特殊', distributions: '📦 配信' };

  const isLegendaryOrMythical = detail?.isLegendary || detail?.isMythical;
  const badgeLabel = detail?.isMythical ? '幻之宝可梦'
    : detail?.isLegendary ? '传说宝可梦'
    : sectionMap[p.section] || p.section;

  return (
    <div
      id="popover-overlay"
      className="open"
      aria-hidden="false"
      onClick={(e) => { if (e.target.id === 'popover-overlay') setPopoverEntry(null); }}
    >
      <div id="popover" role="dialog" aria-modal="true">
        <button
          ref={closeRef}
          id="popover-close"
          aria-label="关闭"
          onClick={() => setPopoverEntry(null)}
        >
          <X size={18} />
        </button>

        {/* Header: Sprite + Name + Types */}
        <div id="popover-header">
          <img id="popover-sprite" src={sprite} alt={p.en || ''} />
          <div id="popover-header-info">
            <div id="popover-num">{numStr}</div>
            <div id="popover-zh">{p.zh || ''}</div>
            <div id="popover-en">{p.en || ''}</div>
            {detail && <TypeBadges types={detail.types} typeMeta={typeMeta} />}
          </div>
        </div>

        {/* Genus + Section badge */}
        <div id="popover-genus-row">
          {detail?.genus && (
            <span id="popover-genus">{detail.genus}</span>
          )}
          <span
            id="popover-section-badge"
            className={isLegendaryOrMythical ? 'legendary' : ''}
          >
            <span>{badgeLabel}</span>
          </span>
        </div>

        {/* Physical Info */}
        {detail && (
          <div id="popover-physical">
            <div className="physical-item">
              <span className="physical-label">身高</span>
              <span className="physical-value">
                {detail.height != null ? (detail.height / 10).toFixed(1) + ' m' : '—'}
              </span>
            </div>
            <div className="physical-item">
              <span className="physical-label">体重</span>
              <span className="physical-value">
                {detail.weight != null ? (detail.weight / 10).toFixed(1) + ' kg' : '—'}
              </span>
            </div>
            <div className="physical-item">
              <span className="physical-label">捕获率</span>
              <span className="physical-value">
                {detail.captureRate != null ? String(detail.captureRate) : '—'}
              </span>
            </div>
          </div>
        )}

        {/* Abilities */}
        <Abilities detail={detail} details={details} />

        {/* Stats */}
        {detail?.stats?.length > 0 && <StatBars stats={detail.stats} />}

        {/* Evolution Chain */}
        <EvoChain chain={chain} />

        {/* Single Distribution Event (when clicked from distributions view) */}
        {isDist && distEv && (
          <div id="popover-event-section">
            <div className="detail-label">
              <Gift size={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
              配信信息
            </div>
            <div id="popover-dist-detail">
              <div className="dist-detail-row">
                <span className="dist-detail-label">初训家</span>
                <span className="dist-detail-value">{distEv.ot}</span>
              </div>
              {distEv.level != null && (
                <div className="dist-detail-row">
                  <span className="dist-detail-label">等级</span>
                  <span className="dist-detail-value">Lv.{distEv.level}</span>
                </div>
              )}
              <div className="dist-detail-row">
                <span className="dist-detail-label">配信方式</span>
                <span className="dist-detail-value">{distEv.method}</span>
              </div>
              <div className="dist-detail-row">
                <span className="dist-detail-label">对应游戏</span>
                <span className="dist-detail-value">{distEv.games}</span>
              </div>
              {distEv.date && (
                <div className="dist-detail-row">
                  <span className="dist-detail-label">配信时间</span>
                  <span className="dist-detail-value">{distEv.date}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Distribution History (all, for normal cards) */}
        <EventHistory events={eventData?.events} />

        {/* Flavor Text */}
        {detail?.flavor && (
          <div id="popover-flavor-section">
            <p id="popover-flavor">{detail.flavor}</p>
          </div>
        )}

        {/* Collect Button */}
        <button
          className={`popover-collect-btn ${isCollected ? 'owned' : ''}`}
          onClick={() => toggleCollected(key)}
        >
          {isCollected
            ? <><Check size={16} style={{ verticalAlign: '-3px' }} /> 已收集</>
            : <><Plus size={16} style={{ verticalAlign: '-3px' }} /> 标记已收集</>
          }
        </button>
      </div>
    </div>
  );
}
