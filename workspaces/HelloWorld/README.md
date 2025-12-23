# HelloWorldWeather

A simple React.js weather application that combines traditional weather data with AI-powered weather insights using the OpenWeather API. Ask any weather-related question and get intelligent responses about weather conditions around the world.

## Features

- 🌤️ **Real-time Weather Data** - Get current weather information for any city
- 🤖 **AI Weather Assistant** - Ask natural language questions about weather conditions
- 🏙️ **City Selection** - Choose from popular cities or enter custom locations
- 🎯 **Default Location** - Starts with Los Angeles, CA as the default location
- 🧭 **Intuitive Navigation** - Easy-to-use interface with multiple sections
- 📱 **Web Browser Compatible** - Runs in any modern web browser

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- OpenWeather API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/hello-world-weather.git
cd hello-world-weather
```

2. Install dependencies:
```bash
npm install
```

3. Create a configuration file:
```bash
cp default.json.example default.json
```

4. Set up your OpenWeather API key in your environment variables or configuration file.

### Configuration

Create a `default.json` file in the project root with the following structure:

```json
{
  "defaultLocation": {
    "city": "Los Angeles",
    "state": "California",
    "country": "USA"
  },
  "apiKey": "your-openweather-api-key-here"
}
```

## Usage

### Starting the Application

```bash
npm start
```

The application will start and be available at `http://localhost:3000`

### Using the Weather App

1. **View Current Weather**: The app loads with weather data for the default location (Los Angeles)

2. **Change Location**: 
   - Select from the dropdown of popular cities
   - Or manually enter a custom city name

3. **Ask Weather Questions**:
   - Use the prompt field to ask natural language questions
   - Examples: "Will it rain tomorrow?", "What should I wear today?", "Is it good beach weather?"

4. **Navigate Features**: Use the navigation menu to access different sections of the app

### API Integration

The application integrates with:
- **OpenWeather Current Weather API** - For real-time weather data
- **OpenWeather AI Weather Assistant** - For intelligent weather responses

Learn more about the AI capabilities: https://openweathermap.org/api/one-call-3#ai_weather_assistant

## Project Structure

```
hello-world-weather/
├── src/
│   ├── components/        # React components
│   ├── services/         # API service calls
│   └── utils/           # Utility functions
├── public/              # Static assets
├── default.json         # Default configuration
└── package.json         # Project dependencies
```

## Development Status

- ✅ Environment setup
- ✅ Default location loading
- ✅ Weather data retrieval
- ✅ Weather data display
- ✅ AI prompt functionality
- ✅ Prompt results display
- 🔄 Navigation system (In Progress)
- 🔄 Custom city entry (In Progress)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenWeather API](https://openweathermap.org/api) for weather data and AI capabilities
- React.js community for the excellent framework