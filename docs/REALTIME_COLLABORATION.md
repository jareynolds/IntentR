# Real-Time Collaboration Feature

## Overview

The IntentR platform now supports real-time collaboration, allowing multiple users to work together simultaneously on ideation and storyboarding pages. Users can see each other's cursors in real-time with their initials displayed, and all changes to the grid are instantly synchronized across all connected users.

## Features

### 1. Real-Time Cursor Tracking
- **Live Cursor Positions**: See where other users are pointing in real-time
- **User Identification**: Each cursor displays the user's first initial
- **Color Coding**: Each user is assigned a unique color for easy identification
- **Name Labels**: Hover to see the full user name

### 2. Grid Synchronization
- **Instant Updates**: Changes to text blocks, images, cards, and connections are immediately visible to all users
- **Workspace Isolation**: Collaboration is scoped to individual workspaces
- **Conflict Prevention**: Updates are synchronized to prevent data conflicts

### 3. User Presence
- **Active User List**: See who else is currently in the workspace
- **Join/Leave Notifications**: Get notified when users join or leave
- **Connection Status**: Visual indicator of connection status

## Architecture

### Components

#### 1. Collaboration Server (`collaboration-server.js`)
- WebSocket server running on port 8084
- Handles real-time communication between users
- Manages workspace rooms and user sessions
- Broadcasts cursor positions and grid updates

**Key Events:**
- `join-workspace`: User joins a workspace
- `cursor-move`: User moves their cursor
- `grid-update`: User makes changes to the grid
- `user-joined`: Notification when a user joins
- `user-left`: Notification when a user leaves

#### 2. CollaborationContext (`src/context/CollaborationContext.tsx`)
- React Context for managing collaboration state
- Handles WebSocket connection lifecycle
- Provides hooks for cursor tracking and grid updates
- Manages automatic reconnection

**API:**
```typescript
interface CollaborationContextType {
  isConnected: boolean;
  activeUsers: User[];
  cursors: Map<string, CursorPosition>;
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: () => void;
  updateCursor: (x: number, y: number, page: string) => void;
  broadcastGridUpdate: (page: string, updateType: string, data: any) => void;
  onGridUpdate: (callback: (update: GridUpdate) => void) => () => void;
}
```

#### 3. RemoteCursors Component (`src/components/RemoteCursors.tsx`)
- Renders cursors for all remote users
- Displays user initials and names
- Handles cursor animations and styling
- Filters cursors by page (ideation/storyboard)

### Integration Points

#### Ideation Page
- Tracks mouse movement and broadcasts cursor position
- Listens for remote grid updates and applies them
- Broadcasts all text/image block changes

#### Storyboard Page
- Tracks mouse movement and broadcasts cursor position
- Listens for remote grid updates and applies them
- Broadcasts all card and connection changes

## Usage

### Starting the Collaboration Server

The collaboration server starts automatically when you run:
```bash
./start.sh
```

To start it manually:
```bash
cd web-ui
npm run collab-server
```

### Monitoring

View collaboration server logs:
```bash
tail -f collab-server.log
```

Check service health:
```bash
curl http://localhost:8084/api/health
```

### Configuration

The collaboration server can be configured by modifying `web-ui/collaboration-server.js`:

**Port**: Change `PORT` constant (default: 8084)
**CORS**: Modify `cors.origin` for production (default: all origins)

The client connection URL is configured in `src/context/CollaborationContext.tsx`:
```typescript
const COLLABORATION_SERVER_URL = 'http://localhost:8084';
```

## Technical Details

### Data Flow

1. **User Action** (e.g., move cursor, add block)
   ↓
2. **Component Handler** (e.g., handleMouseMove, handleAddTextBlock)
   ↓
3. **CollaborationContext** (updateCursor or broadcastGridUpdate)
   ↓
4. **WebSocket Emit** to server
   ↓
5. **Server Broadcast** to all users in workspace
   ↓
6. **Client Receive** via WebSocket
   ↓
7. **CollaborationContext Event** (cursor-update or grid-change)
   ↓
8. **Component Update** (render remote cursor or update grid)

### Preventing Update Loops

To prevent infinite loops when synchronizing grid updates:

1. Each page maintains an `isRemoteUpdate` ref
2. Before broadcasting, check if update is from remote
3. Remote updates don't trigger new broadcasts
4. Flag is reset after state update completes

