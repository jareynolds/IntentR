import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface DesignItem {
  id: string;
  name: string;
  type: 'ui-assets' | 'ui-framework' | 'ui-styles' | 'ui-designer';
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  description?: string;
  lastModified?: string;
  reviewedAt?: string;
  rejectionComment?: string;
  checklistItems?: { id: string; label: string; checked: boolean }[];
}

interface PhaseStatus {
  uiAssets: { total: number; approved: number; rejected: number; items: DesignItem[] };
  uiFramework: { total: number; approved: number; rejected: number; items: DesignItem[] };
  uiStyles: { total: number; approved: number; rejected: number; items: DesignItem[] };
  uiDesigner: { total: number; approved: number; rejected: number; items: DesignItem[] };
}

interface ItemApprovalStatus {
  [itemId: string]: {
    status: 'approved' | 'rejected' | 'draft';
    comment?: string;
    reviewedAt?: string;
    checklistItems?: { id: string; label: string; checked: boolean }[];
  };
}

const defaultDesignItems: DesignItem[] = [
  {
    id: 'ui-assets-review',
    name: 'UI Assets Review',
    type: 'ui-assets',
    status: 'draft',
    description: 'Review all uploaded design assets, screenshots, and mockups',
    checklistItems: [
      { id: 'assets-uploaded', label: 'Design assets have been uploaded', checked: false },
      { id: 'assets-organized', label: 'Assets are properly organized and named', checked: false },
      { id: 'assets-complete', label: 'All required screens/components have assets', checked: false },
    ],
  },
  {
    id: 'ui-framework-review',
    name: 'UI Framework Selection',
    type: 'ui-framework',
    status: 'draft',
    description: 'Review and confirm the selected UI framework configuration',
    checklistItems: [
      { id: 'framework-selected', label: 'UI framework has been selected', checked: false },
      { id: 'framework-configured', label: 'Framework settings are configured', checked: false },
      { id: 'framework-documented', label: 'Framework choice is documented', checked: false },
    ],
  },
  {
    id: 'ui-styles-review',
    name: 'UI Styles Configuration',
    type: 'ui-styles',
    status: 'draft',
    description: 'Review color schemes, typography, and styling decisions',
    checklistItems: [
      { id: 'colors-defined', label: 'Color palette is defined', checked: false },
      { id: 'typography-set', label: 'Typography choices are set', checked: false },
      { id: 'spacing-defined', label: 'Spacing and layout rules are defined', checked: false },
    ],
  },
  {
    id: 'ui-designer-review',
    name: 'UI Designer Output',
    type: 'ui-designer',
    status: 'draft',
    description: 'Review generated UI components and design outputs',
    checklistItems: [
      { id: 'components-generated', label: 'UI components have been generated', checked: false },
      { id: 'components-reviewed', label: 'Generated components have been reviewed', checked: false },
      { id: 'components-approved', label: 'Component designs meet requirements', checked: false },
    ],
  },
];

