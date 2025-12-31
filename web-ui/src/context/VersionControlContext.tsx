import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { SPEC_URL } from '../api/client';

// Types
export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  relativeDate: string;
}

export interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  hunks: Array<{
    header: string;
    lines: string[];
  }>;
}

export interface VersionControlState {
  // Status
  isLoading: boolean;
  error: string | null;
  status: GitStatus | null;
  isGitInitialized: boolean;

  // Team mode
  teamModeEnabled: boolean;
  currentBranch: string;
  mainBranch: string;

  // History
  commits: GitCommit[];
  selectedCommit: GitCommit | null;

  // Diff
  pendingChanges: GitDiff[];

  // UI state
  isHistoryOpen: boolean;
  isPanelOpen: boolean;
}

export interface VersionControlActions {
  // Core operations
  refreshStatus: () => Promise<void>;
  saveVersion: (message: string) => Promise<boolean>;
  viewHistory: (filePath?: string) => Promise<void>;
  viewCommit: (hash: string) => Promise<void>;
  revertToCommit: (hash: string) => Promise<boolean>;

  // Team mode operations
  enableTeamMode: () => Promise<void>;
  disableTeamMode: () => Promise<void>;
  createBranch: (name: string) => Promise<boolean>;
  switchBranch: (name: string) => Promise<boolean>;
  syncChanges: () => Promise<boolean>;
  submitForReview: (title: string, description: string) => Promise<string | null>;

  // UI actions
  openHistory: () => void;
  closeHistory: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearError: () => void;
}

interface VersionControlContextValue {
  state: VersionControlState;
  actions: VersionControlActions;
}

const VersionControlContext = createContext<VersionControlContextValue | null>(null);

// API base URL - uses proxy in production, direct URL in development
const SPEC_API_URL = SPEC_URL;

interface VersionControlProviderProps {
  children: ReactNode;
}

