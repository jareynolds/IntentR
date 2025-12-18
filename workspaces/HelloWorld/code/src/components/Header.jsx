import { useApp } from '../context/AppContext';

function Header({ onMenuToggle }) {
  const { currentLocation, refreshWeather, weatherLoading } = useApp();

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo">
          <button
            className="menu-toggle"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            &#9776;
          </button>
          <img src="/weather-icon.svg" alt="Weather App Logo" />
          <span>Hello Weather World</span>
        </div>

        <nav className="main-nav">
          <ul>
            <li>
              <a href="#dashboard">Dashboard</a>
            </li>
            <li>
              <a href="#forecast">Forecast</a>
            </li>
            <li>
              <a href="#settings">Settings</a>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          {currentLocation && (
            <span style={{ color: 'var(--color-neutral-header-text)', fontSize: 'var(--font-size-body-2)' }}>
              {currentLocation.city}, {currentLocation.state}
            </span>
          )}
          <button
            className="btn btn-accent"
            onClick={refreshWeather}
            disabled={weatherLoading}
            style={{ padding: '8px 16px', fontSize: 'var(--font-size-body-2)' }}
          >
            {weatherLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
