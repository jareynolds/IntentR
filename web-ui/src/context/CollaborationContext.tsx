import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getCollaborationUrl } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  initial: string;
  color: string;
}

interface CursorPosition {
  userId: string;
  user: User;
  x: number;
  y: number;
  page: string;
}

interface GridUpdate {
  userId: string;
  page: string;
  updateType: string;
  data: any;
  timestamp: number;
}

interface EntityStateUpdate {
  userId: string;
  user: User;
  entityType: 'capability' | 'enabler' | 'story_card';
  entityId: string;
  newState: {
    lifecycle_state?: string;
    workflow_stage?: string;
    stage_status?: string;
    approval_status?: string;
  };
  version: number;
  timestamp: number;
}

interface CollaborationContextType {
  isConnected: boolean;
  activeUsers: User[];
  cursors: Map<string, CursorPosition>;
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: () => void;
  updateCursor: (x: number, y: number, page: string) => void;
  broadcastGridUpdate: (page: string, updateType: string, data: any) => void;
  onGridUpdate: (callback: (update: GridUpdate) => void) => () => void;
  // Entity state collaboration
  broadcastEntityStateUpdate: (
    entityType: 'capability' | 'enabler' | 'story_card',
    entityId: string,
    newState: EntityStateUpdate['newState'],
    version: number
  ) => void;
  onEntityStateUpdate: (callback: (update: EntityStateUpdate) => void) => () => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const gridUpdateCallbacks = useRef<Set<(update: GridUpdate) => void>>(new Set());
  const entityStateCallbacks = useRef<Set<(update: EntityStateUpdate) => void>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io(getCollaborationUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);

      // Rejoin workspace if we were in one
      if (currentWorkspaceId) {
        newSocket.emit('join-workspace', {
          workspaceId: currentWorkspaceId,
          user: {
            email: user.email,
            name: user.name || user.email
          }
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
      setActiveUsers([]);
      setCursors(new Map());
    });

    newSocket.on('workspace-users', (users: User[]) => {
      console.log('Current workspace users:', users);
      setActiveUsers(users);
    });

    newSocket.on('user-joined', ({ user: newUser, users }: { user: User; users: User[] }) => {
      console.log('User joined:', newUser);
      setActiveUsers(users);
    });

    newSocket.on('user-left', ({ userId, users }: { userId: string; users: User[] }) => {
      console.log('User left:', userId);
      setActiveUsers(users);
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(userId);
        return newCursors;
      });
    });

    newSocket.on('cursor-update', (cursorData: CursorPosition) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(cursorData.userId, cursorData);
        return newCursors;
      });
    });

    newSocket.on('grid-change', (update: GridUpdate) => {
      console.log('Grid update received:', update);
      // Notify all registered callbacks
      gridUpdateCallbacks.current.forEach(callback => callback(update));
    });

    newSocket.on('entity-state-change', (update: EntityStateUpdate) => {
      console.log('Entity state update received:', update);
      // Notify all registered callbacks
      entityStateCallbacks.current.forEach(callback => callback(update));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const joinWorkspace = useCallback((workspaceId: string) => {
    if (!socket || !user) return;

    console.log('Joining workspace:', workspaceId);
    setCurrentWorkspaceId(workspaceId);

    socket.emit('join-workspace', {
      workspaceId,
      user: {
        email: user.email,
        name: user.name || user.email
      }
    });
  }, [socket, user]);

  const leaveWorkspace = useCallback(() => {
    setCurrentWorkspaceId(null);
    setActiveUsers([]);
    setCursors(new Map());
  }, []);

  const updateCursor = useCallback((x: number, y: number, page: string) => {
    if (!socket || !currentWorkspaceId) return;

    socket.emit('cursor-move', {
      workspaceId: currentWorkspaceId,
      x,
      y,
      page
    });
  }, [socket, currentWorkspaceId]);

  const broadcastGridUpdate = useCallback((page: string, updateType: string, data: any) => {
    if (!socket || !currentWorkspaceId) return;

    socket.emit('grid-update', {
      workspaceId: currentWorkspaceId,
      page,
      updateType,
      data
    });
  }, [socket, currentWorkspaceId]);

  const onGridUpdate = useCallback((callback: (update: GridUpdate) => void) => {
    gridUpdateCallbacks.current.add(callback);

    // Return cleanup function
    return () => {
      gridUpdateCallbacks.current.delete(callback);
    };
  }, []);

  const broadcastEntityStateUpdate = useCallback((
    entityType: 'capability' | 'enabler' | 'story_card',
    entityId: string,
    newState: EntityStateUpdate['newState'],
    version: number
  ) => {
    if (!socket || !currentWorkspaceId) return;

    socket.emit('entity-state-update', {
      workspaceId: currentWorkspaceId,
      entityType,
      entityId,
      newState,
      version
    });
  }, [socket, currentWorkspaceId]);

  const onEntityStateUpdate = useCallback((callback: (update: EntityStateUpdate) => void) => {
    entityStateCallbacks.current.add(callback);

    // Return cleanup function
    return () => {
      entityStateCallbacks.current.delete(callback);
    };
  }, []);

  const value: CollaborationContextType = {
    isConnected,
    activeUsers,
    cursors,
    joinWorkspace,
    leaveWorkspace,
    updateCursor,
    broadcastGridUpdate,
    onGridUpdate,
    broadcastEntityStateUpdate,
    onEntityStateUpdate
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

// Export types for use in other contexts
export type { EntityStateUpdate };
