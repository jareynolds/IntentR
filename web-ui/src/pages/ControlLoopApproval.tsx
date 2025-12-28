import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button, PageLayout } from '../components';
import { ValidationDashboard } from '../components/ValidationDashboard';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePhaseApprovals } from '../context/EntityStateContext';
import { INTEGRATION_URL } from '../api/client';

interface ControlLoopItem {
  id: string;
  name: string;
  type: 'scenarios' | 'coverage' | 'execution' | 'report';
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  description?: string;
  lastModified?: string;
  reviewedAt?: string;
  rejectionComment?: string;
  checklistItems?: { id: string; label: string; checked: boolean }[];
}

interface ItemApprovalStatus {
  [itemId: string]: {
    status: 'approved' | 'rejected' | 'draft';
    comment?: string;
    reviewedAt?: string;
    checklistItems?: { id: string; label: string; checked: boolean }[];
  };
}

const defaultControlLoopItems: ControlLoopItem[] = [
  {
    id: 'scenarios-review',
    name: 'Test Scenarios Review',
    type: 'scenarios',
    status: 'draft',
    description: 'Review Gherkin test scenarios for completeness and accuracy',
    checklistItems: [
      { id: 'scenarios-created', label: 'Test scenarios are created for all enablers', checked: false },
      { id: 'scenarios-linked', label: 'Scenarios are linked to requirements', checked: false },
      { id: 'scenarios-gherkin', label: 'Gherkin syntax is correct', checked: false },
      { id: 'scenarios-reviewed', label: 'Business stakeholders have reviewed scenarios', checked: false },
    ],
  },
  {
    id: 'coverage-review',
    name: 'Test Coverage Review',
    type: 'coverage',
    status: 'draft',
    description: 'Verify test coverage meets minimum thresholds',
    checklistItems: [
      { id: 'coverage-requirements', label: 'Requirement coverage >= 100%', checked: false },
      { id: 'coverage-critical', label: 'All critical requirements have tests', checked: false },
      { id: 'coverage-automation', label: 'Automation rate >= 70%', checked: false },
    ],
  },
  {
    id: 'execution-review',
    name: 'Test Execution Review',
    type: 'execution',
    status: 'draft',
    description: 'Review test execution results and pass rates',
    checklistItems: [
      { id: 'execution-all', label: 'All test scenarios have been executed', checked: false },
      { id: 'execution-pass-rate', label: 'Scenario pass rate >= 80%', checked: false },
      { id: 'execution-critical', label: 'Critical test pass rate = 100%', checked: false },
      { id: 'execution-no-blockers', label: 'No blocking issues remain', checked: false },
    ],
  },
  {
    id: 'report-review',
    name: 'Test Report Review',
    type: 'report',
    status: 'draft',
    description: 'Review and approve final test report',
    checklistItems: [
      { id: 'report-generated', label: 'Test report has been generated', checked: false },
      { id: 'report-metrics', label: 'All metrics are documented', checked: false },
      { id: 'report-issues', label: 'All issues are documented', checked: false },
      { id: 'report-sign-off', label: 'Stakeholder sign-off obtained', checked: false },
    ],
  },
];

