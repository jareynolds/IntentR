import { useState } from 'react';
import { useApp } from '../context/AppContext';

function ApiKeyInput() {
  const { hasApiKey, setApiKey, fetchWeather } = useApp();
  const [inputKey, setInputKey] = useState('');
  const [showInput, setShowInput] = useState(!hasApiKey);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setInputKey('');
      setShowInput(false);
      // Trigger weather fetch after setting key
      setTimeout(() => fetchWeather(), 100);
    }
  };

  if (hasApiKey && !showInput) {
    return (
      <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--color-success)', marginRight: 'var(--spacing-xs)' }}>✓</span>
            <span className="text-body-2">API Key configured</span>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setShowInput(true)}
            style={{ padding: '6px 12px', fontSize: 'var(--font-size-caption)' }}
          >
            Change Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
      <h3 className="card-title" style={{ fontSize: 'var(--font-size-subheading)' }}>
        OpenWeatherMap API Key
      </h3>
      <p className="card-subtitle">
        Enter your API key to fetch weather data.{' '}
        <a
          href="https://openweathermap.org/api"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-primary-lapis-lazuli)' }}
        >
          Get a free API key
        </a>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter your OpenWeatherMap API key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button type="submit" className="btn btn-primary" disabled={!inputKey.trim()}>
            Save API Key
          </button>
          {hasApiKey && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowInput(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ApiKeyInput;
