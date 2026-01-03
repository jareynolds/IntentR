import React, { useState, useEffect, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

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

    setError(null);
    setIsGenerating(true);
    setOutput('Starting code generation via Claude CLI...\n');
    addLog('info', 'Starting code generation via Claude CLI...');
    addLog('info', `Workspace: ${currentWorkspace.projectFolder}`);
    addLog('info', `AI Preset: ${currentWorkspace.activeAIPreset || 'Not set'}`);
    addLog('info', `UI Framework: ${currentWorkspace.selectedUIFramework || 'None'}`);
    if (additionalCommands.trim()) {
      addLog('info', 'Additional commands will be appended to base command');
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      addLog('info', 'Sending request to /generate-code-cli endpoint...');
      addLog('info', 'Using Claude CLI for code generation (no API key required)');

      const response = await fetch(`${INTEGRATION_URL}/generate-code-cli`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          command: fullCommand,
        }),
        signal: abortControllerRef.current.signal,
      });

      addLog('info', `Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setOutput('');
        addLog('error', `CLI Error: ${data.error}`);
      } else {
        setOutput(data.response || 'Code generation completed.');
        addLog('success', 'Code generation completed successfully');
        // Refresh file list after generation
        fetchCodeFiles();
        addLog('info', 'Refreshing file list...');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Code generation was stopped by user.');
        addLog('info', 'Request aborted by user');
      } else {
        setError(`Failed to communicate with code generation service: ${err instanceof Error ? err.message : 'Unknown error'}`);
        addLog('error', `Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('info', 'Stopping code generation...');
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
                Stop
              </Button>
            )}
          </div>

          {/* Code Files Grid */}
          {codeFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-4">Generated Code Files</h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '50px'
                }}
              >
                {codeFiles.map((file, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">📄</span>
                      <span className="font-medium text-sm truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate" title={file.path}>
                      {file.path}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {file.size > 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${file.size} B`}
                    </p>
                  </Card>
                ))}
              </div>
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
    </PageLayout>
  );
};
