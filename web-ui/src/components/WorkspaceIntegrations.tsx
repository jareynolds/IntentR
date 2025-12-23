import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './Button';
import { Alert } from './Alert';
import { JiraImportModal } from './JiraImportModal';
import { INTEGRATION_URL } from '../api/client';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  projectFolder?: string;
}

interface IntegrationResource {
  id: string;
  name: string;
  type: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
}

interface ResourceSuggestion {
  resource_id: string;
  resource_name: string;
  reason: string;
  confidence: number;
}

interface WorkspaceIntegrationsProps {
  workspace: Workspace;
  onClose: () => void;
}

const AVAILABLE_INTEGRATIONS = [
  { name: 'Figma API', icon: '🎨' },
  { name: 'GitHub', icon: '💻' },
  { name: 'Jira', icon: '📋' }
];

export const WorkspaceIntegrations: React.FC<WorkspaceIntegrationsProps> = ({ workspace, onClose }) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [resources, setResources] = useState<IntegrationResource[]>([]);
  const [suggestions, setSuggestions] = useState<ResourceSuggestion[]>([]);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [existingIntegrations, setExistingIntegrations] = useState<Record<string, IntegrationResource[]>>({});
  const [showJiraImport, setShowJiraImport] = useState(false);
  const [selectedJiraProject, setSelectedJiraProject] = useState<IntegrationResource | null>(null);

  // Load existing workspace integrations on mount
  useEffect(() => {
    const workspaceIntegrations = JSON.parse(localStorage.getItem('workspace_integrations') || '{}');
    if (workspaceIntegrations[workspace.id]) {
      setExistingIntegrations(workspaceIntegrations[workspace.id]);
    }
  }, [workspace.id]);

  // Known integration required fields - these are the fields that must be present
  // for each integration to work, regardless of what the LLM analysis returns
  const KNOWN_INTEGRATION_REQUIREMENTS: Record<string, { fields: string[], fieldLabels: Record<string, string> }> = {
    'Jira': {
      fields: ['email', 'api_token', 'domain'],
      fieldLabels: {
        'email': 'Email (your Atlassian account email)',
        'api_token': 'API Token (from https://id.atlassian.com/manage-profile/security/api-tokens)',
        'domain': 'Domain (e.g., yourcompany.atlassian.net)',
      }
    },
    'GitHub': {
      fields: ['access_token'],
      fieldLabels: {
        'access_token': 'Personal Access Token',
      }
    },
    'Figma API': {
      fields: ['access_token'],
      fieldLabels: {
        'access_token': 'Personal Access Token',
      }
    }
  };

  const getIntegrationConfig = (integrationName: string) => {
    const configKey = `integration_config_${integrationName.toLowerCase().replace(/\s+/g, '_')}`;
    const config = localStorage.getItem(configKey);
    if (!config) return null;
    return JSON.parse(config);
  };

  // Validate that all required fields are present for known integrations
  const validateIntegrationConfig = (integrationName: string, fields: Record<string, string>): { valid: boolean, missingFields: string[] } => {
    const requirements = KNOWN_INTEGRATION_REQUIREMENTS[integrationName];
    if (!requirements) {
      // Unknown integration, assume it's valid
      return { valid: true, missingFields: [] };
    }

    const missingFields: string[] = [];
    for (const field of requirements.fields) {
      // Check for the exact field name or common variations
      const hasField = fields[field] ||
        fields[field.replace(/_/g, '')] || // api_token -> apitoken
        fields[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]; // api_token -> apiToken

      if (!hasField) {
        missingFields.push(requirements.fieldLabels[field] || field);
      }
    }

    return { valid: missingFields.length === 0, missingFields };
  };

  const fetchResources = async (integrationName: string) => {
    setLoading(true);
    setError(null);
    setResources([]);
    setSuggestions([]);

    try {
      const config = getIntegrationConfig(integrationName);
      if (!config || !config.fields) {
        throw new Error(`${integrationName} is not configured. Please configure it in the Integrations page first.`);
      }

      // Validate required fields for known integrations
      const validation = validateIntegrationConfig(integrationName, config.fields);
      if (!validation.valid) {
        throw new Error(
          `${integrationName} configuration is incomplete. Missing required fields:\n` +
          validation.missingFields.map(f => `  • ${f}`).join('\n') +
          `\n\nPlease go to the Integrations page and update your ${integrationName} configuration.`
        );
      }

      // Fetch resources from integration
      const response = await axios.post(`${INTEGRATION_URL}/fetch-resources`, {
        integration_name: integrationName,
        credentials: config.fields
      });

      setResources(response.data.resources);

      // Get AI suggestions
      await fetchSuggestions(integrationName, response.data.resources);
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (integrationName: string, resourcesList: IntegrationResource[]) => {
    setLoadingSuggestions(true);
    try {
      const anthropicKey = localStorage.getItem('anthropic_api_key');
      if (!anthropicKey) {
        console.warn('Anthropic API key not found, skipping suggestions');
        return;
      }

      const response = await axios.post(`${INTEGRATION_URL}/suggest-resources`, {
        workspace_name: workspace.name,
        workspace_description: workspace.description || '',
        integration_name: integrationName,
        resources: resourcesList,
        anthropic_key: anthropicKey
      });

      setSuggestions(response.data.suggestions);

      // Auto-select high-confidence suggestions
      const autoSelect = new Set(selectedResources);
      response.data.suggestions.forEach((suggestion: ResourceSuggestion) => {
        if (suggestion.confidence >= 0.7) {
          autoSelect.add(suggestion.resource_id);
        }
      });
      setSelectedResources(autoSelect);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      // Don't show error for suggestions, it's optional
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleIntegrationSelect = (integrationName: string) => {
    setSelectedIntegration(integrationName);

    // Pre-select existing resources for this integration
    const existingResources = existingIntegrations[integrationName] || [];
    const existingResourceIds = new Set(existingResources.map((r: IntegrationResource) => r.id));
    setSelectedResources(existingResourceIds);

    fetchResources(integrationName);
  };

  const toggleResourceSelection = (resourceId: string) => {
    const newSelection = new Set(selectedResources);
    if (newSelection.has(resourceId)) {
      newSelection.delete(resourceId);
    } else {
      newSelection.add(resourceId);
    }
    setSelectedResources(newSelection);
  };

  const getSuggestionForResource = (resourceId: string): ResourceSuggestion | undefined => {
    return suggestions.find(s => s.resource_id === resourceId);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let dataToSave = resources.filter(r => selectedResources.has(r.id));

      // For Figma API, we need to fetch the actual files from the selected teams/users
      if (selectedIntegration === 'Figma API' && dataToSave.length > 0) {
        console.log('[WorkspaceIntegrations] Fetching Figma files from selected teams/users...');
        const config = availableIntegrations.find(i => i.name === 'Figma API')?.config;

        if (config?.fields?.access_token) {
          try {
            // Fetch files for each selected team/user
            const allFiles: any[] = [];
            for (const resource of dataToSave) {
              if (resource.type === 'user' || resource.type === 'team') {
                console.log(`[WorkspaceIntegrations] Fetching files for ${resource.name}...`);
                const response = await axios.post(`${INTEGRATION_URL}/fetch-team-files`, {
                  integration_name: 'Figma API',
                  team_id: resource.id,
                  credentials: { access_token: config.fields.access_token }
                });

                if (response.data && response.data.files) {
                  console.log(`[WorkspaceIntegrations] Found ${response.data.files.length} files for ${resource.name}`);
                  allFiles.push(...response.data.files);
                }
              }
            }

            // Replace teams/users with actual files
            if (allFiles.length > 0) {
              console.log(`[WorkspaceIntegrations] Total Figma files: ${allFiles.length}`);
              dataToSave = allFiles;
            } else {
              console.warn('[WorkspaceIntegrations] No Figma files found');
            }
          } catch (err) {
            console.error('[WorkspaceIntegrations] Failed to fetch Figma files:', err);
            // Continue with teams/users if file fetching fails
          }
        }
      }

      const workspaceIntegrations = JSON.parse(localStorage.getItem('workspace_integrations') || '{}');
      if (!workspaceIntegrations[workspace.id]) {
        workspaceIntegrations[workspace.id] = {};
      }
      workspaceIntegrations[workspace.id][selectedIntegration!] = dataToSave;
      localStorage.setItem('workspace_integrations', JSON.stringify(workspaceIntegrations));

      // If this workspace is in global_shared_workspaces, also update the shared integrations
      const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
      const isShared = globalSharedWorkspaces.some((w: Workspace) => w.id === workspace.id);

      if (isShared) {
        const sharedIntegrations = JSON.parse(localStorage.getItem('shared_workspace_integrations') || '{}');
        if (!sharedIntegrations[workspace.id]) {
          sharedIntegrations[workspace.id] = {};
        }
        sharedIntegrations[workspace.id][selectedIntegration!] = dataToSave;
        localStorage.setItem('shared_workspace_integrations', JSON.stringify(sharedIntegrations));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save integration configuration');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'var(--color-systemGreen)';
    if (confidence >= 0.6) return 'var(--color-systemOrange)';
    return 'var(--color-systemGray)';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 className="text-title2">Configure Integrations</h2>
            <p className="text-body text-secondary" style={{ marginTop: '4px' }}>
              {workspace.name}
            </p>
          </div>
          <button
            onClick={onClose}
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

        {saveSuccess && (
          <Alert type="success" style={{ marginBottom: '20px' }}>
            <strong>Success!</strong> Integration configuration saved. Closing...
          </Alert>
        )}

        {error && (
          <Alert type="error" style={{ marginBottom: '20px' }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* Integration Selection */}
        {!selectedIntegration && (
          <div>
            <h3 className="text-headline" style={{ marginBottom: '16px' }}>Select Integration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {AVAILABLE_INTEGRATIONS.map((integration) => {
                const config = getIntegrationConfig(integration.name);
                const isConfigured = !!config;
                const hasWorkspaceIntegration = !!existingIntegrations[integration.name];

                return (
                  <button
                    key={integration.name}
                    onClick={() => isConfigured && handleIntegrationSelect(integration.name)}
                    disabled={!isConfigured}
                    style={{
                      padding: '20px',
                      border: `2px solid ${hasWorkspaceIntegration ? 'var(--color-systemGreen)' : 'var(--color-grey-300)'}`,
                      borderRadius: '12px',
                      backgroundColor: isConfigured ? 'white' : 'var(--color-systemGray6)',
                      cursor: isConfigured ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: isConfigured ? 1 : 0.5,
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (isConfigured) {
                        e.currentTarget.style.borderColor = 'var(--color-systemBlue)';
                        e.currentTarget.style.backgroundColor = 'var(--color-systemBlue-light)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = hasWorkspaceIntegration ? 'var(--color-systemGreen)' : 'var(--color-grey-300)';
                      e.currentTarget.style.backgroundColor = isConfigured ? 'white' : 'var(--color-systemGray6)';
                    }}
                  >
                    {hasWorkspaceIntegration && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'var(--color-systemGreen)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px'
                      }}>
                        ✓
                      </div>
                    )}
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>{integration.icon}</div>
                    <div className="text-headline" style={{ marginBottom: '8px' }}>{integration.name}</div>
                    <div className="text-footnote text-secondary">
                      {hasWorkspaceIntegration
                        ? `${existingIntegrations[integration.name].length} resource${existingIntegrations[integration.name].length !== 1 ? 's' : ''} configured`
                        : isConfigured ? 'Click to configure' : 'Not configured'}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-footnote text-secondary" style={{ marginTop: '16px' }}>
              Configure integrations in the Integrations page before adding them to workspaces.
            </p>
          </div>
        )}

        {/* Resource Selection */}
        {selectedIntegration && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
                ← Back
              </Button>
              <h3 className="text-headline">{selectedIntegration} Resources</h3>
            </div>

            {loading && (
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
                <p className="text-body">Fetching available resources...</p>
              </div>
            )}

            {!loading && resources.length === 0 && !error && (
              <Alert type="info">
                No resources found for this integration. Make sure your credentials are correct.
              </Alert>
            )}

            {!loading && resources.length > 0 && (
              <div>
                {loadingSuggestions && (
                  <Alert type="info" style={{ marginBottom: '16px' }}>
                    Claude is analyzing resources to suggest the best matches...
                  </Alert>
                )}

                {suggestions.length > 0 && !loadingSuggestions && (
                  <Alert type="success" style={{ marginBottom: '16px' }}>
                    <strong>AI Suggestions:</strong> Claude has pre-selected {suggestions.filter(s => s.confidence >= 0.7).length} high-confidence resources for you.
                  </Alert>
                )}

                <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                  Select resources to integrate with this workspace:
                </p>

                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                  {resources.map((resource) => {
                    const suggestion = getSuggestionForResource(resource.id);
                    const isSelected = selectedResources.has(resource.id);

                    return (
                      <div
                        key={resource.id}
                        onClick={() => toggleResourceSelection(resource.id)}
                        style={{
                          padding: '16px',
                          border: `2px solid ${isSelected ? 'var(--color-systemBlue)' : 'var(--color-grey-300)'}`,
                          borderRadius: '8px',
                          marginBottom: '12px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-systemBlue-light)' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                              <h4 className="text-subheadline">{resource.name}</h4>
                              {suggestion && (
                                <span style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  backgroundColor: getConfidenceColor(suggestion.confidence),
                                  color: 'white'
                                }}>
                                  {getConfidenceLabel(suggestion.confidence)} Match
                                </span>
                              )}
                            </div>
                            {resource.description && (
                              <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                                {resource.description}
                              </p>
                            )}
                            {suggestion && (
                              <p className="text-footnote" style={{
                                color: 'var(--color-systemIndigo)',
                                fontStyle: 'italic',
                                marginTop: '8px'
                              }}>
                                💡 {suggestion.reason}
                              </p>
                            )}
                            {resource.url && (
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-footnote"
                                style={{ color: 'var(--color-systemBlue)', marginTop: '4px', display: 'inline-block' }}
                              >
                                View in {selectedIntegration} →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--color-grey-300)' }}>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving || saveSuccess || selectedResources.size === 0}
                    style={{ flex: 1 }}
                  >
                    {saving ? 'Saving...' : saveSuccess ? 'Saved!' : `Save ${selectedResources.size} Resource${selectedResources.size !== 1 ? 's' : ''}`}
                  </Button>
                  {/* Show Import button only for Jira when a project is selected */}
                  {selectedIntegration === 'Jira' && selectedResources.size === 1 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const selectedProject = resources.find(r => selectedResources.has(r.id));
                        if (selectedProject) {
                          setSelectedJiraProject(selectedProject);
                          setShowJiraImport(true);
                        }
                      }}
                      disabled={saving || saveSuccess}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Import Epics as Capabilities
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIntegration(null)}
                    disabled={saving || saveSuccess}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Jira Import Modal */}
        {showJiraImport && selectedJiraProject && (
          <JiraImportModal
            isOpen={showJiraImport}
            onClose={() => {
              setShowJiraImport(false);
              setSelectedJiraProject(null);
            }}
            projectKey={selectedJiraProject.metadata?.key as string || selectedJiraProject.id}
            projectName={selectedJiraProject.name}
            credentials={getIntegrationConfig('Jira')?.fields || {}}
            workspacePath={workspace.projectFolder || ''}
            onImportComplete={(count) => {
              console.log(`Imported ${count} capabilities from Jira`);
              // Optionally refresh capabilities list or show notification
            }}
          />
        )}
      </div>
    </div>
  );
};
