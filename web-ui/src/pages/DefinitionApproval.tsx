import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface DefinitionItem {
  id: string;
  name: string;
  type: 'capability' | 'enabler';
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  description?: string;
  lastModified?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionComment?: string;
  path?: string;
}

interface PhaseStatus {
  capabilities: { total: number; approved: number; rejected: number; items: DefinitionItem[] };
  enablers: { total: number; approved: number; rejected: number; items: DefinitionItem[] };
}

interface ItemApprovalStatus {
  [itemId: string]: {
    status: 'approved' | 'rejected' | 'draft';
    comment?: string;
    reviewedAt?: string;
  };
}

export const DefinitionApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
    capabilities: { total: 0, approved: 0, rejected: 0, items: [] },
    enablers: { total: 0, approved: 0, rejected: 0, items: [] },
  });
  const [definitionApproved, setDefinitionApproved] = useState(false);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);

  // Item approval tracking
  const [itemApprovals, setItemApprovals] = useState<ItemApprovalStatus>({});

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: DefinitionItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Load definition phase items
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      loadDefinitionItems();
      loadItemApprovals();
    }
  }, [currentWorkspace?.projectFolder]);

  const loadItemApprovals = async () => {
    if (!currentWorkspace?.id || !currentWorkspace?.projectFolder) return;

    // Try to load from file first (for shared/imported workspaces)
    try {
      const response = await fetch(`${INTEGRATION_URL}/read-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: `${currentWorkspace.projectFolder}/approvals/definition-approvals.json`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          const fileApprovals = JSON.parse(data.content);
          setItemApprovals(fileApprovals.itemApprovals || {});
          localStorage.setItem(`definition-item-approvals-${currentWorkspace.id}`, JSON.stringify(fileApprovals.itemApprovals || {}));

          if (fileApprovals.phaseApproved) {
            setDefinitionApproved(true);
            setApprovalDate(fileApprovals.phaseApprovedDate || null);
            localStorage.setItem(`definition-approved-${currentWorkspace.id}`, JSON.stringify({
              approved: true,
              date: fileApprovals.phaseApprovedDate
            }));
          }
          return;
        }
      }
    } catch (err) {
      console.log('No approval file found, checking localStorage');
    }

    const stored = localStorage.getItem(`definition-item-approvals-${currentWorkspace.id}`);
    if (stored) {
      setItemApprovals(JSON.parse(stored));
    }
  };

  const saveItemApprovals = async (approvals: ItemApprovalStatus) => {
    if (!currentWorkspace?.id || !currentWorkspace?.projectFolder) return;

    localStorage.setItem(`definition-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));
    setItemApprovals(approvals);

    try {
      const fileContent = JSON.stringify({
        phase: 'definition',
        itemApprovals: approvals,
        phaseApproved: definitionApproved,
        phaseApprovedDate: approvalDate,
        lastUpdated: new Date().toISOString(),
      }, null, 2);

      await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          specifications: [{
            filename: 'approvals/definition-approvals.json',
            content: fileContent,
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to save approvals to file:', err);
    }
  };

  const savePhaseApprovalToFile = async (approved: boolean, date: string | null) => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const fileContent = JSON.stringify({
        phase: 'definition',
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
            filename: 'approvals/definition-approvals.json',
            content: fileContent,
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to save phase approval to file:', err);
    }
  };

  const loadDefinitionItems = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setLoading(true);
    try {
      // Load capability items
      const capabilityResponse = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const capabilityData = await capabilityResponse.json();
      const capabilityItems: DefinitionItem[] = (capabilityData.capabilities || []).map((c: any) => ({
        id: c.filename,
        name: c.name || c.filename,
        type: 'capability' as const,
        status: 'draft' as const,
        description: c.description,
        lastModified: c.lastModified,
        path: c.path,
      }));

      // Load enabler items
      const enablerResponse = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const enablerData = await enablerResponse.json();
      const enablerItems: DefinitionItem[] = (enablerData.enablers || []).map((e: any) => ({
        id: e.filename,
        name: e.name || e.filename,
        type: 'enabler' as const,
        status: 'draft' as const,
        description: e.description,
        lastModified: e.lastModified,
        path: e.path,
      }));

      // Apply saved approval statuses
      const storedApprovals = localStorage.getItem(`definition-item-approvals-${currentWorkspace.id}`);
      const approvals: ItemApprovalStatus = storedApprovals ? JSON.parse(storedApprovals) : {};

      const applyApprovalStatus = (items: DefinitionItem[]) => {
        return items.map(item => {
          const approval = approvals[item.id];
          if (approval) {
            return {
              ...item,
              status: approval.status,
              rejectionComment: approval.comment,
              reviewedAt: approval.reviewedAt,
            };
          }
          return item;
        });
      };

      const updatedCapabilityItems = applyApprovalStatus(capabilityItems);
      const updatedEnablerItems = applyApprovalStatus(enablerItems);

      setPhaseStatus({
        capabilities: {
          total: updatedCapabilityItems.length,
          approved: updatedCapabilityItems.filter(i => i.status === 'approved').length,
          rejected: updatedCapabilityItems.filter(i => i.status === 'rejected').length,
          items: updatedCapabilityItems,
        },
        enablers: {
          total: updatedEnablerItems.length,
          approved: updatedEnablerItems.filter(i => i.status === 'approved').length,
          rejected: updatedEnablerItems.filter(i => i.status === 'rejected').length,
          items: updatedEnablerItems,
        },
      });

      // Check if definition phase is already approved
      const stored = localStorage.getItem(`definition-approved-${currentWorkspace.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        setDefinitionApproved(data.approved);
        setApprovalDate(data.date);
      }
    } catch (err) {
      console.error('Failed to load definition items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = (item: DefinitionItem) => {
    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
      },
    };
    saveItemApprovals(newApprovals);
    updateItemStatus(item, 'approved');
  };

  const handleRejectItem = (item: DefinitionItem) => {
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
      },
    };
    saveItemApprovals(newApprovals);
    updateItemStatus(rejectionModal.item, 'rejected', rejectionComment);
    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const updateItemStatus = (item: DefinitionItem, newStatus: 'approved' | 'rejected', comment?: string) => {
    setPhaseStatus(prev => {
      const sectionKey = item.type === 'capability' ? 'capabilities' : 'enablers';
      const section = prev[sectionKey];
      const updatedItems = section.items.map(i =>
        i.id === item.id
          ? { ...i, status: newStatus, rejectionComment: comment, reviewedAt: new Date().toISOString() }
          : i
      );

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          items: updatedItems,
          approved: updatedItems.filter(i => i.status === 'approved').length,
          rejected: updatedItems.filter(i => i.status === 'rejected').length,
        },
      };
    });
  };

  const handleResetItemStatus = (item: DefinitionItem) => {
    const newApprovals = { ...itemApprovals };
    delete newApprovals[item.id];
    saveItemApprovals(newApprovals);

    setPhaseStatus(prev => {
      const sectionKey = item.type === 'capability' ? 'capabilities' : 'enablers';
      const section = prev[sectionKey];
      const updatedItems = section.items.map(i =>
        i.id === item.id
          ? { ...i, status: 'draft' as const, rejectionComment: undefined, reviewedAt: undefined }
          : i
      );

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          items: updatedItems,
          approved: updatedItems.filter(i => i.status === 'approved').length,
          rejected: updatedItems.filter(i => i.status === 'rejected').length,
        },
      };
    });
  };

  const getTotalItems = () =>
    phaseStatus.capabilities.total + phaseStatus.enablers.total;

  const getTotalApproved = () =>
    phaseStatus.capabilities.approved + phaseStatus.enablers.approved;

  const getTotalRejected = () =>
    phaseStatus.capabilities.rejected + phaseStatus.enablers.rejected;

  const getCompletionPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getTotalApproved() / total) * 100);
  };

  const canApprovePhase = () => {
    return (
      phaseStatus.capabilities.total > 0 &&
      phaseStatus.enablers.total > 0 &&
      getTotalItems() === getTotalApproved() &&
      getTotalRejected() === 0
    );
  };

  const handleApproveDefinition = async () => {
    if (!currentWorkspace?.id) return;

    const approvalData = {
      approved: true,
      date: new Date().toISOString(),
    };
    localStorage.setItem(`definition-approved-${currentWorkspace.id}`, JSON.stringify(approvalData));
    setDefinitionApproved(true);
    setApprovalDate(approvalData.date);

    await savePhaseApprovalToFile(true, approvalData.date);
  };

  const handleRevokeApproval = async () => {
    if (!currentWorkspace?.id) return;

    localStorage.removeItem(`definition-approved-${currentWorkspace.id}`);
    setDefinitionApproved(false);
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

  const renderSectionCard = (
    title: string,
    section: { total: number; approved: number; rejected: number; items: DefinitionItem[] },
    path: string,
    icon: string
  ) => {
    const isComplete = section.total > 0 && section.total === section.approved && section.rejected === 0;
    const hasRejected = section.rejected > 0;
    const hasItems = section.total > 0;

    return (
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: isComplete
                ? 'rgba(52, 199, 89, 0.1)'
                : hasRejected
                  ? 'rgba(255, 59, 48, 0.1)'
                  : hasItems
                    ? 'rgba(255, 204, 0, 0.1)'
                    : 'rgba(142, 142, 147, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              {icon}
            </div>
            <div>
              <h3 className="text-headline" style={{ marginBottom: '4px' }}>{title}</h3>
              <p className="text-footnote text-secondary">
                {section.approved} approved, {section.rejected} rejected of {section.total} items
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isComplete ? (
              <span style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                backgroundColor: 'rgba(52, 199, 89, 0.1)',
                color: 'var(--color-systemGreen)',
              }}>
                Complete
              </span>
            ) : hasRejected ? (
              <span style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                color: 'var(--color-systemRed)',
              }}>
                Has Rejections
              </span>
            ) : hasItems ? (
              <span style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                color: 'var(--color-systemYellow)',
              }}>
                In Progress
              </span>
            ) : (
              <span style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '20px',
                backgroundColor: 'rgba(142, 142, 147, 0.1)',
                color: 'var(--color-systemGray)',
              }}>
                Not Started
              </span>
            )}
          </div>
        </div>

        {/* Item list */}
        {section.items.length > 0 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-separator)',
          }}>
            {section.items.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    backgroundColor: item.status === 'rejected'
                      ? 'rgba(255, 59, 48, 0.05)'
                      : item.status === 'approved'
                        ? 'rgba(52, 199, 89, 0.05)'
                        : 'var(--color-tertiarySystemBackground)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{
                        color: badge.color,
                        fontSize: '18px',
                        fontWeight: 'bold',
                      }}>
                        {badge.icon}
                      </span>
                      <div>
                        <span className="text-body" style={{ fontWeight: 500 }}>{item.name}</span>
                        {item.description && (
                          <p className="text-caption1 text-secondary" style={{ marginTop: '2px' }}>
                            {item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}
                          </p>
                        )}
                        {item.reviewedAt && (
                          <p className="text-caption1 text-secondary" style={{ marginTop: '2px' }}>
                            Reviewed: {new Date(item.reviewedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                      <Button
                        variant="secondary"
                        onClick={() => navigate(`${path}?open=${encodeURIComponent(item.id)}`)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Review
                      </Button>

                      {item.status !== 'approved' && (
                        <Button
                          variant="primary"
                          onClick={() => handleApproveItem(item)}
                          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--color-systemGreen)' }}
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

                  {/* Show rejection comment */}
                  {item.status === 'rejected' && item.rejectionComment && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--color-systemRed)',
                    }}>
                      <p className="text-caption1" style={{ fontWeight: 600, color: 'var(--color-systemRed)', marginBottom: '4px' }}>
                        Rejection Reason:
                      </p>
                      <p className="text-body" style={{ color: 'var(--color-label)' }}>
                        {item.rejectionComment}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Definition Phase Approval</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          Review and approve all definition phase items before proceeding to Design.
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
              ${definitionApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
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
              {definitionApproved
                ? 'Definition Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {definitionApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Approved on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div>
            {definitionApproved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/designs')}>
                  Proceed to Design
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
                onClick={handleApproveDefinition}
                disabled={!canApprovePhase()}
              >
                Approve Definition Phase
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Workspace check */}
      {!currentWorkspace?.projectFolder && (
        <Alert type="warning" style={{ marginBottom: '24px' }}>
          Please set a project folder for this workspace to review definition items.
        </Alert>
      )}

      {/* No Items Yet - Getting Started */}
      {!loading && getTotalItems() === 0 && currentWorkspace?.projectFolder && (
        <Alert type="info" style={{ marginBottom: '24px' }}>
          <strong>No definition items found yet.</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            To get started, create items in each section:
          </p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Capabilities:</strong> Go to the Capabilities page to define high-level business capabilities</li>
            <li><strong>Enablers:</strong> Go to the Enablers page to define technical enablers that implement capabilities</li>
          </ul>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-secondaryLabel)' }}>
            Looking for files in: <code>{currentWorkspace.projectFolder}/definition/</code>
          </p>
        </Alert>
      )}

      {/* Requirements Info */}
      {!canApprovePhase() && !definitionApproved && getTotalItems() > 0 && (
        <Alert type={getTotalRejected() > 0 ? 'error' : 'info'} style={{ marginBottom: '24px' }}>
          <strong>{getTotalRejected() > 0 ? 'Action Required:' : 'Requirements for Approval:'}</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {phaseStatus.capabilities.total === 0 && <li>At least one Capability is required</li>}
            {phaseStatus.enablers.total === 0 && <li>At least one Enabler is required</li>}
            {getTotalRejected() > 0 && <li style={{ color: 'var(--color-systemRed)' }}>Resolve {getTotalRejected()} rejected item(s) - update and re-approve</li>}
            {getTotalItems() > getTotalApproved() + getTotalRejected() && <li>{getTotalItems() - getTotalApproved() - getTotalRejected()} item(s) still need review</li>}
          </ul>
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-body text-secondary">Loading definition items...</p>
        </div>
      ) : (
        <>
          {/* Section Cards */}
          {renderSectionCard('Capabilities', phaseStatus.capabilities, '/capabilities', '🎯')}
          {renderSectionCard('Enablers', phaseStatus.enablers, '/enablers', '⚙️')}
        </>
      )}

      {/* SAWai Info */}
      <Alert type="info" style={{ marginTop: '24px' }}>
        <strong>SAWai Definition Phase:</strong> The definition phase establishes the scope of your project.
        Before proceeding to Design, ensure all capabilities and enablers have been reviewed and approved.
        This gate ensures alignment on what you're building before designing how it looks.
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
