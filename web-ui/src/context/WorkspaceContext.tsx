import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { INTEGRATION_URL, WORKSPACE_URL } from '../api/client';

const SHARED_WORKSPACE_API = `${WORKSPACE_URL}/api`;

export interface StoryCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  x: number;
  y: number;
  status: 'pending' | 'in-progress' | 'completed';
  ideationTags: string[];
  ideationCardId?: string; // Link to ideation card by ID
  sourceFileName?: string; // Original filename if loaded from specifications
}

export interface Connection {
  id?: string;
  from: string;
  to: string;
}

export interface StoryboardData {
  cards: StoryCard[];
  connections: Connection[];
  zoom?: number;
  scrollLeft?: number;
  scrollTop?: number;
}

export interface TextBlock {
  id: string;
  content: string;
  x: number;
  y: number;
  tags: string[];
  width: number;
  height: number;
}

export interface ImageBlock {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  tags: string[];
  width: number;
  height: number;
}

export interface ShapeBlock {
  id: string;
  type: 'box' | 'circle' | 'line' | 'square';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  tags: string[];
}

export interface IdeationData {
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  shapeBlocks?: ShapeBlock[];
  connections?: Connection[];
  zoom?: number;
  scrollLeft?: number;
  scrollTop?: number;
}

export interface AIPrinciplesData {
  [categoryId: string]: string;
}

export interface AIPrinciplesPreset {
  name: string;
  principles: AIPrinciplesData;
}

export interface SystemCapability {
  id: string;
  name: string;
  status: string;
  enablers: string[];
  upstreamDependencies: string[];
  downstreamImpacts: string[];
  x: number;
  y: number;
}

export interface SystemEnabler {
  id: string;
  name: string;
  capabilityId: string;
  x: number;
  y: number;
}

export interface SystemCapabilityDependency {
  from: string;
  to: string;
}

export interface SystemEnablerConnection {
  capabilityId: string;
  enablerId: string;
}

export interface SystemData {
  capabilities: SystemCapability[];
  enablers: SystemEnabler[];
  capabilityDependencies?: SystemCapabilityDependency[];
  enablerConnections?: SystemEnablerConnection[];
  zoom?: number;
  scrollLeft?: number;
  scrollTop?: number;
}

export type WorkspaceType = 'new' | 'refactor' | 'enhance' | 'reverse-engineer';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  workspaceType?: WorkspaceType;
  figmaTeamUrl?: string;
  projectFolder?: string;
  aiPrinciples?: AIPrinciplesData;
  aiPrinciplesPresets?: AIPrinciplesPreset[];
  activeAIPreset?: number; // 1-5 representing which preset is active
  selectedUIFramework?: string; // ID of the selected UI framework
  customUIFrameworks?: any[]; // Custom UI frameworks created by user
  selectedUILayout?: string; // ID of the selected UI layout
  customUILayouts?: any[]; // Custom UI layouts created by user
  storyboard?: StoryboardData;
  ideation?: IdeationData;
  systemDiagram?: SystemData;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerName?: string;
  isShared: boolean;
}

interface WorkspaceState {
  workspaces: Workspace[];
  sharedWorkspaces: Workspace[];
  joinedWorkspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
}

interface WorkspaceContextType extends WorkspaceState {
  createWorkspace: (name: string, description?: string, figmaTeamUrl?: string, workspaceType?: WorkspaceType) => Promise<void>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  switchWorkspace: (id: string, isShared?: boolean) => void;
  updateStoryboard: (storyboardData: StoryboardData) => void;
  toggleSharing: (id: string) => Promise<void>;
  joinSharedWorkspace: (workspace: Workspace) => Promise<void>;
  leaveSharedWorkspace: (id: string) => Promise<void>;
  refreshSharedWorkspaces: () => Promise<void>;
  setActiveAIPreset: (presetNumber: number) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<WorkspaceState>({
    workspaces: [],
    sharedWorkspaces: [],
    joinedWorkspaces: [],
    currentWorkspace: null,
    isLoading: true,
  });

