import React, { useState, useCallback } from 'react';
import { Button, Alert } from './index';
import axios from 'axios';
import { INTEGRATION_URL } from '../api/client';

interface DiscoveredField {
  name: string;
  type: 'text' | 'password' | 'select' | 'url';
  label: string;
  description: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
}

interface ConnectionAttempt {
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  errorMessage?: string;
  headers?: Record<string, string>;
}

interface DiscoveryState {
  step: 'initial' | 'testing' | 'analyzing' | 'configuring' | 'success';
  attempts: ConnectionAttempt[];
  discoveredFields: DiscoveredField[];
  llmAnalysis?: string;
  authType?: string;
}

export interface CustomIntegration {
  id: string;
  name: string;
  baseUrl: string;
  description: string;
  authType: string;
  fields: DiscoveredField[];
  configuredFields: Record<string, string>;
  createdAt: string;
  lastTestedAt?: string;
  status: 'configured' | 'needs_config' | 'error';
}

interface CreateIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIntegrationCreated: (integration: CustomIntegration) => void;
}

export const CreateIntegrationModal: React.FC<CreateIntegrationModalProps> = ({
  isOpen,
  onClose,
  onIntegrationCreated,
}) => {
  const [integrationName, setIntegrationName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>({
    step: 'initial',
    attempts: [],
    discoveredFields: [],
  });

  const resetModal = useCallback(() => {
    setIntegrationName('');
    setBaseUrl('');
    setDescription('');
    setFieldValues({});
    setError(null);
    setDiscoveryState({
      step: 'initial',
      attempts: [],
      discoveredFields: [],
    });
  }, []);

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const testConnection = async () => {
    if (!baseUrl) {
      setError('Please enter a base URL');
      return;
    }

    setError(null);
    setDiscoveryState(prev => ({
      ...prev,
      step: 'testing',
    }));

    const newAttempt: ConnectionAttempt = {
      timestamp: new Date(),
      status: 'pending',
    };

    setDiscoveryState(prev => ({
      ...prev,
      attempts: [...prev.attempts, newAttempt],
    }));

    try {
      // Call backend to test the connection
      const response = await axios.post(`${INTEGRATION_URL}/test-connection`, {
        base_url: baseUrl,
        credentials: fieldValues,
      }, {
        timeout: 30000, // 30 second timeout
      });

      const result = response.data;

      // Update the attempt with the result
      setDiscoveryState(prev => {
        const attempts = [...prev.attempts];
        attempts[attempts.length - 1] = {
          ...attempts[attempts.length - 1],
          status: result.success ? 'success' : 'error',
          statusCode: result.status_code,
          errorMessage: result.error_message,
          headers: result.response_headers,
        };
        return { ...prev, attempts };
      });

      if (result.success) {
        // Connection successful!
        setDiscoveryState(prev => ({ ...prev, step: 'success' }));
      } else {
        // Connection failed, analyze the error
        await analyzeError(result);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Connection failed';

      setDiscoveryState(prev => {
        const attempts = [...prev.attempts];
        attempts[attempts.length - 1] = {
          ...attempts[attempts.length - 1],
          status: 'error',
          errorMessage,
        };
        return { ...prev, attempts };
      });

      // Analyze the error
      await analyzeError({
        success: false,
        error_message: errorMessage,
        status_code: err.response?.status,
      });
    }
  };

  const analyzeError = async (connectionResult: any) => {
    setDiscoveryState(prev => ({ ...prev, step: 'analyzing' }));

    try {
      // Get Anthropic API key
      const anthropicKey = localStorage.getItem('anthropic_api_key');
      if (!anthropicKey) {
        setError('Anthropic API key not found. Please add it in Settings.');
        setDiscoveryState(prev => ({ ...prev, step: 'configuring' }));
        return;
      }

      // Call backend to analyze the error and suggest fields
      const response = await axios.post(`${INTEGRATION_URL}/analyze-connection-error`, {
        base_url: baseUrl,
        integration_name: integrationName || 'Unknown API',
        connection_result: connectionResult,
        current_fields: discoveryState.discoveredFields,
        current_values: fieldValues,
        anthropic_key: anthropicKey,
      });

      const analysis = response.data;

      // Merge new suggested fields with existing ones (avoid duplicates)
      const existingFieldNames = new Set(discoveryState.discoveredFields.map(f => f.name));
      const newFields = (analysis.suggested_fields || []).filter(
        (f: DiscoveredField) => !existingFieldNames.has(f.name)
      );

      setDiscoveryState(prev => ({
        ...prev,
        step: 'configuring',
        discoveredFields: [...prev.discoveredFields, ...newFields],
        llmAnalysis: analysis.analysis,
        authType: analysis.auth_type || prev.authType,
      }));

      // Auto-fill description if we got one from analysis
      if (analysis.description && !description) {
        setDescription(analysis.description);
      }
    } catch (err: any) {
      setError(`Failed to analyze error: ${err.message}`);
      setDiscoveryState(prev => ({ ...prev, step: 'configuring' }));
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSaveIntegration = () => {
    if (!integrationName.trim()) {
      setError('Please enter an integration name');
      return;
    }

    const integration: CustomIntegration = {
      id: `custom_${Date.now()}`,
      name: integrationName,
      baseUrl,
      description: description || `Custom integration for ${integrationName}`,
      authType: discoveryState.authType || 'Unknown',
      fields: discoveryState.discoveredFields,
      configuredFields: fieldValues,
      createdAt: new Date().toISOString(),
      lastTestedAt: discoveryState.step === 'success' ? new Date().toISOString() : undefined,
      status: discoveryState.step === 'success' ? 'configured' : 'needs_config',
    };

    // Save to localStorage
    const storageKey = `custom_integrations`;
    const existing = localStorage.getItem(storageKey);
    const integrations: CustomIntegration[] = existing ? JSON.parse(existing) : [];
    integrations.push(integration);
    localStorage.setItem(storageKey, JSON.stringify(integrations));

    // Also save individual config
    const configKey = `integration_config_${integrationName.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.setItem(configKey, JSON.stringify({
      integration_name: integrationName,
      provider_url: baseUrl,
      configured_at: new Date().toISOString(),
      auth_method: discoveryState.authType,
      fields: fieldValues,
      is_custom: true,
    }));

    onIntegrationCreated(integration);
    handleClose();
  };

  if (!isOpen) return null;

  const getStepIndicator = () => {
    const steps = [
      { key: 'initial', label: 'Enter URL' },
      { key: 'testing', label: 'Testing' },
      { key: 'analyzing', label: 'Analyzing' },
      { key: 'configuring', label: 'Configure' },
      { key: 'success', label: 'Connected' },
    ];

    const currentIndex = steps.findIndex(s => s.key === discoveryState.step);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '24px',
      }}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: index <= currentIndex
                ? (step.key === 'success' && discoveryState.step === 'success'
                    ? 'var(--color-systemGreen)'
                    : 'var(--color-systemBlue)')
                : 'var(--color-grey-200)',
              color: index <= currentIndex ? 'white' : 'var(--color-grey-500)',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}>
              {step.key === 'success' && discoveryState.step === 'success' ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: index < currentIndex
                  ? 'var(--color-systemBlue)'
                  : 'var(--color-grey-200)',
                transition: 'all 0.3s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          borderBottom: '1px solid var(--color-grey-200)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 className="text-title2">Create New Integration</h2>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--color-grey-500)',
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>
          {getStepIndicator()}
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {error && (
            <Alert type="error" style={{ marginBottom: '20px' }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Initial - Enter URL */}
          {discoveryState.step === 'initial' && (
            <div>
              <p className="text-body text-secondary" style={{ marginBottom: '20px' }}>
                Enter the base URL of the API you want to integrate with. We'll test the connection
                and progressively discover what authentication is needed.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Integration Name
                </label>
                <input
                  type="text"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                  placeholder="e.g., My Custom API"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-grey-300)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  API Base URL *
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-grey-300)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <p className="text-footnote text-secondary" style={{ marginTop: '8px' }}>
                  Enter the base URL of the API (e.g., https://api.example.com/v1)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <Button
                  variant="primary"
                  onClick={testConnection}
                  style={{ flex: 1 }}
                  disabled={!baseUrl}
                >
                  Test Connection
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Testing */}
          {discoveryState.step === 'testing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid var(--color-grey-200)',
                borderTop: '4px solid var(--color-systemBlue)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }} />
              <h3 className="text-headline" style={{ marginBottom: '8px' }}>
                Testing Connection...
              </h3>
              <p className="text-body text-secondary">
                Attempting to connect to <code style={{
                  backgroundColor: 'var(--color-grey-100)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}>{baseUrl}</code>
              </p>
            </div>
          )}

          {/* Step 3: Analyzing */}
          {discoveryState.step === 'analyzing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid var(--color-grey-200)',
                borderTop: '4px solid var(--color-systemOrange)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }} />
              <h3 className="text-headline" style={{ marginBottom: '8px' }}>
                Analyzing Response...
              </h3>
              <p className="text-body text-secondary">
                AI is analyzing the API response to determine what authentication is needed.
              </p>
            </div>
          )}

          {/* Step 4: Configuring */}
          {discoveryState.step === 'configuring' && (
            <div>
              {/* Connection Attempts History */}
              {discoveryState.attempts.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  backgroundColor: 'var(--color-grey-50)',
                  borderRadius: '12px',
                }}>
                  <h4 className="text-subheadline" style={{ marginBottom: '12px' }}>
                    Connection Attempts ({discoveryState.attempts.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {discoveryState.attempts.map((attempt, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: '1px solid var(--color-grey-200)',
                        }}
                      >
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          backgroundColor: attempt.status === 'success'
                            ? 'var(--color-systemGreen)'
                            : attempt.status === 'error'
                              ? 'var(--color-systemRed)'
                              : 'var(--color-systemOrange)',
                          color: 'white',
                        }}>
                          {attempt.status === 'success' ? '✓' : attempt.status === 'error' ? '✗' : '...'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span className="text-footnote">
                            Attempt #{index + 1}
                            {attempt.statusCode && ` - Status: ${attempt.statusCode}`}
                          </span>
                          {attempt.errorMessage && (
                            <p className="text-footnote text-secondary" style={{ margin: 0 }}>
                              {attempt.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LLM Analysis */}
              {discoveryState.llmAnalysis && (
                <Alert type="info" style={{ marginBottom: '20px' }}>
                  <strong>AI Analysis:</strong> {discoveryState.llmAnalysis}
                </Alert>
              )}

              {/* Auth Type */}
              {discoveryState.authType && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-blue-50)',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}>
                  <span className="text-footnote">
                    <strong>Detected Auth Type:</strong> {discoveryState.authType}
                  </span>
                </div>
              )}

              {/* Dynamic Fields */}
              {discoveryState.discoveredFields.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                  <h4 className="text-subheadline" style={{ marginBottom: '16px' }}>
                    Required Configuration
                  </h4>
                  {discoveryState.discoveredFields.map((field, index) => (
                    <div key={field.name} style={{ marginBottom: '16px' }}>
                      <label
                        className="text-body"
                        style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}
                      >
                        {field.label}
                        {field.required && <span style={{ color: 'var(--color-systemRed)' }}> *</span>}
                      </label>
                      <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                        {field.description}
                      </p>
                      {field.type === 'select' && field.options ? (
                        <select
                          value={fieldValues[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--color-grey-300)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                          }}
                        >
                          <option value="">Select...</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={fieldValues[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--color-grey-300)',
                            borderRadius: '8px',
                            fontSize: '14px',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '24px',
                  backgroundColor: 'var(--color-grey-50)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  marginBottom: '20px',
                }}>
                  <p className="text-body text-secondary">
                    No authentication fields discovered yet. Click "Retry Connection" to try again.
                  </p>
                </div>
              )}

              {/* Description field */}
              <div style={{ marginBottom: '20px' }}>
                <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this integration is for..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-grey-300)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="primary"
                  onClick={testConnection}
                  style={{ flex: 1 }}
                >
                  Retry Connection
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveIntegration}
                  disabled={!integrationName}
                >
                  Save Anyway
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {discoveryState.step === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-systemGreen)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <span style={{ color: 'white', fontSize: '40px' }}>✓</span>
              </div>
              <h3 className="text-headline" style={{ marginBottom: '12px' }}>
                Connection Successful!
              </h3>
              <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>
                Successfully connected to the API. You can now save this integration.
              </p>

              {/* Integration Name (if not set) */}
              {!integrationName && (
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Integration Name *
                  </label>
                  <input
                    type="text"
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    placeholder="e.g., My Custom API"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--color-grey-300)',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              {/* Description */}
              <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this integration is for..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-grey-300)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button
                  variant="primary"
                  onClick={handleSaveIntegration}
                  disabled={!integrationName}
                  style={{ minWidth: '200px' }}
                >
                  Save Integration
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
