import React, { useState } from 'react';
import { useVersionControl } from '../context/VersionControlContext';
import type { GitCommit } from '../context/VersionControlContext';

interface VersionHistoryDrawerProps {
  onClose?: () => void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({ onClose }) => {
  const { state, actions } = useVersionControl();
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [revertTarget, setRevertTarget] = useState<string | null>(null);

  if (!state.isHistoryOpen) return null;

  const handleClose = () => {
    actions.closeHistory();
    onClose?.();
  };

  const handleSelectCommit = (commit: GitCommit) => {
    setSelectedCommit(commit);
    actions.viewCommit(commit.hash);
  };

  const handleRevertClick = (hash: string) => {
    setRevertTarget(hash);
    setShowRevertConfirm(true);
  };

  const handleRevertConfirm = async () => {
    if (revertTarget) {
      await actions.revertToCommit(revertTarget);
      setShowRevertConfirm(false);
      setRevertTarget(null);
    }
  };

  return (
    <div className="version-history-overlay">
      <div className="version-history-drawer">
        {/* Header */}
        <div className="vhd-header">
          <div className="vhd-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Version History</span>
          </div>
          <button className="vhd-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="vhd-content">
          {/* Commit List */}
          <div className="vhd-list">
            {state.isLoading ? (
              <div className="vhd-loading">
                <div className="spinner" />
                <span>Loading history...</span>
              </div>
            ) : state.commits.length === 0 ? (
              <div className="vhd-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p>No version history yet</p>
                <span>Save your first version to start tracking changes</span>
              </div>
            ) : (
              <div className="commit-list">
                {state.commits.map((commit, index) => (
                  <div
                    key={commit.hash}
                    className={`commit-item ${selectedCommit?.hash === commit.hash ? 'selected' : ''}`}
                    onClick={() => handleSelectCommit(commit)}
                  >
                    <div className="commit-timeline">
                      <div className="timeline-dot" />
                      {index < state.commits.length - 1 && <div className="timeline-line" />}
                    </div>
                    <div className="commit-content">
                      <div className="commit-message">{commit.message}</div>
                      <div className="commit-meta">
                        <span className="commit-hash">{commit.shortHash}</span>
                        <span className="commit-date">{commit.relativeDate}</span>
                        <span className="commit-author">{commit.author}</span>
                      </div>
                      <div className="commit-actions">
                        <button
                          className="commit-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevertClick(commit.hash);
                          }}
                          title="Restore this version"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Restore
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Commit Details */}
          {selectedCommit && (
            <div className="vhd-detail">
              <div className="detail-header">
                <h3>Commit Details</h3>
                <button
                  className="detail-close"
                  onClick={() => setSelectedCommit(null)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="detail-content">
                <div className="detail-row">
                  <label>Message</label>
                  <p>{selectedCommit.message}</p>
                </div>
                <div className="detail-row">
                  <label>Commit Hash</label>
                  <code>{selectedCommit.hash}</code>
                </div>
                <div className="detail-row">
                  <label>Author</label>
                  <span>{selectedCommit.author}</span>
                </div>
                <div className="detail-row">
                  <label>Date</label>
                  <span>{new Date(selectedCommit.date).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revert Confirmation Dialog */}
        {showRevertConfirm && (
          <div className="revert-confirm-overlay">
            <div className="revert-confirm-dialog">
              <h3>Restore Version?</h3>
              <p>
                This will restore your specification files to this version.
                Any unsaved changes will be lost.
              </p>
              <div className="revert-confirm-actions">
                <button
                  className="revert-cancel-btn"
                  onClick={() => {
                    setShowRevertConfirm(false);
                    setRevertTarget(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="revert-confirm-btn"
                  onClick={handleRevertConfirm}
                >
                  Restore Version
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .version-history-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          justify-content: flex-end;
          background: rgba(0, 0, 0, 0.3);
        }

        .version-history-drawer {
          width: 480px;
          max-width: 90vw;
          height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .vhd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--color-grey-200, #e5e7eb);
          background: var(--color-grey-50, #f9fafb);
        }

        .vhd-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-grey-800, #1f2937);
        }

        .vhd-title svg {
          width: 1.25rem;
          height: 1.25rem;
          color: var(--color-blue-500, #3b82f6);
        }

        .vhd-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border: none;
          background: none;
          color: var(--color-grey-500, #6b7280);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.15s ease;
        }

        .vhd-close:hover {
          background: var(--color-grey-100, #f3f4f6);
          color: var(--color-grey-700, #374151);
        }

        .vhd-close svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .vhd-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .vhd-list {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .vhd-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
          color: var(--color-grey-500, #6b7280);
        }

        .spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid var(--color-grey-200, #e5e7eb);
          border-top-color: var(--color-blue-500, #3b82f6);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .vhd-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 2rem;
          color: var(--color-grey-500, #6b7280);
        }

        .vhd-empty svg {
          width: 3rem;
          height: 3rem;
          margin-bottom: 1rem;
          color: var(--color-grey-300, #d1d5db);
        }

        .vhd-empty p {
          font-weight: 500;
          color: var(--color-grey-600, #4b5563);
          margin-bottom: 0.25rem;
        }

        .vhd-empty span {
          font-size: 0.875rem;
        }

        .commit-list {
          display: flex;
          flex-direction: column;
        }

        .commit-item {
          display: flex;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.75rem;
          margin: -0.75rem;
          margin-bottom: 0;
          border-radius: 0.5rem;
          transition: background 0.15s ease;
        }

        .commit-item:hover {
          background: var(--color-grey-50, #f9fafb);
        }

        .commit-item.selected {
          background: var(--color-blue-50, #eff6ff);
        }

        .commit-timeline {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 0.25rem;
        }

        .timeline-dot {
          width: 0.625rem;
          height: 0.625rem;
          background: var(--color-blue-500, #3b82f6);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .commit-item.selected .timeline-dot {
          box-shadow: 0 0 0 3px var(--color-blue-100, #dbeafe);
        }

        .timeline-line {
          width: 2px;
          flex: 1;
          background: var(--color-grey-200, #e5e7eb);
          margin: 0.375rem 0;
        }

        .commit-content {
          flex: 1;
          min-width: 0;
          padding-bottom: 1rem;
        }

        .commit-message {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-grey-800, #1f2937);
          margin-bottom: 0.375rem;
          line-height: 1.4;
        }

        .commit-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--color-grey-500, #6b7280);
          margin-bottom: 0.5rem;
        }

        .commit-hash {
          font-family: 'SF Mono', Monaco, monospace;
          background: var(--color-grey-100, #f3f4f6);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }

        .commit-actions {
          display: flex;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .commit-item:hover .commit-actions {
          opacity: 1;
        }

        .commit-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          color: var(--color-grey-600, #4b5563);
          background: white;
          border: 1px solid var(--color-grey-300, #d1d5db);
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .commit-action-btn:hover {
          background: var(--color-grey-50, #f9fafb);
          border-color: var(--color-grey-400, #9ca3af);
        }

        .commit-action-btn svg {
          width: 0.875rem;
          height: 0.875rem;
        }

        .vhd-detail {
          border-top: 1px solid var(--color-grey-200, #e5e7eb);
          background: var(--color-grey-50, #f9fafb);
          max-height: 40%;
          overflow-y: auto;
        }

        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-grey-200, #e5e7eb);
        }

        .detail-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-grey-700, #374151);
        }

        .detail-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border: none;
          background: none;
          color: var(--color-grey-500, #6b7280);
          cursor: pointer;
          border-radius: 0.25rem;
        }

        .detail-close:hover {
          background: var(--color-grey-200, #e5e7eb);
        }

        .detail-close svg {
          width: 0.875rem;
          height: 0.875rem;
        }

        .detail-content {
          padding: 1rem;
        }

        .detail-row {
          margin-bottom: 0.75rem;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-row label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-grey-500, #6b7280);
          margin-bottom: 0.25rem;
        }

        .detail-row p,
        .detail-row span {
          font-size: 0.875rem;
          color: var(--color-grey-800, #1f2937);
        }

        .detail-row code {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.75rem;
          background: var(--color-grey-100, #f3f4f6);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          display: inline-block;
          word-break: break-all;
        }

        .revert-confirm-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          z-index: 10;
        }

        .revert-confirm-dialog {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          width: 90%;
          max-width: 360px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .revert-confirm-dialog h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-grey-800, #1f2937);
          margin-bottom: 0.5rem;
        }

        .revert-confirm-dialog p {
          font-size: 0.875rem;
          color: var(--color-grey-600, #4b5563);
          margin-bottom: 1.25rem;
          line-height: 1.5;
        }

        .revert-confirm-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .revert-cancel-btn,
        .revert-confirm-btn {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .revert-cancel-btn {
          background: white;
          border: 1px solid var(--color-grey-300, #d1d5db);
          color: var(--color-grey-700, #374151);
        }

        .revert-cancel-btn:hover {
          background: var(--color-grey-50, #f9fafb);
        }

        .revert-confirm-btn {
          background: var(--color-blue-500, #3b82f6);
          border: 1px solid var(--color-blue-500, #3b82f6);
          color: white;
        }

        .revert-confirm-btn:hover {
          background: var(--color-blue-600, #2563eb);
        }

        @media (max-width: 640px) {
          .version-history-drawer {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default VersionHistoryDrawer;
