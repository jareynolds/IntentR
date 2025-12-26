/**
 * Entity State Context
 *
 * Provides centralized state management for INTENT State Model entities.
 * Handles optimistic updates, conflict resolution, and caching.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { useCollaboration, type EntityStateUpdate } from './CollaborationContext';
import type {
  BulkStateResponse,
  CapabilityState,
  EnablerState,
  StoryCardState,
  UpdateStateRequest,
  CreateStoryCardRequest,
  WorkspaceStateExport,
  ImportResult,
} from '../api/entityStateService';
import {
  getWorkspaceState,
  getCapabilityState,
  updateCapabilityState,
  getEnablerState,
  updateEnablerState,
  getStoryCardState,
  updateStoryCardState,
  createStoryCard,
  syncCapabilityFromFile,
  syncEnablerFromFile,
  syncStoryCardFromFile,
  isOptimisticLockError,
  isNotFoundError,
  exportWorkspaceState,
  importWorkspaceState,
  downloadWorkspaceStateAsFile,
} from '../api/entityStateService';

// ============================================================================
// Types
// ============================================================================

interface EntityStateContextValue {
  // State data
  capabilities: Map<string, CapabilityState>;
  enablers: Map<string, EnablerState>;
  storyCards: Map<string, StoryCardState>;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Capability operations
  fetchCapabilityState: (capabilityId: string) => Promise<CapabilityState | null>;
  updateCapability: (capabilityId: string, update: UpdateStateRequest) => Promise<CapabilityState | null>;
  syncCapability: (capability: Partial<CapabilityState>) => Promise<CapabilityState | null>;

  // Enabler operations
  fetchEnablerState: (enablerId: string) => Promise<EnablerState | null>;
  updateEnabler: (enablerId: string, update: UpdateStateRequest) => Promise<EnablerState | null>;
  syncEnabler: (enabler: Partial<EnablerState>) => Promise<EnablerState | null>;

  // Story card operations
  fetchStoryCardState: (cardId: string) => Promise<StoryCardState | null>;
  updateStoryCard: (cardId: string, update: UpdateStateRequest) => Promise<StoryCardState | null>;
  createNewStoryCard: (request: CreateStoryCardRequest) => Promise<StoryCardState | null>;
  syncStoryCard: (storyCard: CreateStoryCardRequest) => Promise<StoryCardState | null>;

  // Bulk operations
  refreshWorkspaceState: () => Promise<void>;

  // Export/Import operations
  exportState: (includeHistory?: boolean) => Promise<WorkspaceStateExport | null>;
  importState: (data: WorkspaceStateExport) => Promise<ImportResult | null>;
  downloadState: (includeHistory?: boolean) => Promise<void>;

  // Conflict handling
  hasConflict: boolean;
  conflictEntity: { type: string; id: string } | null;
  resolveConflict: () => void;
}

const EntityStateContext = createContext<EntityStateContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface EntityStateProviderProps {
  children: React.ReactNode;
}

export function EntityStateProvider({ children }: EntityStateProviderProps) {
  const { currentWorkspace } = useWorkspace();
  const { broadcastEntityStateUpdate, onEntityStateUpdate } = useCollaboration();

  // State storage using Maps for O(1) lookup
  const [capabilities, setCapabilities] = useState<Map<string, CapabilityState>>(new Map());
  const [enablers, setEnablers] = useState<Map<string, EnablerState>>(new Map());
  const [storyCards, setStoryCards] = useState<Map<string, StoryCardState>>(new Map());

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conflict state
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictEntity, setConflictEntity] = useState<{ type: string; id: string } | null>(null);

  // Track if initial load has happened
  const initialLoadDone = useRef(false);

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  const refreshWorkspaceState = useCallback(async () => {
    if (!currentWorkspace?.name) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const state: BulkStateResponse = await getWorkspaceState(currentWorkspace.name);

      // Update capabilities
      if (state.capabilities) {
        const capMap = new Map<string, CapabilityState>();
        state.capabilities.forEach((cap) => {
          capMap.set(cap.capability_id, cap);
        });
        setCapabilities(capMap);
      }

      // Update enablers
      if (state.enablers) {
        const enbMap = new Map<string, EnablerState>();
        state.enablers.forEach((enb) => {
          enbMap.set(enb.enabler_id, enb);
        });
        setEnablers(enbMap);
      }

      // Update story cards
      if (state.story_cards) {
        const cardMap = new Map<string, StoryCardState>();
        state.story_cards.forEach((card) => {
          cardMap.set(card.card_id, card);
        });
        setStoryCards(cardMap);
      }
    } catch (err) {
      console.error('Failed to fetch workspace state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workspace state');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.name]);

  // Load state when workspace changes
  useEffect(() => {
    if (currentWorkspace?.name && !initialLoadDone.current) {
      refreshWorkspaceState();
      initialLoadDone.current = true;
    }
  }, [currentWorkspace?.name, refreshWorkspaceState]);

  // Reset when workspace changes
  useEffect(() => {
    initialLoadDone.current = false;
    setCapabilities(new Map());
    setEnablers(new Map());
    setStoryCards(new Map());
  }, [currentWorkspace?.name]);

  // ============================================================================
  // Real-time Collaboration - Listen for state changes from other users
  // ============================================================================

  useEffect(() => {
    const handleEntityStateUpdate = (update: EntityStateUpdate) => {
      console.log('Received entity state update from another user:', update);

      // Refresh the entity from the database to get the latest state
      // This ensures we have the authoritative state including the new version
      if (update.entityType === 'capability') {
        fetchCapabilityState(update.entityId);
      } else if (update.entityType === 'enabler') {
        fetchEnablerState(update.entityId);
      } else if (update.entityType === 'story_card') {
        fetchStoryCardState(update.entityId);
      }
    };

    // Register for entity state updates
    const cleanup = onEntityStateUpdate(handleEntityStateUpdate);

    return cleanup;
  }, [onEntityStateUpdate]);

  // ============================================================================
  // Capability Operations
  // ============================================================================

  const fetchCapabilityState = useCallback(async (capabilityId: string): Promise<CapabilityState | null> => {
    try {
      const state = await getCapabilityState(capabilityId);
      setCapabilities((prev) => {
        const next = new Map(prev);
        next.set(capabilityId, state);
        return next;
      });
      return state;
    } catch (err) {
      // 404 is expected for capabilities that haven't been synced to database yet - don't log as error
      if (isNotFoundError(err)) {
        // Capability not in database yet - this is normal, will be synced on first save
        return null;
      }
      console.error(`Failed to fetch capability state for ${capabilityId}:`, err);
      return null;
    }
  }, []);

  const updateCapability = useCallback(
    async (capabilityId: string, update: UpdateStateRequest): Promise<CapabilityState | null> => {
      try {
        const state = await updateCapabilityState(capabilityId, update);
        setCapabilities((prev) => {
          const next = new Map(prev);
          next.set(capabilityId, state);
          return next;
        });
        setHasConflict(false);
        setConflictEntity(null);

        // Broadcast state change to other users
        broadcastEntityStateUpdate('capability', capabilityId, {
          lifecycle_state: update.lifecycle_state,
          workflow_stage: update.workflow_stage,
          stage_status: update.stage_status,
          approval_status: update.approval_status,
        }, state.version);

        return state;
      } catch (err) {
        if (isOptimisticLockError(err)) {
          setHasConflict(true);
          setConflictEntity({ type: 'capability', id: capabilityId });
        }
        console.error(`Failed to update capability state for ${capabilityId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to update capability');
        return null;
      }
    },
    [broadcastEntityStateUpdate]
  );

  const syncCapability = useCallback(
    async (capability: Partial<CapabilityState>): Promise<CapabilityState | null> => {
      try {
        const state = await syncCapabilityFromFile(capability);
        if (state.capability_id) {
          setCapabilities((prev) => {
            const next = new Map(prev);
            next.set(state.capability_id, state);
            return next;
          });
        }
        return state;
      } catch (err) {
        console.error('Failed to sync capability from file:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync capability');
        return null;
      }
    },
    []
  );

  // ============================================================================
  // Enabler Operations
  // ============================================================================

  const fetchEnablerState = useCallback(async (enablerId: string): Promise<EnablerState | null> => {
    try {
      const state = await getEnablerState(enablerId);
      setEnablers((prev) => {
        const next = new Map(prev);
        next.set(enablerId, state);
        return next;
      });
      return state;
    } catch (err) {
      // 404 is expected for enablers that haven't been synced to database yet - don't log as error
      if (isNotFoundError(err)) {
        // Enabler not in database yet - this is normal, will be synced on first save
        return null;
      }
      console.error(`Failed to fetch enabler state for ${enablerId}:`, err);
      return null;
    }
  }, []);

  const updateEnabler = useCallback(
    async (enablerId: string, update: UpdateStateRequest): Promise<EnablerState | null> => {
      try {
        const state = await updateEnablerState(enablerId, update);
        setEnablers((prev) => {
          const next = new Map(prev);
          next.set(enablerId, state);
          return next;
        });
        setHasConflict(false);
        setConflictEntity(null);

        // Broadcast state change to other users
        broadcastEntityStateUpdate('enabler', enablerId, {
          lifecycle_state: update.lifecycle_state,
          workflow_stage: update.workflow_stage,
          stage_status: update.stage_status,
          approval_status: update.approval_status,
        }, state.version);

        return state;
      } catch (err) {
        if (isOptimisticLockError(err)) {
          setHasConflict(true);
          setConflictEntity({ type: 'enabler', id: enablerId });
        }
        console.error(`Failed to update enabler state for ${enablerId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to update enabler');
        return null;
      }
    },
    [broadcastEntityStateUpdate]
  );

  const syncEnabler = useCallback(
    async (enabler: Partial<EnablerState>): Promise<EnablerState | null> => {
      try {
        const state = await syncEnablerFromFile(enabler);
        if (state.enabler_id) {
          setEnablers((prev) => {
            const next = new Map(prev);
            next.set(state.enabler_id, state);
            return next;
          });
        }
        return state;
      } catch (err) {
        console.error('Failed to sync enabler from file:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync enabler');
        return null;
      }
    },
    []
  );

  // ============================================================================
  // Story Card Operations
  // ============================================================================

  const fetchStoryCardState = useCallback(async (cardId: string): Promise<StoryCardState | null> => {
    try {
      const state = await getStoryCardState(cardId);
      setStoryCards((prev) => {
        const next = new Map(prev);
        next.set(cardId, state);
        return next;
      });
      return state;
    } catch (err) {
      console.error(`Failed to fetch story card state for ${cardId}:`, err);
      return null;
    }
  }, []);

  const updateStoryCard = useCallback(
    async (cardId: string, update: UpdateStateRequest): Promise<StoryCardState | null> => {
      try {
        const state = await updateStoryCardState(cardId, update);
        setStoryCards((prev) => {
          const next = new Map(prev);
          next.set(cardId, state);
          return next;
        });
        setHasConflict(false);
        setConflictEntity(null);

        // Broadcast state change to other users
        broadcastEntityStateUpdate('story_card', cardId, {
          lifecycle_state: update.lifecycle_state,
          workflow_stage: update.workflow_stage,
          stage_status: update.stage_status,
          approval_status: update.approval_status,
        }, state.version);

        return state;
      } catch (err) {
        if (isOptimisticLockError(err)) {
          setHasConflict(true);
          setConflictEntity({ type: 'story_card', id: cardId });
        }
        console.error(`Failed to update story card state for ${cardId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to update story card');
        return null;
      }
    },
    [broadcastEntityStateUpdate]
  );

  const createNewStoryCard = useCallback(
    async (request: CreateStoryCardRequest): Promise<StoryCardState | null> => {
      try {
        const state = await createStoryCard(request);
        setStoryCards((prev) => {
          const next = new Map(prev);
          next.set(state.card_id, state);
          return next;
        });
        return state;
      } catch (err) {
        console.error('Failed to create story card:', err);
        setError(err instanceof Error ? err.message : 'Failed to create story card');
        return null;
      }
    },
    []
  );

  const syncStoryCard = useCallback(
    async (request: Partial<StoryCardState>): Promise<StoryCardState | null> => {
      try {
        // Use syncStoryCardFromFile which does upsert behavior (creates or updates)
        const state = await syncStoryCardFromFile(request);
        setStoryCards((prev) => {
          const next = new Map(prev);
          next.set(state.card_id, state);
          return next;
        });
        return state;
      } catch (err) {
        console.error('Failed to sync story card:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync story card');
        return null;
      }
    },
    []
  );

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  const resolveConflict = useCallback(() => {
    if (conflictEntity) {
      // Refresh the entity to get latest state
      if (conflictEntity.type === 'capability') {
        fetchCapabilityState(conflictEntity.id);
      } else if (conflictEntity.type === 'enabler') {
        fetchEnablerState(conflictEntity.id);
      } else if (conflictEntity.type === 'story_card') {
        fetchStoryCardState(conflictEntity.id);
      }
    }
    setHasConflict(false);
    setConflictEntity(null);
  }, [conflictEntity, fetchCapabilityState, fetchEnablerState, fetchStoryCardState]);

  // ============================================================================
  // Export/Import Operations
  // ============================================================================

  const exportState = useCallback(async (includeHistory = false): Promise<WorkspaceStateExport | null> => {
    if (!currentWorkspace?.name) {
      setError('No workspace selected');
      return null;
    }

    try {
      setIsLoading(true);
      const data = await exportWorkspaceState(currentWorkspace.name, includeHistory);
      return data;
    } catch (err) {
      console.error('Failed to export workspace state:', err);
      setError(err instanceof Error ? err.message : 'Failed to export workspace state');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.name]);

  const importState = useCallback(async (data: WorkspaceStateExport): Promise<ImportResult | null> => {
    if (!currentWorkspace?.name) {
      setError('No workspace selected');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await importWorkspaceState(currentWorkspace.name, data);
      // Refresh local state after import
      await refreshWorkspaceState();
      return result;
    } catch (err) {
      console.error('Failed to import workspace state:', err);
      setError(err instanceof Error ? err.message : 'Failed to import workspace state');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.name, refreshWorkspaceState]);

  const downloadState = useCallback(async (includeHistory = false): Promise<void> => {
    const data = await exportState(includeHistory);
    if (data) {
      downloadWorkspaceStateAsFile(data);
    }
  }, [exportState]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: EntityStateContextValue = {
    capabilities,
    enablers,
    storyCards,
    isLoading,
    error,
    fetchCapabilityState,
    updateCapability,
    syncCapability,
    fetchEnablerState,
    updateEnabler,
    syncEnabler,
    fetchStoryCardState,
    updateStoryCard,
    createNewStoryCard,
    syncStoryCard,
    refreshWorkspaceState,
    exportState,
    importState,
    downloadState,
    hasConflict,
    conflictEntity,
    resolveConflict,
  };

  return <EntityStateContext.Provider value={value}>{children}</EntityStateContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useEntityState(): EntityStateContextValue {
  const context = useContext(EntityStateContext);
  if (context === undefined) {
    throw new Error('useEntityState must be used within an EntityStateProvider');
  }
  return context;
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to get a specific capability's state
 */
