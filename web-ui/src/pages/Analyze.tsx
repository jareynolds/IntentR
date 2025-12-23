import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageLayout } from '../components/PageLayout';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface AnalysisFile {
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

export const Analyze: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [analysisFiles, setAnalysisFiles] = useState<AnalysisFile[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Load logs from localStorage on initial render
    const saved = localStorage.getItem('analysis_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => {
      const newLogs = [...prev, { timestamp, type, message }];
      localStorage.setItem('analysis_logs', JSON.stringify(newLogs));
      return newLogs;
    });
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('analysis_logs');
  };

  const fetchAnalysisFiles = async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      // Fetch files from specifications, code, and assets folders
      const response = await fetch(`${INTEGRATION_URL}/analysis-files`, {
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
        setAnalysisFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to fetch analysis files:', err);
    }
  };

  useEffect(() => {
    fetchAnalysisFiles();
  }, [currentWorkspace?.projectFolder]);

  const handleAnalyze = async () => {
    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected or no project folder configured. Please select a workspace with a project folder in Workspace Settings.');
      addLog('error', 'No workspace or project folder configured');
      return;
    }

    if (!currentWorkspace.activeAIPreset || currentWorkspace.activeAIPreset < 1 || currentWorkspace.activeAIPreset > 5) {
      setError('No AI Governance Preset selected. Please set an AI Preset (1-5) in Workspace Settings.');
      addLog('error', 'No AI Governance Preset selected');
      return;
    }

    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) {
      setError('No Anthropic API key found. Please set it in Settings.');
      addLog('error', 'No Anthropic API key found');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setOutput('Starting application analysis...\n');
    addLog('info', 'Starting application analysis...');
    addLog('info', `Workspace: ${currentWorkspace.projectFolder}`);
    addLog('info', `AI Preset: ${currentWorkspace.activeAIPreset}`);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      addLog('info', 'Sending request to /analyze-application endpoint...');

      const response = await fetch(`${INTEGRATION_URL}/analyze-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          apiKey: apiKey,
          aiPreset: currentWorkspace.activeAIPreset,
          prompt: `Claude, please follow the AI-Policy-Preset${currentWorkspace.activeAIPreset}.md and reverse engineer the application based on the screenshots and URLs provided in the ideation markdowns found in the ./specifications folder for this workspace. As a result of the reverse engineering effort, markdowns for capabilities, enablers, storyboards, dependencies and any graphical assets should be produced in the ./specifications folder. In addition if any code is created based on the analysis, the developed source code files shall be placed into a new ./code folder. Any graphical, UI or design assets shall be placed in a ./assets folder. If none of these folders exist, please make sure they are created.${additionalPrompt ? `\n\nAdditional Instructions:\n${additionalPrompt}` : ''}`,
        }),
        signal: abortControllerRef.current.signal,
      });

      addLog('info', `Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setOutput('');
        addLog('error', `API Error: ${data.error}`);
      } else {
        setOutput(data.response || 'Application analysis completed.');
        addLog('success', 'Application analysis completed successfully');
        // Refresh file list after analysis
        fetchAnalysisFiles();
        addLog('info', 'Refreshing file list...');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Analysis was stopped by user.');
        addLog('info', 'Request aborted by user');
      } else {
        setError(`Failed to communicate with analysis service: ${err instanceof Error ? err.message : 'Unknown error'}`);
        addLog('error', `Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('info', 'Stopping analysis...');
    }
  };

  return (
    <PageLayout
      title="Application Analysis"
      quickDescription="Reverse engineer and analyze existing applications using AI."
      detailedDescription="Use AI to analyze existing applications and generate specifications, capabilities, and code documentation. The analysis process examines your codebase structure, identifies patterns, and creates comprehensive documentation."
      className="page-container"
    >

      {currentWorkspace && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{currentWorkspace.name}</h3>
              <p className="text-sm text-gray-500">{currentWorkspace.projectFolder || 'No project folder configured'}</p>
            </div>
          </div>

          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">Analysis Command</h4>
            <code className="text-sm text-gray-700 dark:text-gray-300 block whitespace-pre-wrap">
              Claude, please follow the AI-Policy-Preset{currentWorkspace.activeAIPreset || 'X'}.md and reverse engineer the application based on the screenshots and URLs provided in the ideation markdowns found in the ./specifications folder for this workspace. As a result of the reverse engineering effort, markdowns for capabilities, enablers, storyboards, dependencies and any graphical assets should be produced in the ./specifications folder. In addition if any code is created based on the analysis, the developed source code files shall be placed into a new ./code folder. Any graphical, UI or design assets shall be placed in a ./assets folder. If none of these folders exist, please make sure they are created.
            </code>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2">Additional Instructions (Optional)</h4>
            <textarea
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              placeholder="Add any additional instructions or context to help with the analysis..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
              rows={4}
              style={{
                resize: 'vertical',
                minHeight: '100px',
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              These instructions will be appended to the main analysis command
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !currentWorkspace.projectFolder || !currentWorkspace.activeAIPreset}
              className="flex-1"
            >
              {isAnalyzing ? 'Analyzing Application...' : 'Analyze Application'}
            </Button>
            {isAnalyzing && (
              <Button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700"
              >
                Stop
              </Button>
            )}
          </div>

          {/* Analysis Files Grid */}
          {analysisFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-4">Generated Analysis Files</h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '50px'
                }}
              >
                {analysisFiles.map((file, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">
                        {file.name.endsWith('.md') ? '📝' :
                         file.name.match(/\.(png|jpg|jpeg|gif|svg)$/i) ? '🖼️' : '📄'}
                      </span>
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
          <p className="text-gray-500">Please select a workspace to use application analysis.</p>
        </Card>
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
