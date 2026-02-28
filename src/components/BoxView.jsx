/**
 * BoxView.jsx — Box view with 6×5 grids organized by region.
 */
import { useMemo } from 'react';
import { Zap, Star } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';
import {
  BOX_SIZE, GEN_RANGES, REGION_BOXES, DIST_GEN_LABELS,
  getCollectionKey, isCardVisible,
} from '../data.js';
import Card from './Card.jsx';

function BoxSection({ items, labelPrefix, shinyMode, collected, batchSelected, handleCardClick, filterCtx, searchActive }) {
  if (!items.length) return null;

  const boxes = [];
  let boxNum = 1;
  for (let i = 0; i < items.length; i += BOX_SIZE) {
    const chunk = items.slice(i, i + BOX_SIZE);
    const boxLabel = items.length > BOX_SIZE
      ? `${labelPrefix} ${boxNum++}`
      : labelPrefix;

    boxes.push(
      <div className="box-wrapper" key={i}>
        <div className="box-label">{boxLabel}</div>
        <div className="box-grid">
          {Array.from({ length: BOX_SIZE }, (_, s) => {
            if (s < chunk.length) {
              const p = chunk[s];
              if (!isCardVisible(p, filterCtx)) {
                return <div key={s} className="card empty" />;
              }
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
            }
            return <div key={`empty-${s}`} className="card empty" />;
          })}
        </div>
      </div>,
    );
  }

  return <>{boxes}</>;
}

export default function BoxView() {
  const {
    visibleLists, collected, shinyMode, batchSelected,
    searchQuery, filterMode, filterType, details,
    activeGen, handleCardClick, pokemonData, eventDistributions,
  } = usePokedex();

  const filterCtx = useMemo(() => ({
    searchQuery, filterMode, filterType,
    collected, isShiny: shinyMode, details,
  }), [searchQuery, filterMode, filterType, collected, shinyMode, details]);

  const searchActive = !!searchQuery.trim();

  // Determine which regions to show
  const regions = useMemo(() => {
    if (activeGen === 'all' || activeGen === 'gmax' || activeGen === 'event' || activeGen === 'distributions') {
      return REGION_BOXES;
    }
    return REGION_BOXES.filter(r => {
      const rng = GEN_RANGES[+activeGen];
      return rng && r.range[0] >= rng[0] && r.range[1] <= rng[1];
    });
  }, [activeGen]);

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

  const { main, gmax, event } = visibleLists;

  // Distributions view — grouped by generation
  if (activeGen === 'distributions') {
    return (
      <div id="box-view">
        <div id="boxes-container" className="dist-by-gen">
          {distributionsByGen.map(({ gen, label, items }) => (
            <BoxSection
              key={gen}
              items={items}
              labelPrefix={label}
              shinyMode={shinyMode}
              collected={collected}
              batchSelected={batchSelected}
              handleCardClick={handleCardClick}
              filterCtx={filterCtx}
              searchActive={searchActive}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="box-view">
      <div id="boxes-container">
        {regions.map(region => {
          const rp = main.filter(p =>
            p.numInt >= region.range[0] && p.numInt <= region.range[1],
          );
          if (!rp.length) return null;
          return (
            <BoxSection
              key={region.label}
              items={rp}
              labelPrefix={region.label}
              shinyMode={shinyMode}
              collected={collected}
              batchSelected={batchSelected}
              handleCardClick={handleCardClick}
              filterCtx={filterCtx}
              searchActive={searchActive}
            />
          );
        })}

        {gmax.length > 0 && (
          <BoxSection
            items={gmax}
            labelPrefix="Gmax"
            shinyMode={shinyMode}
            collected={collected}
            batchSelected={batchSelected}
            handleCardClick={handleCardClick}
            filterCtx={filterCtx}
            searchActive={searchActive}
          />
        )}
      </div>
    </div>
  );
}
