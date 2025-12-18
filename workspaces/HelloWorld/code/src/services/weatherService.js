/**
 * Weather Data Management Service
 * Handles OpenWeatherMap API integration
 */

import configService from './configService';

class WeatherService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  getApiKey() {
    // API key should be provided via environment variable or user input
    // For demo purposes, we'll check for it in localStorage or prompt
    return localStorage.getItem('openweather_api_key') || '';
  }

  setApiKey(apiKey) {
    localStorage.setItem('openweather_api_key', apiKey);
  }

  hasApiKey() {
    return !!this.getApiKey();
  }

  getCacheKey(lat, lon) {
    return `${lat},${lon}`;
  }

  getCachedData(lat, lon) {
    const key = this.getCacheKey(lat, lon);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(lat, lon, data) {
    const key = this.getCacheKey(lat, lon);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async fetchWeatherData(location) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key is required');
    }

    const { latitude, longitude } = location;

    // Check cache first
    const cached = this.getCachedData(latitude, longitude);
    if (cached) {
      return cached;
    }

    const apiSettings = configService.getApiSettings();
    const url = `${apiSettings.baseUrl}/weather?lat=${latitude}&lon=${longitude}&units=${apiSettings.units}&appid=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        }
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const processedData = this.processWeatherData(data, location);

      // Cache the result
      this.setCachedData(latitude, longitude, processedData);

      return processedData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  async fetchForecast(location) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key is required');
    }

    const { latitude, longitude } = location;
    const apiSettings = configService.getApiSettings();
    const url = `${apiSettings.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&units=${apiSettings.units}&appid=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processForecastData(data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      throw error;
    }
  }

  processWeatherData(rawData, location) {
    return {
      temperature: Math.round(rawData.main.temp),
      feelsLike: Math.round(rawData.main.feels_like),
      humidity: rawData.main.humidity,
      pressure: rawData.main.pressure,
      windSpeed: rawData.wind.speed,
      windDirection: rawData.wind.deg,
      description: rawData.weather[0]?.description || 'Unknown',
      icon: rawData.weather[0]?.icon || '01d',
      visibility: rawData.visibility,
      clouds: rawData.clouds?.all || 0,
      location: {
        city: location.city,
        state: location.state,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude
      },
      timestamp: new Date(),
      sunrise: rawData.sys?.sunrise ? new Date(rawData.sys.sunrise * 1000) : null,
      sunset: rawData.sys?.sunset ? new Date(rawData.sys.sunset * 1000) : null
    };
  }

  processForecastData(rawData) {
    return rawData.list.map(item => ({
      datetime: new Date(item.dt * 1000),
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      humidity: item.main.humidity,
      description: item.weather[0]?.description || 'Unknown',
      icon: item.weather[0]?.icon || '01d',
      windSpeed: item.wind.speed
    }));
  }

  getWeatherIconUrl(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
const weatherService = new WeatherService();

export default weatherService;
