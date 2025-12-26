import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button, PageLayout } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { useEntityState } from '../context/EntityStateContext';
import { INTEGRATION_URL } from '../api/client';
import {
  type LifecycleState,
  type WorkflowStage,
  type ApprovalStatus,
  type StageStatus,
} from '../api/entityStateService';

interface IntentItem {
  id: string;
  name: string;
  type: 'vision' | 'ideation' | 'storyboard';
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  description?: string;
  lastModified?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionComment?: string;
  path?: string;
  entityId?: string; // Card ID (e.g., STORY-xxx, VIS-xxx, IDEA-xxx) for database sync
}

interface PhaseStatus {
  vision: { total: number; approved: number; rejected: number; items: IntentItem[] };
  ideation: { total: number; approved: number; rejected: number; items: IntentItem[] };
  storyboard: { total: number; approved: number; rejected: number; items: IntentItem[] };
}

interface ItemApprovalStatus {
  [itemId: string]: {
    status: 'approved' | 'rejected' | 'draft';
    comment?: string;
    reviewedAt?: string;
  };
}

export const IntentApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { storyCards: dbStoryCards, syncStoryCard, refreshWorkspaceState } = useEntityState();
  const [loading, setLoading] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
    vision: { total: 0, approved: 0, rejected: 0, items: [] },
    ideation: { total: 0, approved: 0, rejected: 0, items: [] },
    storyboard: { total: 0, approved: 0, rejected: 0, items: [] },
  });
  const [intentApproved, setIntentApproved] = useState(false);
  const [approvalDate, setApprovalDate] = useState<string | null>(null);

  // Item approval tracking
  const [itemApprovals, setItemApprovals] = useState<ItemApprovalStatus>({});

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: IntentItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Load intent phase items
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      loadIntentItems();
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
          filePath: `${currentWorkspace.projectFolder}/approvals/intent-approvals.json`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          const fileApprovals = JSON.parse(data.content);
          setItemApprovals(fileApprovals.itemApprovals || {});
          // Also update localStorage as cache
          localStorage.setItem(`intent-item-approvals-${currentWorkspace.id}`, JSON.stringify(fileApprovals.itemApprovals || {}));

          // Load phase approval status
          if (fileApprovals.phaseApproved) {
            setIntentApproved(true);
            setApprovalDate(fileApprovals.phaseApprovedDate || null);
            localStorage.setItem(`intent-approved-${currentWorkspace.id}`, JSON.stringify({
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

    // Fallback to localStorage
    const stored = localStorage.getItem(`intent-item-approvals-${currentWorkspace.id}`);
    if (stored) {
      setItemApprovals(JSON.parse(stored));
    }
  };

  const saveItemApprovals = async (approvals: ItemApprovalStatus) => {
    if (!currentWorkspace?.id || !currentWorkspace?.projectFolder) return;

    // Update state and localStorage immediately
    localStorage.setItem(`intent-item-approvals-${currentWorkspace.id}`, JSON.stringify(approvals));
    setItemApprovals(approvals);

    // Save to file for sharing/import
    try {
      const fileContent = JSON.stringify({
        phase: 'intent',
        itemApprovals: approvals,
        phaseApproved: intentApproved,
        phaseApprovedDate: approvalDate,
        lastUpdated: new Date().toISOString(),
      }, null, 2);

      await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          specifications: [{
            filename: 'approvals/intent-approvals.json',
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
        phase: 'intent',
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
            filename: 'approvals/intent-approvals.json',
            content: fileContent,
          }],
        }),
      });
    } catch (err) {
      console.error('Failed to save phase approval to file:', err);
    }
  };

  const loadIntentItems = async () => {
    console.log('loadIntentItems called, projectFolder:', currentWorkspace?.projectFolder);
    if (!currentWorkspace?.projectFolder) {
      console.log('No projectFolder set, returning early');
      return;
    }

    setLoading(true);
    try {
      // Load vision items (using theme-files endpoint which handles VIS-*, VISION-*, THEME-* files)
      console.log('Fetching theme-files with workspacePath:', currentWorkspace.projectFolder);
      const visionResponse = await fetch(`${INTEGRATION_URL}/theme-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const visionData = await visionResponse.json();
      console.log('Vision data received:', visionData);
      const visionItems: IntentItem[] = (visionData.themes || []).map((v: any) => ({
        id: v.filename,
        name: v.name || v.filename,
        type: 'vision' as const,
        status: 'draft' as const,
        description: v.description,
        lastModified: v.lastModified,
        path: v.path,
        entityId: v.themeId || v.fields?.['ID'] || v.filename?.replace(/\.md$/, ''),
      }));

      // Load ideation items (using ideation-files endpoint which handles IDEA-* files)
      const ideationResponse = await fetch(`${INTEGRATION_URL}/ideation-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const ideationData = await ideationResponse.json();
      console.log('Ideation data received:', ideationData);
      const ideationItems: IntentItem[] = (ideationData.ideas || []).map((i: any) => ({
        id: i.filename,
        name: i.name || i.filename,
        type: 'ideation' as const,
        status: 'draft' as const,
        description: i.description,
        lastModified: i.lastModified,
        path: i.path,
        entityId: i.ideaId || i.fields?.['ID'] || i.filename?.replace(/\.md$/, ''),
      }));

      // Load storyboard items (using story-files endpoint which handles story*, STORY*, SB-* files)
      const storyboardResponse = await fetch(`${INTEGRATION_URL}/story-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const storyboardData = await storyboardResponse.json();
      console.log('Storyboard data received:', storyboardData);
      const storyboardItems: IntentItem[] = (storyboardData.stories || []).map((s: any) => ({
        id: s.filename,
        name: s.title || s.name || s.filename,
        type: 'storyboard' as const,
        status: 'draft' as const,
        description: s.description,
        lastModified: s.lastModified,
        path: s.path,
        entityId: s.storyId || s.fields?.['ID'] || s.filename?.replace(/\.md$/, ''),
      }));

      // Apply saved approval statuses
      const storedApprovals = localStorage.getItem(`intent-item-approvals-${currentWorkspace.id}`);
      const approvals: ItemApprovalStatus = storedApprovals ? JSON.parse(storedApprovals) : {};

      const applyApprovalStatus = (items: IntentItem[]) => {
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

      const updatedVisionItems = applyApprovalStatus(visionItems);
      const updatedIdeationItems = applyApprovalStatus(ideationItems);
      const updatedStoryboardItems = applyApprovalStatus(storyboardItems);

      console.log('Final counts - Vision:', updatedVisionItems.length, 'Ideation:', updatedIdeationItems.length, 'Storyboard:', updatedStoryboardItems.length);

      setPhaseStatus({
        vision: {
          total: updatedVisionItems.length,
          approved: updatedVisionItems.filter(i => i.status === 'approved').length,
          rejected: updatedVisionItems.filter(i => i.status === 'rejected').length,
          items: updatedVisionItems,
        },
        ideation: {
          total: updatedIdeationItems.length,
          approved: updatedIdeationItems.filter(i => i.status === 'approved').length,
          rejected: updatedIdeationItems.filter(i => i.status === 'rejected').length,
          items: updatedIdeationItems,
        },
        storyboard: {
          total: updatedStoryboardItems.length,
          approved: updatedStoryboardItems.filter(i => i.status === 'approved').length,
          rejected: updatedStoryboardItems.filter(i => i.status === 'rejected').length,
          items: updatedStoryboardItems,
        },
      });

      // Check if intent phase is already approved
      const stored = localStorage.getItem(`intent-approved-${currentWorkspace.id}`);
      if (stored) {
        const data = JSON.parse(stored);
        setIntentApproved(data.approved);
        setApprovalDate(data.date);
      }
    } catch (err) {
      console.error('Failed to load intent items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (item: IntentItem) => {
    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
      },
    };
    saveItemApprovals(newApprovals);

    // Update phase status
    updateItemStatus(item, 'approved');

    // Sync approval status to database (single source of truth)
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On APPROVE: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        const result = await syncStoryCard({
          card_id: item.entityId,
          title: item.name,
          description: item.description || '',
          card_type: item.type, // 'vision', 'ideation', or 'storyboard'
          position_x: 0,
          position_y: 0,
          workspace_id: currentWorkspace.name,
          file_path: item.path,
          lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity is now active in workflow
          workflow_stage: 'intent' as WorkflowStage,         // REQUIRED: this is the Intent phase
          stage_status: 'approved' as StageStatus,           // REQUIRED: stage work complete
          approval_status: 'approved' as ApprovalStatus,     // REQUIRED: authorization granted
        });
        console.log(`Synced ${item.type} ${item.entityId} approval to database:`, result);
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync approval to database:', err);
      }
    }
  };

  const handleRejectItem = (item: IntentItem) => {
    setRejectionModal({ isOpen: true, item });
    setRejectionComment('');
  };

  const confirmRejectItem = async () => {
    if (!rejectionModal.item) return;

    const item = rejectionModal.item;

    const newApprovals = {
      ...itemApprovals,
      [item.id]: {
        status: 'rejected' as const,
        comment: rejectionComment,
        reviewedAt: new Date().toISOString(),
      },
    };
    saveItemApprovals(newApprovals);

    // Update phase status
    updateItemStatus(item, 'rejected', rejectionComment);

    // Sync rejection status to database (single source of truth)
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On REJECT: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        const result = await syncStoryCard({
          card_id: item.entityId,
          title: item.name,
          description: item.description || '',
          card_type: item.type, // 'vision', 'ideation', or 'storyboard'
          position_x: 0,
          position_y: 0,
          workspace_id: currentWorkspace.name,
          file_path: item.path,
          lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity remains in workflow but blocked
          workflow_stage: 'intent' as WorkflowStage,         // REQUIRED: this is the Intent phase
          stage_status: 'blocked' as StageStatus,            // REQUIRED: cannot proceed until resolved
          approval_status: 'rejected' as ApprovalStatus,     // REQUIRED: authorization denied
        });
        console.log(`Synced ${item.type} ${item.entityId} rejection to database:`, result);
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync rejection to database:', err);
      }
    }

    // Close modal
    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const updateItemStatus = (item: IntentItem, newStatus: 'approved' | 'rejected', comment?: string) => {
    setPhaseStatus(prev => {
      const sectionKey = item.type;
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

  const handleResetItemStatus = async (item: IntentItem) => {
    const newApprovals = { ...itemApprovals };
    delete newApprovals[item.id];
    saveItemApprovals(newApprovals);

    // Sync reset status to database (single source of truth)
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On RESET: Only stage_status and approval_status change
    // lifecycle_state and workflow_stage remain unchanged (preserved from existing state).
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        // Get existing state to preserve lifecycle_state and workflow_stage
        const dbCard = dbStoryCards.get(item.entityId);
        const result = await syncStoryCard({
          card_id: item.entityId,
          title: item.name,
          description: item.description || '',
          card_type: item.type, // 'vision', 'ideation', or 'storyboard'
          position_x: 0,
          position_y: 0,
          workspace_id: currentWorkspace.name,
          file_path: item.path,
          lifecycle_state: dbCard?.lifecycle_state || 'active' as LifecycleState,
          workflow_stage: dbCard?.workflow_stage || 'intent' as WorkflowStage,
          stage_status: 'in_progress' as StageStatus,  // REQUIRED: stage_status reset
          approval_status: 'pending' as ApprovalStatus, // REQUIRED: approval_status reset
        });
        console.log(`Synced ${item.type} ${item.entityId} reset to database:`, result);
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync reset to database:', err);
      }
    }

    // Update phase status
    setPhaseStatus(prev => {
      const sectionKey = item.type;
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
    phaseStatus.vision.total + phaseStatus.ideation.total + phaseStatus.storyboard.total;

  const getTotalApproved = () =>
    phaseStatus.vision.approved + phaseStatus.ideation.approved + phaseStatus.storyboard.approved;

  const getTotalRejected = () =>
    phaseStatus.vision.rejected + phaseStatus.ideation.rejected + phaseStatus.storyboard.rejected;

  const getCompletionPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getTotalApproved() / total) * 100);
  };

  const canApprovePhase = () => {
    // All sections must have at least one item and all items must be approved (none rejected or draft)
    return (
      phaseStatus.vision.total > 0 &&
      phaseStatus.ideation.total > 0 &&
      phaseStatus.storyboard.total > 0 &&
      getTotalItems() === getTotalApproved() &&
      getTotalRejected() === 0
    );
  };

  const handleApproveIntent = async () => {
    if (!currentWorkspace?.id) return;

    const approvalData = {
      approved: true,
      date: new Date().toISOString(),
    };
    localStorage.setItem(`intent-approved-${currentWorkspace.id}`, JSON.stringify(approvalData));
    setIntentApproved(true);
    setApprovalDate(approvalData.date);

    // Save to file
    await savePhaseApprovalToFile(true, approvalData.date);
  };

  const handleRevokeApproval = async () => {
    if (!currentWorkspace?.id) return;

    localStorage.removeItem(`intent-approved-${currentWorkspace.id}`);
    setIntentApproved(false);
    setApprovalDate(null);

    // Save to file
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
    section: { total: number; approved: number; rejected: number; items: IntentItem[] },
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
    <PageLayout
      title="Intent Phase Approval"
      quickDescription="Review and approve all intent declaration phase items before proceeding."
      detailedDescription="The Intent phase includes Vision documents, Ideation boards, and Storyboard cards.
Each item must be individually reviewed and approved before the phase can be marked complete.
Rejected items need revision before they can be approved. All items must be approved with no rejections to proceed."
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
              ${intentApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
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
              {intentApproved
                ? 'Intent Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {intentApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Approved on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button */}
          <div>
            {intentApproved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/capabilities')}>
                  Proceed to Specification
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
                onClick={handleApproveIntent}
                disabled={!canApprovePhase()}
              >
                Approve Intent Phase
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Workspace check */}
      {!currentWorkspace?.projectFolder && (
        <Alert type="warning" style={{ marginBottom: '24px' }}>
          Please set a project folder for this workspace to review intent declaration items.
        </Alert>
      )}

      {/* No Items Yet - Getting Started */}
      {!loading && getTotalItems() === 0 && currentWorkspace?.projectFolder && (
        <Alert type="info" style={{ marginBottom: '24px' }}>
          <strong>No intent declaration items found yet.</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            To get started, create items in each section:
          </p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Product Vision:</strong> Go to the Vision page to define your project vision, strategic themes, and market context</li>
            <li><strong>Ideation:</strong> Go to the Ideation Canvas to capture ideas, problems, and solutions</li>
            <li><strong>Storyboard:</strong> Go to the Storyboard page to map out user stories and flows</li>
          </ul>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-secondaryLabel)' }}>
            Looking for files in: <code>{currentWorkspace.projectFolder}/intent/</code>
          </p>
        </Alert>
      )}

      {/* Requirements Info */}
      {!canApprovePhase() && !intentApproved && getTotalItems() > 0 && (
        <Alert type={getTotalRejected() > 0 ? 'error' : 'info'} style={{ marginBottom: '24px' }}>
          <strong>{getTotalRejected() > 0 ? 'Action Required:' : 'Requirements for Approval:'}</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {phaseStatus.vision.total === 0 && <li>At least one Vision item is required</li>}
            {phaseStatus.ideation.total === 0 && <li>At least one Ideation item is required</li>}
            {phaseStatus.storyboard.total === 0 && <li>At least one Storyboard item is required</li>}
            {getTotalRejected() > 0 && <li style={{ color: 'var(--color-systemRed)' }}>Resolve {getTotalRejected()} rejected item(s) - update and re-approve</li>}
            {getTotalItems() > getTotalApproved() + getTotalRejected() && <li>{getTotalItems() - getTotalApproved() - getTotalRejected()} item(s) still need review</li>}
          </ul>
        </Alert>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-body text-secondary">Loading intent declaration items...</p>
        </div>
      ) : (
        <>
          {/* Section Cards */}
          {renderSectionCard('Product Vision', phaseStatus.vision, '/vision', '🎯')}
          {renderSectionCard('Ideation', phaseStatus.ideation, '/ideation', '💡')}
          {renderSectionCard('Storyboard', phaseStatus.storyboard, '/storyboard', '📋')}
        </>
      )}

      {/* INTENT Info */}
      <Alert type="info" style={{ marginTop: '24px' }}>
        <strong>INTENT Intent Phase:</strong> The intent declaration phase establishes the foundation for your project.
        Before proceeding to Specification (Capabilities & Enablers), ensure all vision themes, ideas, and storyboards
        have been reviewed and approved. This gate ensures alignment on what you're building before defining how.
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
