import React, { useState, useEffect } from 'react';
import { Card, Alert, Button, AIPresetIndicator, PageHeader, CreateIntegrationModal } from '../components';
import type { CustomIntegration } from '../components';
import axios from 'axios';
import { INTEGRATION_URL } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';

interface IntegrationConfig {
  name: string;
  providerURL: string;
  description: string;
  status: 'active' | 'inactive';
  service?: string;
}

interface IntegrationAnalysis {
  integration_name: string;
  description: string;
  auth_method: string;
  required_fields: ConfigField[];
  optional_fields: ConfigField[];
  capabilities: string[];
  sample_endpoints: Record<string, string>;
}

interface ConfigField {
  name: string;
  type: string;
  description: string;
  example?: string;
  required: boolean;
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    name: 'Figma API',
    providerURL: 'https://www.figma.com/developers/api',
    description: 'Connected to Figma API for design file synchronization.',
    status: 'active',
    service: 'integration-service:8080'
  },
  {
    name: 'Jira',
    providerURL: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    description: 'Track issues and project management.',
    status: 'inactive'
  },
  {
    name: 'GitHub',
    providerURL: 'https://docs.github.com/en/rest',
    description: 'Code repository integration.',
    status: 'inactive'
  }
];

interface ConnectedRepo {
  workspaceName: string;
  workspaceId: string;
  repoUrl: string;
  branch: string;
}

// Known integration requirements - these override/augment LLM analysis
// This ensures required fields are always shown even if LLM analysis is incomplete
const KNOWN_INTEGRATION_REQUIREMENTS: Record<string, {
  fields: ConfigField[];
  authMethod?: string;
}> = {
  'Jira': {
    authMethod: 'Basic Authentication with API Token',
    fields: [
      {
        name: 'email',
        type: 'text',
        description: 'Your Atlassian account email address',
        example: 'you@company.com',
        required: true,
      },
      {
        name: 'api_token',
        type: 'password',
        description: 'API Token from https://id.atlassian.com/manage-profile/security/api-tokens',
        example: 'ATATT3xFfGF0...',
        required: true,
      },
      {
        name: 'domain',
        type: 'text',
        description: 'Your Jira domain (e.g., yourcompany.atlassian.net)',
        example: 'yourcompany.atlassian.net',
        required: true,
      },
    ],
  },
  'GitHub': {
    authMethod: 'Personal Access Token',
    fields: [
      {
        name: 'access_token',
        type: 'password',
        description: 'Personal Access Token from https://github.com/settings/tokens',
        example: 'ghp_xxxxxxxxxxxx',
        required: true,
      },
    ],
  },
  'Figma API': {
    authMethod: 'Personal Access Token',
    fields: [
      {
        name: 'access_token',
        type: 'password',
        description: 'Personal Access Token from Figma Settings > Account > Personal access tokens',
        example: 'figd_xxxxxxxxxxxx',
        required: true,
      },
    ],
  },
};

