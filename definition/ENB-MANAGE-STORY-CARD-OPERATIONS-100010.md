# Enabler: Manage Story Card Operations

## Metadata
- **ID**: ENB-100010
- **Name**: Manage Story Card Operations
- **Type**: Enabler
- **Parent Capability**: CAP-100002 (Storyboard Management)
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Purpose

Handle the creation, editing, and deletion of story cards on the storyboard canvas. This enabler manages the card form dialog, position tracking, and deduplication logic.

## Technical Context

### Implementation Location
- **File**: `web-ui/src/pages/Storyboard.tsx`
- **State**: `cards`, `cardFormData`, `showCardDialog`, `editingCardId`

### Dependencies
- WorkspaceContext for storyboard persistence
- EntityStateContext for database state sync
- ReadOnlyStateFields component for state display

## Requirements

### Functional Requirements

#### FR-1: Create Story Card
**Description**: Add a new story card to the canvas.

**Input**:
```typescript
cardFormData: {
  title: string;
  description: string;
  imageUrl?: string;
  ideationTags?: string[];
  ideationCardId?: string;
}
```

**Output**:
- New card added to canvas at next available position
- Card assigned unique ID
- Default INTENT state applied

**Business Rules**:
1. Title is required
2. Card ID is auto-generated UUID
3. Initial state: draft, intent, in_progress, pending
4. Position calculated to avoid overlap

#### FR-2: Edit Story Card
**Description**: Update an existing story card's content.

**Input**:
```typescript
cardId: string;
cardFormData: {
  title: string;
  description: string;
  imageUrl?: string;
}
```

**Output**:
- Card content updated
- Position preserved
- Auto-save triggered

**Business Rules**:
1. State fields are read-only in edit dialog
2. Existing connections preserved
3. Changes trigger auto-save

#### FR-3: Delete Story Card
**Description**: Remove a story card and its connections.

**Input**:
```typescript
cardId: string;
```

**Output**:
- Card removed from canvas
- All connections to/from card removed
- Auto-save triggered

**Business Rules**:
1. Confirmation required
2. Cascading connection deletion

#### FR-4: Move Story Card
**Description**: Update card position via drag-and-drop.

**Input**:
```typescript
cardId: string;
newPosition: { x: number; y: number; }
```

**Output**:
- Card position updated
- Auto-save triggered with new position

### Non-Functional Requirements

#### NFR-1: Card Deduplication
```typescript
const uniqueCards = useMemo(() => {
  const seenIds = new Set<string>();
  return cards.filter(card => {
    if (seenIds.has(card.id)) return false;
    seenIds.add(card.id);
    return true;
  });
}, [cards]);
```

#### NFR-2: Debounced Auto-Save
- 1 second debounce on changes
- Prevents excessive API calls

## Technical Specifications

### Card Form State

```typescript
const [cardFormData, setCardFormData] = useState({
  title: '',
  description: '',
  imageUrl: '',
  lifecycle_state: 'draft' as StoryCardLifecycleState,
  workflow_stage: 'intent' as StoryCardWorkflowStage,
  stage_status: 'in_progress' as StoryCardStageStatus,
  approval_status: 'pending' as StoryCardApprovalStatus,
  ideationTags: [] as string[],
  ideationCardId: '' as string | undefined,
});
```

### Position Calculation

Cards are positioned based on grid layout to prevent overlap on creation.

### Status Label Mapping

```typescript
const getLifecycleLabel = (state: StoryCardLifecycleState): string => {
  switch (state) {
    case 'draft': return 'Draft';
    case 'active': return 'Active';
    case 'implemented': return 'Implemented';
    case 'maintained': return 'Maintained';
    case 'retired': return 'Retired';
    default: return 'Draft';
  }
};
```

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TS-100020 | Create card with title | Card appears on canvas |
| TS-100021 | Create card without title | Validation error |
| TS-100022 | Edit card content | Content updated, position preserved |
| TS-100023 | Delete card with connections | Card and connections removed |
| TS-100024 | Move card via drag | Position updated |
| TS-100025 | Duplicate card IDs filtered | Only unique cards rendered |
