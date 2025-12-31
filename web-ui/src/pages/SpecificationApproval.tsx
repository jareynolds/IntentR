import React, { useState, useEffect, useRef } from 'react';
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

interface SpecificationItem {
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
  entityId?: string; // CAP-XXXXXX or ENB-XXXXXX for database sync
  parentCapabilityId?: string; // For enablers: the parent CAP-XXXXXX
}

interface PhaseStatus {
  capabilities: { total: number; approved: number; rejected: number; items: SpecificationItem[] };
  enablers: { total: number; approved: number; rejected: number; items: SpecificationItem[] };
}

export const SpecificationApproval: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const {
    capabilities: dbCapabilities,
    enablers: dbEnablers,
    syncCapability,
    syncEnabler,
    refreshWorkspaceState
  } = useEntityState();
  const {
    phaseApprovals,
    approvePhase: approvePhaseDb,
    revokePhase: revokePhaseDb,
    isPhaseApproved,
  } = usePhaseApprovals();
  const [loading, setLoading] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
    capabilities: { total: 0, approved: 0, rejected: 0, items: [] },
    enablers: { total: 0, approved: 0, rejected: 0, items: [] },
  });

  // Get phase approval state from database
  const specificationApproved = isPhaseApproved('specification');
  const specificationPhaseApproval = phaseApprovals.get('specification');
  const approvalDate = specificationPhaseApproval?.approved_at || null;

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    item: SpecificationItem | null;
  }>({ isOpen: false, item: null });
  const [rejectionComment, setRejectionComment] = useState('');
  const [bulkApprovalLoading, setBulkApprovalLoading] = useState(false);
  const [phaseActionLoading, setPhaseActionLoading] = useState(false);

  // Track if initial load is complete to avoid showing loading spinner on status updates
  const initialLoadComplete = useRef(false);
  const lastProjectFolder = useRef<string | null>(null);

  // Refresh workspace state from database on page mount
  // This ensures we have the latest approval statuses when navigating to this page
  useEffect(() => {
    if (currentWorkspace?.name) {
      refreshWorkspaceState();
    }
  }, [currentWorkspace?.name, refreshWorkspaceState]);

  // Load specification phase items - only on initial load or project folder change
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      // Only do full load if project folder changed or first load
      if (lastProjectFolder.current !== currentWorkspace.projectFolder) {
        lastProjectFolder.current = currentWorkspace.projectFolder;
        initialLoadComplete.current = false;
        loadSpecificationItems();
      }
    }
  }, [currentWorkspace?.projectFolder]);

  // Apply approval statuses from database without full reload
  // This runs when dbCapabilities or dbEnablers change (e.g., after approval) but doesn't reload files
  useEffect(() => {
    if (!initialLoadComplete.current) return; // Skip until initial load is done

    // Update approval statuses in place without reloading from files
    setPhaseStatus(prev => {
      const applyCapabilityStatus = (items: SpecificationItem[]): SpecificationItem[] => {
        return items.map(item => {
          const dbState = item.entityId ? dbCapabilities.get(item.entityId) : null;
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

      const applyEnablerStatus = (items: SpecificationItem[]): SpecificationItem[] => {
        return items.map(item => {
          const dbState = item.entityId ? dbEnablers.get(item.entityId) : null;
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

      const updatedCapabilities = applyCapabilityStatus(prev.capabilities.items);
      const updatedEnablers = applyEnablerStatus(prev.enablers.items);

      return {
        capabilities: {
          ...prev.capabilities,
          items: updatedCapabilities,
          approved: updatedCapabilities.filter(i => i.status === 'approved').length,
          rejected: updatedCapabilities.filter(i => i.status === 'rejected').length,
        },
        enablers: {
          ...prev.enablers,
          items: updatedEnablers,
          approved: updatedEnablers.filter(i => i.status === 'approved').length,
          rejected: updatedEnablers.filter(i => i.status === 'rejected').length,
        },
      };
    });
  }, [dbCapabilities, dbEnablers]);

  // NOTE: localStorage for item approvals is no longer used - database is single source of truth
  // Approval status now comes from dbCapabilities and dbEnablers via EntityStateContext.

  const loadSpecificationItems = async () => {
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
      const capabilityItems: SpecificationItem[] = (capabilityData.capabilities || []).map((c: any) => ({
        id: c.filename,
        name: c.name || c.filename,
        type: 'capability' as const,
        status: 'draft' as const,
        description: c.description,
        lastModified: c.lastModified,
        path: c.path,
        entityId: c.capabilityId || c.fields?.['ID'] || c.filename?.replace(/\.md$/, ''), // CAP-XXXXXX
      }));

      // Load enabler items
      const enablerResponse = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const enablerData = await enablerResponse.json();
      const enablerItems: SpecificationItem[] = (enablerData.enablers || []).map((e: any) => ({
        id: e.filename,
        name: e.name || e.filename,
        type: 'enabler' as const,
        status: 'draft' as const,
        description: e.description,
        lastModified: e.lastModified,
        path: e.path,
        entityId: e.enablerId || e.fields?.['ID'] || e.filename?.replace(/\.md$/, ''), // ENB-XXXXXX
        parentCapabilityId: e.capabilityId || e.fields?.['Parent Capability'] || e.fields?.['Capability'], // CAP-XXXXXX
      }));

      // Apply approval statuses from DATABASE (single source of truth)
      // No longer using localStorage - database is the only source of truth
      const applyCapabilityApprovalStatus = (items: SpecificationItem[]) => {
        return items.map(item => {
          // Get state from database via dbCapabilities cache
          const dbState = item.entityId ? dbCapabilities.get(item.entityId) : null;
          if (dbState) {
            // Map database approval_status to SpecificationItem status
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

      const applyEnablerApprovalStatus = (items: SpecificationItem[]) => {
        return items.map(item => {
          // Get state from database via dbEnablers cache
          const dbState = item.entityId ? dbEnablers.get(item.entityId) : null;
          if (dbState) {
            // Map database approval_status to SpecificationItem status
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

      const updatedCapabilityItems = applyCapabilityApprovalStatus(capabilityItems);
      const updatedEnablerItems = applyEnablerApprovalStatus(enablerItems);

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

      // Phase approval now comes from database via usePhaseApprovals hook
      // No need to check localStorage - specificationApproved and approvalDate
      // are derived from phaseApprovals Map
    } catch (err) {
      console.error('Failed to load specification items:', err);
    } finally {
      initialLoadComplete.current = true;
      setLoading(false);
    }
  };

  // updateSourceFile removed - database is single source of truth for state
  // State changes now only go to database via syncCapability/syncEnabler

  const handleApproveItem = async (item: SpecificationItem) => {
    updateItemStatus(item, 'approved');

    // Sync approval status to database (single source of truth)
    // updateSourceFile removed - database is single source of truth
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On APPROVE: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
    // These transitions are atomic and mandatory.
    // Use syncCapability/syncEnabler which does UPSERT (creates if not exists, updates if exists)
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        if (item.type === 'capability') {
          const result = await syncCapability({
            capability_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity is now active in workflow
            workflow_stage: 'specification' as WorkflowStage,  // REQUIRED: this is the Specification phase
            stage_status: 'approved' as StageStatus,           // REQUIRED: stage work complete
            approval_status: 'approved' as ApprovalStatus,     // REQUIRED: authorization granted
          });
          console.log(`Synced capability ${item.entityId} approval to database (all 4 dimensions):`, result);
        } else if (item.type === 'enabler') {
          // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
          // On APPROVE: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status

          // Look up parent capability's database ID if available
          let parentDbId: number | undefined;
          if (item.parentCapabilityId) {
            const parentCap = dbCapabilities.get(item.parentCapabilityId);
            if (parentCap) {
              parentDbId = parentCap.id;
            }
          }

          const syncData: Record<string, unknown> = {
            enabler_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity is now active in workflow
            workflow_stage: 'specification' as WorkflowStage,  // REQUIRED: this is the Specification phase
            stage_status: 'approved' as StageStatus,           // REQUIRED: stage work complete
            approval_status: 'approved' as ApprovalStatus,     // REQUIRED: authorization granted
          };

          // Only include capability_id if we found the parent's database ID
          if (parentDbId) {
            syncData.capability_id = parentDbId;
          }

          const result = await syncEnabler(syncData as Partial<import('../api/entityStateService').EnablerState>);
          console.log(`Synced enabler ${item.entityId} approval to database:`, result);
        }
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync approval to database:', err);
      }
    }
  };

  const handleRejectItem = (item: SpecificationItem) => {
    setRejectionModal({ isOpen: true, item });
    setRejectionComment('');
  };

  const confirmRejectItem = async () => {
    if (!rejectionModal.item) return;

    const item = rejectionModal.item;
    updateItemStatus(item, 'rejected', rejectionComment);

    // Sync rejection status to database (single source of truth)
    // updateSourceFile removed - database is single source of truth
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On REJECT: Set all 4 dimensions - lifecycle_state, workflow_stage, stage_status, approval_status
    // These transitions are atomic and mandatory.
    // Use syncCapability/syncEnabler which does UPSERT (creates if not exists, updates if exists)
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        if (item.type === 'capability') {
          const result = await syncCapability({
            capability_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity remains in workflow but blocked
            workflow_stage: 'specification' as WorkflowStage,  // REQUIRED: this is the Specification phase
            stage_status: 'blocked' as StageStatus,            // REQUIRED: cannot proceed until resolved
            approval_status: 'rejected' as ApprovalStatus,     // REQUIRED: authorization denied
          });
          console.log(`Synced capability ${item.entityId} rejection to database (all 4 dimensions):`, result);
        } else if (item.type === 'enabler') {
          // Look up parent capability's database ID if available
          let parentDbId: number | undefined;
          if (item.parentCapabilityId) {
            const parentCap = dbCapabilities.get(item.parentCapabilityId);
            if (parentCap) {
              parentDbId = parentCap.id;
            }
          }

          const syncData: Record<string, unknown> = {
            enabler_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: 'active' as LifecycleState,       // REQUIRED: entity remains in workflow but blocked
            workflow_stage: 'specification' as WorkflowStage,  // REQUIRED: this is the Specification phase
            stage_status: 'blocked' as StageStatus,            // REQUIRED: cannot proceed until resolved
            approval_status: 'rejected' as ApprovalStatus,     // REQUIRED: authorization denied
          };

          if (parentDbId) {
            syncData.capability_id = parentDbId;
          }

          const result = await syncEnabler(syncData as Partial<import('../api/entityStateService').EnablerState>);
          console.log(`Synced enabler ${item.entityId} rejection to database:`, result);
        }
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync rejection to database:', err);
      }
    }

    setRejectionModal({ isOpen: false, item: null });
    setRejectionComment('');
  };

  const updateItemStatus = (item: SpecificationItem, newStatus: 'approved' | 'rejected', comment?: string) => {
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

  const handleResetItemStatus = async (item: SpecificationItem) => {
    // Sync reset status to database (single source of truth)
    // updateSourceFile removed - database is single source of truth
    // BUSINESS RULE (see STATE_MODEL.md "Automatic State Transitions on Approval"):
    // On RESET: Only stage_status changes to 'in_progress'
    // lifecycle_state and workflow_stage remain unchanged.
    // Use syncCapability/syncEnabler which does UPSERT (creates if not exists, updates if exists)
    // NOTE: Use currentWorkspace.name (not .id) for consistency with EntityStateContext.refreshWorkspaceState
    if (item.entityId && currentWorkspace?.name) {
      try {
        if (item.type === 'capability') {
          // Get existing state to preserve lifecycle_state and workflow_stage
          const dbCap = dbCapabilities.get(item.entityId);
          const result = await syncCapability({
            capability_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: dbCap?.lifecycle_state || 'active' as LifecycleState,
            workflow_stage: dbCap?.workflow_stage || 'specification' as WorkflowStage,
            stage_status: 'in_progress' as StageStatus, // REQUIRED: only stage_status changes on reset
            approval_status: 'pending' as ApprovalStatus,
          });
          console.log(`Synced capability ${item.entityId} reset to database (stage_status only):`, result);
        } else if (item.type === 'enabler') {
          // Get existing state to preserve lifecycle_state and workflow_stage
          const dbEnb = dbEnablers.get(item.entityId);

          // Look up parent capability's database ID if available
          let parentDbId: number | undefined;
          if (item.parentCapabilityId) {
            const parentCap = dbCapabilities.get(item.parentCapabilityId);
            if (parentCap) {
              parentDbId = parentCap.id;
            }
          }

          const syncData: Record<string, unknown> = {
            enabler_id: item.entityId,
            name: item.name,
            workspace_id: currentWorkspace.name,
            lifecycle_state: dbEnb?.lifecycle_state || 'active' as LifecycleState,
            workflow_stage: dbEnb?.workflow_stage || 'specification' as WorkflowStage,
            stage_status: 'in_progress' as StageStatus, // REQUIRED: stage_status reset
            approval_status: 'pending' as ApprovalStatus, // REQUIRED: approval_status reset
          };

          if (parentDbId) {
            syncData.capability_id = parentDbId;
          }

          const result = await syncEnabler(syncData as Partial<import('../api/entityStateService').EnablerState>);
          console.log(`Synced enabler ${item.entityId} reset to database:`, result);
        }
        // Refresh the workspace state to get updated data
        await refreshWorkspaceState();
      } catch (err) {
        console.error('Failed to sync reset to database:', err);
      }
    }

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

  // Bulk approval helper functions
  const getPendingItemsCount = () => {
    const allItems = [...phaseStatus.capabilities.items, ...phaseStatus.enablers.items];
    return allItems.filter(i => i.status !== 'approved' && i.status !== 'rejected').length;
  };

  const getApprovableItems = () => {
    const allItems = [...phaseStatus.capabilities.items, ...phaseStatus.enablers.items];
    return allItems.filter(i => i.status !== 'approved' && i.status !== 'rejected');
  };

  const handleBulkApprove = async () => {
    const pendingItems = getApprovableItems();
    if (pendingItems.length === 0) return;

    setBulkApprovalLoading(true);

    for (const item of pendingItems) {
      // Generate entityId if not present
      const entityId = item.entityId || item.id?.replace(/\.md$/, '') || `${item.type}-${Date.now()}`;

      // Update local state immediately (optimistic update)
      updateItemStatus(item, 'approved');

      // Sync to database
      if (currentWorkspace?.name) {
        try {
          if (item.type === 'capability') {
            await syncCapability({
              capability_id: entityId,
              name: item.name,
              workspace_id: currentWorkspace.name,
              lifecycle_state: 'active' as LifecycleState,
              workflow_stage: 'specification' as WorkflowStage,
              stage_status: 'approved' as StageStatus,
              approval_status: 'approved' as ApprovalStatus,
            });
          } else if (item.type === 'enabler') {
            let parentDbId: number | undefined;
            if (item.parentCapabilityId) {
              const parentCap = dbCapabilities.get(item.parentCapabilityId);
              if (parentCap) {
                parentDbId = parentCap.id;
              }
            }

            const syncData: Record<string, unknown> = {
              enabler_id: entityId,
              name: item.name,
              workspace_id: currentWorkspace.name,
              lifecycle_state: 'active' as LifecycleState,
              workflow_stage: 'specification' as WorkflowStage,
              stage_status: 'approved' as StageStatus,
              approval_status: 'approved' as ApprovalStatus,
            };

            if (parentDbId) {
              syncData.capability_id = parentDbId;
            }

            await syncEnabler(syncData as Partial<import('../api/entityStateService').EnablerState>);
          }
        } catch (err) {
          console.error(`Failed to sync approval for ${item.name}:`, err);
        }
      }
    }

    // Refresh workspace state to get updated data
    await refreshWorkspaceState();
    setBulkApprovalLoading(false);
  };

  const handleApproveSpecification = async () => {
    // Use database phase approval API
    // specificationApproved and approvalDate are derived from phaseApprovals Map
    setPhaseActionLoading(true);
    try {
      await approvePhaseDb('specification');
      console.log('Specification phase approved via database');
    } catch (err) {
      console.error('Failed to approve specification phase:', err);
    } finally {
      setPhaseActionLoading(false);
    }
  };

  const handleRevokeApproval = async () => {
    // Use database phase revoke API
    // specificationApproved and approvalDate are derived from phaseApprovals Map
    setPhaseActionLoading(true);
    try {
      await revokePhaseDb('specification');
      console.log('Specification phase approval revoked via database');
    } catch (err) {
      console.error('Failed to revoke specification phase approval:', err);
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
    section: { total: number; approved: number; rejected: number; items: SpecificationItem[] },
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
    <PageLayout
      title="Specification Phase Approval"
      quickDescription="Review and approve all formal specification phase items."
      detailedDescription="The Specification phase includes Capabilities and Enablers documentation.
Each capability and enabler must be reviewed for completeness and technical accuracy.
All items must be approved before proceeding to the System phase."
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
              ${specificationApproved ? 'var(--color-systemGreen)' : getTotalRejected() > 0 ? 'var(--color-systemRed)' : 'var(--color-systemBlue)'} ${getCompletionPercentage()}%,
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
              {specificationApproved
                ? 'Specification Phase Approved'
                : getTotalRejected() > 0
                  ? 'Items Need Revision'
                  : canApprovePhase()
                    ? 'Ready for Approval'
                    : 'Review in Progress'}
            </h3>
            <p className="text-body text-secondary">
              {getTotalApproved()} approved, {getTotalRejected()} rejected of {getTotalItems()} items.
            </p>
            {specificationApproved && approvalDate && (
              <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                Approved on {new Date(approvalDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Action Button - Dual Purpose */}
          <div>
            {specificationApproved ? (
              /* State 3: Phase approved - Show "Proceed to Next Section" */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <Button variant="primary" onClick={() => navigate('/system')}>
                  Proceed to Next Section →
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
                onClick={handleApproveSpecification}
                disabled={!canApprovePhase() || phaseActionLoading}
              >
                {phaseActionLoading ? 'Approving...' : 'Approve Specification Phase'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Workspace check */}
      {!currentWorkspace?.projectFolder && (
        <Alert type="warning" style={{ marginBottom: '24px' }}>
          Please set a project folder for this workspace to review specification items.
        </Alert>
      )}

      {/* No Items Yet - Getting Started */}
      {!loading && getTotalItems() === 0 && currentWorkspace?.projectFolder && (
        <Alert type="info" style={{ marginBottom: '24px' }}>
          <strong>No specification items found yet.</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            To get started, create items in each section:
          </p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Capabilities:</strong> Go to the Capabilities page to define high-level business capabilities</li>
            <li><strong>Enablers:</strong> Go to the Enablers page to define technical enablers that implement capabilities</li>
          </ul>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-secondaryLabel)' }}>
            Looking for files in: <code>{currentWorkspace.projectFolder}/specification/</code>
          </p>
        </Alert>
      )}

      {/* Requirements Info */}
      {!canApprovePhase() && !specificationApproved && getTotalItems() > 0 && (
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
          <p className="text-body text-secondary">Loading specification items...</p>
        </div>
      ) : (
        <>
          {/* Section Cards */}
          {renderSectionCard('Capabilities', phaseStatus.capabilities, '/capabilities', '🎯')}
          {renderSectionCard('Enablers', phaseStatus.enablers, '/enablers', '⚙️')}
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