export function useCapabilityState(capabilityId: string | undefined) {
  const { capabilities, fetchCapabilityState, updateCapability } = useEntityState();

  useEffect(() => {
    if (capabilityId && !capabilities.has(capabilityId)) {
      fetchCapabilityState(capabilityId);
    }
  }, [capabilityId, capabilities, fetchCapabilityState]);

  return {
    state: capabilityId ? capabilities.get(capabilityId) : undefined,
    update: updateCapability,
    refresh: () => capabilityId && fetchCapabilityState(capabilityId),
  };
}

/**
 * Hook to get a specific enabler's state
 */
export function useEnablerState(enablerId: string | undefined) {
  const { enablers, fetchEnablerState, updateEnabler } = useEntityState();

  useEffect(() => {
    if (enablerId && !enablers.has(enablerId)) {
      fetchEnablerState(enablerId);
    }
  }, [enablerId, enablers, fetchEnablerState]);

  return {
    state: enablerId ? enablers.get(enablerId) : undefined,
    update: updateEnabler,
    refresh: () => enablerId && fetchEnablerState(enablerId),
  };
}

/**
 * Hook to get a specific story card's state
 */
export function useStoryCardState(cardId: string | undefined) {
  const { storyCards, fetchStoryCardState, updateStoryCard } = useEntityState();

  useEffect(() => {
    if (cardId && !storyCards.has(cardId)) {
      fetchStoryCardState(cardId);
    }
  }, [cardId, storyCards, fetchStoryCardState]);

  return {
    state: cardId ? storyCards.get(cardId) : undefined,
    update: updateStoryCard,
    refresh: () => cardId && fetchStoryCardState(cardId),
  };
}
