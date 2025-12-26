import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST']
  }
});

const PORT = 9084;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'collaboration-service' });
});

// Store active users per workspace
const workspaceUsers = new Map(); // workspaceId -> Map<socketId, user>

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a workspace room
  socket.on('join-workspace', ({ workspaceId, user }) => {
    console.log(`User ${user.email} joining workspace ${workspaceId}`);

    // Leave any previous workspace
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id && room.startsWith('workspace-')) {
        socket.leave(room);
      }
    });

    // Join the new workspace room
    const roomId = `workspace-${workspaceId}`;
    socket.join(roomId);

    // Store user info
    if (!workspaceUsers.has(roomId)) {
      workspaceUsers.set(roomId, new Map());
    }

    const roomUsers = workspaceUsers.get(roomId);
    roomUsers.set(socket.id, {
      id: socket.id,
      email: user.email,
      name: user.name || user.email,
      initial: (user.name || user.email).charAt(0).toUpperCase(),
      color: generateUserColor(socket.id)
    });

    // Notify others about new user
    const userList = Array.from(roomUsers.values());
    socket.to(roomId).emit('user-joined', {
      user: roomUsers.get(socket.id),
      users: userList
    });

    // Send current users to the new user
    socket.emit('workspace-users', userList);

    console.log(`Active users in ${roomId}:`, userList.length);
  });

  // Handle cursor movement
  socket.on('cursor-move', ({ workspaceId, x, y, page }) => {
    const roomId = `workspace-${workspaceId}`;
    const roomUsers = workspaceUsers.get(roomId);

    if (roomUsers && roomUsers.has(socket.id)) {
      const user = roomUsers.get(socket.id);

      // Broadcast cursor position to others in the room
      socket.to(roomId).emit('cursor-update', {
        userId: socket.id,
        user,
        x,
        y,
        page
      });
    }
  });

  // Handle grid updates (text blocks, image blocks, cards, etc.)
  socket.on('grid-update', ({ workspaceId, page, updateType, data }) => {
    const roomId = `workspace-${workspaceId}`;

    console.log(`Grid update in ${roomId}:`, updateType);

    // Broadcast the update to all other users in the room
    socket.to(roomId).emit('grid-change', {
      userId: socket.id,
      page,
      updateType,
      data,
      timestamp: Date.now()
    });
  });

  // Handle entity state updates (capabilities, enablers, story cards)
  socket.on('entity-state-update', ({ workspaceId, entityType, entityId, newState, version }) => {
    const roomId = `workspace-${workspaceId}`;
    const roomUsers = workspaceUsers.get(roomId);

    if (roomUsers && roomUsers.has(socket.id)) {
      const user = roomUsers.get(socket.id);

      console.log(`Entity state update in ${roomId}:`, entityType, entityId);

      // Broadcast the state change to all other users in the room
      socket.to(roomId).emit('entity-state-change', {
        userId: socket.id,
        user,
        entityType,
        entityId,
        newState,
        version,
        timestamp: Date.now()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove user from all workspaces and notify others
    workspaceUsers.forEach((roomUsers, roomId) => {
      if (roomUsers.has(socket.id)) {
        const user = roomUsers.get(socket.id);
        roomUsers.delete(socket.id);

        // Notify others about user leaving
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          user,
          users: Array.from(roomUsers.values())
        });

        console.log(`User left ${roomId}. Remaining users:`, roomUsers.size);

        // Clean up empty workspace
        if (roomUsers.size === 0) {
          workspaceUsers.delete(roomId);
        }
      }
    });
  });
});

// Generate a consistent color for each user based on their socket ID
function generateUserColor(socketId) {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B739', // Orange
    '#52B788', // Green
  ];

  // Use a simple hash of the socket ID to pick a color
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

httpServer.listen(PORT, () => {
  console.log(`Collaboration server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
