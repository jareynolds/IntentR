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

interface GitConfig {
  initialized: boolean;
  userName?: string;
  userEmail?: string;
  remoteUrl?: string;
  remoteName?: string;
  currentBranch?: string;
}

interface WorkspaceIntegrationsProps {
  workspace: Workspace;
  onClose: () => void;
}

const SPEC_API_URL = 'http://localhost:4001';

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

  // GitHub/Git specific state
  const [gitConfig, setGitConfig] = useState<GitConfig>({ initialized: false });
  const [gitLoading, setGitLoading] = useState(false);
  const [gitUserName, setGitUserName] = useState('');
  const [gitUserEmail, setGitUserEmail] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [createNewRepo, setCreateNewRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<Array<{ id: number; name: string; full_name: string; html_url: string; clone_url: string; private: boolean; description: string | null }>>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

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

  // GitHub token helper - looks for token in various field names
  const getGitHubToken = (): string | null => {
    const config = localStorage.getItem('integration_config_github');
    if (!config) return null;

    try {
      const parsed = JSON.parse(config);
      if (!parsed.fields) return null;

      const tokenFieldNames = [
        'personal_access_token', 'Personal Access Token', 'token', 'Token',
        'access_token', 'Access Token', 'api_key', 'API Key', 'apiKey', 'pat', 'PAT',
      ];

      for (const fieldName of tokenFieldNames) {
        if (parsed.fields[fieldName] && typeof parsed.fields[fieldName] === 'string') {
          return parsed.fields[fieldName];
        }
      }

      const values = Object.values(parsed.fields);
      const tokenValue = values.find(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      return tokenValue || null;
    } catch {
      return null;
    }
  };

  // Check git status for the workspace
  const checkGitStatus = async () => {
    if (!workspace.projectFolder) {
      setGitLoading(false);
      return;
    }

    setGitLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${SPEC_API_URL}/git/config?workspace=${encodeURIComponent(workspace.projectFolder)}`
      );

      if (response.ok) {
        const data = await response.json();
        setGitConfig(data);
        setGitUserName(data.userName || '');
        setGitUserEmail(data.userEmail || '');
        setRemoteUrl(data.remoteUrl || '');
      } else {
        setGitConfig({ initialized: false });
      }
    } catch (err) {
      setGitConfig({ initialized: false });
    } finally {
      setGitLoading(false);
    }
  };

  // Initialize git repository
  const handleInitializeGit = async () => {
    if (!workspace.projectFolder) {
      setError('Workspace folder not set. Please set a project folder first.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${SPEC_API_URL}/git/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspace.projectFolder,
          userName: gitUserName || undefined,
          userEmail: gitUserEmail || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize repository');
      }

      setSuccess('Git repository initialized successfully!');
      await checkGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize repository');
    } finally {
      setSaving(false);
    }
  };

  // Save git config
  const handleSaveGitConfig = async () => {
    if (!workspace.projectFolder) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${SPEC_API_URL}/git/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspace.projectFolder,
          userName: gitUserName,
          userEmail: gitUserEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess('Git configuration saved!');
      await checkGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Connect to existing remote
  const handleConnectRemote = async () => {
    if (!workspace.projectFolder || !remoteUrl) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${SPEC_API_URL}/git/remote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspace.projectFolder,
          url: remoteUrl,
          name: 'origin',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect remote');
      }

      setSuccess('GitHub repository connected!');
      await checkGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect remote');
    } finally {
      setSaving(false);
    }
  };

  // Create new GitHub repository
  const handleCreateRepo = async () => {
    if (!workspace.projectFolder || !newRepoName) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getGitHubToken();

      if (!token) {
        throw new Error('GitHub token not found. Please configure GitHub in the Integrations page first.');
      }

      const response = await fetch(`${SPEC_API_URL}/git/create-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspace.projectFolder,
          name: newRepoName,
          private: newRepoPrivate,
          token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create repository');
      }

      const data = await response.json();
      setRemoteUrl(data.url);
      setSuccess(`Repository created: ${data.url}`);
      setCreateNewRepo(false);
      await checkGitStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create repository');
    } finally {
      setSaving(false);
    }
  };

  // Fetch user's GitHub repositories
  const fetchGitHubRepos = async () => {
    const token = getGitHubToken();
    if (!token) {
      setError('GitHub token not found. Please configure GitHub in the Integrations page first.');
      return;
    }

    setLoadingRepos(true);
    setError(null);

    try {
      // Fetch repos directly from GitHub API
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('GitHub token is invalid or expired. Please update your GitHub configuration.');
        }
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const repos = await response.json();
      setGithubRepos(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GitHub repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Select a repo from the list to connect
  const handleSelectRepo = (repo: { clone_url: string; full_name: string }) => {
    setRemoteUrl(repo.clone_url);
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
    setError(null);
    setSuccess(null);

    // For GitHub, load git status and fetch repos
    if (integrationName === 'GitHub') {
      checkGitStatus();
      fetchGitHubRepos();
      return;
    }

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
        const config = getIntegrationConfig('Figma API');

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

        {success && (
          <Alert type="success" style={{ marginBottom: '20px' }}>
            {success}
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

            {/* GitHub Version Control UI */}
            {selectedIntegration === 'GitHub' && (
              <div>
                {gitLoading && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{
                      width: '50px',
                      height: '50px',
                      border: '4px solid var(--color-grey-200)',
                      borderTop: '4px solid var(--color-blue-500)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <p className="text-body">Checking repository status...</p>
                  </div>
                )}

                {!gitLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Status Section */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: gitConfig.initialized ? 'var(--color-green-50, #f0fdf4)' : 'var(--color-grey-50)',
                      border: `1px solid ${gitConfig.initialized ? 'var(--color-green-200, #bbf7d0)' : 'var(--color-grey-200)'}`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: gitConfig.initialized ? 'var(--color-green-100, #dcfce7)' : 'var(--color-grey-100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {gitConfig.initialized ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-green-600, #16a34a)">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-grey-400)">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          {gitConfig.initialized ? 'Repository Initialized' : 'Not Initialized'}
                        </p>
                        {gitConfig.currentBranch && (
                          <p className="text-caption1 text-secondary" style={{ margin: 0 }}>
                            Branch: <code>{gitConfig.currentBranch}</code>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Initialize Section */}
                    {!gitConfig.initialized && workspace.projectFolder && (
                      <div>
                        <h4 className="text-headline" style={{ marginBottom: '12px' }}>
                          Initialize Repository
                        </h4>
                        <p className="text-footnote text-secondary" style={{ marginBottom: '16px' }}>
                          Initialize a new Git repository in your workspace folder.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Git User Name</label>
                            <input
                              type="text"
                              value={gitUserName}
                              onChange={(e) => setGitUserName(e.target.value)}
                              placeholder="Your Name"
                              className="input"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <div>
                            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Git User Email</label>
                            <input
                              type="email"
                              value={gitUserEmail}
                              onChange={(e) => setGitUserEmail(e.target.value)}
                              placeholder="your.email@example.com"
                              className="input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          onClick={handleInitializeGit}
                          disabled={saving || !workspace.projectFolder}
                          style={{ marginTop: '16px' }}
                        >
                          {saving ? 'Initializing...' : 'Initialize Repository'}
                        </Button>
                      </div>
                    )}

                    {/* No Project Folder Warning */}
                    {!workspace.projectFolder && (
                      <Alert type="warning">
                        <strong>Project Folder Required</strong>
                        <p style={{ margin: '8px 0 0 0' }}>
                          Please set a project folder for this workspace before configuring version control.
                        </p>
                      </Alert>
                    )}

                    {/* Git Config Section (when initialized) */}
                    {gitConfig.initialized && (
                      <>
                        <div>
                          <h4 className="text-headline" style={{ marginBottom: '12px' }}>
                            Git Configuration
                          </h4>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Git User Name</label>
                              <input
                                type="text"
                                value={gitUserName}
                                onChange={(e) => setGitUserName(e.target.value)}
                                placeholder="Your Name"
                                className="input"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div>
                              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Git User Email</label>
                              <input
                                type="email"
                                value={gitUserEmail}
                                onChange={(e) => setGitUserEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                className="input"
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            onClick={handleSaveGitConfig}
                            disabled={saving}
                            style={{ marginTop: '12px' }}
                          >
                            {saving ? 'Saving...' : 'Save Configuration'}
                          </Button>
                        </div>

                        {/* GitHub Connection Section */}
                        <div>
                          <h4 className="text-headline" style={{ marginBottom: '12px' }}>
                            GitHub Repository
                          </h4>

                          {!getGitHubToken() && (
                            <div
                              style={{
                                padding: '20px',
                                backgroundColor: 'var(--color-yellow-50, #fefce8)',
                                border: '1px solid var(--color-yellow-200, #fef08a)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--color-yellow-100, #fef9c3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-yellow-600, #ca8a04)">
                                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                                  </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, marginBottom: '8px', fontWeight: 600, color: 'var(--color-yellow-900, #713f12)' }}>
                                    GitHub Connection Required
                                  </p>
                                  <p style={{ margin: 0, marginBottom: '12px', color: 'var(--color-yellow-800, #854d0e)', fontSize: '14px' }}>
                                    To create repositories or push changes to GitHub, you need to configure your GitHub credentials first. Go to the main Integrations page and configure GitHub with your Personal Access Token.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Current Connection Status */}
                          {gitConfig.remoteUrl && (
                            <div
                              style={{
                                padding: '16px',
                                backgroundColor: 'var(--color-green-50, #f0fdf4)',
                                border: '1px solid var(--color-green-200, #bbf7d0)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                              }}
                            >
                              <p style={{ margin: 0, marginBottom: '8px', fontWeight: 500 }}>
                                Currently Connected
                              </p>
                              <code
                                style={{
                                  fontSize: '13px',
                                  backgroundColor: 'rgba(0,0,0,0.05)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {gitConfig.remoteUrl}
                              </code>
                            </div>
                          )}

                          {/* Repository Options */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* Toggle between link existing and create new */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setCreateNewRepo(false)}
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: `2px solid ${!createNewRepo ? 'var(--color-blue-500)' : 'var(--color-grey-200)'}`,
                                    borderRadius: '8px',
                                    backgroundColor: !createNewRepo ? 'var(--color-blue-50)' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <p style={{ margin: 0, fontWeight: 500 }}>Link Existing</p>
                                  <p className="text-caption1 text-secondary" style={{ margin: 0 }}>
                                    Connect to an existing repo
                                  </p>
                                </button>
                                <button
                                  onClick={() => setCreateNewRepo(true)}
                                  disabled={!getGitHubToken()}
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: `2px solid ${createNewRepo ? 'var(--color-blue-500)' : 'var(--color-grey-200)'}`,
                                    borderRadius: '8px',
                                    backgroundColor: createNewRepo ? 'var(--color-blue-50)' : 'white',
                                    cursor: getGitHubToken() ? 'pointer' : 'not-allowed',
                                    opacity: getGitHubToken() ? 1 : 0.5,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  <p style={{ margin: 0, fontWeight: 500 }}>Create New</p>
                                  <p className="text-caption1 text-secondary" style={{ margin: 0 }}>
                                    Create a new GitHub repo
                                  </p>
                                </button>
                              </div>

                              {!createNewRepo ? (
                                <div>
                                  {/* Available Repos List */}
                                  {loadingRepos ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                      <div style={{
                                        width: '30px',
                                        height: '30px',
                                        border: '3px solid var(--color-grey-200)',
                                        borderTop: '3px solid var(--color-blue-500)',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        margin: '0 auto 12px'
                                      }} />
                                      <p className="text-footnote text-secondary">Loading your repositories...</p>
                                    </div>
                                  ) : githubRepos.length > 0 ? (
                                    <div style={{ marginBottom: '16px' }}>
                                      <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                                        Your Repositories ({githubRepos.length})
                                      </label>
                                      <div style={{
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--color-grey-200)',
                                        borderRadius: '8px',
                                      }}>
                                        {githubRepos.map((repo) => (
                                          <div
                                            key={repo.id}
                                            onClick={() => handleSelectRepo(repo)}
                                            style={{
                                              padding: '12px',
                                              borderBottom: '1px solid var(--color-grey-100)',
                                              cursor: 'pointer',
                                              backgroundColor: remoteUrl === repo.clone_url ? 'var(--color-blue-50)' : 'white',
                                              transition: 'background-color 0.15s',
                                            }}
                                            onMouseEnter={(e) => {
                                              if (remoteUrl !== repo.clone_url) {
                                                e.currentTarget.style.backgroundColor = 'var(--color-grey-50)';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (remoteUrl !== repo.clone_url) {
                                                e.currentTarget.style.backgroundColor = 'white';
                                              }
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontSize: '16px' }}>{repo.private ? '🔒' : '🌐'}</span>
                                              <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>
                                                  {repo.full_name}
                                                </p>
                                                {repo.description && (
                                                  <p className="text-caption1 text-secondary" style={{ margin: '2px 0 0 0' }}>
                                                    {repo.description.length > 60 ? repo.description.substring(0, 60) + '...' : repo.description}
                                                  </p>
                                                )}
                                              </div>
                                              {remoteUrl === repo.clone_url && (
                                                <span style={{ color: 'var(--color-blue-500)', fontSize: '18px' }}>✓</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <Button
                                        variant="outline"
                                        onClick={fetchGitHubRepos}
                                        style={{ marginTop: '8px', fontSize: '13px' }}
                                      >
                                        🔄 Refresh List
                                      </Button>
                                    </div>
                                  ) : (
                                    <div style={{ marginBottom: '16px' }}>
                                      <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                                        No repositories found or unable to fetch. You can enter a URL manually below.
                                      </p>
                                      <Button
                                        variant="outline"
                                        onClick={fetchGitHubRepos}
                                        style={{ fontSize: '13px' }}
                                      >
                                        🔄 Try Again
                                      </Button>
                                    </div>
                                  )}

                                  {/* Manual URL input */}
                                  <div style={{ marginTop: githubRepos.length > 0 ? '16px' : '0', paddingTop: githubRepos.length > 0 ? '16px' : '0', borderTop: githubRepos.length > 0 ? '1px solid var(--color-grey-200)' : 'none' }}>
                                    <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                                      {githubRepos.length > 0 ? 'Or enter repository URL manually' : 'Repository URL'}
                                    </label>
                                    <input
                                      type="url"
                                      value={remoteUrl}
                                      onChange={(e) => setRemoteUrl(e.target.value)}
                                      placeholder="https://github.com/username/repo.git"
                                      className="input"
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <Button
                                    variant="primary"
                                    onClick={handleConnectRemote}
                                    disabled={saving || !remoteUrl}
                                    style={{ marginTop: '12px' }}
                                  >
                                    {saving ? 'Connecting...' : 'Connect Repository'}
                                  </Button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <div>
                                    <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Repository Name</label>
                                    <input
                                      type="text"
                                      value={newRepoName}
                                      onChange={(e) => setNewRepoName(e.target.value)}
                                      placeholder="my-project"
                                      className="input"
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={newRepoPrivate}
                                        onChange={(e) => setNewRepoPrivate(e.target.checked)}
                                      />
                                      <span>Private repository</span>
                                    </label>
                                  </div>
                                  <Button
                                    variant="primary"
                                    onClick={handleCreateRepo}
                                    disabled={saving || !newRepoName}
                                  >
                                    {saving ? 'Creating...' : 'Create Repository'}
                                  </Button>
                                </div>
                              )}
                            </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resource Selection for Figma/Jira */}
            {selectedIntegration !== 'GitHub' && loading && (
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

            {selectedIntegration !== 'GitHub' && !loading && resources.length === 0 && !error && (
              <Alert type="info">
                No resources found for this integration. Make sure your credentials are correct.
              </Alert>
            )}

            {selectedIntegration !== 'GitHub' && !loading && resources.length > 0 && (
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

        {/* Spinner animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
