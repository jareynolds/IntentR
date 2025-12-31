import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Alert, Button, PageLayout } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { useEntityState, usePhaseApprovals } from '../context/EntityStateContext';
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

// ItemApprovalStatus interface removed - approval status now comes from database only

export const IntentApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { storyCards: dbStoryCards, syncStoryCard, updateStoryCard, refreshWorkspaceState } = useEntityState();
  const {
    phaseApprovals,
    approvePhase: approvePhaseDb,
    revokePhase: revokePhaseDb,
    isPhaseApproved,
  } = usePhaseApprovals();
  const [loading, setLoading] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
    vision: { total: 0, approved: 0, rejected: 0, items: [] },
    ideation: { total: 0, approved: 0, rejected: 0, items: [] },
    storyboard: { total: 0, approved: 0, rejected: 0, items: [] },
  });

  // Get phase approval state from database
  const intentApproved = isPhaseApproved('intent');
  const intentPhaseApproval = phaseApprovals.get('intent');
  const approvalDate = intentPhaseApproval?.approved_at || null;

  // Item approval tracking - no longer needed, approval status comes from database

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: IntentItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');

  // Feedback state for user notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [itemActionLoading, setItemActionLoading] = useState<string | null>(null); // Track which item is being processed
  const [phaseActionLoading, setPhaseActionLoading] = useState(false);
  const [bulkApprovalLoading, setBulkApprovalLoading] = useState(false);

  // Track if initial load is complete to avoid showing loading spinner on status updates
  const initialLoadComplete = useRef(false);
  const lastProjectFolder = useRef<string | null>(null);

  // Auto-clear feedback messages after 5 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  // Load intent phase items - only on initial load or project folder change
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      // Only do full load if project folder changed or first load
      if (lastProjectFolder.current !== currentWorkspace.projectFolder) {
        lastProjectFolder.current = currentWorkspace.projectFolder;
        initialLoadComplete.current = false;
        loadIntentItems();
      }
    }
  }, [currentWorkspace?.projectFolder]);

  // Apply approval statuses from database without full reload
  // This runs when dbStoryCards changes (e.g., after approval) but doesn't reload files
  useEffect(() => {
    if (!initialLoadComplete.current) return; // Skip until initial load is done

    // Update approval statuses in place without reloading from files
    setPhaseStatus(prev => {
      const applyStatusToItems = (items: IntentItem[]): IntentItem[] => {
        return items.map(item => {
          const dbState = item.entityId ? dbStoryCards.get(item.entityId) : null;
          if (dbState) {
            let status: 'approved' | 'rejected' | 'draft' = 'draft';
            if (dbState.approval_status === 'approved') {
              status = 'approved';
            } else if (dbState.approval_status === 'rejected') {
              status = 'rejected';
            }
            return {
              ...item,
              status,
              rejectionComment: dbState.rejection_comment,
              reviewedAt: dbState.updated_at,
            };
          }
          return item;
        });
      };

      const updatedVision = applyStatusToItems(prev.vision.items);
      const updatedIdeation = applyStatusToItems(prev.ideation.items);
      const updatedStoryboard = applyStatusToItems(prev.storyboard.items);

      return {
        vision: {
          ...prev.vision,
          items: updatedVision,
          approved: updatedVision.filter(i => i.status === 'approved').length,
          rejected: updatedVision.filter(i => i.status === 'rejected').length,
        },
        ideation: {
          ...prev.ideation,
          items: updatedIdeation,
          approved: updatedIdeation.filter(i => i.status === 'approved').length,
          rejected: updatedIdeation.filter(i => i.status === 'rejected').length,
        },
        storyboard: {
          ...prev.storyboard,
          items: updatedStoryboard,
          approved: updatedStoryboard.filter(i => i.status === 'approved').length,
          rejected: updatedStoryboard.filter(i => i.status === 'rejected').length,
        },
      };
    });
  }, [dbStoryCards]);

  // All approval state is now managed in the database via syncStoryCard
  // localStorage and JSON files are no longer used

  const loadIntentItems = async () => {
    if (!currentWorkspace?.projectFolder) {
      return;
    }

    setLoading(true);
    try {
      // Load vision items (using theme-files endpoint which handles VIS-*, VISION-*, THEME-* files)
      const visionResponse = await fetch(`${INTEGRATION_URL}/theme-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const visionData = await visionResponse.json();
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
      const storyboardItems: IntentItem[] = (storyboardData.stories || []).map((s: any) => ({
        id: s.filename,
        name: s.title || s.name || s.filename,
        type: 'storyboard' as const,
        status: 'draft' as const,
        description: s.description,
        lastModified: s.lastModified,
        path: s.path,
        // Use Card ID (same as Storyboard page) for database sync - this is the single source of truth
        entityId: s.fields?.['Card ID'] || s.storyId || s.fields?.['ID'] || s.filename?.replace(/\.md$/, ''),
      }));

      // NOTE: We do NOT sync items here because UpsertStoryCard overwrites ALL fields
      // including approval_status. Items are synced when:
      // 1. Created on Storyboard page
      // 2. Approved/rejected on this page (IntentApproval)
      // The database already has the correct state for items that exist.

      // Apply approval statuses from DATABASE (single source of truth)
      // No longer using localStorage - database is the only source of truth
      const applyApprovalStatus = (items: IntentItem[]) => {
        return items.map(item => {
          // Get state from database via dbStoryCards cache
          const dbState = item.entityId ? dbStoryCards.get(item.entityId) : null;
          if (dbState) {
            // Map database approval_status to IntentItem status
            let status: 'approved' | 'rejected' | 'draft' = 'draft';
            if (dbState.approval_status === 'approved') {
              status = 'approved';
            } else if (dbState.approval_status === 'rejected') {
              status = 'rejected';
            }
            return {
              ...item,
              status,
              rejectionComment: dbState.rejection_comment,
              reviewedAt: dbState.updated_at,
            };
          }
          return item;
        });
      };

      const updatedVisionItems = applyApprovalStatus(visionItems);
      const updatedIdeationItems = applyApprovalStatus(ideationItems);
      const updatedStoryboardItems = applyApprovalStatus(storyboardItems);

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

      // Phase approval now comes from database via usePhaseApprovals hook
      // No need to check localStorage - intentApproved and approvalDate
      // are derived from phaseApprovals Map

      // Mark initial load as complete so subsequent dbStoryCards changes don't cause full reload
      initialLoadComplete.current = true;
    } catch (err) {
      console.error('Failed to load intent items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (item: IntentItem) => {
    // Validate prerequisites
    if (!item.entityId) {
      setFeedbackMessage({
        type: 'warning',
        message: `Cannot approve "${item.name}": Missing entity ID. Item may not be synced to database.`,
      });
      return;
    }

    if (!currentWorkspace?.name) {
      setFeedbackMessage({
        type: 'error',
        message: 'No workspace selected. Please select a workspace first.',
      });
      return;
    }

    // Set loading state for this item
    setItemActionLoading(item.id);

    // Store previous status for rollback
    const previousStatus = item.status;

    // Optimistic UI update
    updateItemStatus(item, 'approved');

    try {
      // Sync approval status to database (single source of truth)
      // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
      // On APPROVE: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
      const existingCard = dbStoryCards.get(item.entityId);

      if (existingCard) {
        // Item exists - use updateStoryCard which only updates state fields (preserves position, etc.)
        const result = await updateStoryCard(item.entityId, {
          lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity is now active in workflow
          workflow_stage: 'intent' as WorkflowStage,         // REQUIRED: this is the Intent phase
          stage_status: 'approved' as StageStatus,           // REQUIRED: stage work complete
          approval_status: 'approved' as ApprovalStatus,     // REQUIRED: authorization granted
          version: existingCard.version,                     // Required for optimistic locking
        });

        if (!result) {
          throw new Error('Failed to update story card - no result returned');
        }
      } else {
        // Item doesn't exist - use syncStoryCard to create it
        const result = await syncStoryCard({
          card_id: item.entityId,
          title: item.name,
          description: item.description || '',
          card_type: item.type, // 'vision', 'ideation', or 'storyboard'
          position_x: 0,
          position_y: 0,
          workspace_id: currentWorkspace.name,
          file_path: item.path,
          lifecycle_state: 'active' as LifecycleState,
          workflow_stage: 'intent' as WorkflowStage,
          stage_status: 'approved' as StageStatus,
          approval_status: 'approved' as ApprovalStatus,
        });

        if (!result) {
          throw new Error('Failed to create story card - no result returned');
        }
      }

      // Refresh the workspace state to get updated data from database
      await refreshWorkspaceState();

      setFeedbackMessage({
        type: 'success',
        message: `"${item.name}" approved successfully.`,
      });
    } catch (err) {
      // Rollback optimistic update on failure
      updateItemStatus(item, previousStatus as 'draft' | 'approved' | 'rejected');

      console.error('Failed to approve item:', err);
      setFeedbackMessage({
        type: 'error',
        message: `Failed to approve "${item.name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setItemActionLoading(null);
    }
  };

  // Bulk approve all pending items
  const handleBulkApprove = async () => {
    if (!currentWorkspace?.name) {
      setFeedbackMessage({
        type: 'error',
        message: 'No workspace selected. Please select a workspace first.',
      });
      return;
    }

    // Get all items that are not yet approved
    const pendingItems = getApprovableItems();

    if (pendingItems.length === 0) {
      setFeedbackMessage({
        type: 'warning',
        message: 'No items to approve. All items are already approved.',
      });
      return;
    }

    setBulkApprovalLoading(true);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // Process all items
    for (const item of pendingItems) {
      // Generate entityId if missing (use filename without extension as fallback)
      const entityId = item.entityId || item.id?.replace(/\.md$/, '') || `${item.type}-${Date.now()}`;

      try {
        const existingCard = dbStoryCards.get(entityId);

        if (existingCard) {
          await updateStoryCard(entityId, {
            lifecycle_state: 'active' as LifecycleState,
            workflow_stage: 'intent' as WorkflowStage,
            stage_status: 'approved' as StageStatus,
            approval_status: 'approved' as ApprovalStatus,
            version: existingCard.version,
          });
        } else {
          await syncStoryCard({
            card_id: entityId,
            title: item.name,
            description: item.description || '',
            card_type: item.type,
            position_x: 0,
            position_y: 0,
            workspace_id: currentWorkspace.name,
            file_path: item.path,
            lifecycle_state: 'active' as LifecycleState,
            workflow_stage: 'intent' as WorkflowStage,
            stage_status: 'approved' as StageStatus,
            approval_status: 'approved' as ApprovalStatus,
          });
        }

        // Update local state optimistically
        updateItemStatus(item, 'approved');
        successCount++;
      } catch (err) {
        console.error(`Failed to approve ${item.name}:`, err);
        failCount++;
      }
    }

    // Refresh state once at the end
    await refreshWorkspaceState();

    setBulkApprovalLoading(false);

    if (failCount === 0) {
      setFeedbackMessage({
        type: 'success',
        message: `Successfully approved ${successCount} item${successCount !== 1 ? 's' : ''}.`,
      });
    } else {
      setFeedbackMessage({
        type: 'warning',
        message: `Approved ${successCount} item${successCount !== 1 ? 's' : ''}, but ${failCount} failed.`,
      });
    }
  };

  // Get count of pending items for bulk approval button (items not yet approved)
  const getPendingItemsCount = () => {
    return [
      ...phaseStatus.vision.items,
      ...phaseStatus.ideation.items,
      ...phaseStatus.storyboard.items,
    ].filter(i => i.status !== 'approved').length;
  };

  // Get items that can be bulk approved (pending items with entityId for database sync)
  const getApprovableItems = () => {
    return [
      ...phaseStatus.vision.items.filter(i => i.status !== 'approved'),
      ...phaseStatus.ideation.items.filter(i => i.status !== 'approved'),
      ...phaseStatus.storyboard.items.filter(i => i.status !== 'approved'),
    ];
  };

  const handleRejectItem = (item: IntentItem) => {
    setRejectionModal({ isOpen: true, item });
    setRejectionComment('');
  };

  const confirmRejectItem = async () => {
    if (!rejectionModal.item) return;

    const item = rejectionModal.item;

    // Validate prerequisites
    if (!item.entityId) {
      setFeedbackMessage({
        type: 'warning',
        message: `Cannot reject "${item.name}": Missing entity ID. Item may not be synced to database.`,
      });
      setRejectionModal({ isOpen: false, item: null });
      setRejectionComment('');
      return;
    }

    if (!currentWorkspace?.name) {
      setFeedbackMessage({
        type: 'error',
        message: 'No workspace selected. Please select a workspace first.',
      });
      setRejectionModal({ isOpen: false, item: null });
      setRejectionComment('');
      return;
    }

    // Set loading state for this item
    setItemActionLoading(item.id);

    // Store previous status for rollback
    const previousStatus = item.status;
    const previousComment = item.rejectionComment;

    // Optimistic UI update
    updateItemStatus(item, 'rejected', rejectionComment);

    // Close modal immediately for better UX
    setRejectionModal({ isOpen: false, item: null });
    const commentToSave = rejectionComment;
    setRejectionComment('');

    try {
      // Sync rejection status to database (single source of truth)
      // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
      // On REJECT: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
      const existingCard = dbStoryCards.get(item.entityId);

      if (existingCard) {
        // Item exists - use updateStoryCard which only updates state fields (preserves position, etc.)
        const result = await updateStoryCard(item.entityId, {
          lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity remains in workflow but blocked
          workflow_stage: 'intent' as WorkflowStage,         // REQUIRED: this is the Intent phase
          stage_status: 'blocked' as StageStatus,            // REQUIRED: cannot proceed until resolved
          approval_status: 'rejected' as ApprovalStatus,     // REQUIRED: authorization denied
          version: existingCard.version,                     // Required for optimistic locking
          change_reason: commentToSave,                      // Store rejection reason in change_reason
        });

        if (!result) {
          throw new Error('Failed to update story card - no result returned');
        }
      } else {
        // Item doesn't exist - use syncStoryCard to create it
        const result = await syncStoryCard({
          card_id: item.entityId,
          title: item.name,
          description: item.description || '',
          card_type: item.type, // 'vision', 'ideation', or 'storyboard'
          position_x: 0,
          position_y: 0,
          workspace_id: currentWorkspace.name,
          file_path: item.path,
          lifecycle_state: 'active' as LifecycleState,
          workflow_stage: 'intent' as WorkflowStage,
          stage_status: 'blocked' as StageStatus,
          approval_status: 'rejected' as ApprovalStatus,
          rejection_comment: commentToSave,
        });

        if (!result) {
          throw new Error('Failed to create story card - no result returned');
        }
      }

      // Refresh the workspace state to get updated data from database
      await refreshWorkspaceState();

      setFeedbackMessage({
        type: 'success',
        message: `"${item.name}" rejected${commentToSave ? ' with comment' : ''}.`,
      });
    } catch (err) {
      // Rollback optimistic update on failure
      updateItemStatus(item, previousStatus as 'draft' | 'approved' | 'rejected', previousComment);

      console.error('Failed to reject item:', err);
      setFeedbackMessage({
        type: 'error',
        message: `Failed to reject "${item.name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setItemActionLoading(null);
    }
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
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch {
        // Silent failure for reset sync
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
    // Validate workspace
    if (!currentWorkspace?.name) {
      setFeedbackMessage({
        type: 'error',
        message: 'No workspace selected. Please select a workspace first.',
      });
      return;
    }

    setPhaseActionLoading(true);

    try {
      // Use database phase approval API
      // intentApproved and approvalDate are derived from phaseApprovals Map
      const result = await approvePhaseDb('intent');

      if (result) {
        setFeedbackMessage({
          type: 'success',
          message: 'Intent phase approved successfully! You can now proceed to the Specification phase.',
        });
      } else {
        throw new Error('No result returned from phase approval');
      }
    } catch (err) {
      console.error('Failed to approve intent phase:', err);
      setFeedbackMessage({
        type: 'error',
        message: `Failed to approve Intent phase: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setPhaseActionLoading(false);
    }
  };

  const handleRevokeApproval = async () => {
    // Validate workspace
    if (!currentWorkspace?.name) {
      setFeedbackMessage({
        type: 'error',
        message: 'No workspace selected. Please select a workspace first.',
      });
      return;
    }

    setPhaseActionLoading(true);

    try {
      // Use database phase revoke API
      // intentApproved and approvalDate are derived from phaseApprovals Map
      const result = await revokePhaseDb('intent');

      if (result) {
        setFeedbackMessage({
          type: 'warning',
          message: 'Intent phase approval revoked. Individual items remain approved.',
        });
      } else {
        throw new Error('No result returned from phase revocation');
      }
    } catch (err) {
      console.error('Failed to revoke intent phase approval:', err);
      setFeedbackMessage({
        type: 'error',
        message: `Failed to revoke Intent phase approval: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setPhaseActionLoading(false);
    }
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
                          disabled={itemActionLoading === item.id}
                          style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--color-systemGreen)' }}
                        >
                          {itemActionLoading === item.id ? 'Approving...' : 'Approve'}
                        </Button>
                      )}

                      {item.status !== 'rejected' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleRejectItem(item)}
                          disabled={itemActionLoading === item.id}
                          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--color-systemRed)', borderColor: 'var(--color-systemRed)' }}
                        >
                          {itemActionLoading === item.id ? 'Processing...' : 'Reject'}
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

      {/* Feedback Alert */}
      {feedbackMessage && (
        <Alert
          variant={feedbackMessage.type === 'success' ? 'success' : feedbackMessage.type === 'warning' ? 'warning' : 'error'}
          style={{ marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{feedbackMessage.message}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 4px',
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </div>
        </Alert>
      )}

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

          {/* Action Button - Dual Purpose */}
          <div>
            {intentApproved ? (
              /* State 3: Phase approved - Show "Proceed to Specification" */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/capabilities')}>
                  Proceed to Specification →
                </Button>
                <button
                  onClick={handleRevokeApproval}
                  disabled={phaseActionLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: phaseActionLoading ? 'not-allowed' : 'pointer',
                    color: 'var(--color-systemRed)',
                    fontSize: '12px',
                    opacity: phaseActionLoading ? 0.5 : 1,
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
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
              >
                {bulkApprovalLoading ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      border: '2px solid currentColor',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Approving...
                  </>
                ) : (
                  `Approve All (${getPendingItemsCount()})`
                )}
              </Button>
            ) : (
              /* State 2: All items approved, phase not yet approved - Show "Approve Intent Phase" */
              <Button
                variant="primary"
                onClick={handleApproveIntent}
                disabled={!canApprovePhase() || phaseActionLoading}
              >
                {phaseActionLoading ? 'Approving...' : 'Approve Intent Phase'}
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
