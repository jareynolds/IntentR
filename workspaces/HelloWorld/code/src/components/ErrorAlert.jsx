import { useApp } from '../context/AppContext';

function ErrorAlert() {
  const { weatherError, appState } = useApp();

  if (!weatherError && !appState.error) {
    return null;
  }

  const error = weatherError || appState.error;

  return (
    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
      <span style={{ fontSize: '1.2em' }}>⚠️</span>
      <div>
        <strong>Error</strong>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    </div>
  );
}

export default ErrorAlert;
