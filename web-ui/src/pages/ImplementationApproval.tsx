import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button, PageLayout } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { usePhaseApprovals } from '../context/EntityStateContext';
import { INTEGRATION_URL } from '../api/client';

interface ImplementationItem {
  id: string;
  name: string;
  type: 'system' | 'ai-principles' | 'code' | 'run';
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

const defaultImplementationItems: ImplementationItem[] = [
  {
    id: 'system-review',
    name: 'System Architecture Review',
    type: 'system',
    status: 'draft',
    description: 'Review system diagram and architecture decisions',
    checklistItems: [
      { id: 'system-documented', label: 'System architecture is documented', checked: false },
      { id: 'system-components', label: 'All components are identified', checked: false },
      { id: 'system-dependencies', label: 'Dependencies are mapped', checked: false },
    ],
  },
  {
    id: 'ai-principles-review',
    name: 'AI Principles Configuration',
    type: 'ai-principles',
    status: 'draft',
    description: 'Review AI principles and code generation settings',
    checklistItems: [
      { id: 'ai-configured', label: 'AI principles are configured', checked: false },
      { id: 'ai-presets', label: 'AI presets are set up', checked: false },
      { id: 'ai-guidelines', label: 'Code generation guidelines are defined', checked: false },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Generation Review',
    type: 'code',
    status: 'draft',
    description: 'Review generated code and implementation quality',
    checklistItems: [
      { id: 'code-generated', label: 'Code has been generated', checked: false },
      { id: 'code-reviewed', label: 'Generated code has been reviewed', checked: false },
      { id: 'code-quality', label: 'Code meets quality standards', checked: false },
      { id: 'code-tested', label: 'Code has been tested', checked: false },
    ],
  },
  {
    id: 'run-review',
    name: 'Application Run & Test',
    type: 'run',
    status: 'draft',
    description: 'Verify application runs correctly and meets requirements',
    checklistItems: [
      { id: 'app-runs', label: 'Application runs without errors', checked: false },
      { id: 'app-functional', label: 'Core functionality works', checked: false },
      { id: 'app-tested', label: 'User acceptance testing complete', checked: false },
    ],
  },
];

export const ImplementationApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const {
    phaseApprovals,
    approvePhase: approvePhaseDb,
    revokePhase: revokePhaseDb,
    isPhaseApproved,
  } = usePhaseApprovals();
  const [loading, setLoading] = useState(false);
  const [implementationItems, setImplementationItems] = useState<ImplementationItem[]>([]);

  // Get phase approval state from database
  const implementationApproved = isPhaseApproved('implementation');
  const implementationPhaseApproval = phaseApprovals.get('implementation');
  const approvalDate = implementationPhaseApproval?.approved_at || null;

  // Item approval tracking
  const [itemApprovals, setItemApprovals] = useState<ItemApprovalStatus>({});

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: ImplementationItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Load implementation phase items
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadImplementationItems();
    }
  }, [currentWorkspace?.id]);

  const loadImplementationItems = async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    try {
      let approvals: ItemApprovalStatus = {};

      // Try to load from file first (for shared/imported workspaces)
      if (currentWorkspace?.projectFolder) {
        try {
          const response = await fetch(`${INTEGRATION_URL}/read-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: `${currentWorkspace.projectFolder}/approvals/implementation-approvals.json`
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.content) {
              const fileApprovals = JSON.parse(data.content);
              approvals = fileApprovals.itemApprovals || {};
              localStorage.setItem(`implementation-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));

              if (fileApprovals.phaseApproved) {
                setImplementationApproved(true);
                setApprovalDate(fileApprovals.phaseApprovedDate || null);
                localStorage.setItem(`implementation-approved-${currentWorkspace.id}`, JSON.stringify({
                  approved: true,
                  date: fileApprovals.phaseApprovedDate
                }));
              }
            }
          }
        } catch (err) {
          console.log('No approval file found, checking localStorage');
        }
      }

      // Fallback to localStorage if no file data
      if (Object.keys(approvals).length === 0) {
        const stored = localStorage.getItem(`implementation-item-approvals-${currentWorkspace.id}`);
        approvals = stored ? JSON.parse(stored) : {};
      }

      setItemApprovals(approvals);

      // Apply saved status to default items
      const itemsWithStatus = defaultImplementationItems.map(item => {
        const approval = approvals[item.id];
        if (approval) {
          return {
            ...item,
            status: approval.status,
            rejectionComment: approval.comment,
            reviewedAt: approval.reviewedAt,
            checklistItems: approval.checklistItems || item.checklistItems,
          };
        }
        return item;
      });

      setImplementationItems(itemsWithStatus);

      // Phase approval state is now managed by usePhaseApprovals hook from EntityStateContext
      // No need to check localStorage - implementationApproved and approvalDate
      // are derived from the phaseApprovals Map
    } catch (err) {
      console.error('Failed to load implementation items:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveItemApprovals = async (approvals: ItemApprovalStatus) => {
    if (!currentWorkspace?.id) return;
    localStorage.setItem(`implementation-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));
    setItemApprovals(approvals);

    // Save to file for sharing/import
    if (currentWorkspace?.projectFolder) {
      try {
        const fileContent = JSON.stringify({
          phase: 'implementation',
          itemApprovals: approvals,
          phaseApproved: implementationApproved,
          phaseApprovedDate: approvalDate,
          lastUpdated: new Date().toISOString(),
        }, null, 2);

        await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            specifications: [{
              filename: 'approvals/implementation-approvals.json',
              content: fileContent,
            }],
          }),
        });
      } catch (err) {
        console.error('Failed to save approvals to file:', err);
      }
    }
  };

  const savePhaseApprovalToFile = async (approved: boolean, date: string | null) => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const fileContent = JSON.stringify({
        phase: 'implementation',
        itemApprovals: itemApprovals,
        phaseApproved: approved,
        phaseApprovedDate: date,
        lastUpdated: new Date().toISOString(),
      }, null, 2);

      await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          specifications: [{
            filename: 'approvals/implementation-approvals.json',
            content: fileContent,
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to save phase approval to file:', err);
    }
  };

  const handleChecklistChange = (item: ImplementationItem, checklistId: string, checked: boolean) => {
    const updatedChecklistItems = item.checklistItems?.map(ci =>
      ci.id === checklistId ? { ...ci, checked } : ci
    ) || [];

    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        ...itemApprovals[item.id],
        status: itemApprovals[item.id]?.status || 'draft' as const,
        checklistItems: updatedChecklistItems,
      },
    };
    saveItemApprovals(newApprovals);
    loadImplementationItems();
  };

  const handleApproveItem = (item: ImplementationItem) => {
    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
        checklistItems: item.checklistItems,
      },
    };
    saveItemApprovals(newApprovals);
    loadImplementationItems();
  };

  const handleRejectItem = (item: ImplementationItem) => {
    setRejectionModal({ isOpen: true, item });
    setRejectionComment('');
  };

  const confirmRejectItem = () => {
    if (!rejectionModal.item) return;

    const newApprovals = {
      ...itemApprovals,
      [rejectionModal.item.id]: {
        status: 'rejected' as const,
        comment: rejectionComment,
        reviewedAt: new Date().toISOString(),
        checklistItems: rejectionModal.item.checklistItems,
      },
    };
    saveItemApprovals(newApprovals);
    loadImplementationItems();
    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const handleResetItemStatus = (item: ImplementationItem) => {
    const newApprovals = { ...itemApprovals };
    delete newApprovals[item.id];
    saveItemApprovals(newApprovals);
    loadImplementationItems();
  };

  const getTotalItems = () => implementationItems.length;
  const getTotalApproved = () => implementationItems.filter(i => i.status === 'approved').length;
  const getTotalRejected = () => implementationItems.filter(i => i.status === 'rejected').length;

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

  const handleApproveImplementation = async () => {
    if (!currentWorkspace?.id) return;

    // Use database-backed approval
    await approvePhaseDb('implementation');

    // Also save to file for sharing/import (backwards compatibility)
    await savePhaseApprovalToFile(true, new Date().toISOString());
  };

  const handleRevokeApproval = async () => {
    if (!currentWorkspace?.id) return;

    // Use database-backed revocation
    await revokePhaseDb('implementation');

    // Also save to file for sharing/import (backwards compatibility)
    await savePhaseApprovalToFile(false, null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'rgba(52, 199, 89, 0.1)',
          color: 'var(--color-systemGreen)',
          text: 'Approved',
          icon: '✓',
        };
      case 'rejected':
        return {
          bg: 'rgba(255, 59, 48, 0.1)',
          color: 'var(--color-systemRed)',
          text: 'Rejected',
          icon: '✕',
        };
      default:
        return {
          bg: 'rgba(142, 142, 147, 0.1)',
          color: 'var(--color-systemGray)',
          text: 'Pending Review',
          icon: '○',
        };
    }
  };

  const getPathForType = (type: string) => {
    switch (type) {
      case 'system': return '/system';
      case 'ai-principles': return '/ai-principles';
      case 'code': return '/code';
      case 'run': return '/run';
      default: return '/code';
    }
  };

  const renderImplementationItemCard = (item: ImplementationItem) => {
    const badge = getStatusBadge(item.status);
    const currentChecklistItems = itemApprovals[item.id]?.checklistItems || item.checklistItems || [];
    const allChecked = currentChecklistItems.every(ci => ci.checked);

    return (
      <Card key={item.id} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                color: badge.color,
                fontSize: '18px',
                fontWeight: 'bold',
              }}>
                {badge.icon}
              </span>
              <h3 className="text-headline">{item.name}</h3>
              <span style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '12px',
                backgroundColor: badge.bg,
                color: badge.color,
              }}>
                {badge.text}
              </span>
            </div>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              {item.description}
            </p>

            {/* Checklist */}
            <div style={{ marginBottom: '16px' }}>
              <p className="text-subheadline" style={{ marginBottom: '8px', fontWeight: 600 }}>
                Review Checklist:
              </p>
              {currentChecklistItems.map(ci => (
                <label key={ci.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  marginBottom: '4px',
                  borderRadius: '6px',
                  backgroundColor: ci.checked ? 'rgba(52, 199, 89, 0.05)' : 'var(--color-tertiarySystemBackground)',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={ci.checked}
                    onChange={(e) => handleChecklistChange(item, ci.id, e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span className="text-body" style={{
                    color: ci.checked ? 'var(--color-systemGreen)' : 'var(--color-label)',
                  }}>
                    {ci.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Rejection comment */}
            {item.status === 'rejected' && itemApprovals[item.id]?.comment && (
              <div style={{
                padding: '10px',
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                borderRadius: '6px',
                borderLeft: '3px solid var(--color-systemRed)',
                marginBottom: '16px',
              }}>
                <p className="text-caption1" style={{ fontWeight: 600, color: 'var(--color-systemRed)', marginBottom: '4px' }}>
                  Rejection Reason:
                </p>
                <p className="text-body" style={{ color: 'var(--color-label)' }}>
                  {itemApprovals[item.id]?.comment}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
            <Button
              variant="secondary"
              onClick={() => navigate(`${getPathForType(item.type)}?open=${encodeURIComponent(item.id)}`)}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Review
            </Button>

            {item.status !== 'approved' && (
              <Button
                variant="primary"
                onClick={() => handleApproveItem(item)}
                disabled={!allChecked}
                style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: allChecked ? 'var(--color-systemGreen)' : undefined }}
              >
                Approve
              </Button>
            )}

            {item.status !== 'rejected' && (
              <Button
                variant="secondary"
                onClick={() => handleRejectItem(item)}
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-systemRed)', borderColor: 'var(--color-systemRed)' }}
              >
                Reject
              </Button>
            )}

            {(item.status === 'approved' || item.status === 'rejected') && (
              <button
                onClick={() => handleResetItemStatus(item)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-systemGray)',
                  fontSize: '11px',
                  padding: '6px',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <PageLayout
      title="System Phase Approval"
      quickDescription="Review and approve all system derivation phase items."
      detailedDescription="The System phase includes System Architecture, AI Principles configuration, Code Generation, and Run Configuration.
Each item has specific checklist requirements that must be satisfied.
Complete all reviews and approve each section before proceeding to Control Loop."
      className="max-w-7xl mx-auto"
    >

      {/* Phase Status Overview */}
      <Card style={{ marginBottom: '24px', backgroundColor: 'var(--color-secondarySystemBackground)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Progress Circle */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: `conic-gradient(
              ${implementationApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
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
              {implementationApproved
                ? 'System Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Final Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {implementationApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Completed on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div>
            {implementationApproved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/testing-approval')}>
                  Proceed to Control Loop
                </Button>
                <button
                  onClick={handleRevokeApproval}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-systemRed)',
                    fontSize: '12px',
                  }}
                >
                  Revoke Approval
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleApproveImplementation}
                disabled={!canApprovePhase()}
              >
                Approve System Phase
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Requirements Info */}
      {!canApprovePhase() && !implementationApproved && (
        <Alert type={getTotalRejected() > 0 ? 'error' : 'info'} style={{ marginBottom: '24px' }}>
          <strong>{getTotalRejected() > 0 ? 'Action Required:' : 'Requirements for Completion:'}</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {getTotalRejected() > 0 && <li style={{ color: 'var(--color-systemRed)' }}>Resolve {getTotalRejected()} rejected item(s) - update and re-approve</li>}
            {getTotalItems() > getTotalApproved() + getTotalRejected() && <li>{getTotalItems() - getTotalApproved() - getTotalRejected()} item(s) still need review and approval</li>}
            <li>Complete all checklist items before approving each section</li>
          </ul>
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-body text-secondary">Loading implementation items...</p>
        </div>
      ) : (
        <>
          {/* Implementation Item Cards */}
          {implementationItems.map(item => renderImplementationItemCard(item))}
        </>
      )}

      {/* INTENT Info */}
      <Alert type="info" style={{ marginTop: '24px' }}>
        <strong>INTENT System Phase:</strong> The system derivation phase is where your application comes to life.
        Ensure the system architecture is documented, AI principles are configured, code is generated and reviewed,
        and the application runs correctly. This gate validates that the implementation meets all requirements before proceeding to Control Loop.
      </Alert>

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <Card style={{ maxWidth: '500px', width: '100%' }}>
            <h2 className="text-title1" style={{ marginBottom: '16px', color: 'var(--color-systemRed)' }}>
              Reject Item
            </h2>
            <p className="text-body" style={{ marginBottom: '16px' }}>
              You are rejecting: <strong>{rejectionModal.item?.name}</strong>
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
                Rejection Comment <span style={{ color: 'var(--color-systemRed)' }}>*</span>
              </label>
              <textarea
                className="input"
                rows={4}
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Please explain why this item is being rejected and what changes are needed..."
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
                variant="primary"
                onClick={confirmRejectItem}
                disabled={!rejectionComment.trim()}
                style={{ backgroundColor: 'var(--color-systemRed)' }}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};
