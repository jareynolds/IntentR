import { useApp } from '../context/AppContext';
import weatherService from '../services/weatherService';

function WeatherCard() {
  const { weatherData, currentLocation, weatherLoading } = useApp();

  if (weatherLoading) {
    return (
      <div className="weather-card">
        <div className="loading-container">
          <div className="spinner" style={{ borderTopColor: 'var(--color-neutral-white)' }}></div>
          <span className="loading-text" style={{ color: 'var(--color-neutral-white)' }}>
            Loading weather data...
          </span>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="weather-card">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
          <p style={{ fontSize: 'var(--font-size-subheading)', marginBottom: 'var(--spacing-sm)' }}>
            No Weather Data
          </p>
          <p style={{ opacity: 0.8 }}>
            Enter your OpenWeatherMap API key to get started
          </p>
        </div>
      </div>
    );
  }

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="weather-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="location">{currentLocation?.city}, {currentLocation?.state}</p>
          <p className="temperature">{weatherData.temperature}°F</p>
          <p className="conditions">{weatherData.description}</p>
          <p style={{ fontSize: 'var(--font-size-body-2)', opacity: 0.7, marginTop: 'var(--spacing-xs)' }}>
            Feels like {weatherData.feelsLike}°F
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <img
            src={weatherService.getWeatherIconUrl(weatherData.icon)}
            alt={weatherData.description}
            style={{ width: '80px', height: '80px' }}
          />
          <p style={{ fontSize: 'var(--font-size-caption)', opacity: 0.7 }}>
            Updated: {weatherData.timestamp?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-detail-item">
          <span className="weather-detail-label">Humidity</span>
          <span className="weather-detail-value">{weatherData.humidity}%</span>
        </div>
        <div className="weather-detail-item">
          <span className="weather-detail-label">Wind</span>
          <span className="weather-detail-value">{weatherData.windSpeed} mph</span>
        </div>
        <div className="weather-detail-item">
          <span className="weather-detail-label">Pressure</span>
          <span className="weather-detail-value">{weatherData.pressure} hPa</span>
        </div>
        <div className="weather-detail-item">
          <span className="weather-detail-label">Visibility</span>
          <span className="weather-detail-value">
            {weatherData.visibility ? `${(weatherData.visibility / 1609.34).toFixed(1)} mi` : 'N/A'}
          </span>
        </div>
        <div className="weather-detail-item">
          <span className="weather-detail-label">Sunrise</span>
          <span className="weather-detail-value">{formatTime(weatherData.sunrise)}</span>
        </div>
        <div className="weather-detail-item">
          <span className="weather-detail-label">Sunset</span>
          <span className="weather-detail-value">{formatTime(weatherData.sunset)}</span>
        </div>
      </div>
    </div>
  );
}

export default WeatherCard;
