import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import WeatherCard from './components/WeatherCard';
import ApiKeyInput from './components/ApiKeyInput';
import AiPromptInput from './components/AiPromptInput';
import ErrorAlert from './components/ErrorAlert';
import LoadingScreen from './components/LoadingScreen';

function Dashboard() {
  const { appState, currentLocation, hasApiKey } = useApp();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Weather Dashboard</h1>
        <p className="page-subtitle">
          {currentLocation
            ? `Current weather for ${currentLocation.city}, ${currentLocation.state}, ${currentLocation.country}`
            : 'Loading location...'}
        </p>
      </div>

      <ErrorAlert />

      <ApiKeyInput />

      {hasApiKey && (
        <>
          <WeatherCard />
          <AiPromptInput />
        </>
      )}

      {!hasApiKey && (
        <div className="card" style={{ marginTop: 'var(--spacing-md)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🌤️</div>
            <h2 className="text-subheading" style={{ marginBottom: 'var(--spacing-sm)' }}>
              Welcome to Hello Weather World
            </h2>
            <p className="text-body-1" style={{ color: 'var(--color-neutral-slogan-gray)', maxWidth: '500px', margin: '0 auto' }}>
              Get real-time weather updates and ask AI-powered questions about the weather.
              Enter your OpenWeatherMap API key above to get started.
            </p>
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <h3 className="text-body-1" style={{ fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                Features:
              </h3>
              <ul style={{ textAlign: 'left', display: 'inline-block', color: 'var(--color-neutral-slogan-gray)' }}>
                <li>Real-time weather data from OpenWeatherMap</li>
                <li>AI-powered natural language weather queries</li>
                <li>Multiple location support</li>
                <li>Temperature, humidity, wind, and more</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const { appState } = useApp();

  if (!appState.isReady && appState.status === 'initializing') {
    return <LoadingScreen />;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

export default App;
