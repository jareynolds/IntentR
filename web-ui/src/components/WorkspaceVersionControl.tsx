import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Alert } from './Alert';

interface WorkspaceVersionControlProps {
  workspace: {
    id: string;
    name: string;
    projectFolder?: string;
  };
  onClose: () => void;
}

interface GitConfig {
  initialized: boolean;
  userName?: string;
  userEmail?: string;
  remoteUrl?: string;
  remoteName?: string;
  currentBranch?: string;
}

const SPEC_API_URL = 'http://localhost:4001';

export const WorkspaceVersionControl: React.FC<WorkspaceVersionControlProps> = ({
  workspace,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gitConfig, setGitConfig] = useState<GitConfig>({
    initialized: false,
  });

  // Form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [createNewRepo, setCreateNewRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);

  // Check if GitHub is configured in integrations
  const [githubConfigured, setGithubConfigured] = useState(false);

  useEffect(() => {
    checkGitStatus();
    checkGitHubIntegration();
  }, [workspace.projectFolder]);

  // Helper to get GitHub token from config (field name varies based on AI analysis)
  const getGitHubToken = (): string | null => {
    const config = localStorage.getItem('integration_config_github');
    if (!config) return null;

    try {
      const parsed = JSON.parse(config);
      if (!parsed.fields) return null;

      // Look for token in common field names
      const tokenFieldNames = [
        'personal_access_token',
        'Personal Access Token',
        'token',
        'Token',
        'access_token',
        'Access Token',
        'api_key',
        'API Key',
        'apiKey',
        'pat',
        'PAT',
      ];

      for (const fieldName of tokenFieldNames) {
        if (parsed.fields[fieldName] && typeof parsed.fields[fieldName] === 'string') {
          return parsed.fields[fieldName];
        }
      }

      // If no common name found, return the first non-empty string field
      const values = Object.values(parsed.fields);
      const tokenValue = values.find(
        (value): value is string => typeof value === 'string' && value.length > 0
      );
      return tokenValue || null;
    } catch {
      return null;
    }
  };

  const checkGitHubIntegration = () => {
    const token = getGitHubToken();
    setGithubConfigured(!!token);
  };

  const checkGitStatus = async () => {
    if (!workspace.projectFolder) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${SPEC_API_URL}/git/config?workspace=${encodeURIComponent(workspace.projectFolder)}`
      );

      if (response.ok) {
        const data = await response.json();
        setGitConfig(data);
        setUserName(data.userName || '');
        setUserEmail(data.userEmail || '');
        setRemoteUrl(data.remoteUrl || '');
      } else {
        // Git not initialized or error
        setGitConfig({ initialized: false });
      }
    } catch (err) {
      // API might not exist yet, check if folder exists
      setGitConfig({ initialized: false });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
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
          userName: userName || undefined,
          userEmail: userEmail || undefined,
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

  const handleSaveConfig = async () => {
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
          userName,
          userEmail,
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

  const handleCreateRepo = async () => {
    if (!workspace.projectFolder || !newRepoName) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get GitHub token from integrations
      const token = getGitHubToken();

      if (!token) {
        throw new Error('GitHub token not found. Please configure GitHub in the Admin Panel > Integrations.');
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

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-systemBackground)',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '560px',
          width: '100%',
          margin: '16px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-blue-100, #dbeafe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-blue-600, #2563eb)"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v6m0 6v6" />
            </svg>
          </div>
          <div>
            <h3 className="text-title1" style={{ margin: 0 }}>Version Control</h3>
            <p className="text-caption1 text-secondary" style={{ margin: 0 }}>
              {workspace.name}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert type="error" style={{ marginBottom: '16px' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert type="success" style={{ marginBottom: '16px' }}>
            {success}
          </Alert>
        )}

        {/* No folder set */}
        {!workspace.projectFolder && (
          <div
            style={{
              padding: '24px',
              backgroundColor: 'var(--color-yellow-50, #fefce8)',
              border: '1px solid var(--color-yellow-200, #fef08a)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <p style={{ margin: 0, color: 'var(--color-yellow-800, #854d0e)' }}>
              <strong>No project folder set.</strong> Please set a project folder for this workspace
              before configuring version control.
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-secondary">Checking git status...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Section */}
            <div
              style={{
                padding: '16px',
                backgroundColor: gitConfig.initialized
                  ? 'var(--color-green-50, #f0fdf4)'
                  : 'var(--color-grey-50, #f9fafb)',
                border: `1px solid ${
                  gitConfig.initialized
                    ? 'var(--color-green-200, #bbf7d0)'
                    : 'var(--color-grey-200, #e5e7eb)'
                }`,
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: gitConfig.initialized
                      ? 'var(--color-green-500, #22c55e)'
                      : 'var(--color-grey-300, #d1d5db)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {gitConfig.initialized ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
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

                <div className="space-y-4">
                  <div>
                    <label className="label block mb-2">Git User Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your Name"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label block mb-2">Git User Email</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="input w-full"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleInitialize}
                  disabled={saving || !workspace.projectFolder}
                  style={{ marginTop: '16px' }}
                >
                  {saving ? 'Initializing...' : 'Initialize Repository'}
                </Button>
              </div>
            )}

            {/* Git Config Section (when initialized) */}
            {gitConfig.initialized && (
              <>
                <div>
                  <h4 className="text-headline" style={{ marginBottom: '12px' }}>
                    Git Configuration
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="label block mb-2">Git User Name</label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your Name"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="label block mb-2">Git User Email</label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleSaveConfig}
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

                  {!githubConfigured && (
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
                            To create repositories or push changes to GitHub, you need to configure your GitHub credentials first.
                          </p>
                          <a
                            href="/integrations"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              backgroundColor: 'var(--color-yellow-600, #ca8a04)',
                              color: 'white',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '14px',
                              fontWeight: 500,
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            Configure GitHub in Integrations
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {gitConfig.remoteUrl ? (
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--color-green-50, #f0fdf4)',
                        border: '1px solid var(--color-green-200, #bbf7d0)',
                        borderRadius: '8px',
                      }}
                    >
                      <p style={{ margin: 0, marginBottom: '8px', fontWeight: 500 }}>
                        Connected to GitHub
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
                  ) : (
                    <div className="space-y-4">
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
                          disabled={!githubConfigured}
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: `2px solid ${createNewRepo ? 'var(--color-blue-500)' : 'var(--color-grey-200)'}`,
                            borderRadius: '8px',
                            backgroundColor: createNewRepo ? 'var(--color-blue-50)' : 'white',
                            cursor: githubConfigured ? 'pointer' : 'not-allowed',
                            opacity: githubConfigured ? 1 : 0.5,
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
                          <label className="label block mb-2">Repository URL</label>
                          <input
                            type="url"
                            value={remoteUrl}
                            onChange={(e) => setRemoteUrl(e.target.value)}
                            placeholder="https://github.com/username/repo.git"
                            className="input w-full"
                          />
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
                        <div className="space-y-4">
                          <div>
                            <label className="label block mb-2">Repository Name</label>
                            <input
                              type="text"
                              value={newRepoName}
                              onChange={(e) => setNewRepoName(e.target.value)}
                              placeholder="my-project"
                              className="input w-full"
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
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-grey-200)' }}>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <style>{`
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--color-grey-200);
          border-top-color: var(--color-blue-500);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WorkspaceVersionControl;
