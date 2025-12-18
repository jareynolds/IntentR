import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import configService from '../services/configService';
import weatherService from '../services/weatherService';
import aiWeatherService from '../services/aiWeatherService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Application state
  const [appState, setAppState] = useState({
    status: 'initializing',
    isReady: false,
    error: null
  });

  // Configuration state
  const [config, setConfig] = useState(null);

  // Location state
  const [currentLocation, setCurrentLocation] = useState(null);

  // Weather data state
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // AI query state
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // API key state
  const [hasApiKey, setHasApiKey] = useState(false);

  // Initialize application
  useEffect(() => {
    async function initialize() {
      try {
        setAppState({ status: 'loading_config', isReady: false, error: null });

        // Load configuration
        const loadedConfig = await configService.loadConfig();
        setConfig(loadedConfig);

        // Set default location
        const defaultLocation = configService.getDefaultLocation();
        setCurrentLocation(defaultLocation);

        // Check for API key
        setHasApiKey(weatherService.hasApiKey());

        setAppState({ status: 'ready', isReady: true, error: null });
      } catch (error) {
        console.error('Initialization error:', error);
        setAppState({
          status: 'error',
          isReady: false,
          error: error.message
        });
      }
    }

    initialize();
  }, []);

  // Fetch weather when location changes or API key is set
  useEffect(() => {
    if (currentLocation && hasApiKey && appState.isReady) {
      fetchWeather();
    }
  }, [currentLocation, hasApiKey, appState.isReady]);

  const fetchWeather = useCallback(async () => {
    if (!currentLocation) return;

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const data = await weatherService.fetchWeatherData(currentLocation);
      setWeatherData(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherError(error.message);
    } finally {
      setWeatherLoading(false);
    }
  }, [currentLocation]);

  const setApiKey = useCallback((apiKey) => {
    weatherService.setApiKey(apiKey);
    setHasApiKey(true);
  }, []);

  const refreshWeather = useCallback(() => {
    weatherService.clearCache();
    fetchWeather();
  }, [fetchWeather]);

  const updateLocation = useCallback((location) => {
    setCurrentLocation(location);
  }, []);

  const sendAiQuery = useCallback(async (query) => {
    if (!query.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await aiWeatherService.processQuery(
        query,
        currentLocation,
        weatherData
      );
      setAiResponse(response);
    } catch (error) {
      console.error('AI query error:', error);
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  }, [currentLocation, weatherData]);

  const clearAiResponse = useCallback(() => {
    setAiResponse(null);
    setAiError(null);
  }, []);

  const value = {
    // App state
    appState,
    config,

    // Location
    currentLocation,
    updateLocation,

    // Weather
    weatherData,
    weatherLoading,
    weatherError,
    fetchWeather,
    refreshWeather,

    // API Key
    hasApiKey,
    setApiKey,

    // AI
    aiResponse,
    aiLoading,
    aiError,
    sendAiQuery,
    clearAiResponse
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
