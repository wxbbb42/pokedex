/**
 * Header.jsx — Main header with app title, sync status, and theme toggle.
 * Sits on the red Pokédex band above the toolbar.
 */
import { Moon, Sun } from 'lucide-react';
import { usePokedex } from '../hooks/usePokedex.jsx';

export default function Header() {
  const { darkMode, setDarkMode, syncStatus } = usePokedex();

  return (
    <div id="header">
      <div id="header-inner">
        {/* Decorative lens */}
        <div className="header-lens" aria-hidden="true" />

        <h1 id="header-title">
          宝可梦<span>Pokédex</span>
        </h1>

        <div id="header-actions">
          <span
            id="sync-status"
            className={syncStatus.cls}
            title={syncStatus.text}
          >
            {syncStatus.text}
          </span>

          <button
            className="icon-btn header-icon-btn"
            title="深色模式"
            onClick={() => setDarkMode(prev => !prev)}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
