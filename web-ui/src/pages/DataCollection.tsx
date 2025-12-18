import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components';
import { Alert } from '../components/Alert';
import { useWorkspace } from '../context/WorkspaceContext';
import { authClient } from '../api/client';

interface CollectionStatus {
  workspace_id: string;
  target_samples: number;
  current_samples: number;
  jobs_created: number;
  jobs_completed: number;
  jobs_running: number;
  jobs_failed: number;
  is_complete: boolean;
  started_at: string;
  bulk_run_id?: string;
  bulk_run_status?: string;
  stop_reason?: string;
  current_strategy_cycle?: number;
  last_activity?: string;
  is_actively_running: boolean;
}

export const DataCollection: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [targetSamples, setTargetSamples] = useState('10000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      refreshStatus();
      // Auto-refresh status every 5 seconds if collection is running
      const interval = setInterval(() => {
        refreshStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentWorkspace?.id]);

  const refreshStatus = async () => {
    if (!currentWorkspace?.id) return;
    try {
      setRefreshing(true);
      const response = await authClient.get(`/api/bulk-collection/workspace/${currentWorkspace.id}/status`);
      setStatus(response.data);
    } catch (err) {
      // Silently fail for auto-refresh, but set status to null to show no data
      console.error('Failed to fetch status', err);
    } finally {
      setRefreshing(false);
    }
  };

  const startBulkCollection = async () => {
    if (!currentWorkspace?.id) {
      setError('No workspace selected. Please select a workspace first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await authClient.post('/api/bulk-collection/start', {
        workspace_id: currentWorkspace.id,
        target_samples: parseInt(targetSamples),
        min_quality_score: 3.0,
        min_loc: 20,
        max_loc: 2000,
        require_docstrings: true
      });

      setSuccess('Bulk collection started! It will run in the background.');
      setTimeout(() => refreshStatus(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start bulk collection');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!status || status.target_samples === 0) return 0;
    return Math.min((status.current_samples / status.target_samples) * 100, 100);
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.is_actively_running) {
      return (
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'var(--color-systemBlue)',
          color: 'white',
          animation: 'pulse 2s infinite'
        }}>
          RUNNING
        </span>
      );
    }

    if (status.is_complete) {
      return (
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'var(--color-systemGreen)',
          color: 'white'
        }}>
          COMPLETE
        </span>
      );
    }

    if (status.bulk_run_status === 'stopped') {
      return (
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'var(--color-systemOrange)',
          color: 'white'
        }}>
          STOPPED
        </span>
      );
    }

    if (status.bulk_run_status === 'failed') {
      return (
        <span style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: 'var(--color-systemRed)',
          color: 'white'
        }}>
          FAILED
        </span>
      );
    }

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: 'var(--color-systemGray)',
        color: 'white'
      }}>
        IDLE
      </span>
    );
  };

  const getStopReasonMessage = () => {
    if (!status?.stop_reason) return null;

    const messages: Record<string, string> = {
      'target_reached': 'Target sample count was reached successfully!',
      'strategies_exhausted': 'All search strategies were exhausted. Try increasing the target or adjusting quality filters.',
      'rate_limit_exhausted': 'GitHub API rate limit was exceeded too many times.',
      'consecutive_failures': 'Too many consecutive job failures occurred.',
      'job_limit_reached': 'Maximum job limit was reached.',
      'manual_cancel': 'Collection was cancelled manually.',
    };

    return messages[status.stop_reason] || status.stop_reason;
  };

  if (!currentWorkspace) {
    return (
      <div className="max-w-4xl mx-auto" style={{ padding: '16px' }}>
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <h2 className="text-title2" style={{ marginBottom: '16px' }}>No Workspace Selected</h2>
          <p className="text-body text-secondary" style={{ marginBottom: '24px' }}>
            Please select a workspace to view and manage data collection.
          </p>
          <Button variant="primary" onClick={() => navigate('/workspaces')}>
            Go to Workspaces
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" style={{ padding: '16px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Data Collection</h1>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              Workspace: <strong>{currentWorkspace.name}</strong>
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      {/* Start Collection Card */}
      <Card style={{ marginBottom: '24px' }}>
        <h3 className="text-title2" style={{ marginBottom: '16px' }}>Start Bulk Collection</h3>
        <p className="text-body text-secondary" style={{ marginBottom: '20px' }}>
          Automatically collect high-quality Python code samples from GitHub until the target is reached.
          The system will run multiple collection jobs with different search strategies to maximize diversity.
        </p>

        <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
          <div>
            <label htmlFor="target-samples" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Target Number of Samples
            </label>
            <input
              id="target-samples"
              type="number"
              value={targetSamples}
              onChange={(e) => setTargetSamples(e.target.value)}
              min="100"
              max="100000"
              step="100"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-separator)',
                backgroundColor: 'var(--color-secondarySystemFill)',
                color: 'var(--color-label)',
                fontSize: '14px'
              }}
            />
            <small className="text-caption2 text-secondary" style={{ marginTop: '8px', display: 'block' }}>
              Recommended: 10,000 for fine-tuning, 50,000+ for best results
            </small>
          </div>

          <Button
            variant="primary"
            onClick={startBulkCollection}
            disabled={loading || status?.is_actively_running}
            style={{ width: 'fit-content' }}
          >
            {loading ? 'Starting...' : status?.is_actively_running ? 'Collection Running...' : 'Start Bulk Collection'}
          </Button>
        </div>
      </Card>

      {/* Collection Status Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 className="text-title2" style={{ margin: 0 }}>Collection Status</h3>
            {getStatusBadge()}
          </div>
          <Button
            size="small"
            variant="secondary"
            onClick={refreshStatus}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {status ? (
          <>
            {/* Progress Bar */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="text-body" style={{ fontWeight: 500 }}>Progress</span>
                <span className="text-body text-secondary">
                  {status.current_samples.toLocaleString()} / {status.target_samples.toLocaleString()} samples
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '24px',
                backgroundColor: 'var(--color-tertiarySystemFill)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getProgressPercentage()}%`,
                  height: '100%',
                  backgroundColor: status.is_complete ? 'var(--color-systemGreen)' :
                                   status.is_actively_running ? 'var(--color-systemBlue)' : 'var(--color-systemOrange)',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {getProgressPercentage().toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Strategy Cycle Info */}
            {status.current_strategy_cycle && (
              <div style={{ marginBottom: '20px' }}>
                <span className="text-body text-secondary">
                  Strategy Cycle: {status.current_strategy_cycle} / 20
                </span>
              </div>
            )}

            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--color-secondarySystemFill)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-label)' }}>
                  {status.jobs_created}
                </div>
                <div className="text-footnote text-secondary">Jobs Created</div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                  {status.jobs_completed}
                </div>
                <div className="text-footnote text-secondary">Completed</div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
                  {status.jobs_running}
                </div>
                <div className="text-footnote text-secondary">Running</div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: status.jobs_failed > 0 ? 'rgba(255, 59, 48, 0.1)' : 'var(--color-secondarySystemFill)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: status.jobs_failed > 0 ? 'var(--color-systemRed)' : 'var(--color-label)'
                }}>
                  {status.jobs_failed}
                </div>
                <div className="text-footnote text-secondary">Failed</div>
              </div>
            </div>

            {/* Stop Reason */}
            {status.stop_reason && !status.is_actively_running && (
              <div style={{
                padding: '16px',
                backgroundColor: status.stop_reason === 'target_reached'
                  ? 'rgba(52, 199, 89, 0.1)'
                  : 'rgba(255, 149, 0, 0.1)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <div className="text-body" style={{
                  color: status.stop_reason === 'target_reached'
                    ? 'var(--color-systemGreen)'
                    : 'var(--color-systemOrange)'
                }}>
                  {status.stop_reason === 'target_reached' ? '✅' : '⚠️'} {getStopReasonMessage()}
                </div>
              </div>
            )}

            {/* Last Activity */}
            {status.last_activity && (
              <div className="text-footnote text-secondary">
                Last activity: {new Date(status.last_activity).toLocaleString()}
              </div>
            )}

            {/* Completion Message */}
            {status.is_complete && (
              <div style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                borderRadius: '12px'
              }}>
                <div className="text-body" style={{ color: 'var(--color-systemGreen)', fontWeight: 500 }}>
                  ✅ Collection complete! {status.current_samples.toLocaleString()} samples collected.
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-body text-secondary">
              No collection data yet. Start a bulk collection to see progress here.
            </p>
          </div>
        )}
      </Card>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default DataCollection;
