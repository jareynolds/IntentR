import React, { useState, useEffect, useRef } from 'react';
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
  const [bulkApprovalLoading, setBulkApprovalLoading] = useState(false);
  const [phaseActionLoading, setPhaseActionLoading] = useState(false);

  // Track if initial load is complete to avoid showing loading spinner on status updates
  const initialLoadComplete = useRef(false);
  const lastWorkspaceId = useRef<string | null>(null);

  // Load control-loop phase items - only on initial load or workspace change
  useEffect(() => {
    if (currentWorkspace?.id) {
      // Only do full load if workspace changed or first load
      if (lastWorkspaceId.current !== currentWorkspace.id) {
        lastWorkspaceId.current = currentWorkspace.id;
        initialLoadComplete.current = false;
        loadControlLoopItems();
      }
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
      initialLoadComplete.current = true;
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

  // Bulk approval helper functions
  const getTotalItems = () => controlLoopItems.length;
  const getTotalApproved = () => controlLoopItems.filter(i => i.status === 'approved').length;
  const getTotalRejected = () => controlLoopItems.filter(i => i.status === 'rejected').length;

  const getCompletionPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getTotalApproved() / total) * 100);
  };

  const canApprovePhase = () => {
    return (
      getTotalItems() > 0 &&
      getTotalItems() === getTotalApproved() &&
      getTotalRejected() === 0
    );
  };

  const getPendingItemsCount = () => {
    return controlLoopItems.filter(i => i.status !== 'approved' && i.status !== 'rejected').length;
  };

  const getApprovableItems = () => {
    return controlLoopItems.filter(i => i.status !== 'approved' && i.status !== 'rejected');
  };

  const handleBulkApprove = async () => {
    const pendingItems = getApprovableItems();
    if (pendingItems.length === 0) return;

    setBulkApprovalLoading(true);

    const reviewedAt = new Date().toISOString();
    const updatedItems = controlLoopItems.map(item => {
      if (item.status !== 'approved' && item.status !== 'rejected') {
        // Mark all checklist items as checked
        const checkedItems = item.checklistItems?.map(ci => ({ ...ci, checked: true })) || [];
        return {
          ...item,
          status: 'approved' as const,
          reviewedAt,
          rejectionComment: undefined,
          checklistItems: checkedItems,
        };
      }
      return item;
    });

    setControlLoopItems(updatedItems);
    await saveControlLoopItems(updatedItems);

    // Build updated approvals
    const newApprovals = { ...itemApprovals };
    pendingItems.forEach(item => {
      const checkedItems = item.checklistItems?.map(ci => ({ ...ci, checked: true })) || [];
      newApprovals[item.id] = {
        status: 'approved',
        reviewedAt,
        checklistItems: checkedItems,
      };
    });
    setItemApprovals(newApprovals);

    // Approve the phase in database since all items are now approved
    await approvePhaseDb('control_loop');
    setBulkApprovalLoading(false);
  };

  const handleApprovePhase = async () => {
    setPhaseActionLoading(true);
    try {
      await approvePhaseDb('control_loop');
    } finally {
      setPhaseActionLoading(false);
    }
  };

  const handleRevokePhaseApproval = async () => {
    setPhaseActionLoading(true);
    try {
      await revokePhaseDb('control_loop');
    } finally {
      setPhaseActionLoading(false);
    }
  };

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

      {/* Phase Status Overview */}
      <Card style={{ marginBottom: '24px', backgroundColor: 'var(--color-secondarySystemBackground)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Progress Circle */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: `conic-gradient(
              ${controlLoopApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
              var(--color-systemGray3) 0
            )`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-systemBackground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>
              {getCompletionPercentage()}%
            </div>
          </div>

          {/* Status Text */}
          <div style={{ flex: 1 }}>
            <h3 className="text-title2" style={{ marginBottom: '8px' }}>
              {controlLoopApproved
                ? 'Control Loop Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Final Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {controlLoopApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Completed on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button - Dual Purpose */}
          <div>
            {controlLoopApproved ? (
              /* State 3: Phase approved - Show "Complete" or navigation option */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/dashboard')}>
                  Complete →
                </Button>
                <button
                  onClick={handleRevokePhaseApproval}
                  disabled={phaseActionLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: phaseActionLoading ? 'not-allowed' : 'pointer',
                    color: 'var(--color-systemRed)',
                    fontSize: '12px',
                    opacity: phaseActionLoading ? 0.6 : 1,
                  }}
                >
                  {phaseActionLoading ? 'Processing...' : 'Revoke Approval'}
                </button>
              </div>
            ) : getPendingItemsCount() > 0 ? (
              /* State 1: Items pending - Show "Approve All" */
              <Button
                variant="primary"
                onClick={handleBulkApprove}
                disabled={bulkApprovalLoading || loading}
                style={{
                  backgroundColor: 'var(--color-systemGreen)',
                  opacity: (bulkApprovalLoading || loading) ? 0.6 : 1,
                }}
              >
                {bulkApprovalLoading ? 'Approving...' : `Approve All (${getPendingItemsCount()})`}
              </Button>
            ) : (
              /* State 2: All items approved, phase not yet approved - Show "Approve Phase" */
              <Button
                variant="primary"
                onClick={handleApprovePhase}
                disabled={!canApprovePhase() || phaseActionLoading}
              >
                {phaseActionLoading ? 'Approving...' : 'Approve Control Loop Phase'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={() => navigate('/control-loop')}>
          Back to Control Loop
        </Button>
      </div>

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
