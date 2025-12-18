# Hello Weather World

A React.js weather application that displays weather data from OpenWeatherMap API with AI-powered natural language query capabilities.

## Features

- **Real-time Weather Data**: Get current weather conditions for any location
- **AI-Powered Queries**: Ask natural language questions about the weather
- **Multiple Locations**: Quick access to weather for multiple cities
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Blue Theme**: Beautiful UI with the Dark Blue color scheme

## Prerequisites

- Node.js 18+ installed
- OpenWeatherMap API key (free tier available at https://openweathermap.org/api)

## Getting Started

1. **Install dependencies:**
   ```bash
   cd code
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:3000`

4. **Enter API Key:**
   On first launch, enter your OpenWeatherMap API key when prompted.

## Project Structure

```
code/
├── public/
│   ├── default.json      # Default configuration (Los Angeles)
│   └── weather-icon.svg  # Application icon
├── src/
│   ├── components/       # React components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Layout.jsx
│   │   ├── WeatherCard.jsx
│   │   ├── ApiKeyInput.jsx
│   │   ├── AiPromptInput.jsx
│   │   └── ...
│   ├── context/          # React Context for state management
│   │   └── AppContext.jsx
│   ├── services/         # API and business logic
│   │   ├── configService.js
│   │   ├── weatherService.js
│   │   └── aiWeatherService.js
│   ├── styles/           # CSS styles
│   │   ├── variables.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── index.css
│   ├── App.jsx           # Main application component
│   └── main.jsx          # Application entry point
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
└── vite.config.js        # Vite configuration
```

## Configuration

The default location and settings are stored in `public/default.json`:

```json
{
  "defaultLocation": {
    "city": "Los Angeles",
    "state": "California",
    "country": "USA",
    "latitude": 34.0522,
    "longitude": -118.2437
  }
}
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **OpenWeatherMap API** - Weather data provider
- **CSS Variables** - Theming system

## UI Framework

This application uses the **Dashboard Admin** layout:
- Header with navigation and location display
- Left sidebar with quick location selection
- Main content area for weather display and AI queries

## UI Style

Implements the **Dark Blue** color scheme:
- Primary: Maastricht Blue (#081534), Dark Cerulean (#133A7C)
- Accent: Picton Blue (#47A8E5)
- Typography: Inter font family

## License

MIT License