export const DesignApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
    uiAssets: { total: 1, approved: 0, rejected: 0, items: [] },
    uiFramework: { total: 1, approved: 0, rejected: 0, items: [] },
    uiStyles: { total: 1, approved: 0, rejected: 0, items: [] },
    uiDesigner: { total: 1, approved: 0, rejected: 0, items: [] },
  });
  const [designApproved, setDesignApproved] = useState(false);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);

  // Item approval tracking
  const [itemApprovals, setItemApprovals] = useState<ItemApprovalStatus>({});

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: DesignItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Load design phase items
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadDesignItems();
    }
  }, [currentWorkspace?.id]);

  const loadDesignItems = async () => {
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
              filePath: `${currentWorkspace.projectFolder}/approvals/design-approvals.json`
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.content) {
              const fileApprovals = JSON.parse(data.content);
              approvals = fileApprovals.itemApprovals || {};
              localStorage.setItem(`design-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));

              if (fileApprovals.phaseApproved) {
                setDesignApproved(true);
                setApprovalDate(fileApprovals.phaseApprovedDate || null);
                localStorage.setItem(`design-approved-${currentWorkspace.id}`, JSON.stringify({
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
        const stored = localStorage.getItem(`design-item-approvals-${currentWorkspace.id}`);
        approvals = stored ? JSON.parse(stored) : {};
      }

      setItemApprovals(approvals);

      // Apply saved status to default items
      const itemsWithStatus = defaultDesignItems.map(item => {
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

      // Group items by type
      const uiAssetsItems = itemsWithStatus.filter(i => i.type === 'ui-assets');
      const uiFrameworkItems = itemsWithStatus.filter(i => i.type === 'ui-framework');
      const uiStylesItems = itemsWithStatus.filter(i => i.type === 'ui-styles');
      const uiDesignerItems = itemsWithStatus.filter(i => i.type === 'ui-designer');

      setPhaseStatus({
        uiAssets: {
          total: uiAssetsItems.length,
          approved: uiAssetsItems.filter(i => i.status === 'approved').length,
          rejected: uiAssetsItems.filter(i => i.status === 'rejected').length,
          items: uiAssetsItems,
        },
        uiFramework: {
          total: uiFrameworkItems.length,
          approved: uiFrameworkItems.filter(i => i.status === 'approved').length,
          rejected: uiFrameworkItems.filter(i => i.status === 'rejected').length,
          items: uiFrameworkItems,
        },
        uiStyles: {
          total: uiStylesItems.length,
          approved: uiStylesItems.filter(i => i.status === 'approved').length,
          rejected: uiStylesItems.filter(i => i.status === 'rejected').length,
          items: uiStylesItems,
        },
        uiDesigner: {
          total: uiDesignerItems.length,
          approved: uiDesignerItems.filter(i => i.status === 'approved').length,
          rejected: uiDesignerItems.filter(i => i.status === 'rejected').length,
          items: uiDesignerItems,
        },
      });

      // Check if design phase is already approved
      const phaseApproval = localStorage.getItem(`design-approved-${currentWorkspace.id}`);
      if (phaseApproval) {
        const data = JSON.parse(phaseApproval);
        setDesignApproved(data.approved);
        setApprovalDate(data.date);
      }
    } catch (err) {
      console.error('Failed to load design items:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveItemApprovals = async (approvals: ItemApprovalStatus) => {
    if (!currentWorkspace?.id) return;
    localStorage.setItem(`design-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));
    setItemApprovals(approvals);

    // Save to file for sharing/import
    if (currentWorkspace?.projectFolder) {
      try {
        const fileContent = JSON.stringify({
          phase: 'design',
          itemApprovals: approvals,
          phaseApproved: designApproved,
          phaseApprovedDate: approvalDate,
          lastUpdated: new Date().toISOString(),
        }, null, 2);

        await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            specifications: [{
              filename: 'approvals/design-approvals.json',
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
        phase: 'design',
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
            filename: 'approvals/design-approvals.json',
            content: fileContent,
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to save phase approval to file:', err);
    }
  };

  const handleChecklistChange = (item: DesignItem, checklistId: string, checked: boolean) => {
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

    // Update phase status
    updatePhaseStatus();
  };

  const updatePhaseStatus = () => {
    loadDesignItems();
  };

  const handleApproveItem = (item: DesignItem) => {
    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
        checklistItems: item.checklistItems,
      },
    };
    saveItemApprovals(newApprovals);
    updatePhaseStatus();
  };

  const handleRejectItem = (item: DesignItem) => {
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
    updatePhaseStatus();
    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const handleResetItemStatus = (item: DesignItem) => {
    const newApprovals = { ...itemApprovals };
    delete newApprovals[item.id];
    saveItemApprovals(newApprovals);
    updatePhaseStatus();
  };

  const getTotalItems = () =>
    phaseStatus.uiAssets.total + phaseStatus.uiFramework.total + phaseStatus.uiStyles.total + phaseStatus.uiDesigner.total;

  const getTotalApproved = () =>
    phaseStatus.uiAssets.approved + phaseStatus.uiFramework.approved + phaseStatus.uiStyles.approved + phaseStatus.uiDesigner.approved;

  const getTotalRejected = () =>
    phaseStatus.uiAssets.rejected + phaseStatus.uiFramework.rejected + phaseStatus.uiStyles.rejected + phaseStatus.uiDesigner.rejected;

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

  const handleApproveDesign = async () => {
    if (!currentWorkspace?.id) return;

    const approvalData = {
      approved: true,
      date: new Date().toISOString(),
    };
    localStorage.setItem(`design-approved-${currentWorkspace.id}`, JSON.stringify(approvalData));
    setDesignApproved(true);
    setApprovalDate(approvalData.date);

    await savePhaseApprovalToFile(true, approvalData.date);
  };

  const handleRevokeApproval = async () => {
    if (!currentWorkspace?.id) return;

    localStorage.removeItem(`design-approved-${currentWorkspace.id}`);
    setDesignApproved(false);
    setApprovalDate(null);

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
      case 'ui-assets': return '/designs';
      case 'ui-framework': return '/ui-framework';
      case 'ui-styles': return '/ui-styles';
      case 'ui-designer': return '/ui-designer';
      default: return '/designs';
    }
  };

  const renderDesignItemCard = (item: DesignItem) => {
    const badge = getStatusBadge(item.status);
    const allChecked = item.checklistItems?.every(ci => ci.checked) || false;
    const currentChecklistItems = itemApprovals[item.id]?.checklistItems || item.checklistItems || [];

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

  const allItems = [
    ...phaseStatus.uiAssets.items,
    ...phaseStatus.uiFramework.items,
    ...phaseStatus.uiStyles.items,
    ...phaseStatus.uiDesigner.items,
  ];

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Design Phase Approval</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          Review and approve all design phase items before proceeding to Implementation.
        </p>
      </div>

      {/* Phase Status Overview */}
      <Card style={{ marginBottom: '24px', backgroundColor: 'var(--color-secondarySystemBackground)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Progress Circle */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: `conic-gradient(
              ${designApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
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
              {designApproved
                ? 'Design Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {designApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Approved on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div>
            {designApproved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/code')}>
                  Proceed to Implementation
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
                onClick={handleApproveDesign}
                disabled={!canApprovePhase()}
              >
                Approve Design Phase
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Requirements Info */}
      {!canApprovePhase() && !designApproved && (
        <Alert type={getTotalRejected() > 0 ? 'error' : 'info'} style={{ marginBottom: '24px' }}>
          <strong>{getTotalRejected() > 0 ? 'Action Required:' : 'Requirements for Approval:'}</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {getTotalRejected() > 0 && <li style={{ color: 'var(--color-systemRed)' }}>Resolve {getTotalRejected()} rejected item(s) - update and re-approve</li>}
            {getTotalItems() > getTotalApproved() + getTotalRejected() && <li>{getTotalItems() - getTotalApproved() - getTotalRejected()} item(s) still need review and approval</li>}
            <li>Complete all checklist items before approving each section</li>
          </ul>
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-body text-secondary">Loading design items...</p>
        </div>
      ) : (
        <>
          {/* Design Item Cards */}
          {allItems.map(item => renderDesignItemCard(item))}
        </>
      )}

      {/* SAWai Info */}
      <Alert type="info" style={{ marginTop: '24px' }}>
        <strong>SAWai Design Phase:</strong> The design phase establishes how your application will look and feel.
        Before proceeding to Implementation, ensure all UI assets, framework choices, styles, and component designs
        have been reviewed and approved. This gate ensures visual alignment before building.
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
    </div>
  );
};
