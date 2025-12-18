/**
 * Configuration Management Service
 * Loads and manages application configuration from default.json
 */

class ConfigurationService {
  constructor() {
    this.config = null;
    this.isLoaded = false;
  }

  async loadConfig() {
    if (this.isLoaded) {
      return this.config;
    }

    try {
      const response = await fetch('/default.json');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status}`);
      }
      this.config = await response.json();
      this.isLoaded = true;
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Return default configuration if file cannot be loaded
      this.config = this.getDefaultConfig();
      this.isLoaded = true;
      return this.config;
    }
  }

  getDefaultConfig() {
    return {
      defaultLocation: {
        city: 'Los Angeles',
        state: 'California',
        country: 'USA',
        latitude: 34.0522,
        longitude: -118.2437
      },
      apiSettings: {
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        aiBaseUrl: 'https://api.openweathermap.org/data/3.0',
        units: 'imperial'
      },
      uiSettings: {
        theme: 'darkblue',
        refreshInterval: 300000
      }
    };
  }

  getConfig() {
    return this.config;
  }

  getConfigValue(key) {
    if (!this.config) {
      return null;
    }
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    return value;
  }

  getDefaultLocation() {
    return this.config?.defaultLocation || this.getDefaultConfig().defaultLocation;
  }

  getApiSettings() {
    return this.config?.apiSettings || this.getDefaultConfig().apiSettings;
  }

  getUiSettings() {
    return this.config?.uiSettings || this.getDefaultConfig().uiSettings;
  }
}

// Singleton instance
const configService = new ConfigurationService();

export default configService;
