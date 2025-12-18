import { useState } from 'react';
import { useApp } from '../context/AppContext';

function Sidebar({ isOpen, onClose }) {
  const { currentLocation, updateLocation } = useApp();
  const [activeItem, setActiveItem] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'forecast', label: 'Forecast', icon: '📅' },
    { id: 'alerts', label: 'Weather Alerts', icon: '⚠️' },
    { id: 'history', label: 'History', icon: '📊' }
  ];

  const quickLocations = [
    { city: 'Los Angeles', state: 'California', country: 'USA', latitude: 34.0522, longitude: -118.2437 },
    { city: 'New York', state: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
    { city: 'Chicago', state: 'Illinois', country: 'USA', latitude: 41.8781, longitude: -87.6298 },
    { city: 'Miami', state: 'Florida', country: 'USA', latitude: 25.7617, longitude: -80.1918 },
    { city: 'Seattle', state: 'Washington', country: 'USA', latitude: 47.6062, longitude: -122.3321 }
  ];

  const handleNavClick = (itemId) => {
    setActiveItem(itemId);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 769) {
      onClose();
    }
  };

  const handleLocationClick = (location) => {
    updateLocation(location);
    if (window.innerWidth < 769) {
      onClose();
    }
  };

  const isCurrentLocation = (loc) => {
    return currentLocation?.city === loc.city && currentLocation?.state === loc.state;
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay visible" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`sidebar-nav-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              <span style={{ fontSize: '1.2em' }}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-section-title">Quick Locations</div>
        <nav className="sidebar-nav">
          {quickLocations.map((location) => (
            <button
              key={`${location.city}-${location.state}`}
              className={`sidebar-nav-item ${isCurrentLocation(location) ? 'active' : ''}`}
              onClick={() => handleLocationClick(location)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: isCurrentLocation(location) ? 'var(--color-primary-lapis-lazuli)' : 'transparent'
              }}
            >
              <span style={{ fontSize: '1.2em' }}>📍</span>
              <span>{location.city}, {location.state}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-section-title">About</div>
        <div style={{ padding: 'var(--spacing-sm)', fontSize: 'var(--font-size-caption)', color: 'var(--color-neutral-slogan-gray)' }}>
          <p>Hello Weather World v1.0</p>
          <p style={{ marginTop: 'var(--spacing-xs)' }}>
            Powered by OpenWeatherMap API
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
