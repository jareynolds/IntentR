import { useState } from 'react';
import { useApp } from '../context/AppContext';

function AiPromptInput() {
  const {
    weatherData,
    hasApiKey,
    sendAiQuery,
    aiResponse,
    aiLoading,
    aiError,
    clearAiResponse
  } = useApp();

  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      sendAiQuery(query.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    "What should I wear today?",
    "Is it a good day for outdoor activities?",
    "Do I need an umbrella?",
    "How windy is it outside?",
    "What's the temperature like?"
  ];

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    sendAiQuery(suggestion);
  };

  if (!hasApiKey) {
    return null;
  }

  return (
    <div className="prompt-section">
      <div className="card">
        <h3 className="card-title" style={{ fontSize: 'var(--font-size-subheading)' }}>
          Ask About the Weather
        </h3>
        <p className="card-subtitle">
          Ask any question about the weather in your current location
        </p>

        <form onSubmit={handleSubmit}>
          <div className="prompt-input-container">
            <input
              type="text"
              className="form-input prompt-input"
              placeholder="e.g., Do I need a jacket today?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={aiLoading || !weatherData}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={aiLoading || !query.trim() || !weatherData}
            >
              {aiLoading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
        </form>

        {!weatherData && (
          <div className="alert alert-info" style={{ marginTop: 'var(--spacing-md)' }}>
            Weather data is loading. Please wait to ask questions.
          </div>
        )}

        {!aiResponse && !aiLoading && weatherData && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <p className="text-caption" style={{ color: 'var(--color-neutral-slogan-gray)', marginBottom: 'var(--spacing-sm)' }}>
              Try asking:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
              {suggestedQuestions.map((q, index) => (
                <button
                  key={index}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 12px',
                    fontSize: 'var(--font-size-caption)',
                    borderColor: 'var(--color-neutral-silver-sand)'
                  }}
                  onClick={() => handleSuggestionClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {aiError && (
          <div className="alert alert-error" style={{ marginTop: 'var(--spacing-md)' }}>
            {aiError}
          </div>
        )}

        {aiResponse && (
          <div className="prompt-response" style={{ marginTop: 'var(--spacing-md)' }}>
            <div className="prompt-response-header">
              <span style={{ fontSize: '1.2em' }}>🤖</span>
              <span>Weather Assistant</span>
              <button
                onClick={clearAiResponse}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-neutral-slogan-gray)',
                  fontSize: 'var(--font-size-body-2)'
                }}
              >
                Clear
              </button>
            </div>
            <div className="prompt-response-content">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiPromptInput;
