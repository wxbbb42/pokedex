/**
 * CardGrid.jsx — List view with section headers and filtered card grids.
 */
import { useMemo } from 'react';
import { BookOpen, Zap, Star, Gift } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';
import { getCollectionKey, isCardVisible, DIST_GEN_LABELS } from '../data.js';
import Card from './Card.jsx';

/** Section configuration with Lucide icons. */
const SECTIONS = [
  { key: 'main',  label: '全国图鉴 + 变体', Icon: BookOpen, sectionId: null },
  { key: 'gmax',  label: '超极巨化（Gigantamax）', Icon: Zap, sectionId: 'section-gmax' },
  { key: 'event', label: '配信 & 神话宝可梦', Icon: Star, sectionId: 'section-event' },
];

export default function CardGrid() {
  const {
    visibleLists, collected, shinyMode, batchSelected,
    searchQuery, filterMode, filterType, details,
    handleCardClick, activeGen, eventDistributions, pokemonData,
  } = usePokedex();

  const filterCtx = useMemo(() => ({
    searchQuery, filterMode, filterType,
    collected, isShiny: shinyMode, details,
  }), [searchQuery, filterMode, filterType, collected, shinyMode, details]);

  const searchActive = !!searchQuery.trim();

  // Build per-event distribution cards grouped by gen
  const distributionsByGen = useMemo(() => {
    if (activeGen !== 'distributions' || !eventDistributions) return [];
    const mainPokemon = pokemonData.filter(p => p.section === 'main');
    const mainByNumInt = new Map(mainPokemon.map(p => [p.numInt, p]));

    return [9, 8, 7, 6].map(gen => {
      const items = [];
      for (const [numInt, entry] of eventDistributions) {
        const base = mainByNumInt.get(numInt);
        if (!base) continue;
        entry.events
          .filter(ev => ev.gen === gen)
          .forEach((ev, idx) => {
            items.push({
              ...base,
              id: `dist-${numInt}-g${gen}-${idx}`,
              distEvent: ev,
              section: 'distributions',
            });
          });
      }
      items.sort((a, b) => a.numInt - b.numInt);
      return { gen, label: DIST_GEN_LABELS[gen] || `Gen ${gen}`, items };
    }).filter(g => g.items.length > 0);
  }, [activeGen, eventDistributions, pokemonData]);

  // Distributions view — grouped by generation
  if (activeGen === 'distributions' && distributionsByGen.length > 0) {
    return (
      <div id="list-view">
        {distributionsByGen.map(({ gen, label, items }) => {
          const visibleItems = items.filter(p => isCardVisible(p, filterCtx));
          if (!visibleItems.length) return null;
          return (
            <div key={gen}>
              <div className="section-title">
                <Gift size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                {label} — {items.length} 种
              </div>
              <div className="grid">
                {visibleItems.map(p => {
                  const collKey = getCollectionKey(p.id, shinyMode);
                  return (
                    <Card
                      key={p.id}
                      p={p}
                      isCollected={collected.has(collKey)}
                      isShiny={shinyMode}
                      isBatchSelected={batchSelected.has(collKey)}
                      isSearchMatch={searchActive}
                      searchActive={searchActive}
                      onClick={handleCardClick}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div id="list-view">
      {SECTIONS.map(({ key, label, Icon }) => {
        const items = visibleLists[key];
        if (!items?.length) return null;

        const visibleItems = items.filter(p => isCardVisible(p, filterCtx));
        if (!visibleItems.length && (filterMode !== 'all' || filterType || searchQuery)) {
          return null;
        }

        return (
          <div key={key}>
            <div className="section-title">
              <Icon size={16} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
              {label}
            </div>
            <div className="grid">
              {items.map(p => {
                const visible = isCardVisible(p, filterCtx);
                if (!visible) return null;
                const collKey = getCollectionKey(p.id, shinyMode);
                return (
                  <Card
                    key={p.id}
                    p={p}
                    isCollected={collected.has(collKey)}
                    isShiny={shinyMode}
                    isBatchSelected={batchSelected.has(collKey)}
                    isSearchMatch={searchActive}
                    searchActive={searchActive}
                    onClick={handleCardClick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
