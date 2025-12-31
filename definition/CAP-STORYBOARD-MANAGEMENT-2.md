# Capability: Storyboard Management

## Metadata
- **ID**: CAP-100002
- **Name**: Storyboard Management
- **Type**: Capability
- **Component**: IntentR Web UI
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Business Context

### Purpose
Provide a visual canvas for creating, organizing, and connecting story cards that represent user stories, flows, and requirements. The storyboard serves as the primary interface for capturing and visualizing intent during the Intent phase of the INTENT Framework.

### Business Value
- Visual representation of user stories and flows
- Enables dependency mapping between stories
- Auto-saves work to prevent data loss
- Synchronizes state with database for approval workflow
- Generates markdown documentation automatically

### Users
- Product Owners creating user stories
- UX Designers mapping user flows
- Business Analysts documenting requirements
- Development Teams reviewing story dependencies

## Functional Description

### Core Features
1. **Story Card CRUD** - Create, read, update, delete story cards
2. **Visual Canvas** - Drag-and-drop positioning with zoom/pan
3. **Connection Management** - Draw dependencies between cards
4. **Auto-Save** - Automatic markdown generation and save
5. **Database Sync** - State synchronization with EntityStateContext
6. **File Import** - Load stories from existing markdown files

### User Workflow
1. User opens Storyboard page for workspace
2. System loads existing cards from workspace files
3. System applies state from database (via EntityStateContext)
4. User creates/edits story cards with title, description, state
5. User draws connections to show dependencies
6. System auto-saves changes to conception folder
7. System syncs card state to database

## Scope

### In Scope
- Story card creation and editing
- Visual positioning and connections
- INTENT 4-dimension state model
- Auto-save to markdown files
- Database state synchronization
- Connection deduplication
- File-based card loading

### Out of Scope
- Multi-user real-time editing
- Undo/redo history
- Card templates
- Bulk operations

## Dependencies

### Upstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| WorkspaceContext | Context | Workspace and storyboard data |
| EntityStateContext | Context | Database state management |
| CollaborationContext | Context | Real-time cursor sharing |

### Downstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| Intent Approval | Page | Stories submitted for approval |
| Specification | Workflow | Approved stories drive specs |

## Enablers

| Enabler ID | Name | Description | Status |
|------------|------|-------------|--------|
| ENB-100010 | Manage Story Card Operations | Create, edit, delete story cards | Implemented |
| ENB-100011 | Manage Connection Operations | Create, update, delete connections | Implemented |
| ENB-100012 | Execute Auto-Save to Markdown | Generate and save markdown files | Implemented |
| ENB-100013 | Sync Story Card State to Database | Persist state via EntityStateContext | Implemented |
| ENB-100014 | Render Storyboard Canvas | Visual canvas with zoom/pan | Implemented |

## Acceptance Criteria

### AC-1: Create Story Card
**Given** a user on the storyboard canvas
**When** the user clicks "Add Card" and fills the form
**Then** a new story card appears on the canvas
**And** the card has default INTENT state (draft, intent, in_progress, pending)
**And** changes are auto-saved after 1 second debounce

### AC-2: Edit Story Card
**Given** a story card exists on the canvas
**When** the user double-clicks the card
**Then** the edit dialog opens with current values
**And** state fields are read-only (managed by approval workflow)
**And** saved changes persist to markdown and database

### AC-3: Draw Connection
**Given** two story cards on the canvas
**When** the user drags from one card to another
**Then** a connection line is drawn showing dependency
**And** the connection is saved with unique ID
**And** connection data appears in markdown export

### AC-4: Auto-Save
**Given** any change to cards or connections
**When** 1 second passes without further changes
**Then** system saves all cards to conception folder
**And** system generates STORYBOARD-INDEX.md
**And** system syncs state to database

### AC-5: Load from Files
**Given** a workspace with existing STORY-*.md files
**When** the user opens the Storyboard page
**Then** cards are loaded from files
**And** positions are restored from file metadata
**And** database state is applied (approval status)

## Technical Specifications

### State Model
Story cards use the INTENT 4-dimension state model:

```typescript
interface StoryCard {
  id: string;
  title: string;
  description: string;
  x: number;  // Canvas position
  y: number;
  imageUrl?: string;

  // INTENT State Model
  lifecycle_state: 'draft' | 'active' | 'implemented' | 'maintained' | 'retired';
  workflow_stage: 'intent' | 'specification' | 'ui_design' | 'implementation' | 'control_loop';
  stage_status: 'in_progress' | 'ready_for_approval' | 'approved' | 'blocked';
  approval_status: 'pending' | 'approved' | 'rejected';
}
```

### Auto-Save File Structure

```
workspace/conception/
├── STORY-CARD-TITLE.md       # Individual card file
├── STORY-ANOTHER-CARD.md     # Another card
└── STORYBOARD-INDEX.md       # Index with mermaid diagram
```

### Markdown File Format

```markdown
# Card Title

## Metadata
- **Type**: Story Card
- **Card ID**: {uuid}
- **Grid Position X**: 100
- **Grid Position Y**: 200
- **Generated**: {timestamp}

## Description
{description}

## Dependencies
### Upstream Dependencies
| Card Title | Card ID | Connection ID |
...

### Downstream Impact
| Card Title | Card ID | Connection ID |
...
```

### Connection Deduplication

```typescript
const deduplicateConnections = (
  connections: Connection[],
  validCardIds?: Set<string>
): Connection[] => {
  const seenIds = new Set<string>();
  return connections.filter(conn => {
    if (seenIds.has(conn.id)) return false;
    if (validCardIds && (!validCardIds.has(conn.from) || !validCardIds.has(conn.to))) {
      return false;
    }
    seenIds.add(conn.id);
    return true;
  });
};
```

## Implementation Files

| File | Purpose |
|------|---------|
| `web-ui/src/pages/Storyboard.tsx` | Main storyboard canvas |
| `web-ui/src/context/WorkspaceContext.tsx` | Storyboard state |
| `web-ui/src/context/EntityStateContext.tsx` | Database sync |
| `cmd/integration-service/main.go` | File save endpoints |
