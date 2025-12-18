/**
 * AI Weather Query Service
 * Handles natural language weather queries using OpenWeatherMap AI API
 */

import configService from './configService';
import weatherService from './weatherService';

class AIWeatherService {
  constructor() {
    this.conversationHistory = [];
  }

  getApiKey() {
    return weatherService.getApiKey();
  }

  /**
   * Process a natural language weather query
   * @param {string} query - The user's question
   * @param {object} location - Current location context
   * @param {object} weatherData - Current weather data for context
   */
  async processQuery(query, location, weatherData) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key is required');
    }

    // Build context-aware prompt
    const context = this.buildContext(location, weatherData);

    try {
      // For OpenWeatherMap's AI endpoint (if available)
      // Otherwise, we'll generate a response based on available data
      const response = await this.generateIntelligentResponse(query, context, weatherData);

      // Store in conversation history
      this.conversationHistory.push({
        query,
        response,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      console.error('Error processing AI query:', error);
      throw error;
    }
  }

  buildContext(location, weatherData) {
    return {
      location: `${location.city}, ${location.state}, ${location.country}`,
      currentTemp: weatherData?.temperature,
      conditions: weatherData?.description,
      humidity: weatherData?.humidity,
      windSpeed: weatherData?.windSpeed,
      feelsLike: weatherData?.feelsLike
    };
  }

  /**
   * Generate an intelligent response based on weather data and query
   * This simulates AI-like responses when the actual AI API is not available
   */
  async generateIntelligentResponse(query, context, weatherData) {
    const lowerQuery = query.toLowerCase();

    // Analyze query type
    if (this.isTemperatureQuery(lowerQuery)) {
      return this.generateTemperatureResponse(context, weatherData);
    }

    if (this.isRainQuery(lowerQuery)) {
      return this.generateRainResponse(context, weatherData);
    }

    if (this.isWindQuery(lowerQuery)) {
      return this.generateWindResponse(context, weatherData);
    }

    if (this.isOutdoorActivityQuery(lowerQuery)) {
      return this.generateActivityResponse(context, weatherData);
    }

    if (this.isClothingQuery(lowerQuery)) {
      return this.generateClothingResponse(context, weatherData);
    }

    // General weather summary
    return this.generateGeneralResponse(context, weatherData);
  }

  isTemperatureQuery(query) {
    const keywords = ['temperature', 'temp', 'hot', 'cold', 'warm', 'cool', 'degrees', 'feels like'];
    return keywords.some(kw => query.includes(kw));
  }

  isRainQuery(query) {
    const keywords = ['rain', 'umbrella', 'precipitation', 'wet', 'shower', 'storm'];
    return keywords.some(kw => query.includes(kw));
  }

  isWindQuery(query) {
    const keywords = ['wind', 'windy', 'breeze', 'gust'];
    return keywords.some(kw => query.includes(kw));
  }

  isOutdoorActivityQuery(query) {
    const keywords = ['outdoor', 'outside', 'walk', 'run', 'jog', 'hike', 'picnic', 'beach', 'park', 'activity', 'exercise'];
    return keywords.some(kw => query.includes(kw));
  }

  isClothingQuery(query) {
    const keywords = ['wear', 'clothes', 'jacket', 'coat', 'dress', 'outfit'];
    return keywords.some(kw => query.includes(kw));
  }

  generateTemperatureResponse(context, weatherData) {
    const temp = weatherData?.temperature;
    const feelsLike = weatherData?.feelsLike;
    const location = context.location;

    if (!temp) {
      return `I don't have current temperature data for ${location}. Please try refreshing the weather data.`;
    }

    let response = `The current temperature in ${location} is ${temp}°F`;

    if (feelsLike && Math.abs(feelsLike - temp) >= 3) {
      response += `, but it feels like ${feelsLike}°F due to humidity and wind conditions`;
    }

    response += '. ';

    if (temp >= 90) {
      response += "It's very hot outside. Stay hydrated and seek shade when possible!";
    } else if (temp >= 75) {
      response += "It's a warm and pleasant day.";
    } else if (temp >= 60) {
      response += "It's mild weather - comfortable for most activities.";
    } else if (temp >= 45) {
      response += "It's a bit cool. A light jacket would be a good idea.";
    } else if (temp >= 32) {
      response += "It's cold outside. Bundle up with warm layers!";
    } else {
      response += "It's freezing! Be careful of icy conditions and dress very warmly.";
    }

    return response;
  }

  generateRainResponse(context, weatherData) {
    const conditions = weatherData?.description?.toLowerCase() || '';
    const humidity = weatherData?.humidity;
    const clouds = weatherData?.clouds;

    if (conditions.includes('rain') || conditions.includes('shower') || conditions.includes('drizzle')) {
      return `Yes, there's currently ${conditions} in ${context.location}. You should definitely bring an umbrella!`;
    }

    if (conditions.includes('thunderstorm')) {
      return `There's a thunderstorm in ${context.location}. I'd recommend staying indoors until it passes.`;
    }

    if (clouds > 80 && humidity > 70) {
      return `While it's not raining right now in ${context.location}, the high cloud cover (${clouds}%) and humidity (${humidity}%) suggest rain might be possible. Consider bringing an umbrella just in case.`;
    }

    return `It's currently ${conditions} in ${context.location}. No rain is expected right now, but always good to check the forecast!`;
  }

  generateWindResponse(context, weatherData) {
    const windSpeed = weatherData?.windSpeed;

    if (!windSpeed) {
      return `I don't have wind data available for ${context.location} at the moment.`;
    }

    let response = `Wind speed in ${context.location} is currently ${windSpeed} mph. `;

    if (windSpeed < 5) {
      response += "It's very calm with barely any wind.";
    } else if (windSpeed < 12) {
      response += "There's a light breeze - perfect weather!";
    } else if (windSpeed < 20) {
      response += "It's moderately windy. You might notice leaves and small branches moving.";
    } else if (windSpeed < 30) {
      response += "It's quite windy. Walking might feel more difficult and loose objects could blow around.";
    } else {
      response += "It's very windy! Be cautious outdoors and secure any loose items.";
    }

    return response;
  }

  generateActivityResponse(context, weatherData) {
    const temp = weatherData?.temperature;
    const conditions = weatherData?.description?.toLowerCase() || '';
    const windSpeed = weatherData?.windSpeed;

    let suitability = 'good';
    let reasons = [];

    if (conditions.includes('rain') || conditions.includes('storm')) {
      suitability = 'poor';
      reasons.push('rain or stormy conditions');
    }

    if (temp < 40 || temp > 95) {
      suitability = suitability === 'poor' ? 'poor' : 'moderate';
      reasons.push(temp < 40 ? 'cold temperatures' : 'extreme heat');
    }

    if (windSpeed > 25) {
      suitability = suitability === 'good' ? 'moderate' : suitability;
      reasons.push('strong winds');
    }

    if (suitability === 'good') {
      return `Great news! The weather in ${context.location} looks perfect for outdoor activities. It's ${temp}°F with ${conditions}. Enjoy your time outside!`;
    } else if (suitability === 'moderate') {
      return `Outdoor activities in ${context.location} are possible but not ideal due to ${reasons.join(' and ')}. Consider shorter outings or activities with shelter nearby.`;
    } else {
      return `I'd recommend postponing outdoor activities in ${context.location} due to ${reasons.join(' and ')}. Maybe try some indoor activities instead?`;
    }
  }

  generateClothingResponse(context, weatherData) {
    const temp = weatherData?.temperature;
    const conditions = weatherData?.description?.toLowerCase() || '';
    const windSpeed = weatherData?.windSpeed;

    let suggestions = [];

    if (temp >= 80) {
      suggestions.push('light, breathable clothing');
      suggestions.push('shorts and a t-shirt');
      if (conditions.includes('clear') || conditions.includes('sun')) {
        suggestions.push('sunglasses and sunscreen');
      }
    } else if (temp >= 65) {
      suggestions.push('a light layer like a t-shirt');
      suggestions.push('maybe a light cardigan for indoors');
    } else if (temp >= 50) {
      suggestions.push('a light jacket or sweater');
      suggestions.push('long pants');
    } else if (temp >= 35) {
      suggestions.push('a warm coat');
      suggestions.push('layers');
      if (windSpeed > 15) {
        suggestions.push('a wind-resistant outer layer');
      }
    } else {
      suggestions.push('heavy winter coat');
      suggestions.push('hat, gloves, and scarf');
      suggestions.push('warm layers');
    }

    if (conditions.includes('rain')) {
      suggestions.push('waterproof jacket or umbrella');
    }

    return `For ${temp}°F and ${conditions} in ${context.location}, I'd suggest: ${suggestions.join(', ')}.`;
  }

  generateGeneralResponse(context, weatherData) {
    if (!weatherData) {
      return `I don't have weather data for ${context.location} right now. Please try refreshing the page or check your API connection.`;
    }

    const { temperature, description, humidity, windSpeed, feelsLike } = weatherData;

    return `Here's the current weather in ${context.location}: It's ${temperature}°F (feels like ${feelsLike}°F) with ${description}. Humidity is at ${humidity}% and wind speed is ${windSpeed} mph. Is there anything specific you'd like to know about the weather?`;
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// Singleton instance
const aiWeatherService = new AIWeatherService();

export default aiWeatherService;