```typescript
// Mark as remote update
isRemoteUpdate.current = true;
setTextBlocks(update.data.textBlocks);

// Reset flag
setTimeout(() => {
  isRemoteUpdate.current = false;
}, 100);
```

### Workspace Isolation

Each workspace has its own "room" on the collaboration server:
- Room ID: `workspace-{workspaceId}`
- Users automatically join their workspace room
- Updates only broadcast within the same room
- Users can only see cursors from their workspace

## Development

### Adding New Collaborative Features

1. **Add event to collaboration server**
   ```javascript
   socket.on('new-event', ({ workspaceId, data }) => {
     const roomId = `workspace-${workspaceId}`;
     socket.to(roomId).emit('new-event-broadcast', data);
   });
   ```

2. **Add method to CollaborationContext**
   ```typescript
   const emitNewEvent = useCallback((data: any) => {
     if (!socket || !currentWorkspaceId) return;
     socket.emit('new-event', { workspaceId: currentWorkspaceId, data });
   }, [socket, currentWorkspaceId]);
   ```

3. **Listen for event in component**
   ```typescript
   useEffect(() => {
     const unsubscribe = onNewEvent((data) => {
       // Handle event
     });
     return unsubscribe;
   }, []);
   ```

### Testing Locally

To test collaboration locally:

1. Open two browser windows (or use incognito)
2. Log in with different users in each window
3. Navigate to the same workspace
4. Make changes in one window and observe in the other

### Debugging

Enable verbose logging in the collaboration server:
```javascript
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  // Add more console.log statements as needed
});
```

Enable client-side logging:
```typescript
socket.on('cursor-update', (cursorData) => {
  console.log('Received cursor update:', cursorData);
  // Process update
});
```

## Performance Considerations

### Throttling Cursor Updates

Cursor movements are sent on every mouse move. For better performance, consider throttling:

```typescript
import { throttle } from 'lodash';

const throttledUpdateCursor = throttle((x, y, page) => {
  updateCursor(x, y, page);
}, 50); // Max 20 updates per second
```

### Grid Update Optimization

Currently, full grid state is broadcast on every change. For large workspaces, consider:
1. Sending only deltas (what changed)
2. Batching multiple changes
3. Implementing operational transformation (OT) or CRDTs

## Security Considerations

### Production Deployment

Before deploying to production:

1. **Restrict CORS**
   ```javascript
   const io = new Server(httpServer, {
     cors: {
       origin: 'https://your-domain.com',
       methods: ['GET', 'POST']
     }
   });
   ```

2. **Add Authentication**
   - Verify JWT token on connection
   - Ensure users can only join workspaces they have access to

3. **Rate Limiting**
   - Implement rate limiting for cursor and grid updates
   - Prevent abuse and DoS attacks

4. **Use WSS (WebSocket Secure)**
   - Enable HTTPS/WSS in production
   - Update `COLLABORATION_SERVER_URL` to use `wss://`

## Troubleshooting

### Connection Issues

**Problem**: "Disconnected from collaboration server"

**Solutions**:
- Check if collaboration server is running
- Verify port 8084 is not blocked by firewall
- Check browser console for WebSocket errors
- Review `collab-server.log` for server errors

### Cursor Not Showing

**Problem**: Can't see other users' cursors

**Solutions**:
- Ensure users are in the same workspace
- Check if `RemoteCursors` component is rendered
- Verify cursor positions are being broadcast (check logs)
- Confirm users are authenticated

### Grid Not Syncing

**Problem**: Changes not appearing for other users

**Solutions**:
- Check if `broadcastGridUpdate` is being called
- Verify `isRemoteUpdate` flag is working correctly
- Review server logs for broadcast errors
- Ensure `onGridUpdate` callback is registered

## Future Enhancements

Potential improvements for the collaboration feature:

1. **Operational Transformation**: Implement OT for true conflict-free collaboration
2. **Presence Indicators**: Show typing indicators and active selections
3. **Chat**: Add in-app messaging between collaborators
4. **Version History**: Track and replay collaboration sessions
5. **Permissions**: Role-based access control for collaboration
6. **Offline Support**: Queue updates when offline and sync when reconnected
7. **Performance**: Implement delta updates and compression
8. **Video/Audio**: Add WebRTC for voice/video calls

## References

- [Socket.io Documentation](https://socket.io/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Operational Transformation](https://en.wikipedia.org/wiki/Operational_transformation)
- [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)