export const VersionControlProvider: React.FC<VersionControlProviderProps> = ({ children }) => {
  const { currentWorkspace } = useWorkspace();

  // Get the workspace path for git operations
  const workspacePath = currentWorkspace?.projectFolder || null;

  const [state, setState] = useState<VersionControlState>({
    isLoading: false,
    error: null,
    status: null,
    isGitInitialized: false,
    teamModeEnabled: false,
    currentBranch: 'main',
    mainBranch: 'main',
    commits: [],
    selectedCommit: null,
    pendingChanges: [],
    isHistoryOpen: false,
    isPanelOpen: false,
  });

  // Load team mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('version_control_team_mode');
    if (saved) {
      setState(prev => ({ ...prev, teamModeEnabled: JSON.parse(saved) }));
    }
  }, []);

  // Refresh status when workspace changes
  useEffect(() => {
    if (workspacePath) {
      refreshStatus();
    }
  }, [workspacePath]);

  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  };

  const refreshStatus = useCallback(async () => {
    if (!workspacePath) return;

    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/status?workspace=${encodeURIComponent(workspacePath)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Check if this is a "not a git repository" error
        if (response.status === 400 && errorData.error?.includes('not a git repository')) {
          setState(prev => ({
            ...prev,
            isGitInitialized: false,
            status: null,
            isLoading: false,
            error: null,
          }));
          return;
        }
        throw new Error('Failed to fetch git status');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        isGitInitialized: true,
        status: data.status,
        currentBranch: data.status?.branch || 'main',
        pendingChanges: data.changes || [],
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      // If API doesn't exist yet or error occurred, mark as not initialized
      console.warn('Git status check failed:', err);
      setState(prev => ({
        ...prev,
        isGitInitialized: false,
        status: null,
        isLoading: false,
        error: null, // Don't show error when git is simply not initialized
      }));
    }
  }, [workspacePath]);

  // Helper to get GitHub token from localStorage
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

  // Helper to get Anthropic API key from localStorage
  const getAnthropicApiKey = (): string | null => {
    // First check the Settings page location (primary location)
    const settingsKey = localStorage.getItem('anthropic_api_key');
    if (settingsKey && settingsKey.trim()) {
      return settingsKey;
    }

    // Then check the Integrations config format
    const config = localStorage.getItem('integration_config_anthropic');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        if (parsed.fields) {
          // Look for API key in common field names
          const keyFieldNames = [
            'api_key',
            'API Key',
            'apiKey',
            'Api Key',
            'ANTHROPIC_API_KEY',
            'anthropic_api_key',
            'key',
            'Key',
          ];

          for (const fieldName of keyFieldNames) {
            if (parsed.fields[fieldName] && typeof parsed.fields[fieldName] === 'string') {
              return parsed.fields[fieldName];
            }
          }

          // If no common name found, return the first non-empty string field
          const values = Object.values(parsed.fields);
          const keyValue = values.find(
            (value): value is string => typeof value === 'string' && value.length > 0
          );
          if (keyValue) return keyValue;
        }
      } catch {
        // Ignore parse errors
      }
    }

    return null;
  };

  const saveVersion = useCallback(async (message: string): Promise<boolean> => {
    if (!workspacePath) return false;

    setLoading(true);
    try {
      // Step 0: Generate/Update README.md from conception folder
      try {
        const apiKey = getAnthropicApiKey();
        console.log('[Version Control] README generation - API key found:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
        console.log('[Version Control] Workspace path:', workspacePath);

        const readmeResponse = await fetch(`${SPEC_API_URL}/generate-readme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace: workspacePath,
            apiKey: apiKey || undefined,
          }),
        });

        if (readmeResponse.ok) {
          const result = await readmeResponse.json();
          console.log('[Version Control] README.md generated successfully:', result.message);
        } else {
          // Log warning but don't fail - README generation is optional
          const readmeError = await readmeResponse.json();
          console.warn('[Version Control] README generation skipped:', readmeError.details || readmeError.error);
        }
      } catch (readmeErr) {
        // README generation failed - log but don't fail the commit
        console.warn('[Version Control] Could not generate README:', readmeErr);
      }

      // Step 1: Create the commit locally
      const commitResponse = await fetch(`${SPEC_API_URL}/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspacePath,
          message,
          files: state.status?.unstaged || [],
        }),
      });

      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.message || 'Failed to save version');
      }

      // Step 2: Push to remote (if remote is configured)
      try {
        // Get GitHub token from integrations config
        const token = getGitHubToken();

        const pushResponse = await fetch(`${SPEC_API_URL}/git/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace: workspacePath,
            setUpstream: true, // Set upstream if not already set
            token: token || undefined, // Pass token for authentication
          }),
        });

        if (!pushResponse.ok) {
          // Push failed - commit succeeded but push didn't
          // This could happen if no remote is configured or auth failed
          const pushError = await pushResponse.json();
          console.warn('Push failed (commit succeeded):', pushError.details || pushError.error);
          // Don't throw - the commit was successful, just couldn't push
        }
      } catch (pushErr) {
        // Push failed but commit succeeded - log but don't fail
        console.warn('Could not push to remote:', pushErr);
      }

      await refreshStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version');
      return false;
    }
  }, [workspacePath, state.status, refreshStatus]);

  const viewHistory = useCallback(async (filePath?: string) => {
    if (!workspacePath) return;

    setLoading(true);
    try {
      const url = filePath
        ? `${SPEC_API_URL}/git/log?workspace=${encodeURIComponent(workspacePath)}&file=${encodeURIComponent(filePath)}`
        : `${SPEC_API_URL}/git/log?workspace=${encodeURIComponent(workspacePath)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        commits: data.commits || [],
        isHistoryOpen: true,
        isLoading: false,
      }));
    } catch (err) {
      // Mock data for development
      console.warn('Git log API not available, using mock data');
      setState(prev => ({
        ...prev,
        commits: [
          {
            hash: 'abc123def456',
            shortHash: 'abc123d',
            message: 'Initial capability specifications',
            author: 'Developer',
            date: new Date().toISOString(),
            relativeDate: '2 hours ago',
          },
          {
            hash: 'def456ghi789',
            shortHash: 'def456g',
            message: 'Added enabler documentation',
            author: 'Developer',
            date: new Date(Date.now() - 86400000).toISOString(),
            relativeDate: '1 day ago',
          },
        ],
        isHistoryOpen: true,
        isLoading: false,
      }));
    }
  }, [workspacePath]);

  const viewCommit = useCallback(async (hash: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/show?workspace=${encodeURIComponent(workspacePath || '')}&hash=${hash}`);

      if (!response.ok) {
        throw new Error('Failed to fetch commit details');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        selectedCommit: data.commit,
        isLoading: false,
      }));
    } catch (err) {
      const commit = state.commits.find(c => c.hash === hash || c.shortHash === hash);
      setState(prev => ({
        ...prev,
        selectedCommit: commit || null,
        isLoading: false,
      }));
    }
  }, [workspacePath, state.commits]);

  const revertToCommit = useCallback(async (hash: string): Promise<boolean> => {
    if (!workspacePath) return false;

    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspacePath,
          hash,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert to commit');
      }

      await refreshStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert');
      return false;
    }
  }, [workspacePath, refreshStatus]);

  // Team mode operations
  const enableTeamMode = useCallback(async () => {
    setState(prev => ({ ...prev, teamModeEnabled: true }));
    localStorage.setItem('version_control_team_mode', 'true');
    await refreshStatus();
  }, [refreshStatus]);

  const disableTeamMode = useCallback(async () => {
    setState(prev => ({ ...prev, teamModeEnabled: false }));
    localStorage.setItem('version_control_team_mode', 'false');
  }, []);

  const createBranch = useCallback(async (name: string): Promise<boolean> => {
    if (!workspacePath) return false;

    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspacePath,
          name,
          checkout: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create branch');
      }

      setState(prev => ({ ...prev, currentBranch: name }));
      await refreshStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
      return false;
    }
  }, [workspacePath, refreshStatus]);

  const switchBranch = useCallback(async (name: string): Promise<boolean> => {
    if (!workspacePath) return false;

    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspacePath,
          branch: name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch branch');
      }

      setState(prev => ({ ...prev, currentBranch: name }));
      await refreshStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch branch');
      return false;
    }
  }, [workspacePath, refreshStatus]);

  const syncChanges = useCallback(async (): Promise<boolean> => {
    if (!workspacePath) return false;

    setLoading(true);
    try {
      // Pull from remote
      const pullResponse = await fetch(`${SPEC_API_URL}/git/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: workspacePath }),
      });

      if (!pullResponse.ok) {
        throw new Error('Failed to pull changes');
      }

      // Push local changes
      const pushResponse = await fetch(`${SPEC_API_URL}/git/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: workspacePath }),
      });

      if (!pushResponse.ok) {
        throw new Error('Failed to push changes');
      }

      await refreshStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync changes');
      return false;
    }
  }, [workspacePath, refreshStatus]);

  const submitForReview = useCallback(async (title: string, description: string): Promise<string | null> => {
    if (!workspacePath) return null;

    setLoading(true);
    try {
      const response = await fetch(`${SPEC_API_URL}/git/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: workspacePath,
          title,
          description,
          base: state.mainBranch,
          head: state.currentBranch,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create pull request');
      }

      const data = await response.json();
      setLoading(false);
      return data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for review');
      return null;
    }
  }, [workspacePath, state.mainBranch, state.currentBranch]);

  // UI actions
  const openHistory = useCallback(() => {
    setState(prev => ({ ...prev, isHistoryOpen: true }));
    viewHistory();
  }, [viewHistory]);

  const closeHistory = useCallback(() => {
    setState(prev => ({ ...prev, isHistoryOpen: false, selectedCommit: null }));
  }, []);

  const openPanel = useCallback(() => {
    setState(prev => ({ ...prev, isPanelOpen: true }));
  }, []);

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, isPanelOpen: false }));
  }, []);

  const togglePanel = useCallback(() => {
    setState(prev => ({ ...prev, isPanelOpen: !prev.isPanelOpen }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const actions: VersionControlActions = {
    refreshStatus,
    saveVersion,
    viewHistory,
    viewCommit,
    revertToCommit,
    enableTeamMode,
    disableTeamMode,
    createBranch,
    switchBranch,
    syncChanges,
    submitForReview,
    openHistory,
    closeHistory,
    openPanel,
    closePanel,
    togglePanel,
    clearError,
  };

  return (
    <VersionControlContext.Provider value={{ state, actions }}>
      {children}
    </VersionControlContext.Provider>
  );
};

export const useVersionControl = (): VersionControlContextValue => {
  const context = useContext(VersionControlContext);
  if (!context) {
    throw new Error('useVersionControl must be used within a VersionControlProvider');
  }
  return context;
};

export default VersionControlContext;
