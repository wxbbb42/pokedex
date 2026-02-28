/**
 * App.jsx — Root application component.
 */
import { PokedexProvider, usePokedex } from './hooks/usePokedex.jsx';
import Header from './components/Header.jsx';
import Toolbar from './components/Toolbar.jsx';
import FilterPanel from './components/FilterPanel.jsx';
import CardGrid from './components/CardGrid.jsx';
import BoxView from './components/BoxView.jsx';
import Popover from './components/Popover.jsx';
import StatsModal from './components/StatsModal.jsx';
import BottomBar from './components/BottomBar.jsx';
import BatchBar from './components/BatchBar.jsx';

function AppContent() {
  const { loading, error, viewMode } = usePokedex();

  return (
    <>
      {/* Popover + Stats overlays */}
      <Popover />
      <StatsModal />

      {/* Top Bar */}
      <Header />
      <Toolbar />
      <FilterPanel />

      {/* Main Content */}
      <div id="main">
        {loading ? (
          <div id="loading">
            <div className="spinner" />
            正在加载图鉴数据...
          </div>
        ) : error ? (
          <div id="loading">
            <div style={{ color: '#dc2626', padding: '20px' }}>
              加载失败：{error.message}
            </div>
          </div>
        ) : (
          <div id="content">
            {viewMode === 'list' ? <CardGrid /> : <BoxView />}
          </div>
        )}
      </div>

      {/* Bottom Bars */}
      <BottomBar />
      <BatchBar />
    </>
  );
}

export default function App() {
  return (
    <PokedexProvider>
      <AppContent />
    </PokedexProvider>
  );
}
