import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useWorkspace } from '../context/WorkspaceContext';
import { PageLayout } from '../components';
import { CLAUDE_PROXY_URL } from '../api/client';

interface AppStatus {
  isRunning: boolean;
  port?: number;
  ports?: number[];
  url?: string;
  isThisWorkspace: boolean;
  otherProcess?: string;
  hasStartScript: boolean;
  hasStopScript: boolean;
  error?: string;
  logs?: string;
}

export const Run: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Check app status on load and when workspace changes
  const checkStatus = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${CLAUDE_PROXY_URL}/check-app-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      const data = await response.json();
      setAppStatus(data);

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(`Failed to check status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.projectFolder]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleStart = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsStarting(true);
    setError(null);
    setLogs('Starting application...\n');

    try {
      const response = await fetch(`${CLAUDE_PROXY_URL}/run-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      const data = await response.json();

      if (data.logs) {
        setLogs(prev => prev + data.logs);
      }

      if (data.error) {
        setError(data.error);
        setLogs(prev => prev + `\nError: ${data.error}`);
      } else {
        setLogs(prev => prev + `\nApplication started successfully!`);
        if (data.url) {
          setLogs(prev => prev + `\nURL: ${data.url}`);
        }
        // Refresh status
        await checkStatus();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start: ${errMsg}`);
      setLogs(prev => prev + `\nFailed to start: ${errMsg}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsStopping(true);
    setError(null);
    setLogs('Stopping application...\n');

    try {
      const response = await fetch(`${CLAUDE_PROXY_URL}/stop-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      const data = await response.json();

      if (data.logs) {
        setLogs(prev => prev + data.logs);
      }

      if (data.error) {
        setError(data.error);
        setLogs(prev => prev + `\nError: ${data.error}`);
      } else {
        setLogs(prev => prev + `\nApplication stopped successfully!`);
        // Refresh status
        await checkStatus();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to stop: ${errMsg}`);
      setLogs(prev => prev + `\nFailed to stop: ${errMsg}`);
    } finally {
      setIsStopping(false);
    }
  };

  const getStatusColor = () => {
    if (!appStatus) return 'var(--color-secondaryLabel)';
    if (appStatus.isRunning && appStatus.isThisWorkspace) return 'var(--color-systemGreen)';
    if (appStatus.isRunning && !appStatus.isThisWorkspace) return 'var(--color-systemOrange)';
    return 'var(--color-secondaryLabel)';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking status...';
    if (!appStatus) return 'Unknown';
    if (appStatus.isRunning && appStatus.isThisWorkspace) return 'Running';
    if (appStatus.isRunning && !appStatus.isThisWorkspace) return 'Port in use by another process';
    return 'Not running';
  };

  return (
    <PageLayout
      title="Run Application"
      quickDescription="Start and test your generated application."
      detailedDescription="Launch and manage your workspace application from this page.
The Run page detects start.sh and stop.sh scripts in your code folder to manage application lifecycle.
Monitor running status, access application URLs, and view startup logs all in one place.

Applications are accessible via port 8080 through nginx reverse proxy.
Set the PUBLIC_HOST environment variable to your server's public IP or hostname for external access."
      className="page-container"
    >

      {/* Status Detection Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="text-title2" style={{ margin: 0 }}>Application Status</h3>
          <Button variant="secondary" onClick={checkStatus} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Refresh'}
          </Button>
        </div>

        {/* Status Display */}
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--color-tertiarySystemBackground)',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
            }} />
            <span className="text-headline" style={{ color: getStatusColor() }}>
              {getStatusText()}
            </span>
          </div>

          {appStatus && (
            <div style={{ display: 'grid', gap: '8px' }}>
              <div className="text-footnote">
                <strong>Scripts:</strong>{' '}
                {appStatus.hasStartScript ? '✓ start.sh' : '✗ start.sh'}{' '}
                {appStatus.hasStopScript ? '✓ stop.sh' : '✗ stop.sh'}
              </div>

              {appStatus.ports && appStatus.ports.length > 0 && (
                <div className="text-footnote">
                  <strong>Configured Port(s):</strong> {appStatus.ports.join(', ')}
                </div>
              )}

              {appStatus.isRunning && !appStatus.isThisWorkspace && appStatus.otherProcess && (
                <div className="text-footnote" style={{ color: 'var(--color-systemOrange)' }}>
                  <strong>Warning:</strong> Port is being used by: {appStatus.otherProcess}
                </div>
              )}

              {appStatus.url && appStatus.isRunning && appStatus.isThisWorkspace && (
                <div className="text-footnote">
                  <strong>URL:</strong>{' '}
                  <a
                    href={appStatus.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-systemBlue)' }}
                  >
                    {appStatus.url}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {(!appStatus?.isRunning || !appStatus?.isThisWorkspace) && (
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={isStarting || !appStatus?.hasStartScript}
              style={{ backgroundColor: 'var(--color-systemGreen)' }}
            >
              {isStarting ? 'Starting...' : '▶ Start Application'}
            </Button>
          )}

          {appStatus?.isRunning && (
            <Button
              variant="primary"
              onClick={handleStop}
              disabled={isStopping}
              style={{ backgroundColor: 'var(--color-systemRed)' }}
            >
              {isStopping ? 'Stopping...' : '■ Stop Application'}
            </Button>
          )}

          {appStatus?.url && appStatus?.isRunning && appStatus?.isThisWorkspace && (
            <Button
              variant="secondary"
              onClick={() => window.open(appStatus.url, '_blank')}
            >
              Open in Browser
            </Button>
          )}
        </div>

        {!appStatus?.hasStartScript && !isLoading && (
          <p className="text-footnote" style={{ color: 'var(--color-systemOrange)', marginTop: '12px' }}>
            No start.sh script found in the code folder. Create a start.sh script to enable running.
          </p>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card style={{ marginBottom: '24px', borderLeft: '4px solid var(--color-systemRed)' }}>
          <h3 className="text-headline" style={{ color: 'var(--color-systemRed)', marginBottom: '8px' }}>
            Error
          </h3>
          <p className="text-body" style={{ color: 'var(--color-systemRed)' }}>{error}</p>
        </Card>
      )}

      {/* Logs Display */}
      {logs && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 className="text-title2" style={{ margin: 0 }}>Logs</h3>
            <Button variant="secondary" onClick={() => setLogs('')}>
              Clear
            </Button>
          </div>
          <pre style={{
            backgroundColor: 'var(--color-systemBackground)',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '400px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            border: '1px solid var(--color-separator)',
          }}>
            {logs}
          </pre>

          {/* Open App Button - shown when app is running on configured port */}
          {appStatus?.isRunning && appStatus?.port && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onClick={() => {
                  // Use the same host as the current page, but with the app's port
                  const appUrl = `http://${window.location.hostname}:${appStatus.port}`;
                  window.open(appUrl, '_blank');
                }}
                style={{ backgroundColor: 'var(--color-systemBlue)' }}
              >
                🚀 Open App
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Application URL Card (when running) */}
      {appStatus?.isRunning && appStatus?.isThisWorkspace && appStatus?.url && (
        <Card style={{ borderLeft: '4px solid var(--color-systemGreen)' }}>
          <h3 className="text-title2" style={{ color: 'var(--color-systemGreen)', marginBottom: '16px' }}>
            Application Running
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <p className="text-body" style={{ marginBottom: '12px' }}>
              Your application is running and accessible at:
            </p>
            <a
              href={appStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                backgroundColor: 'var(--color-tertiarySystemBackground)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--color-systemBlue)',
                fontSize: '18px',
                fontFamily: 'monospace',
              }}
            >
              {appStatus.url}
            </a>
          </div>

          {appStatus.port && (
            <p className="text-footnote" style={{ marginBottom: '12px', color: 'var(--color-secondaryLabel)' }}>
              Internal port: {appStatus.port} → Proxied via nginx on port 8080
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => window.open(appStatus.url, '_blank')}>
              Open in Browser
            </Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(appStatus.url || '')}>
              Copy URL
            </Button>
          </div>
        </Card>
      )}

      {/* No Workspace Warning */}
      {!currentWorkspace && (
        <Card>
          <p style={{ color: 'var(--color-secondaryLabel)' }}>
            Please select a workspace to run the application.
          </p>
        </Card>
      )}
    </PageLayout>
  );
};
