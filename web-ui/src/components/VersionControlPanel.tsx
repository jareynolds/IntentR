import React, { useState } from 'react';
import { useVersionControl } from '../context/VersionControlContext';

interface VersionControlPanelProps {
  position?: 'bottom-right' | 'bottom-left' | 'sidebar';
  className?: string;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  position = 'bottom-right',
  className = '',
}) => {
  const { state, actions } = useVersionControl();
  const [commitMessage, setCommitMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Don't render if git is not initialized for this workspace
  if (!state.isGitInitialized) {
    return null;
  }

  const hasChanges = state.status && (
    state.status.staged.length > 0 ||
    state.status.unstaged.length > 0 ||
    state.status.untracked.length > 0
  );

  const totalChanges = state.status
    ? state.status.staged.length + state.status.unstaged.length + state.status.untracked.length
    : 0;

  const handleSaveVersion = async () => {
    if (!commitMessage.trim()) return;

    const success = await actions.saveVersion(commitMessage);
    if (success) {
      setCommitMessage('');
      setIsExpanded(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    const success = await actions.createBranch(newBranchName);
    if (success) {
      setNewBranchName('');
      setShowBranchInput(false);
    }
  };

  const handleSync = async () => {
    await actions.syncChanges();
  };

  // Collapsed state - just show a floating button
  if (!isExpanded && !state.isPanelOpen) {
    return (
      <div className={`version-control-trigger ${position} ${className}`}>
        <button
          className="version-trigger-btn"
          onClick={() => setIsExpanded(true)}
          title="Version Control"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {hasChanges && (
            <span className="changes-badge">{totalChanges}</span>
          )}
        </button>

        <style>{`
          .version-control-trigger {
            position: fixed;
            z-index: 1000;
          }

          .version-control-trigger.bottom-right {
            bottom: 1.5rem;
            right: 1.5rem;
          }

          .version-control-trigger.bottom-left {
            bottom: 1.5rem;
            left: 1.5rem;
          }

          .version-trigger-btn {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            background: var(--color-blue-500, #3b82f6);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.2s ease;
          }

          .version-trigger-btn:hover {
            background: var(--color-blue-600, #2563eb);
            transform: scale(1.05);
          }

          .version-trigger-btn svg {
            width: 1.5rem;
            height: 1.5rem;
          }

          .changes-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
            background: var(--color-orange-500, #f97316);
            color: white;
            border-radius: 9999px;
            padding: 0 0.25rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`version-control-panel ${position} ${className}`}>
      {/* Header */}
      <div className="vcp-header">
        <div className="vcp-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6m0 6v6" />
          </svg>
          <span>Version Control</span>
        </div>
        <button className="vcp-close" onClick={() => setIsExpanded(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Branch Info (Team Mode) */}
      {state.teamModeEnabled && (
        <div className="vcp-branch-section">
          <div className="vcp-branch-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="branch-name">{state.currentBranch}</span>
            {state.currentBranch !== state.mainBranch && (
              <span className="branch-badge">feature</span>
            )}
          </div>
          <div className="vcp-branch-actions">
            {!showBranchInput ? (
              <button
                className="vcp-btn vcp-btn--small"
                onClick={() => setShowBranchInput(true)}
              >
                New Branch
              </button>
            ) : (
              <div className="branch-input-row">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="branch-name"
                  className="vcp-input vcp-input--small"
                />
                <button
                  className="vcp-btn vcp-btn--small vcp-btn--primary"
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim()}
                >
                  Create
                </button>
                <button
                  className="vcp-btn vcp-btn--small"
                  onClick={() => {
                    setShowBranchInput(false);
                    setNewBranchName('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="vcp-status">
        {state.isLoading ? (
          <div className="vcp-loading">
            <div className="spinner" />
            <span>Checking status...</span>
          </div>
        ) : hasChanges ? (
          <div className="vcp-changes">
            <div className="changes-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{totalChanges} unsaved {totalChanges === 1 ? 'change' : 'changes'}</span>
            </div>
            <div className="changes-list">
              {state.status?.unstaged.slice(0, 5).map((file, idx) => (
                <div key={idx} className="change-item">
                  <span className="change-type change-type--modified">M</span>
                  <span className="change-file">{file.split('/').pop()}</span>
                </div>
              ))}
              {state.status?.untracked.slice(0, 3).map((file, idx) => (
                <div key={`u-${idx}`} className="change-item">
                  <span className="change-type change-type--new">A</span>
                  <span className="change-file">{file.split('/').pop()}</span>
                </div>
              ))}
              {totalChanges > 8 && (
                <div className="changes-more">+{totalChanges - 8} more files</div>
              )}
            </div>
          </div>
        ) : (
          <div className="vcp-clean">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>All changes saved</span>
          </div>
        )}
      </div>

      {/* Save Version */}
      {hasChanges && (
        <div className="vcp-commit">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Describe your changes..."
            className="vcp-textarea"
            rows={2}
          />
          <button
            className="vcp-btn vcp-btn--primary vcp-btn--full"
            onClick={handleSaveVersion}
            disabled={!commitMessage.trim() || state.isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save Version
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="vcp-actions">
        <button className="vcp-btn" onClick={() => actions.openHistory()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View History
        </button>

        {state.teamModeEnabled && (
          <>
            <button className="vcp-btn" onClick={handleSync} disabled={state.isLoading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </button>
            {state.currentBranch !== state.mainBranch && (
              <button
                className="vcp-btn vcp-btn--success"
                onClick={() => actions.submitForReview('Review Changes', '')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit for Review
              </button>
            )}
          </>
        )}

        <button className="vcp-btn" onClick={actions.refreshStatus} disabled={state.isLoading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="vcp-error">
          <span>{state.error}</span>
          <button onClick={actions.clearError}>Dismiss</button>
        </div>
      )}

      <style>{`
        .version-control-panel {
          position: fixed;
          z-index: 1000;
          width: 320px;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .version-control-panel.bottom-right {
          bottom: 1.5rem;
          right: 1.5rem;
        }

        .version-control-panel.bottom-left {
          bottom: 1.5rem;
          left: 1.5rem;
        }

        .version-control-panel.sidebar {
          position: relative;
          width: 100%;
          box-shadow: none;
          border: 1px solid var(--color-grey-200, #e5e7eb);
        }

        .vcp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--color-grey-50, #f9fafb);
          border-bottom: 1px solid var(--color-grey-200, #e5e7eb);
        }

        .vcp-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--color-grey-800, #1f2937);
        }

        .vcp-title svg {
          width: 1.125rem;
          height: 1.125rem;
          color: var(--color-blue-500, #3b82f6);
        }

        .vcp-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          border: none;
          background: none;
          color: var(--color-grey-500, #6b7280);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.15s ease;
        }

        .vcp-close:hover {
          background: var(--color-grey-100, #f3f4f6);
          color: var(--color-grey-700, #374151);
        }

        .vcp-close svg {
          width: 1rem;
          height: 1rem;
        }

        .vcp-branch-section {
          padding: 0.75rem 1rem;
          background: var(--color-blue-50, #eff6ff);
          border-bottom: 1px solid var(--color-blue-100, #dbeafe);
        }

        .vcp-branch-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .vcp-branch-info svg {
          width: 1rem;
          height: 1rem;
          color: var(--color-blue-500, #3b82f6);
        }

        .branch-name {
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--color-blue-700, #1d4ed8);
        }

        .branch-badge {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 0.125rem 0.375rem;
          background: var(--color-purple-100, #f3e8ff);
          color: var(--color-purple-700, #7c3aed);
          border-radius: 9999px;
        }

        .vcp-branch-actions {
          display: flex;
          gap: 0.375rem;
        }

        .branch-input-row {
          display: flex;
          gap: 0.375rem;
          flex: 1;
        }

        .vcp-status {
          padding: 1rem;
        }

        .vcp-loading {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--color-grey-600, #4b5563);
          font-size: 0.875rem;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--color-grey-200, #e5e7eb);
          border-top-color: var(--color-blue-500, #3b82f6);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .vcp-changes .changes-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-orange-600, #ea580c);
          margin-bottom: 0.75rem;
        }

        .vcp-changes .changes-header svg {
          width: 1rem;
          height: 1rem;
        }

        .changes-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .change-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .change-type {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.25rem;
          height: 1.25rem;
          font-weight: 600;
          border-radius: 0.25rem;
        }

        .change-type--modified {
          background: var(--color-orange-100, #ffedd5);
          color: var(--color-orange-700, #c2410c);
        }

        .change-type--new {
          background: var(--color-green-100, #dcfce7);
          color: var(--color-green-700, #15803d);
        }

        .change-file {
          color: var(--color-grey-700, #374151);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .changes-more {
          font-size: 0.75rem;
          color: var(--color-grey-500, #6b7280);
          padding-left: 1.75rem;
        }

        .vcp-clean {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-green-600, #16a34a);
          font-size: 0.875rem;
        }

        .vcp-clean svg {
          width: 1rem;
          height: 1rem;
        }

        .vcp-commit {
          padding: 0 1rem 1rem;
        }

        .vcp-textarea {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid var(--color-grey-300, #d1d5db);
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-family: inherit;
          resize: none;
          margin-bottom: 0.5rem;
        }

        .vcp-textarea:focus {
          outline: none;
          border-color: var(--color-blue-500, #3b82f6);
          box-shadow: 0 0 0 3px var(--color-blue-100, #dbeafe);
        }

        .vcp-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--color-grey-300, #d1d5db);
          border-radius: 0.375rem;
          font-size: 0.75rem;
        }

        .vcp-input--small {
          padding: 0.375rem 0.5rem;
        }

        .vcp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0 1rem 1rem;
        }

        .vcp-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          font-weight: 500;
          border: 1px solid var(--color-grey-300, #d1d5db);
          border-radius: 0.5rem;
          background: white;
          color: var(--color-grey-700, #374151);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .vcp-btn:hover:not(:disabled) {
          background: var(--color-grey-50, #f9fafb);
          border-color: var(--color-grey-400, #9ca3af);
        }

        .vcp-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .vcp-btn svg {
          width: 1rem;
          height: 1rem;
        }

        .vcp-btn--small {
          padding: 0.375rem 0.5rem;
          font-size: 0.75rem;
        }

        .vcp-btn--primary {
          background: var(--color-blue-500, #3b82f6);
          border-color: var(--color-blue-500, #3b82f6);
          color: white;
        }

        .vcp-btn--primary:hover:not(:disabled) {
          background: var(--color-blue-600, #2563eb);
          border-color: var(--color-blue-600, #2563eb);
        }

        .vcp-btn--success {
          background: var(--color-green-500, #22c55e);
          border-color: var(--color-green-500, #22c55e);
          color: white;
        }

        .vcp-btn--success:hover:not(:disabled) {
          background: var(--color-green-600, #16a34a);
          border-color: var(--color-green-600, #16a34a);
        }

        .vcp-btn--full {
          width: 100%;
          justify-content: center;
        }

        .vcp-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--color-red-50, #fef2f2);
          border-top: 1px solid var(--color-red-100, #fee2e2);
          color: var(--color-red-700, #b91c1c);
          font-size: 0.8125rem;
        }

        .vcp-error button {
          background: none;
          border: none;
          color: var(--color-red-600, #dc2626);
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default VersionControlPanel;