  useEffect(() => {
    if (user) {
      // Migrate old shared_workspaces to global_shared_workspaces (one-time migration)
      migrateSharedWorkspaces();
      loadWorkspaces();
      refreshSharedWorkspaces();
    }
  }, [user]);

  // Auto-refresh current workspace if it's a joined/shared workspace (for collaboration)
  useEffect(() => {
    if (!state.currentWorkspace) return;

    // Check if current workspace is a joined workspace
    const isJoinedWorkspace = state.joinedWorkspaces.some(w => w.id === state.currentWorkspace?.id);

    if (!isJoinedWorkspace) return;

    // Poll every 3 seconds for updates from global_shared_workspaces
    const intervalId = setInterval(() => {
      try {
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
        const latestWorkspace = globalSharedWorkspaces.find((w: Workspace) => w.id === state.currentWorkspace?.id);

        if (latestWorkspace) {
          const updatedWorkspace = {
            ...latestWorkspace,
            createdAt: new Date(latestWorkspace.createdAt),
            updatedAt: new Date(latestWorkspace.updatedAt),
          };

          // Only update if the updatedAt timestamp is newer
          if (new Date(updatedWorkspace.updatedAt) > new Date(state.currentWorkspace!.updatedAt)) {
            console.log('Syncing workspace updates from shared storage...');

            // Update joined workspaces
            const updatedJoinedWorkspaces = state.joinedWorkspaces.map(w =>
              w.id === state.currentWorkspace?.id ? updatedWorkspace : w
            );

            saveJoinedWorkspaces(updatedJoinedWorkspaces);

            setState(prev => ({
              ...prev,
              joinedWorkspaces: updatedJoinedWorkspaces,
              currentWorkspace: updatedWorkspace,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to sync workspace updates:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [state.currentWorkspace?.id, state.currentWorkspace?.updatedAt, state.joinedWorkspaces]);

  const migrateSharedWorkspaces = () => {
    const userEmail = user?.email || 'anonymous';

    // MIGRATION 1: Migrate old global 'workspaces' to user-specific 'workspaces_${email}'
    const oldWorkspaces = localStorage.getItem('workspaces');
    const userSpecificWorkspaces = localStorage.getItem(`workspaces_${userEmail}`);

    // Only migrate if old workspaces exist AND user-specific doesn't exist yet
    if (oldWorkspaces && !userSpecificWorkspaces) {
      try {
        const oldData = JSON.parse(oldWorkspaces);

        // Filter to only migrate workspaces owned by this user
        const myWorkspaces = oldData.filter((w: Workspace) =>
          w.ownerId === userEmail || w.ownerId === 'unknown'
        );

        if (myWorkspaces.length > 0) {
          localStorage.setItem(`workspaces_${userEmail}`, JSON.stringify(myWorkspaces));
          console.log(`Migrated ${myWorkspaces.length} workspaces to user-specific storage for ${userEmail}`);
        }

        // Don't remove the old key yet - other users might need to migrate their workspaces
      } catch (err) {
        console.error('Failed to migrate workspaces:', err);
      }
    }

    // MIGRATION 2: Migrate old global 'joinedWorkspaces' to user-specific
    const oldJoinedWorkspaces = localStorage.getItem('joinedWorkspaces');
    const userSpecificJoined = localStorage.getItem(`joinedWorkspaces_${userEmail}`);

    if (oldJoinedWorkspaces && !userSpecificJoined) {
      try {
        localStorage.setItem(`joinedWorkspaces_${userEmail}`, oldJoinedWorkspaces);
        console.log(`Migrated joined workspaces to user-specific storage for ${userEmail}`);
      } catch (err) {
        console.error('Failed to migrate joined workspaces:', err);
      }
    }

    // MIGRATION 3: Migrate old 'shared_workspaces' to 'global_shared_workspaces'
    const oldSharedWorkspaces = localStorage.getItem('shared_workspaces');
    if (oldSharedWorkspaces) {
      try {
        const oldData = JSON.parse(oldSharedWorkspaces);
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');

        // Merge old data into global shared workspaces (avoiding duplicates by ID)
        const existingIds = new Set(globalSharedWorkspaces.map((w: Workspace) => w.id));
        oldData.forEach((workspace: Workspace) => {
          if (!existingIds.has(workspace.id)) {
            globalSharedWorkspaces.push(workspace);
          }
        });

        localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));

        // Remove the old key to prevent re-migration
        localStorage.removeItem('shared_workspaces');
        console.log('Migrated shared workspaces to global storage');
      } catch (err) {
        console.error('Failed to migrate shared workspaces:', err);
      }
    }
  };

  const loadWorkspaces = () => {
    // Use user-specific keys to isolate workspaces per user
    const userEmail = user?.email || 'anonymous';
    const stored = localStorage.getItem(`workspaces_${userEmail}`);
    const joinedStored = localStorage.getItem(`joinedWorkspaces_${userEmail}`);
    const currentId = localStorage.getItem(`currentWorkspaceId_${userEmail}`);

    let workspaces: Workspace[] = [];
    let joinedWorkspaces: Workspace[] = [];

    if (stored) {
      let needsSave = false;
      workspaces = JSON.parse(stored)
        .filter((w: Workspace) => {
          // SAFETY: Only load workspaces owned by this user
          const ownerEmail = w.ownerId || 'unknown';
          return ownerEmail === userEmail || ownerEmail === 'unknown';
        })
        .map((w: Workspace) => {
          // Migration: Auto-set projectFolder if not set
          let projectFolder = w.projectFolder;
          if (!projectFolder) {
            const safeFolderName = w.name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
            projectFolder = `workspaces/${safeFolderName}`;
            needsSave = true;
            console.log(`Migrating workspace "${w.name}" to use projectFolder: ${projectFolder}`);
          }
          return {
            ...w,
            projectFolder,
            createdAt: new Date(w.createdAt),
            updatedAt: new Date(w.updatedAt),
            ownerId: w.ownerId || user?.email || 'unknown',
            ownerName: w.ownerName || user?.name || user?.email || 'Unknown',
            isShared: w.isShared || false,
          };
        });
      // Save migrated workspaces if any were updated
      if (needsSave) {
        localStorage.setItem(`workspaces_${userEmail}`, JSON.stringify(workspaces));
      }
    } else {
      const safeFolderName = 'Default-Workspace';
      const defaultWorkspace: Workspace = {
        id: 'default-' + Date.now(),
        name: 'Default Workspace',
        description: 'Your first workspace',
        projectFolder: `workspaces/${safeFolderName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: user?.email || 'unknown',
        ownerName: user?.name || user?.email || 'Unknown',
        isShared: false,
      };

      workspaces = [defaultWorkspace];
      localStorage.setItem(`workspaces_${userEmail}`, JSON.stringify(workspaces));
    }

    if (joinedStored) {
      joinedWorkspaces = JSON.parse(joinedStored).map((w: Workspace) => ({
        ...w,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.updatedAt),
      }));
    }

    const allWorkspaces = [...workspaces, ...joinedWorkspaces];
    const currentWorkspace = currentId
      ? allWorkspaces.find(w => w.id === currentId) || allWorkspaces[0] || null
      : allWorkspaces[0] || null;

    if (currentWorkspace) {
      localStorage.setItem(`currentWorkspaceId_${userEmail}`, currentWorkspace.id);
    }

    setState(prev => ({
      ...prev,
      workspaces,
      joinedWorkspaces,
      currentWorkspace,
      isLoading: false,
    }));
  };

  const saveWorkspaces = (workspaces: Workspace[]) => {
    const userEmail = user?.email || 'anonymous';
    localStorage.setItem(`workspaces_${userEmail}`, JSON.stringify(workspaces));
  };

  const saveJoinedWorkspaces = (workspaces: Workspace[]) => {
    const userEmail = user?.email || 'anonymous';
    localStorage.setItem(`joinedWorkspaces_${userEmail}`, JSON.stringify(workspaces));
  };

  const createWorkspace = async (
    name: string,
    description?: string,
    figmaTeamUrl?: string,
    workspaceType?: WorkspaceType
  ): Promise<void> => {
    // Generate a safe folder name from the workspace name
    const safeFolderName = name.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    const projectFolder = `workspaces/${safeFolderName}`;

    const newWorkspace: Workspace = {
      id: 'workspace-' + Date.now(),
      name,
      description,
      workspaceType: workspaceType || 'new',
      figmaTeamUrl,
      projectFolder, // Auto-set project folder based on workspace name
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: user?.email || 'unknown',
      ownerName: user?.name || user?.email || 'Unknown',
      isShared: false,
    };

    // Ensure workspace folder structure exists
    try {
      await fetch(`${INTEGRATION_URL}/folders/ensure-workspace-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: projectFolder }),
      });
    } catch (error) {
      console.error('Error ensuring workspace structure:', error);
    }

    // Save .ubeworkspace configuration file
    try {
      await fetch(`${INTEGRATION_URL}/workspace-config/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            id: newWorkspace.id,
            name: newWorkspace.name,
            description: newWorkspace.description || '',
            workspaceType: newWorkspace.workspaceType || 'new',
            figmaTeamUrl: newWorkspace.figmaTeamUrl || '',
            projectFolder: newWorkspace.projectFolder,
            activeAIPreset: newWorkspace.activeAIPreset || 0,
            selectedUIFramework: newWorkspace.selectedUIFramework || '',
            selectedUILayout: newWorkspace.selectedUILayout || '',
            ownerId: newWorkspace.ownerId,
            ownerName: newWorkspace.ownerName || '',
            isShared: newWorkspace.isShared,
            createdAt: newWorkspace.createdAt.toISOString(),
            updatedAt: newWorkspace.updatedAt.toISOString(),
            version: '1.0',
          },
        }),
      });
    } catch (error) {
      console.error('Error saving workspace configuration file:', error);
    }

    const updatedWorkspaces = [...state.workspaces, newWorkspace];
    saveWorkspaces(updatedWorkspaces);

    setState(prev => ({
      ...prev,
      workspaces: updatedWorkspaces,
    }));
  };

  const updateWorkspace = async (id: string, updates: Partial<Workspace>): Promise<void> => {
    const updatedWorkspaces = state.workspaces.map(w =>
      w.id === id
        ? { ...w, ...updates, updatedAt: new Date() }
        : w
    );

    saveWorkspaces(updatedWorkspaces);

    // Update .ubeworkspace configuration file if workspace has a projectFolder
    const updatedWorkspace = updatedWorkspaces.find(w => w.id === id);
    if (updatedWorkspace?.projectFolder) {
      try {
        await fetch(`${INTEGRATION_URL}/workspace-config/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              id: updatedWorkspace.id,
              name: updatedWorkspace.name,
              description: updatedWorkspace.description || '',
              workspaceType: updatedWorkspace.workspaceType || 'new',
              figmaTeamUrl: updatedWorkspace.figmaTeamUrl || '',
              projectFolder: updatedWorkspace.projectFolder,
              activeAIPreset: updatedWorkspace.activeAIPreset || 0,
              selectedUIFramework: updatedWorkspace.selectedUIFramework || '',
              selectedUILayout: updatedWorkspace.selectedUILayout || '',
              ownerId: updatedWorkspace.ownerId,
              ownerName: updatedWorkspace.ownerName || '',
              isShared: updatedWorkspace.isShared,
              createdAt: updatedWorkspace.createdAt instanceof Date
                ? updatedWorkspace.createdAt.toISOString()
                : updatedWorkspace.createdAt,
              updatedAt: updatedWorkspace.updatedAt instanceof Date
                ? updatedWorkspace.updatedAt.toISOString()
                : updatedWorkspace.updatedAt,
              version: '1.0',
            },
          }),
        });
      } catch (error) {
        console.error('Error updating workspace configuration file:', error);
      }
    }

