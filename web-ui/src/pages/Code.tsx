import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePhaseApprovals } from '../context/EntityStateContext';
import { PageLayout } from '../components';
import { INTEGRATION_URL } from '../api/client';

interface CodeFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'error' | 'success';
  message: string;
}

interface PhaseApprovalStatus {
  phase: string;
  approved: boolean;
  approvedAt?: string;
}

// Job status types from backend
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface JobLogEntry {
  timestamp: string;
  type: string;
  message: string;
}

interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress?: string;
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  logs: JobLogEntry[];
}

const JOB_ID_STORAGE_KEY = 'code_generation_active_job_id';
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

export const Code: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { isPhaseApproved } = usePhaseApprovals();
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [baseCommand, setBaseCommand] = useState<string>('');
  const [isLoadingCommand, setIsLoadingCommand] = useState(false);
  const [additionalCommands, setAdditionalCommands] = useState<string>(() => {
    const saved = localStorage.getItem('code_generation_additional_commands');
    return saved || '';
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Load logs from localStorage on initial render
    const saved = localStorage.getItem('code_generation_logs');
    return saved ? JSON.parse(saved) : [];
  });
  // Job-based code generation state
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    return localStorage.getItem(JOB_ID_STORAGE_KEY);
  });
  const [jobElapsedTime, setJobElapsedTime] = useState<number>(0);
  const [jobProgress, setJobProgress] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Compute top-level files and folders from all code files
  const topLevelEntries = useMemo(() => {
    if (codeFiles.length === 0) return [];

    const entries: { name: string; isFolder: boolean; itemCount: number; totalSize: number }[] = [];
    const folderMap = new Map<string, { count: number; size: number }>();

    for (const file of codeFiles) {
      // Get the first path segment (top-level entry)
      const pathParts = file.path.split('/').filter(Boolean);
      if (pathParts.length === 0) continue;

      const topLevel = pathParts[0];

      if (pathParts.length === 1) {
        // This is a top-level file
        entries.push({ name: topLevel, isFolder: false, itemCount: 1, totalSize: file.size });
      } else {
        // This file is inside a folder - track folder stats
        const existing = folderMap.get(topLevel) || { count: 0, size: 0 };
        folderMap.set(topLevel, { count: existing.count + 1, size: existing.size + file.size });
      }
    }

    // Add folders to entries
    for (const [name, stats] of folderMap) {
      entries.push({ name, isFolder: true, itemCount: stats.count, totalSize: stats.size });
    }

    // Sort: folders first, then files, alphabetically within each group
    return entries.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [codeFiles]);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => {
      const newLogs = [...prev, { timestamp, type, message }];
      localStorage.setItem('code_generation_logs', JSON.stringify(newLogs));
      return newLogs;
    });
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('code_generation_logs');
  };

  // Format elapsed time for display
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Stop polling and clean up job state
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`${INTEGRATION_URL}/generate-code-status/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Job not found - clean up
          addLog('error', 'Job not found on server - it may have expired');
          setCurrentJobId(null);
          localStorage.removeItem(JOB_ID_STORAGE_KEY);
          setIsGenerating(false);
          stopPolling();
          return;
        }
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data: JobStatusResponse = await response.json();

      // Update elapsed time
      setJobElapsedTime(data.elapsedSeconds);

      // Update progress if available
      if (data.progress) {
        setJobProgress(data.progress);
      }

      // Sync logs from backend (only add new ones)
      if (data.logs && data.logs.length > 0) {
        const lastBackendLog = data.logs[data.logs.length - 1];
        // Check if we need to add this log (simple check - could be improved)
        setLogs(prev => {
          const lastLocalLog = prev[prev.length - 1];
          if (!lastLocalLog || lastLocalLog.message !== lastBackendLog.message) {
            // Add logs from backend that we don't have
            const newLogs = data.logs.map(log => ({
              timestamp: new Date(log.timestamp).toLocaleTimeString(),
              type: log.type as 'info' | 'error' | 'success',
              message: log.message,
            }));
            localStorage.setItem('code_generation_logs', JSON.stringify(newLogs));
            return newLogs;
          }
          return prev;
        });
      }

      // Check if job is complete
      if (data.status === 'completed') {
        setOutput(data.output || 'Code generation completed.');
        addLog('success', 'Code generation completed successfully');
        setIsGenerating(false);
        setCurrentJobId(null);
        localStorage.removeItem(JOB_ID_STORAGE_KEY);
        stopPolling();
        fetchCodeFiles(); // Refresh file list
      } else if (data.status === 'failed') {
        setError(data.error || 'Code generation failed');
        addLog('error', `Failed: ${data.error || 'Unknown error'}`);
        setIsGenerating(false);
        setCurrentJobId(null);
        localStorage.removeItem(JOB_ID_STORAGE_KEY);
        stopPolling();
      } else if (data.status === 'cancelled') {
        addLog('info', 'Code generation was cancelled');
        setIsGenerating(false);
        setCurrentJobId(null);
        localStorage.removeItem(JOB_ID_STORAGE_KEY);
        stopPolling();
      }
      // For 'pending' or 'running', continue polling
    } catch (err) {
      console.error('Failed to poll job status:', err);
      // Don't stop polling on network errors - keep trying
    }
  }, [stopPolling]);

  // Start polling for a job
  const startPolling = useCallback((jobId: string) => {
    // Clear any existing polling
    stopPolling();

    // Poll immediately
    pollJobStatus(jobId);

    // Then poll on interval
    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, POLL_INTERVAL_MS);
  }, [pollJobStatus, stopPolling]);

  // Check for existing job on mount (recovery after page refresh)
  useEffect(() => {
    const savedJobId = localStorage.getItem(JOB_ID_STORAGE_KEY);
    if (savedJobId) {
      addLog('info', `Recovering job: ${savedJobId.substring(0, 8)}...`);
      setIsGenerating(true);
      setCurrentJobId(savedJobId);
      startPolling(savedJobId);
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const fetchCodeFiles = async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const response = await fetch(`${INTEGRATION_URL}/code-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      if (data.files) {
        setCodeFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to fetch code files:', err);
    }
  };

  useEffect(() => {
    fetchCodeFiles();
  }, [currentWorkspace?.projectFolder]);

  // Fetch CODE_GEN_COMMAND.md from workspace
  const fetchBaseCommand = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsLoadingCommand(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          filePath: 'implementation/PROMPT/CODE_GEN_COMMAND.md',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBaseCommand(data.content || '');
      } else {
        // File doesn't exist yet - use empty string
        setBaseCommand('');
        console.log('CODE_GEN_COMMAND.md not found, using empty base command');
      }
    } catch (err) {
      console.error('Failed to fetch CODE_GEN_COMMAND.md:', err);
      setBaseCommand('');
    } finally {
      setIsLoadingCommand(false);
    }
  };

  useEffect(() => {
    fetchBaseCommand();
  }, [currentWorkspace?.projectFolder]);

  // Check if all phase approvals are complete using database-backed EntityStateContext
  const checkAllPhaseApprovals = (): { allApproved: boolean; missingPhases: string[] } => {
    if (!currentWorkspace?.id) {
      return { allApproved: false, missingPhases: ['No workspace selected'] };
    }

    // Map workflow stages to display names
    // These correspond to the WorkflowStage type: 'intent' | 'specification' | 'ui_design' | 'control_loop'
    // Note: 'implementation' phase approval was removed as it was confusing for users
    // All approval pages now use the database-backed EntityStateContext
    const phases: Array<{ stage: 'intent' | 'specification' | 'ui_design' | 'control_loop'; name: string }> = [
      { stage: 'intent', name: 'Intent' },
      { stage: 'specification', name: 'Specification' },
      { stage: 'ui_design', name: 'UI Design' },
      { stage: 'control_loop', name: 'Control Loop' },
    ];

    const missingPhases: string[] = [];

    for (const phase of phases) {
      // Use the database-backed isPhaseApproved function from EntityStateContext
      if (!isPhaseApproved(phase.stage)) {
        missingPhases.push(phase.name);
      }
    }

    return {
      allApproved: missingPhases.length === 0,
      missingPhases,
    };
  };

  const handleGenerateCode = async () => {
    // Clear previous errors
    setApprovalError(null);
    setError(null);
    setJobProgress('');
    setJobElapsedTime(0);

    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected or no project folder configured. Please select a workspace with a project folder in Workspace Settings.');
      addLog('error', 'No workspace or project folder configured');
      return;
    }

    // Check if all phase approvals are complete
    const { allApproved, missingPhases } = checkAllPhaseApprovals();
    if (!allApproved) {
      const errorMessage = `Cannot generate code. The following phases have not been approved:\n\n${missingPhases.map(p => `  - ${p}`).join('\n')}\n\nPlease complete all phase approvals before generating code.`;
      setApprovalError(errorMessage);
      addLog('error', `Phase approval check failed: ${missingPhases.join(', ')}`);
      return;
    }

    if (!baseCommand.trim()) {
      setError('Base code generation command is empty. Please ensure CODE_GEN_COMMAND.md exists in implementation/PROMPT/');
      addLog('error', 'Base code generation command is empty - check implementation/PROMPT/CODE_GEN_COMMAND.md');
      return;
    }

    // Combine base command with additional commands
    const fullCommand = additionalCommands.trim()
      ? `${baseCommand.trim()}\n\n${additionalCommands.trim()}`
      : baseCommand.trim();

    setIsGenerating(true);
    setOutput('');
    clearLogs();
    addLog('info', 'Starting code generation job...');
    addLog('info', `Workspace: ${currentWorkspace.projectFolder}`);
    addLog('info', `AI Preset: ${currentWorkspace.activeAIPreset || 'Not set'}`);
    addLog('info', `UI Framework: ${currentWorkspace.selectedUIFramework || 'None'}`);
    if (additionalCommands.trim()) {
      addLog('info', 'Additional commands will be appended to base command');
    }

    try {
      // Start the job via the new job-based endpoint
      const response = await fetch(`${INTEGRATION_URL}/generate-code-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          command: fullCommand,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start job: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsGenerating(false);
        addLog('error', `Failed to start job: ${data.error}`);
        return;
      }

      const jobId = data.jobId;
      addLog('info', `Job started with ID: ${jobId.substring(0, 8)}...`);
      addLog('info', 'You can safely navigate away - the job will continue in the background');

      // Save job ID for recovery
      setCurrentJobId(jobId);
      localStorage.setItem(JOB_ID_STORAGE_KEY, jobId);

      // Start polling for status
      startPolling(jobId);

    } catch (err) {
      setError(`Failed to start code generation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      addLog('error', `Failed to start job: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const handleStop = async () => {
    if (!currentJobId) {
      addLog('info', 'No active job to stop');
      return;
    }

    addLog('info', 'Requesting job cancellation...');

    try {
      const response = await fetch(`${INTEGRATION_URL}/generate-code-cancel/${currentJobId}`, {
        method: 'POST',
      });

      if (response.ok) {
        addLog('info', 'Job cancellation requested');
        // The polling will detect the cancelled status and clean up
      } else {
        addLog('error', 'Failed to cancel job');
      }
    } catch (err) {
      addLog('error', `Failed to cancel: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <PageLayout
      title="Code Generation"
      quickDescription="Generate application code from specifications using AI governance principles."
      detailedDescription="This page orchestrates code generation by sending your specifications to Claude CLI with the configured AI governance preset.
The AI reads through your conception, definition, design, and implementation folders in sequence to generate code.
All generated code respects the active UI Framework and AI Principles settings for your workspace."
      className="page-container"
    >

      {currentWorkspace && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">{currentWorkspace.projectFolder || 'No project folder configured'}</p>
            </div>
          </div>

          {/* Base Command Status */}
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-tertiarySystemBackground)' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Base Command</h4>
              {isLoadingCommand ? (
                <span className="text-xs text-gray-500">Loading...</span>
              ) : baseCommand ? (
                <span className="text-xs text-green-600">✓ Loaded from CODE_GEN_COMMAND.md</span>
              ) : (
                <span className="text-xs text-orange-500">⚠ File not found</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Source: <code>implementation/PROMPT/CODE_GEN_COMMAND.md</code>
            </p>
            {baseCommand && (
              <details className="mt-2">
                <summary className="text-xs text-blue-500 cursor-pointer">Preview base command</summary>
                <pre className="mt-2 p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                  {baseCommand}
                </pre>
              </details>
            )}
          </div>

          {/* Additional Code Commands */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Additional Code Commands</h4>
            <textarea
              value={additionalCommands}
              onChange={(e) => {
                setAdditionalCommands(e.target.value);
                localStorage.setItem('code_generation_additional_commands', e.target.value);
              }}
              placeholder="Enter any additional instructions to append to the base command..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-mono"
              rows={5}
              style={{
                resize: 'vertical',
                minHeight: '100px',
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              These commands will be appended to the base command. AI Preset: {currentWorkspace.activeAIPreset || 'Not set'} | UI Framework: {currentWorkspace.selectedUIFramework || 'None'}
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleGenerateCode}
              disabled={isGenerating || !currentWorkspace.projectFolder || !baseCommand.trim() || isLoadingCommand}
              className="flex-1"
            >
              {isGenerating ? 'Generating Code via CLI...' : 'Generate Code from Specifications'}
            </Button>
            {isGenerating && (
              <Button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Job Status Display */}
          {isGenerating && currentJobId && (
            <div className="mt-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Job Running</span>
                </div>
                <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                  {formatElapsedTime(jobElapsedTime)}
                </span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Job ID: {currentJobId.substring(0, 8)}...
              </p>
              {jobProgress && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{jobProgress}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                ✓ You can navigate away - the job will continue in the background
              </p>
            </div>
          )}
        </Card>
      )}

      {!currentWorkspace && (
        <Card>
          <p className="text-gray-500">Please select a workspace to use code generation.</p>
        </Card>
      )}

      {/* Approval Error Modal */}
      {approvalError && (
        <div
          style={{
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
          }}
          onClick={() => setApprovalError(null)}
        >
          <Card
            style={{
              maxWidth: '500px',
              padding: '24px',
              backgroundColor: 'var(--color-systemBackground)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px', marginRight: '12px' }}>⚠️</span>
              <h3 style={{ margin: 0, color: 'var(--color-systemRed)' }}>Phase Approvals Required</h3>
            </div>
            <p style={{ whiteSpace: 'pre-line', marginBottom: '20px', color: 'var(--color-label)' }}>
              {approvalError}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setApprovalError(null)}
                style={{ backgroundColor: 'var(--color-systemGray4)' }}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {error && (
        <Card className="mt-4 border-red-500">
          <p className="text-red-500">{error}</p>
        </Card>
      )}

      {output && (
        <Card className="mt-4">
          <h3 className="font-semibold mb-2">Output</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-sm whitespace-pre-wrap">
            {output}
          </pre>
        </Card>
      )}

      {/* Log Window */}
      <Card className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Log</h3>
          <Button onClick={clearLogs} className="text-xs px-2 py-1">
            Clear
          </Button>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg overflow-auto max-h-48 text-sm font-mono">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'success'
                    ? 'text-green-400'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </Card>

      {/* Generated Code Files - Top Level Only */}
      {topLevelEntries.length > 0 && (
        <Card className="mt-4">
          <h3 className="font-semibold mb-4">Generated Files ({codeFiles.length} total)</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px'
            }}
          >
            {topLevelEntries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-xl mr-2">{entry.isFolder ? '📁' : '📄'}</span>
                <div className="overflow-hidden">
                  <span className="font-medium text-sm truncate block" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {entry.isFolder
                      ? `${entry.itemCount} item${entry.itemCount !== 1 ? 's' : ''}`
                      : entry.totalSize > 1024
                        ? `${(entry.totalSize / 1024).toFixed(1)} KB`
                        : `${entry.totalSize} B`
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageLayout>
  );
};