export const Integrations: React.FC = () => {
  const { workspaces } = useWorkspace();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IntegrationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [providerURL, setProviderURL] = useState('');
  const [showURLInput, setShowURLInput] = useState(false);
  const [configuredIntegrations, setConfiguredIntegrations] = useState<Record<string, boolean>>({});
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customIntegrations, setCustomIntegrations] = useState<CustomIntegration[]>([]);

  // Load custom integrations from localStorage
  useEffect(() => {
    const loadCustomIntegrations = () => {
      const stored = localStorage.getItem('custom_integrations');
      if (stored) {
        try {
          setCustomIntegrations(JSON.parse(stored));
        } catch {
          setCustomIntegrations([]);
        }
      }
    };
    loadCustomIntegrations();
  }, [showCreateModal]);

  // Check which integrations are configured
  useEffect(() => {
    const checkConfigurations = () => {
      const configured: Record<string, boolean> = {};
      INTEGRATIONS.forEach(integration => {
        const configKey = `integration_config_${integration.name.toLowerCase().replace(/\s+/g, '_')}`;
        const config = localStorage.getItem(configKey);
        if (config) {
          try {
            const parsed = JSON.parse(config);
            // Check if the configuration has actual credentials
            configured[integration.name] = !!(parsed.fields && Object.keys(parsed.fields).length > 0);
          } catch {
            configured[integration.name] = false;
          }
        } else {
          configured[integration.name] = false;
        }
      });
      // Also check custom integrations
      customIntegrations.forEach(integration => {
        configured[integration.name] = integration.status === 'configured';
      });
      setConfiguredIntegrations(configured);
    };

    checkConfigurations();
    // Re-check when modal closes
  }, [showConfigModal, customIntegrations]);

  // Get connected repositories for GitHub
  useEffect(() => {
    const getConnectedRepos = async () => {
      const repos: ConnectedRepo[] = [];

      for (const workspace of workspaces) {
        if (workspace.projectFolder) {
          try {
            const response = await fetch(
              `http://localhost:4001/git/config?workspace=${encodeURIComponent(workspace.projectFolder)}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.initialized && data.remoteUrl) {
                repos.push({
                  workspaceName: workspace.name,
                  workspaceId: workspace.id,
                  repoUrl: data.remoteUrl,
                  branch: data.currentBranch || 'main',
                });
              }
            }
          } catch (err) {
            // Ignore errors for individual workspaces
          }
        }
      }

      setConnectedRepos(repos);
    };

    if (workspaces.length > 0) {
      getConnectedRepos();
    }
  }, [workspaces]);

  // Helper function to merge LLM analysis with known integration requirements
  // Defined before handleConfigure so it can be used there
  const mergeWithKnownRequirements = (llmAnalysis: IntegrationAnalysis, integrationName: string): IntegrationAnalysis => {
    const knownReqs = KNOWN_INTEGRATION_REQUIREMENTS[integrationName];

    if (!knownReqs) {
      return llmAnalysis; // No known requirements, return LLM analysis as-is
    }

    // Start with LLM analysis
    const merged = { ...llmAnalysis };

    // Override auth method if we have a known one
    if (knownReqs.authMethod) {
      merged.auth_method = knownReqs.authMethod;
    }

    // Merge required fields - known requirements take priority
    const existingFieldNames = new Set(merged.required_fields.map(f => f.name.toLowerCase()));
    const mergedRequiredFields: ConfigField[] = [];

    // Add known required fields first (they take priority)
    for (const knownField of knownReqs.fields) {
      mergedRequiredFields.push(knownField);
      existingFieldNames.add(knownField.name.toLowerCase());
    }

    // Add any LLM fields that aren't already covered by known fields
    for (const llmField of merged.required_fields) {
      const fieldNameLower = llmField.name.toLowerCase();
      // Skip if this field (or a variant) is already in our known fields
      const isKnownField = knownReqs.fields.some(kf =>
        kf.name.toLowerCase() === fieldNameLower ||
        // Check common variations
        (fieldNameLower === 'access_token' && knownReqs.fields.some(f => f.name === 'api_token')) ||
        (fieldNameLower === 'api_token' && knownReqs.fields.some(f => f.name === 'access_token')) ||
        (fieldNameLower === 'username' && knownReqs.fields.some(f => f.name === 'email')) ||
        (fieldNameLower === 'user' && knownReqs.fields.some(f => f.name === 'email'))
      );

      if (!isKnownField) {
        mergedRequiredFields.push(llmField);
      }
    }

    merged.required_fields = mergedRequiredFields;

    return merged;
  };

  const handleConfigure = async (integration: IntegrationConfig) => {
    setSelectedIntegration(integration);
    setError(null);
    setShowConfigModal(true);

    // Check if configuration already exists
    const configKey = `integration_config_${integration.name.toLowerCase().replace(/\s+/g, '_')}`;
    const existingConfig = localStorage.getItem(configKey);

    if (existingConfig) {
      // Load existing configuration
      try {
        const config = JSON.parse(existingConfig);

        // If no provider_url in saved config (old format), use default and migrate
        if (!config.provider_url) {
          console.warn('Found old configuration format without provider_url, migrating...');
          setProviderURL(integration.providerURL);
          setFormValues(config.fields || {});

          // Update the stored config with the provider_url
          const updatedConfig = {
            ...config,
            provider_url: integration.providerURL
          };
          localStorage.setItem(configKey, JSON.stringify(updatedConfig));

          // Trigger re-analysis with the default provider URL
          await analyzeIntegration(integration.providerURL, integration.name);
        } else {
          // Normal flow with provider_url present
          setProviderURL(config.provider_url);
          setFormValues(config.fields || {});

          // For known integrations, always use our predefined requirements
          // to ensure all required fields are shown (fixes incomplete LLM analysis)
          const knownReqs = KNOWN_INTEGRATION_REQUIREMENTS[integration.name];
          if (knownReqs) {
            // Use predefined requirements, but still try to enhance with cached/LLM data
            const cacheKey = `integration_analysis_${config.provider_url}`;
            const cachedAnalysis = localStorage.getItem(cacheKey);

            if (cachedAnalysis) {
              // Merge cached analysis with known requirements
              const parsed = JSON.parse(cachedAnalysis);
              const mergedAnalysis = mergeWithKnownRequirements(parsed, integration.name);
              setAnalysis(mergedAnalysis);

              // Update cache with merged analysis
              localStorage.setItem(cacheKey, JSON.stringify(mergedAnalysis));
            } else {
              // No cache, trigger fresh analysis (which will use known requirements)
              await analyzeIntegration(config.provider_url, integration.name);
            }
          } else {
            // Unknown integration - use cache or analyze
            const cacheKey = `integration_analysis_${config.provider_url}`;
            const cachedAnalysis = localStorage.getItem(cacheKey);

            if (cachedAnalysis) {
              setAnalysis(JSON.parse(cachedAnalysis));
            } else {
              // Re-analyze
              await analyzeIntegration(config.provider_url, integration.name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load existing configuration:', err);
        setShowURLInput(true);
        setProviderURL(integration.providerURL);
      }
    } else {
      // No existing configuration, ask for URL
      setShowURLInput(true);
      setProviderURL(integration.providerURL);
    }
  };

  const analyzeIntegration = async (url: string, name: string) => {
    setAnalyzing(true);
    setError(null);

    try {
      // Check if this is a known integration - use predefined requirements
      const knownReqs = KNOWN_INTEGRATION_REQUIREMENTS[name];

      if (knownReqs) {
        // For known integrations, use our predefined requirements
        // This ensures all required fields are always shown
        const analysis: IntegrationAnalysis = {
          integration_name: name,
          description: `${name} integration with predefined configuration requirements.`,
          auth_method: knownReqs.authMethod || 'API Key',
          required_fields: knownReqs.fields,
          optional_fields: [],
          capabilities: [],
          sample_endpoints: {},
        };

        // Optionally, still call LLM to get description and capabilities
        // but merge our known required fields
        try {
          const anthropicKey = localStorage.getItem('anthropic_api_key');
          if (anthropicKey) {
            const response = await axios.post(`${INTEGRATION_URL}/analyze-integration`, {
              provider_url: url,
              provider_name: name,
              anthropic_key: anthropicKey
            });

            // Merge LLM analysis with known requirements
            const mergedAnalysis = mergeWithKnownRequirements(response.data, name);

            // Cache the merged analysis
            const cacheKey = `integration_analysis_${url}`;
            localStorage.setItem(cacheKey, JSON.stringify(mergedAnalysis));

            setAnalysis(mergedAnalysis);
            setShowURLInput(false);
            return;
          }
        } catch (llmErr) {
          console.warn('LLM analysis failed, using known requirements:', llmErr);
        }

        // Fallback to just our known requirements
        setAnalysis(analysis);
        setShowURLInput(false);
        return;
      }

      // For unknown integrations, use LLM analysis
      const anthropicKey = localStorage.getItem('anthropic_api_key');

      if (!anthropicKey) {
        throw new Error('Anthropic API key not found. Please add it in Settings.');
      }

      // Check cache first
      const cacheKey = `integration_analysis_${url}`;
      const cachedAnalysis = localStorage.getItem(cacheKey);

      if (cachedAnalysis) {
        setAnalysis(JSON.parse(cachedAnalysis));
        setShowURLInput(false);
        return;
      }

      // Call the integration analysis endpoint
      const response = await axios.post(`${INTEGRATION_URL}/analyze-integration`, {
        provider_url: url,
        provider_name: name,
        anthropic_key: anthropicKey
      });

      // Cache the analysis
      localStorage.setItem(cacheKey, JSON.stringify(response.data));

      setAnalysis(response.data);
      setShowURLInput(false);
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Failed to analyze integration');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeClick = () => {
    if (!providerURL) {
      setError('Please enter a provider URL');
      return;
    }
    analyzeIntegration(providerURL, selectedIntegration?.name || '');
  };

  const handleSaveConfiguration = async () => {
    if (!selectedIntegration || !analysis) return;

    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      const missingFields = analysis.required_fields.filter(
        field => !formValues[field.name] || formValues[field.name].trim() === ''
      );

      if (missingFields.length > 0) {
        throw new Error(`Please fill in required fields: ${missingFields.map(f => f.name).join(', ')}`);
      }

      // Save configuration to localStorage
      const configKey = `integration_config_${selectedIntegration.name.toLowerCase().replace(/\s+/g, '_')}`;
      const configData = {
        integration_name: selectedIntegration.name,
        provider_url: providerURL,
        configured_at: new Date().toISOString(),
        auth_method: analysis.auth_method,
        fields: formValues,
      };

      localStorage.setItem(configKey, JSON.stringify(configData));

      // Show success message
      setSaveSuccess(true);

      // Close modal after 1.5 seconds
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowConfigModal(false);
    setAnalysis(null);
    setError(null);
    setSelectedIntegration(null);
    setFormValues({});
    setSaving(false);
    setSaveSuccess(false);
    setProviderURL('');
    setShowURLInput(false);
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleIntegrationCreated = (integration: CustomIntegration) => {
    setCustomIntegrations(prev => [...prev, integration]);
  };

  const handleDeleteCustomIntegration = (integrationId: string) => {
    const updated = customIntegrations.filter(i => i.id !== integrationId);
    setCustomIntegrations(updated);
    localStorage.setItem('custom_integrations', JSON.stringify(updated));

    // Also remove the individual config
    const integration = customIntegrations.find(i => i.id === integrationId);
    if (integration) {
      const configKey = `integration_config_${integration.name.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.removeItem(configKey);
    }
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <AIPresetIndicator />
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <PageHeader
          title="External Integrations"
          quickDescription="Manage connections to external design tools and services."
          detailedDescription="Configure integrations with external services like Figma, GitHub, and Jira.
Integrations enable automatic synchronization of design assets, code repositories, and project management data.
Each integration requires API credentials which are stored securely in your browser's local storage."
          actions={
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Create Integration
            </Button>
          }
        />

        <Alert type="success" style={{ marginBottom: '24px' }}>
          <strong>Success:</strong> Figma integration is active and connected.
        </Alert>

        {/* Apple HIG Title 2 */}
        <h3 className="text-title2" style={{ marginBottom: '16px' }}>Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
          {INTEGRATIONS.map((integration) => {
            const isConfigured = configuredIntegrations[integration.name] || integration.status === 'active';
            return (
              <Card key={integration.name}>
                <h3 className="text-headline" style={{ marginBottom: '8px' }}>{integration.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '20px',
                    backgroundColor: isConfigured
                      ? 'rgba(76, 217, 100, 0.1)'
                      : 'rgba(142, 142, 147, 0.1)',
                    color: isConfigured
                      ? 'var(--color-systemGreen)'
                      : 'var(--color-grey-500)',
                    width: 'fit-content'
                  }}>
                    {isConfigured ? 'Configured' : 'Not Configured'}
                  </span>
                  <p className="text-footnote text-secondary">
                    {integration.description}
                  </p>
                  {integration.service && (
                    <p className="text-footnote text-secondary">
                      <strong>Service:</strong> {integration.service}
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    style={{ marginTop: '8px' }}
                    onClick={() => handleConfigure(integration)}
                  >
                    {isConfigured ? 'Update Configuration' : 'Configure'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Custom Integrations Section */}
        {customIntegrations.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 className="text-title2" style={{ marginBottom: '16px' }}>Custom Integrations</h3>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              Integrations you've created using Progressive Discovery.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
              {customIntegrations.map((integration) => (
                <Card key={integration.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 className="text-headline" style={{ marginBottom: '8px' }}>{integration.name}</h3>
                    <button
                      onClick={() => handleDeleteCustomIntegration(integration.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-systemRed)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '16px',
                      }}
                      title="Delete integration"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '20px',
                      backgroundColor: integration.status === 'configured'
                        ? 'rgba(76, 217, 100, 0.1)'
                        : integration.status === 'needs_config'
                          ? 'rgba(255, 149, 0, 0.1)'
                          : 'rgba(255, 59, 48, 0.1)',
                      color: integration.status === 'configured'
                        ? 'var(--color-systemGreen)'
                        : integration.status === 'needs_config'
                          ? 'var(--color-systemOrange)'
                          : 'var(--color-systemRed)',
                      width: 'fit-content'
                    }}>
                      {integration.status === 'configured' ? 'Connected' : integration.status === 'needs_config' ? 'Needs Config' : 'Error'}
                    </span>
                    <p className="text-footnote text-secondary">
                      {integration.description}
                    </p>
                    <p className="text-footnote text-secondary">
                      <strong>Base URL:</strong>{' '}
                      <code style={{
                        backgroundColor: 'var(--color-grey-100)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}>
                        {integration.baseUrl}
                      </code>
                    </p>
                    {integration.authType && (
                      <p className="text-footnote text-secondary">
                        <strong>Auth:</strong> {integration.authType}
                      </p>
                    )}
                    <p className="text-footnote text-secondary" style={{ opacity: 0.7 }}>
                      Created: {new Date(integration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Connected Repositories Section (GitHub) */}
        {configuredIntegrations['GitHub'] && (
          <div style={{ marginTop: '32px' }}>
            <h3 className="text-title2" style={{ marginBottom: '16px' }}>Connected Repositories</h3>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              Workspaces linked to GitHub repositories for version control.
            </p>

            {connectedRepos.length > 0 ? (
              <div style={{
                border: '1px solid var(--color-grey-200)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}>
                {connectedRepos.map((repo, index) => (
                  <div
                    key={repo.workspaceId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-grey-50)',
                      borderBottom: index < connectedRepos.length - 1 ? '1px solid var(--color-grey-200)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-grey-100)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-grey-600)">
                          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>
                          {repo.workspaceName}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-grey-500)' }}>
                          Branch: <code style={{ backgroundColor: 'var(--color-grey-100)', padding: '2px 6px', borderRadius: '4px' }}>{repo.branch}</code>
                        </p>
                      </div>
                    </div>
                    <a
                      href={repo.repoUrl.replace('.git', '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-blue-600)',
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {repo.repoUrl.replace('https://github.com/', '').replace('.git', '')}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15,3 21,3 21,9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '32px',
                  backgroundColor: 'var(--color-grey-50)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-grey-400)"
                  strokeWidth="1.5"
                  style={{ margin: '0 auto 12px' }}
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                </svg>
                <p style={{ margin: 0, marginBottom: '8px', fontWeight: 500, color: 'var(--color-grey-600)' }}>
                  No repositories connected yet
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-grey-500)' }}>
                  Go to Workspaces and click "Version Control" on a workspace to connect it to a GitHub repository.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && (
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
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="text-title2">Configure {selectedIntegration?.name}</h2>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: 'var(--color-grey-500)'
                  }}
                >
                  ×
                </button>
              </div>

              {showURLInput && !analyzing && !analysis && (
                <div>
                  <p className="text-body" style={{ marginBottom: '16px' }}>
                    Please enter the URL of your {selectedIntegration?.name} instance or the API documentation page.
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="text-body" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                      Provider URL
                    </label>
                    <input
                      type="url"
                      value={providerURL}
                      onChange={(e) => setProviderURL(e.target.value)}
                      placeholder="https://api.example.com or https://example.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--color-grey-300)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginBottom: '12px'
                      }}
                    />
                    <p className="text-footnote text-secondary">
                      Claude will analyze this URL to determine what configuration is needed.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="primary" onClick={handleAnalyzeClick} style={{ flex: 1 }}>
                      Analyze Integration
                    </Button>
                    <Button variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {analyzing && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid var(--color-grey-200)',
                    borderTop: '4px solid var(--color-blue-500)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p className="text-body">Analyzing {selectedIntegration?.name} API...</p>
                  <p className="text-footnote text-secondary" style={{ marginTop: '8px' }}>
                    Claude is examining the API documentation to determine configuration requirements.
                  </p>
                </div>
              )}

              {error && !showURLInput && (
                <Alert type="error" style={{ marginBottom: '20px' }}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {error && showURLInput && (
                <Alert type="error" style={{ marginBottom: '16px' }}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {analysis && !analyzing && (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 className="text-headline" style={{ marginBottom: '8px' }}>Integration Details</h3>
                    <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                      {analysis.description}
                    </p>

                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-blue-50)',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <p className="text-footnote"><strong>Authentication Method:</strong> {analysis.auth_method}</p>
                    </div>

                    {analysis.capabilities.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h4 className="text-subheadline" style={{ marginBottom: '8px' }}>Capabilities</h4>
                        <ul style={{ paddingLeft: '20px' }}>
                          {analysis.capabilities.map((cap, idx) => (
                            <li key={idx} className="text-footnote text-secondary">{cap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-headline" style={{ marginBottom: '16px' }}>Configuration</h3>

                    {saveSuccess && (
                      <Alert type="success" style={{ marginBottom: '20px' }}>
                        <strong>Success!</strong> Configuration saved successfully. Closing...
                      </Alert>
                    )}

                    {analysis.required_fields.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 className="text-subheadline" style={{ marginBottom: '12px' }}>Required Fields</h4>
                        {analysis.required_fields.map((field, idx) => (
                          <div key={idx} style={{ marginBottom: '16px' }}>
                            <label className="text-body" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                              {field.name}
                            </label>
                            <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                              {field.description}
                            </p>
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              placeholder={field.example || `Enter ${field.name}`}
                              value={formValues[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              disabled={saving || saveSuccess}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--color-grey-300)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                opacity: (saving || saveSuccess) ? 0.6 : 1
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {analysis.optional_fields.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 className="text-subheadline" style={{ marginBottom: '12px' }}>Optional Fields</h4>
                        {analysis.optional_fields.map((field, idx) => (
                          <div key={idx} style={{ marginBottom: '16px' }}>
                            <label className="text-body" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                              {field.name} <span className="text-footnote text-secondary">(Optional)</span>
                            </label>
                            <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                              {field.description}
                            </p>
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              placeholder={field.example || `Enter ${field.name}`}
                              value={formValues[field.name] || ''}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              disabled={saving || saveSuccess}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--color-grey-300)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                opacity: (saving || saveSuccess) ? 0.6 : 1
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                      <Button
                        variant="primary"
                        style={{ flex: 1 }}
                        onClick={handleSaveConfiguration}
                        disabled={saving || saveSuccess}
                      >
                        {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configuration'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={closeModal}
                        disabled={saving || saveSuccess}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Integration Modal */}
        <CreateIntegrationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onIntegrationCreated={handleIntegrationCreated}
        />
      </div>
    </div>
  );
};