export const ControlLoopApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const {
    phaseApprovals,
    approvePhase: approvePhaseDb,
    revokePhase: revokePhaseDb,
    isPhaseApproved,
  } = usePhaseApprovals();
  const [loading, setLoading] = useState(false);
  const [controlLoopItems, setControlLoopItems] = useState<ControlLoopItem[]>([]);

  // Get phase approval state from database
  const controlLoopApproved = isPhaseApproved('control_loop');
  const controlLoopPhaseApproval = phaseApprovals.get('control_loop');
  const approvalDate = controlLoopPhaseApproval?.approved_at || null;

  // Item approval tracking
  const [itemApprovals, setItemApprovals] = useState<ItemApprovalStatus>({});

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: ControlLoopItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Load control-loop phase items
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadControlLoopItems();
    }
  }, [currentWorkspace?.id]);

  const loadControlLoopItems = async () => {
    if (!currentWorkspace?.id || !currentWorkspace?.projectFolder) {
      setControlLoopItems(defaultControlLoopItems);
      return;
    }

    setLoading(true);
    try {
      // Try to load from file first (for shared/imported workspaces)
      try {
        const response = await fetch(`${INTEGRATION_URL}/read-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: `${currentWorkspace.projectFolder}/approvals/control-loop-approvals.json`
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.content) {
            const fileData = JSON.parse(data.content);
            const items = fileData.items || defaultControlLoopItems;
            setControlLoopItems(items);

            // Build item approvals from saved data
            const approvals: ItemApprovalStatus = {};
            items.forEach((item: ControlLoopItem) => {
              if (item.status === 'approved' || item.status === 'rejected') {
                approvals[item.id] = {
                  status: item.status,
                  comment: item.rejectionComment,
                  reviewedAt: item.reviewedAt,
                  checklistItems: item.checklistItems,
                };
              }
            });
            setItemApprovals(approvals);

            // Check if all items are approved
            const allApproved = items.every((item: ControlLoopItem) => item.status === 'approved');
            setControlLoopApproved(allApproved);
            if (allApproved) {
              const latestApproval = items.reduce((latest: string, item: ControlLoopItem) => {
                if (item.reviewedAt && item.reviewedAt > latest) return item.reviewedAt;
                return latest;
              }, '');
              setApprovalDate(latestApproval);
            }

            // Update localStorage with file data
            const storageKey = `phaseApprovals_${currentWorkspace.id}_control-loop`;
            localStorage.setItem(storageKey, JSON.stringify(items));
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.log('No approval file found, checking localStorage');
      }

      // Fallback to localStorage
      const storageKey = `phaseApprovals_${currentWorkspace?.id}_control-loop`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        const parsed = JSON.parse(savedData);
        setControlLoopItems(parsed);

        // Build item approvals from saved data
        const approvals: ItemApprovalStatus = {};
        parsed.forEach((item: ControlLoopItem) => {
          if (item.status === 'approved' || item.status === 'rejected') {
            approvals[item.id] = {
              status: item.status,
              comment: item.rejectionComment,
              reviewedAt: item.reviewedAt,
              checklistItems: item.checklistItems,
            };
          }
        });
        setItemApprovals(approvals);

        // Check if all items are approved
        const allApproved = parsed.every((item: ControlLoopItem) => item.status === 'approved');
        setControlLoopApproved(allApproved);
        if (allApproved) {
          const latestApproval = parsed.reduce((latest: string, item: ControlLoopItem) => {
            if (item.reviewedAt && item.reviewedAt > latest) return item.reviewedAt;
            return latest;
          }, '');
          setApprovalDate(latestApproval);
        }
      } else {
        setControlLoopItems(defaultControlLoopItems);
      }
    } catch (error) {
      console.error('Error loading control-loop items:', error);
      setControlLoopItems(defaultControlLoopItems);
    } finally {
      setLoading(false);
    }
  };

  const saveControlLoopItems = async (items: ControlLoopItem[]) => {
    if (!currentWorkspace?.id) return;

    // Save to localStorage immediately
    const storageKey = `phaseApprovals_${currentWorkspace.id}_control-loop`;
    localStorage.setItem(storageKey, JSON.stringify(items));

    // Save to file for sharing/import
    if (currentWorkspace.projectFolder) {
      try {
        const allApproved = items.every(item => item.status === 'approved');
        const latestApproval = items.reduce((latest: string, item: ControlLoopItem) => {
          if (item.reviewedAt && item.reviewedAt > latest) return item.reviewedAt;
          return latest;
        }, '');

        const fileContent = JSON.stringify({
          phase: 'control-loop',
          items: items,
          phaseApproved: allApproved,
          phaseApprovedDate: allApproved ? latestApproval : null,
          lastUpdated: new Date().toISOString(),
        }, null, 2);

        await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            specifications: [{
              filename: 'approvals/control-loop-approvals.json',
              content: fileContent,
            }],
          }),
        });
      } catch (err) {
        console.error('Failed to save control-loop approvals to file:', err);
      }
    }
  };

  const handleChecklistChange = (itemId: string, checklistId: string, checked: boolean) => {
    setControlLoopItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId && item.checklistItems) {
          return {
            ...item,
            checklistItems: item.checklistItems.map(ci =>
              ci.id === checklistId ? { ...ci, checked } : ci
            ),
          };
        }
        return item;
      });
      saveControlLoopItems(updated);
      return updated;
    });
  };

  const handleApproveItem = async (item: ControlLoopItem) => {
    const reviewedAt = new Date().toISOString();
    setControlLoopItems(prev => {
      const updated = prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'approved' as const, reviewedAt, rejectionComment: undefined }
          : i
      );
      saveControlLoopItems(updated);

      // Check if all items are now approved - if so, approve the phase in database
      const allApproved = updated.every(i => i.status === 'approved');
      if (allApproved) {
        approvePhaseDb('control_loop');
      }

      return updated;
    });

    setItemApprovals(prev => ({
      ...prev,
      [item.id]: {
        status: 'approved',
        reviewedAt,
        checklistItems: item.checklistItems,
      },
    }));
  };

  const handleRejectItem = async () => {
    if (!rejectionModal.item) return;

    const reviewedAt = new Date().toISOString();
    const item = rejectionModal.item;

    setControlLoopItems(prev => {
      const updated = prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'rejected' as const, reviewedAt, rejectionComment }
          : i
      );
      saveControlLoopItems(updated);
      return updated;
    });

    setItemApprovals(prev => ({
      ...prev,
      [item.id]: {
        status: 'rejected',
        comment: rejectionComment,
        reviewedAt,
        checklistItems: item.checklistItems,
      },
    }));

    // Revoke phase approval in database if it was approved
    if (controlLoopApproved) {
      await revokePhaseDb('control_loop');
    }

    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const handleResetItem = async (item: ControlLoopItem) => {
    setControlLoopItems(prev => {
      const updated = prev.map(i =>
        i.id === item.id
          ? {
              ...i,
              status: 'draft' as const,
              reviewedAt: undefined,
              rejectionComment: undefined,
              checklistItems: i.checklistItems?.map(ci => ({ ...ci, checked: false })),
            }
          : i
      );
      saveControlLoopItems(updated);
      return updated;
    });

    setItemApprovals(prev => {
      const updated = { ...prev };
      delete updated[item.id];
      return updated;
    });

    // Revoke phase approval in database if it was approved
    if (controlLoopApproved) {
      await revokePhaseDb('control_loop');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      case 'in_review':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'scenarios':
        return '[-]';
      case 'coverage':
        return '[%]';
      case 'execution':
        return '[>]';
      case 'report':
        return '[#]';
      default:
        return '[?]';
    }
  };

  const allChecklistsComplete = (item: ControlLoopItem) => {
    return item.checklistItems?.every(ci => ci.checked) ?? false;
  };

  const hasRejections = controlLoopItems.some(item => item.status === 'rejected');

  return (
    <PageLayout
      title="Control Loop Approval"
      quickDescription="Review and approve test scenarios, coverage, and execution results"
      detailedDescription="The Control Loop Approval page allows you to review and approve test scenarios, verify test coverage meets thresholds, review execution results, and sign off on final test reports before completing the control loop phase."
    >
      <style>{`
        .control-loop-approval-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--color-grey-600);
          margin-top: 4px;
        }

        .phase-status-banner {
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .phase-status-banner.approved {
          background: #dcfce7;
          border: 1px solid #22c55e;
        }

        .phase-status-banner.rejected {
          background: #fee2e2;
          border: 1px solid #ef4444;
        }

        .phase-status-banner.pending {
          background: #fef3c7;
          border: 1px solid #f59e0b;
        }

        .status-icon {
          font-size: 24px;
        }

        .status-text {
          font-weight: 500;
        }

        .status-date {
          font-size: 14px;
          color: var(--color-grey-600);
        }

        .items-grid {
          display: grid;
          gap: 16px;
        }

        .item-card {
          background: white;
          border-radius: 8px;
          border: 1px solid var(--color-grey-200);
          overflow: hidden;
        }

        .item-header {
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-grey-100);
        }

        .item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .item-icon {
          font-size: 24px;
          font-family: monospace;
        }

        .item-name {
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .item-description {
          font-size: 14px;
          color: var(--color-grey-600);
          margin-top: 2px;
        }

        .item-status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .item-content {
          padding: 16px 20px;
        }

        .checklist {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .checklist-item input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checklist-item label {
          font-size: 14px;
          color: var(--color-grey-700);
          cursor: pointer;
        }

        .checklist-item.checked label {
          color: var(--color-grey-500);
          text-decoration: line-through;
        }

        .item-actions {
          padding: 16px 20px;
          border-top: 1px solid var(--color-grey-100);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .rejection-comment {
          margin-top: 12px;
          padding: 12px;
          background: #fee2e2;
          border-radius: 6px;
          font-size: 14px;
          color: #991b1b;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          padding: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .modal-textarea {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          border: 1px solid var(--color-grey-300);
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
        }
      `}</style>

      <div style={{ padding: '16px', paddingBottom: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={() => navigate('/control-loop')}>
          Back to Control Loop
        </Button>
      </div>

      {/* Phase Status Banner */}
      {controlLoopApproved ? (
        <div className="phase-status-banner approved">
          <span className="status-icon">[OK]</span>
          <div>
            <div className="status-text">Control Loop Phase Approved</div>
            {approvalDate && (
              <div className="status-date">
                Approved on {new Date(approvalDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ) : hasRejections ? (
        <div className="phase-status-banner rejected">
          <span className="status-icon">[X]</span>
          <div>
            <div className="status-text">Items Require Attention</div>
            <div className="status-date">Some items have been rejected and need revision</div>
          </div>
        </div>
      ) : (
        <div className="phase-status-banner pending">
          <span className="status-icon">[!]</span>
          <div>
            <div className="status-text">Pending Approval</div>
            <div className="status-date">Review and approve all items to complete this phase</div>
          </div>
        </div>
      )}

      {/* Validation Dashboard */}
      <ValidationDashboard />

      {/* Control Loop Items */}
      <div className="items-grid">
        {controlLoopItems.map(item => (
          <div key={item.id} className="item-card">
            <div className="item-header">
              <div className="item-info">
                <span className="item-icon">{getTypeIcon(item.type)}</span>
                <div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                </div>
              </div>
              <span
                className="item-status"
                style={{ backgroundColor: getStatusColor(item.status) }}
              >
                {item.status === 'draft' ? 'Pending Review' : item.status.replace('_', ' ')}
              </span>
            </div>

            <div className="item-content">
              <div className="checklist">
                {item.checklistItems?.map(ci => (
                  <div
                    key={ci.id}
                    className={`checklist-item ${ci.checked ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      id={ci.id}
                      checked={ci.checked}
                      onChange={(e) => handleChecklistChange(item.id, ci.id, e.target.checked)}
                      disabled={item.status === 'approved'}
                    />
                    <label htmlFor={ci.id}>{ci.label}</label>
                  </div>
                ))}
              </div>

              {item.rejectionComment && (
                <div className="rejection-comment">
                  <strong>Rejection Reason:</strong> {item.rejectionComment}
                </div>
              )}
            </div>

            <div className="item-actions">
              {item.status === 'approved' ? (
                <Button variant="secondary" size="small" onClick={() => handleResetItem(item)}>
                  Reset
                </Button>
              ) : item.status === 'rejected' ? (
                <>
                  <Button variant="secondary" size="small" onClick={() => handleResetItem(item)}>
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleApproveItem(item)}
                    disabled={!allChecklistsComplete(item)}
                  >
                    Approve
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => setRejectionModal({ isOpen: true, item })}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleApproveItem(item)}
                    disabled={!allChecklistsComplete(item)}
                  >
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="modal-overlay" onClick={() => setRejectionModal({ isOpen: false, item: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Reject Item</h2>
            <p>Please provide a reason for rejecting "{rejectionModal.item?.name}":</p>
            <textarea
              className="modal-textarea"
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Enter rejection reason..."
            />
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectionModal({ isOpen: false, item: null });
                  setRejectionComment('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectItem}
                disabled={!rejectionComment.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default ControlLoopApproval;
