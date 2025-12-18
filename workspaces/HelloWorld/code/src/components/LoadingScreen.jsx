function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-background)',
        gap: 'var(--spacing-md)'
      }}
    >
      <img
        src="/weather-icon.svg"
        alt="Loading"
        style={{ width: '80px', height: '80px', animation: 'pulse 1.5s ease-in-out infinite' }}
      />
      <div className="spinner"></div>
      <p style={{ color: 'var(--color-neutral-slogan-gray)', fontSize: 'var(--font-size-body-1)' }}>
        Loading Hello Weather World...
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
