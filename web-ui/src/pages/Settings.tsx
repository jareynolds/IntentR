import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog, PageLayout } from '../components';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme, availableThemes, setTheme } = useTheme();
  const { user } = useAuth();
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [dataCleared, setDataCleared] = useState(false);
  const [workspaceDiagnostics, setWorkspaceDiagnostics] = useState<any>(null);
  const [ownershipFixed, setOwnershipFixed] = useState(false);
  const [allDataDeleted, setAllDataDeleted] = useState(false);
  const [integrationsCleared, setIntegrationsCleared] = useState(false);
  const [wizardModeEnabled, setWizardModeEnabled] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    // Load saved API key on mount
    const savedKey = localStorage.getItem('anthropic_api_key');
    if (savedKey) {
      setAnthropicApiKey(savedKey);
      setApiKeySaved(true);
    }

    // Load wizard mode preference
    const wizardMode = localStorage.getItem('wizard_mode_enabled');
    setWizardModeEnabled(wizardMode === 'true');
  }, []);

  const handleWizardModeToggle = () => {
    const newValue = !wizardModeEnabled;
    setWizardModeEnabled(newValue);
    localStorage.setItem('wizard_mode_enabled', String(newValue));
  };

  const handleSaveApiKey = () => {
    if (!anthropicApiKey.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }

    if (!anthropicApiKey.startsWith('sk-ant-')) {
      setApiKeyError('Invalid Anthropic API key format. Should start with "sk-ant-"');
      return;
    }

    localStorage.setItem('anthropic_api_key', anthropicApiKey);
    setApiKeySaved(true);
    setApiKeyError(null);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('anthropic_api_key');
    setAnthropicApiKey('');
    setApiKeySaved(false);
    setApiKeyError(null);
  };

  const runWorkspaceDiagnostics = () => {
    if (!user?.email) {
      setWorkspaceDiagnostics({ error: 'No user logged in' });
      return;
    }

    const userEmail = user.email;
    const workspaces = JSON.parse(localStorage.getItem(`workspaces_${userEmail}`) || '[]');
    const joinedWorkspaces = JSON.parse(localStorage.getItem(`joinedWorkspaces_${userEmail}`) || '[]');
    const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');

    // Find workspaces in joinedWorkspaces that are actually owned by this user
    const misplacedWorkspaces = joinedWorkspaces.filter((w: any) => w.ownerId === userEmail);

    setWorkspaceDiagnostics({
      userEmail,
      ownedWorkspaces: workspaces.length,
      joinedWorkspaces: joinedWorkspaces.length,
      globalSharedWorkspaces: globalSharedWorkspaces.length,
      misplacedWorkspaces: misplacedWorkspaces.length,
      misplacedDetails: misplacedWorkspaces.map((w: any) => ({
        id: w.id,
        name: w.name,
        ownerId: w.ownerId,
        isShared: w.isShared
      }))
    });
  };

  const fixWorkspaceOwnership = () => {
    if (!user?.email) {
      return;
    }

    const userEmail = user.email;
    const workspaces = JSON.parse(localStorage.getItem(`workspaces_${userEmail}`) || '[]');
    const joinedWorkspaces = JSON.parse(localStorage.getItem(`joinedWorkspaces_${userEmail}`) || '[]');

    // Find workspaces in joinedWorkspaces that are owned by this user
    const misplacedWorkspaces = joinedWorkspaces.filter((w: any) => w.ownerId === userEmail);
    const correctJoinedWorkspaces = joinedWorkspaces.filter((w: any) => w.ownerId !== userEmail);

    if (misplacedWorkspaces.length > 0) {
      // Move misplaced workspaces to owned workspaces
      const updatedWorkspaces = [...workspaces, ...misplacedWorkspaces];
      localStorage.setItem(`workspaces_${userEmail}`, JSON.stringify(updatedWorkspaces));

      // Update joined workspaces to only include non-owned ones
      localStorage.setItem(`joinedWorkspaces_${userEmail}`, JSON.stringify(correctJoinedWorkspaces));

      setOwnershipFixed(true);
      setTimeout(() => setOwnershipFixed(false), 5000);

      // Re-run diagnostics to show updated state
      runWorkspaceDiagnostics();

      // Refresh the page to reload workspaces
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const clearOldWorkspaceData = () => {
    // Remove all old global workspace keys
    localStorage.removeItem('workspaces');
    localStorage.removeItem('joinedWorkspaces');
    localStorage.removeItem('currentWorkspaceId');
    localStorage.removeItem('shared_workspaces');

    // Also remove any legacy workspace-related keys that might exist
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('workspace_') ||
        key.includes('workspace') && !key.includes('workspaces_') && !key.includes('joinedWorkspaces_') && !key.includes('currentWorkspaceId_')
      )) {
        // Keep the new user-specific keys and workspace_integrations
        if (!key.startsWith('workspaces_') &&
            !key.startsWith('joinedWorkspaces_') &&
            !key.startsWith('currentWorkspaceId_') &&
            key !== 'workspace_integrations' &&
            key !== 'shared_workspace_integrations' &&
            key !== 'global_shared_workspaces') {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    setDataCleared(true);
    setTimeout(() => {
      setDataCleared(false);
      window.location.reload();
    }, 2000);
  };

  const clearIntegrationData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Integration Data',
      message: 'This will clear all workspace integration data (Figma files, etc.). You will need to re-configure your integrations. Continue?',
      confirmLabel: 'Clear Data',
      confirmVariant: 'danger',
      onConfirm: () => {
        closeConfirmDialog();

        // Clear all integration-related keys
        localStorage.removeItem('workspace_integrations');
        localStorage.removeItem('shared_workspace_integrations');

        // Also clear individual integration configs if needed
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('workspace_figma_files_') ||
            key === 'workspace_design_files'
          )) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log('[Settings] Cleared integration data');
        setIntegrationsCleared(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
    });
  };

  const performDeleteAllWorkspaceData = () => {
    // Remove ALL workspace-related keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('workspaces_') ||
        key.startsWith('joinedWorkspaces_') ||
        key.startsWith('currentWorkspaceId_') ||
        key === 'workspaces' ||
        key === 'joinedWorkspaces' ||
        key === 'currentWorkspaceId' ||
        key === 'shared_workspaces' ||
        key === 'global_shared_workspaces' ||
        key === 'workspace_integrations' ||
        key === 'shared_workspace_integrations' ||
        key.startsWith('workspace_') ||
        key.includes('ideation') ||
        key.includes('storyboard') ||
        key.startsWith('integration_config_')
      )) {
        keysToRemove.push(key);
      }
    }

    console.log('[Settings] Deleting all workspace data. Keys to remove:', keysToRemove);
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setAllDataDeleted(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const showFinalDeleteConfirmation = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Final Warning',
      message: 'This is your final warning. All workspaces, ideation data, storyboards, and integrations will be permanently deleted. Continue?',
      confirmLabel: 'Delete Everything',
      confirmVariant: 'danger',
      onConfirm: () => {
        closeConfirmDialog();
        performDeleteAllWorkspaceData();
      },
    });
  };

  const deleteAllWorkspaceData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Workspace Data',
      message: 'WARNING: This will delete ALL workspace data for ALL users including workspaces, integrations, and shared workspaces. This action cannot be undone. Are you absolutely sure?',
      confirmLabel: 'Yes, Continue',
      confirmVariant: 'danger',
      onConfirm: () => {
        closeConfirmDialog();
        // Show the second confirmation
        setTimeout(() => showFinalDeleteConfirmation(), 100);
      },
    });
  };

  return (
    <PageLayout
      title="Settings"
      quickDescription="Manage your application preferences and design system."
      detailedDescription="Configure API keys for AI-powered features, manage your theme preferences, and adjust application settings. Your Anthropic API key is stored securely in your browser's local storage and is required for AI analysis features. You can also manage workspace data, clear integrations, and toggle wizard mode for guided workflows."
    >

      <div className="space-y-6">
        {/* API Keys Section */}
        <Card>
          <h3 className="mb-2">API Keys</h3>
          <p className="text-sm text-grey-600 mb-6">
            Configure API keys for AI-powered integration analysis and other features.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-2">
                Anthropic API Key
              </label>
              <p className="text-xs text-grey-500 mb-3">
                Used for AI-powered integration analysis. Get your API key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  console.anthropic.com
                </a>
              </p>

              {apiKeyError && (
                <Alert variant="error" className="mb-3">
                  {apiKeyError}
                </Alert>
              )}

              {apiKeySaved && !apiKeyError && (
                <Alert variant="success" className="mb-3">
                  API key saved successfully!
                </Alert>
              )}

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={anthropicApiKey}
                    onChange={(e) => {
                      setAnthropicApiKey(e.target.value);
                      setApiKeySaved(false);
                      setApiKeyError(null);
                    }}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2 border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-500 hover:text-grey-700"
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <Button onClick={handleSaveApiKey} variant="primary">
                  Save
                </Button>
                {anthropicApiKey && (
                  <Button onClick={handleClearApiKey} variant="outline">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                  Security Notice
                </h4>
                <p className="text-sm text-yellow-700">
                  Your API key is stored locally in your browser and is only used to make requests to integration providers on your behalf.
                  Never share your API key with others.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation Mode */}
        <Card>
          <h3 className="mb-2">Navigation Mode</h3>
          <p className="text-sm text-grey-600 mb-6">
            Choose how you navigate through IntentR's development workflow.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-grey-50 border border-grey-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${wizardModeEnabled ? 'bg-blue-100' : 'bg-grey-200'}`}>
                    <svg
                      className={`w-6 h-6 ${wizardModeEnabled ? 'text-blue-600' : 'text-grey-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-grey-900">Wizard Mode</h4>
                    <p className="text-xs text-grey-600 mt-0.5">
                      Step-by-step guided navigation through the INTENT development workflow
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleWizardModeToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  wizardModeEnabled ? 'bg-blue-600' : 'bg-grey-300'
                }`}
                role="switch"
                aria-checked={wizardModeEnabled}
                aria-label="Toggle wizard mode"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    wizardModeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    About Navigation Modes
                  </h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>
                      <strong>Sidebar Navigation (Default):</strong> Access any page directly using the left sidebar. Best for experienced users who want quick, ad-hoc access.
                    </p>
                    <p>
                      <strong>Wizard Mode:</strong> A guided step-by-step experience with progress tracking. Ideal for new users or when following the complete INTENT workflow from Intent Declaration to Continuous Validation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {wizardModeEnabled && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-green-700">
                      Wizard Mode is enabled. Start the guided workflow now.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/wizard/workspace')}
                  >
                    Start Wizard
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Developer Tools */}
        <Card>
          <h3 className="mb-2">Developer Tools</h3>
          <p className="text-sm text-grey-600 mb-6">
            Utilities for debugging and managing application data.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Clear Old Workspace Data
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    If you're experiencing issues with workspaces appearing for the wrong user, click this button to clear old localStorage data. This will remove the old global workspace keys and force a clean migration on next login.
                  </p>
                  <p className="text-xs text-red-600 mb-3">
                    <strong>Warning:</strong> This will NOT delete your workspaces, but you may need to log out and log back in for changes to take effect.
                  </p>
                  {dataCleared && (
                    <Alert type="success" style={{ marginBottom: '12px' }}>
                      Old data cleared! Page will reload...
                    </Alert>
                  )}
                  <Button
                    variant="outline"
                    onClick={clearOldWorkspaceData}
                    style={{
                      borderColor: 'var(--color-red-500)',
                      color: 'var(--color-red-700)'
                    }}
                  >
                    Clear Old Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Clear Integration Data */}
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                    Clear Integration Data
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    If you're seeing errors with Figma files or other integrations showing as "user" or "team" instead of actual files, click this button to clear all integration data. You'll need to re-configure your integrations afterward.
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    <strong>What this clears:</strong> workspace_integrations, shared_workspace_integrations, and legacy Figma file storage.
                  </p>
                  {integrationsCleared && (
                    <Alert type="success" style={{ marginBottom: '12px' }}>
                      Integration data cleared! Page will reload...
                    </Alert>
                  )}
                  <Button
                    variant="outline"
                    onClick={clearIntegrationData}
                    style={{
                      borderColor: 'var(--color-yellow-600)',
                      color: 'var(--color-yellow-800)',
                      backgroundColor: 'var(--color-yellow-100)'
                    }}
                  >
                    Clear Integration Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete All Workspace Data (Admin Only) */}
            {user?.role === 'admin' && (
              <div className="p-4 bg-red-100 border-2 border-red-400 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <svg
                    className="w-6 h-6 text-red-700 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-900 mb-1 flex items-center gap-2">
                      Delete All Workspace Data
                      <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">ADMIN ONLY</span>
                    </h4>
                    <p className="text-sm text-red-800 mb-2">
                      <strong>⚠️ DANGER ZONE:</strong> This will permanently delete ALL workspace data for ALL users including:
                    </p>
                    <ul className="text-xs text-red-800 mb-3 ml-4 list-disc">
                      <li>All workspaces (owned and joined) for all users</li>
                      <li>All ideation boards and cards</li>
                      <li>All storyboards and content</li>
                      <li>All integration configurations (Figma, GitHub, etc.)</li>
                      <li>All shared workspace data</li>
                      <li>All workspace-related localStorage data</li>
                    </ul>
                    <p className="text-xs font-bold text-red-900 mb-3">
                      ⚠️ THIS ACTION CANNOT BE UNDONE ⚠️
                    </p>
                    {allDataDeleted && (
                      <Alert type="success" style={{ marginBottom: '12px' }}>
                        All workspace data deleted! Page will reload...
                      </Alert>
                    )}
                    <Button
                      variant="outline"
                      onClick={deleteAllWorkspaceData}
                      style={{
                        borderColor: 'var(--color-red-700)',
                        backgroundColor: 'var(--color-red-600)',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      🗑️ Delete All Workspace Data
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Ownership Diagnostics */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Workspace Ownership Diagnostics
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    If your own workspace appears as a "shared workspace" without edit buttons, this tool can diagnose and fix the issue. Click "Run Diagnostics" to check for misplaced workspaces.
                  </p>

                  {ownershipFixed && (
                    <Alert type="success" style={{ marginBottom: '12px' }}>
                      Workspace ownership fixed! Page will reload...
                    </Alert>
                  )}

                  {workspaceDiagnostics && (
                    <div className="mb-3 p-3 bg-white border border-blue-300 rounded text-xs">
                      <h5 className="font-semibold mb-2">Diagnostics Report:</h5>
                      {workspaceDiagnostics.error ? (
                        <p className="text-red-600">{workspaceDiagnostics.error}</p>
                      ) : (
                        <>
                          <p><strong>User:</strong> {workspaceDiagnostics.userEmail}</p>
                          <p><strong>Owned Workspaces:</strong> {workspaceDiagnostics.ownedWorkspaces}</p>
                          <p><strong>Joined Workspaces:</strong> {workspaceDiagnostics.joinedWorkspaces}</p>
                          <p><strong>Global Shared Workspaces:</strong> {workspaceDiagnostics.globalSharedWorkspaces}</p>
                          <p className={workspaceDiagnostics.misplacedWorkspaces > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                            <strong>Misplaced Workspaces:</strong> {workspaceDiagnostics.misplacedWorkspaces}
                          </p>
                          {workspaceDiagnostics.misplacedDetails && workspaceDiagnostics.misplacedDetails.length > 0 && (
                            <div className="mt-2">
                              <p className="font-semibold">Misplaced Workspaces Found:</p>
                              <ul className="list-disc ml-4 mt-1">
                                {workspaceDiagnostics.misplacedDetails.map((w: any) => (
                                  <li key={w.id}>
                                    <strong>{w.name}</strong> (Owner: {w.ownerId}, Shared: {w.isShared ? 'Yes' : 'No'})
                                  </li>
                                ))}
                              </ul>
                              <p className="mt-2 text-red-600">
                                These workspaces are owned by you but appear in "Joined Workspaces" instead of "My Workspaces".
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={runWorkspaceDiagnostics}
                      style={{
                        borderColor: 'var(--color-blue-500)',
                        color: 'var(--color-blue-700)'
                      }}
                    >
                      Run Diagnostics
                    </Button>

                    {workspaceDiagnostics && workspaceDiagnostics.misplacedWorkspaces > 0 && (
                      <Button
                        variant="primary"
                        onClick={fixWorkspaceOwnership}
                        style={{
                          backgroundColor: 'var(--color-blue-600)',
                          color: 'white'
                        }}
                      >
                        Fix Ownership ({workspaceDiagnostics.misplacedWorkspaces} workspace{workspaceDiagnostics.misplacedWorkspaces !== 1 ? 's' : ''})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </PageLayout>
  );
};