    setState(prev => ({
      ...prev,
      workspaces: updatedWorkspaces,
      currentWorkspace: prev.currentWorkspace?.id === id
        ? updatedWorkspaces.find(w => w.id === id) || prev.currentWorkspace
        : prev.currentWorkspace,
    }));

    // Sync to global shared workspaces if this workspace is shared
    const workspace = updatedWorkspaces.find(w => w.id === id);
    if (workspace?.isShared) {
      try {
        // Update in global_shared_workspaces so other users see the changes
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
        const sharedIndex = globalSharedWorkspaces.findIndex((w: Workspace) => w.id === id);

        if (sharedIndex >= 0) {
          globalSharedWorkspaces[sharedIndex] = workspace;
        } else {
          globalSharedWorkspaces.push(workspace);
        }

        localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));

        // When backend workspace service is implemented, uncomment this:
        // await axios.put(`${SHARED_WORKSPACE_API}/shared-workspaces/${id}`, { workspace });
      } catch (error) {
        console.error('Failed to sync workspace to shared storage:', error);
      }
    }

    // Also update joined workspaces if this is a joined workspace
    const isJoinedWorkspace = state.joinedWorkspaces.some(w => w.id === id);
    if (isJoinedWorkspace) {
      const updatedJoinedWorkspaces = state.joinedWorkspaces.map(w =>
        w.id === id
          ? { ...w, ...updates, updatedAt: new Date() }
          : w
      );

      saveJoinedWorkspaces(updatedJoinedWorkspaces);

      setState(prev => ({
        ...prev,
        joinedWorkspaces: updatedJoinedWorkspaces,
        currentWorkspace: prev.currentWorkspace?.id === id
          ? updatedJoinedWorkspaces.find(w => w.id === id) || prev.currentWorkspace
          : prev.currentWorkspace,
      }));

      // Sync joined workspace changes to global shared workspaces as well
      const joinedWorkspace = updatedJoinedWorkspaces.find(w => w.id === id);
      if (joinedWorkspace) {
        try {
          const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
          const sharedIndex = globalSharedWorkspaces.findIndex((w: Workspace) => w.id === id);

          if (sharedIndex >= 0) {
            globalSharedWorkspaces[sharedIndex] = joinedWorkspace;
            localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));
          }
        } catch (error) {
          console.error('Failed to sync joined workspace to shared storage:', error);
        }
      }
    }
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    const workspace = state.workspaces.find(w => w.id === id);

    if (workspace?.isShared) {
      try {
        await axios.delete(`${SHARED_WORKSPACE_API}/shared-workspaces/${id}?userEmail=${user?.email}`);
      } catch (error) {
        console.error('Failed to unshare workspace:', error);
      }
    }

    // Move workspace folder to archived_workspaces instead of permanently deleting
    if (workspace?.projectFolder) {
      try {
        await fetch(`${INTEGRATION_URL}/folders/move-to-deleted`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePath: workspace.projectFolder,
          }),
        });
      } catch (error) {
        console.error('Failed to move workspace folder to archived_workspaces:', error);
        // Continue with deletion from state even if folder move fails
      }
    }

    const updatedWorkspaces = state.workspaces.filter(w => w.id !== id);
    saveWorkspaces(updatedWorkspaces);

    setState(prev => {
      const allWorkspaces = [...updatedWorkspaces, ...prev.joinedWorkspaces];
      const newCurrent = prev.currentWorkspace?.id === id
        ? allWorkspaces[0] || null
        : prev.currentWorkspace;

      if (newCurrent) {
        const userEmail = user?.email || 'anonymous';
        localStorage.setItem(`currentWorkspaceId_${userEmail}`, newCurrent.id);
      }

      return {
        ...prev,
        workspaces: updatedWorkspaces,
        currentWorkspace: newCurrent,
      };
    });
  };

  const switchWorkspace = async (id: string, isShared: boolean = false): Promise<void> => {
    let workspace = isShared
      ? state.joinedWorkspaces.find(w => w.id === id)
      : state.workspaces.find(w => w.id === id);

    const userEmail = user?.email || 'anonymous';

    // Initialize workspace files (copy CLAUDE.md and MAIN_SWDEV_PLAN.md from CODE_RULES if needed)
    const workspaceToInit = workspace || [...state.workspaces, ...state.joinedWorkspaces].find(w => w.id === id);
    if (workspaceToInit?.projectFolder) {
      try {
        await fetch(`${INTEGRATION_URL}/workspace/init-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: workspaceToInit.projectFolder,
          }),
        });
      } catch (error) {
        console.error('Failed to initialize workspace files:', error);
      }
    }

    // If switching to a joined workspace, reload the latest data from global_shared_workspaces
    if (isShared && workspace) {
      try {
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
        const latestWorkspace = globalSharedWorkspaces.find((w: Workspace) => w.id === id);

        if (latestWorkspace) {
          // Update the joined workspace with latest data
          workspace = {
            ...latestWorkspace,
            createdAt: new Date(latestWorkspace.createdAt),
            updatedAt: new Date(latestWorkspace.updatedAt),
          };

          // Update the joinedWorkspaces array with latest data
          const updatedJoinedWorkspaces = state.joinedWorkspaces.map(w =>
            w.id === id ? workspace! : w
          );

          saveJoinedWorkspaces(updatedJoinedWorkspaces);

          setState(prev => ({
            ...prev,
            joinedWorkspaces: updatedJoinedWorkspaces,
          }));
        }
      } catch (error) {
        console.error('Failed to reload workspace from shared storage:', error);
      }
    }

    if (!workspace) {
      const found = [...state.workspaces, ...state.joinedWorkspaces].find(w => w.id === id);
      if (found) {
        localStorage.setItem(`currentWorkspaceId_${userEmail}`, id);
        setState(prev => ({
          ...prev,
          currentWorkspace: found,
        }));
      }
    } else {
      localStorage.setItem(`currentWorkspaceId_${userEmail}`, id);
      setState(prev => ({
        ...prev,
        currentWorkspace: workspace,
      }));
    }
  };

  const updateStoryboard = (storyboardData: StoryboardData): void => {
    if (!state.currentWorkspace) return;

    const workspaceId = state.currentWorkspace.id;
    const isOwnWorkspace = state.workspaces.some(w => w.id === workspaceId);

    if (isOwnWorkspace) {
      const updatedWorkspaces = state.workspaces.map(w =>
        w.id === workspaceId
          ? { ...w, storyboard: storyboardData, updatedAt: new Date() }
          : w
      );

      saveWorkspaces(updatedWorkspaces);

      const updatedWorkspace = updatedWorkspaces.find(w => w.id === workspaceId);

      setState(prev => ({
        ...prev,
        workspaces: updatedWorkspaces,
        currentWorkspace: updatedWorkspace || prev.currentWorkspace,
      }));

      // Sync to global_shared_workspaces if this workspace is shared
      if (updatedWorkspace?.isShared) {
        try {
          const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
          const sharedIndex = globalSharedWorkspaces.findIndex((w: Workspace) => w.id === workspaceId);

          if (sharedIndex >= 0) {
            globalSharedWorkspaces[sharedIndex] = updatedWorkspace;
          } else {
            globalSharedWorkspaces.push(updatedWorkspace);
          }

          localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));
          console.log('Synced storyboard to shared storage');
        } catch (error) {
          console.error('Failed to sync storyboard to shared storage:', error);
        }

        // When backend workspace service is implemented, uncomment this:
        // axios.put(`${SHARED_WORKSPACE_API}/shared-workspaces/${workspaceId}`, {
        //   workspace: updatedWorkspace
        // }).catch(error => console.error('Failed to sync workspace:', error));
      }
    } else {
      // This is a joined workspace - update it
      const updatedJoinedWorkspaces = state.joinedWorkspaces.map(w =>
        w.id === workspaceId
          ? { ...w, storyboard: storyboardData, updatedAt: new Date() }
          : w
      );

      saveJoinedWorkspaces(updatedJoinedWorkspaces);

      const updatedJoinedWorkspace = updatedJoinedWorkspaces.find(w => w.id === workspaceId);

      setState(prev => ({
        ...prev,
        joinedWorkspaces: updatedJoinedWorkspaces,
        currentWorkspace: updatedJoinedWorkspace || prev.currentWorkspace,
      }));

      // Sync joined workspace changes to global_shared_workspaces as well
      if (updatedJoinedWorkspace) {
        try {
          const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
          const sharedIndex = globalSharedWorkspaces.findIndex((w: Workspace) => w.id === workspaceId);

          if (sharedIndex >= 0) {
            globalSharedWorkspaces[sharedIndex] = updatedJoinedWorkspace;
            localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));
            console.log('Synced storyboard from joined workspace to shared storage');
          }
        } catch (error) {
          console.error('Failed to sync joined workspace storyboard to shared storage:', error);
        }
      }
    }
  };

  const toggleSharing = async (id: string): Promise<void> => {
    const workspace = state.workspaces.find(w => w.id === id);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const newIsShared = !workspace.isShared;

    try {
      // For now, workspace sharing is handled locally via localStorage
      // When backend workspace service is implemented, uncomment the API calls below:
      // if (newIsShared) {
      //   await axios.post(`${SHARED_WORKSPACE_API}/shared-workspaces`, { workspace: { ...workspace, isShared: true } });
      // } else {
      //   await axios.delete(`${SHARED_WORKSPACE_API}/shared-workspaces/${id}?userEmail=${user?.email}`);
      // }

      const updatedWorkspaces = state.workspaces.map(w =>
        w.id === id
          ? { ...w, isShared: newIsShared, updatedAt: new Date() }
          : w
      );

      saveWorkspaces(updatedWorkspaces);

      // Save shared workspaces to GLOBAL localStorage for local simulation (shared across all users on this browser)
      if (newIsShared) {
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');

        // Add the workspace to global shared list if not already there
        const existingIndex = globalSharedWorkspaces.findIndex((w: Workspace) => w.id === id);
        const sharedWorkspace = {
          ...workspace,
          isShared: true,
          updatedAt: new Date(),
          ownerId: workspace.ownerId || user?.email || 'unknown',
          ownerName: workspace.ownerName || user?.name || user?.email || 'Unknown'
        };

        if (existingIndex >= 0) {
          globalSharedWorkspaces[existingIndex] = sharedWorkspace;
        } else {
          globalSharedWorkspaces.push(sharedWorkspace);
        }

        localStorage.setItem('global_shared_workspaces', JSON.stringify(globalSharedWorkspaces));

        // Also share workspace-specific integration configurations
        const workspaceIntegrations = JSON.parse(localStorage.getItem('workspace_integrations') || '{}');
        if (workspaceIntegrations[id]) {
          // Store the integration configs for this workspace in a shared location
          const sharedIntegrations = JSON.parse(localStorage.getItem('shared_workspace_integrations') || '{}');
          sharedIntegrations[id] = workspaceIntegrations[id];
          localStorage.setItem('shared_workspace_integrations', JSON.stringify(sharedIntegrations));
        }
      } else {
        // Remove from global shared workspaces
        const globalSharedWorkspaces = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');
        const filtered = globalSharedWorkspaces.filter((w: Workspace) => w.id !== id);
        localStorage.setItem('global_shared_workspaces', JSON.stringify(filtered));

        // Remove shared integration configurations
        const sharedIntegrations = JSON.parse(localStorage.getItem('shared_workspace_integrations') || '{}');
        delete sharedIntegrations[id];
        localStorage.setItem('shared_workspace_integrations', JSON.stringify(sharedIntegrations));
      }

      setState(prev => ({
        ...prev,
        workspaces: updatedWorkspaces,
        currentWorkspace: prev.currentWorkspace?.id === id
          ? updatedWorkspaces.find(w => w.id === id) || prev.currentWorkspace
          : prev.currentWorkspace,
      }));
    } catch (error) {
      console.error('Failed to toggle sharing:', error);
      throw error;
    }
  };

  const refreshSharedWorkspaces = async (): Promise<void> => {
    if (!user?.email) return;

    try {
      // For now, workspace sharing is handled locally via localStorage
      // When backend workspace service is implemented, uncomment the API call below:
      // const response = await axios.get(`${SHARED_WORKSPACE_API}/shared-workspaces?userEmail=${user.email}`);
      // const sharedWorkspaces = response.data.workspaces.map((w: Workspace) => ({
      //   ...w,
      //   createdAt: new Date(w.createdAt),
      //   updatedAt: new Date(w.updatedAt),
      // }));

      // Load ALL shared workspaces from global localStorage (shared across all users on this browser)
      const allSharedWorkspacesData = JSON.parse(localStorage.getItem('global_shared_workspaces') || '[]');

      // Filter to show only workspaces that:
      // 1. Are NOT owned by the current user (don't show your own workspaces in "Available to Join")
      // 2. Have NOT already been joined by the current user
      const joinedWorkspaceIds = new Set(state.joinedWorkspaces.map(w => w.id));
      const myWorkspaceIds = new Set(state.workspaces.map(w => w.id));

      const sharedWorkspaces = allSharedWorkspacesData
        .filter((w: any) => w.ownerId !== user.email && !joinedWorkspaceIds.has(w.id) && !myWorkspaceIds.has(w.id))
        .map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
        }));

      setState(prev => ({
        ...prev,
        sharedWorkspaces,
      }));
    } catch (error) {
      console.error('Failed to fetch shared workspaces:', error);
    }
  };

  const joinSharedWorkspace = async (workspace: Workspace): Promise<void> => {
    if (state.joinedWorkspaces.some(w => w.id === workspace.id)) {
      return;
    }

    const updatedJoinedWorkspaces = [...state.joinedWorkspaces, workspace];
    saveJoinedWorkspaces(updatedJoinedWorkspaces);

    // Copy shared integration configurations to user's workspace integrations
    const sharedIntegrations = JSON.parse(localStorage.getItem('shared_workspace_integrations') || '{}');
    if (sharedIntegrations[workspace.id]) {
      const workspaceIntegrations = JSON.parse(localStorage.getItem('workspace_integrations') || '{}');
      workspaceIntegrations[workspace.id] = sharedIntegrations[workspace.id];
      localStorage.setItem('workspace_integrations', JSON.stringify(workspaceIntegrations));
    }

    setState(prev => ({
      ...prev,
      joinedWorkspaces: updatedJoinedWorkspaces,
    }));
  };

  const leaveSharedWorkspace = async (id: string): Promise<void> => {
    const updatedJoinedWorkspaces = state.joinedWorkspaces.filter(w => w.id !== id);
    saveJoinedWorkspaces(updatedJoinedWorkspaces);

    setState(prev => {
      const allWorkspaces = [...prev.workspaces, ...updatedJoinedWorkspaces];
      const newCurrent = prev.currentWorkspace?.id === id
        ? allWorkspaces[0] || null
        : prev.currentWorkspace;

      if (newCurrent) {
        localStorage.setItem('currentWorkspaceId', newCurrent.id);
      }

      return {
        ...prev,
        joinedWorkspaces: updatedJoinedWorkspaces,
        currentWorkspace: newCurrent,
      };
    });
  };

  const setActiveAIPreset = async (presetNumber: number): Promise<void> => {
    if (!state.currentWorkspace) return;
    if (presetNumber < 1 || presetNumber > 5) {
      console.error('Invalid preset number. Must be 1-5');
      return;
    }

    await updateWorkspace(state.currentWorkspace.id, { activeAIPreset: presetNumber });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        ...state,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        switchWorkspace,
        updateStoryboard,
        toggleSharing,
        joinSharedWorkspace,
        leaveSharedWorkspace,
        refreshSharedWorkspaces,
        setActiveAIPreset,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};
