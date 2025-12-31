# Enabler: Execute Auto-Save to Markdown

## Metadata
- **ID**: ENB-100012
- **Name**: Execute Auto-Save to Markdown
- **Type**: Enabler
- **Parent Capability**: CAP-100002 (Storyboard Management)
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Purpose

Automatically generate and save markdown files for story cards when changes occur. This enabler creates both individual card files and an index file with a mermaid flowchart, persisting the storyboard to the workspace's conception folder.

## Technical Context

### Implementation Location
- **File**: `web-ui/src/pages/Storyboard.tsx`
- **Function**: `autoSaveToIdeation`
- **Trigger**: useEffect with 1-second debounce

### Dependencies
- Integration Service save-specifications endpoint
- EntityStateContext for database sync

## Requirements

### Functional Requirements

#### FR-1: Generate Individual Card Files
**Description**: Create a markdown file for each story card.

**Output Format**:
```markdown
# {Card Title}

## Metadata
- **Type**: Story Card
- **Storyboard**: {Workspace Name}
- **Card ID**: {uuid}
- **Grid Position X**: {x}
- **Grid Position Y**: {y}
- **Generated**: {timestamp}
- **File**: STORY-{TITLE}.md

## Description
{description or "_No description provided._"}

## Visual Reference
{if imageUrl: "This story card includes a visual reference (80x80px image)."}

## Dependencies

### Upstream Dependencies
{Table of cards this depends on, or "_No upstream dependencies - this is a starting point in the flow._"}

### Downstream Impact
{Table of cards that depend on this, or "_No downstream dependencies - this is an end point in the flow._"}
```

**Business Rules**:
1. File name derived from title: `STORY-{TITLE-SLUG}.md`
2. Position stored for restoration
3. State NOT stored in markdown (database is source of truth)

#### FR-2: Generate Index File
**Description**: Create STORYBOARD-INDEX.md with complete overview.

**Output Format**:
```markdown
# Storyboard Index: {Workspace Name}

## Metadata
- **Workspace**: {name}
- **Generated**: {timestamp}
- **Total Cards**: {count}
- **Total Connections**: {count}

## Complete Flow Diagram
{mermaid flowchart}

## Story Cards
{Table with columns: #, Title, Lifecycle, X, Y, File, Dependencies}

## Connections Data
{Table with columns: Connection ID, From Card ID, To Card ID}

## Card Positions Data
{Table with columns: Card ID, Title, X, Y}
```

#### FR-3: Debounced Save
**Description**: Wait for changes to settle before saving.

**Trigger**: Any change to cards or connections
**Debounce**: 1000ms
**Skip**: Initial load

### Non-Functional Requirements

#### NFR-1: State Separation
- Position data stored in markdown
- State data stored in database only
- No duplication of state sources

#### NFR-2: Error Resilience
- Log warnings on save failure
- Don't fail overall operation

## Technical Specifications

### File Name Generation

```typescript
const generateFileName = (cardTitle: string) => {
  const titleSlug = cardTitle
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `STORY-${titleSlug}.md`;
};
```

### Mermaid Diagram Generation

```typescript
indexMarkdown += '```mermaid\n';
indexMarkdown += 'flowchart TD\n';
cardsToSave.forEach(card => {
  const nodeId = card.id.replace(/-/g, '');
  const state = card.lifecycle_state || 'draft';
  const statusEmoji = state === 'implemented' || state === 'maintained'
    ? '✓' : state === 'active' ? '⟳' : '○';
  indexMarkdown += `    ${nodeId}["${statusEmoji} ${card.title}"]\n`;
});
connectionsToSave.forEach(conn => {
  indexMarkdown += `    ${conn.from.replace(/-/g, '')} --> ${conn.to.replace(/-/g, '')}\n`;
});
indexMarkdown += '```\n\n';
```

### Auto-Save Effect

```typescript
useEffect(() => {
  if (!initialLoadComplete.current) return;
  if (!currentWorkspace?.projectFolder) return;

  if (autoSaveTimeoutRef.current) {
    clearTimeout(autoSaveTimeoutRef.current);
  }

  autoSaveTimeoutRef.current = setTimeout(async () => {
    await autoSaveToIdeation(cards, connections);
  }, 1000);

  return () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  };
}, [cards, connections, currentWorkspace?.projectFolder]);
```

### API Call

```typescript
await fetch(`${INTEGRATION_URL}/save-specifications`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workspacePath: currentWorkspace.projectFolder,
    files,
    subfolder: 'conception'
  }),
});
```

### Database Sync After Save

```typescript
for (const card of cardsToSave) {
  await syncStoryCard({
    card_id: card.id,
    title: card.title,
    description: card.description || '',
    card_type: 'story',
    position_x: Math.round(card.x),
    position_y: Math.round(card.y),
    workspace_id: currentWorkspace.name,
    file_path: `${currentWorkspace.projectFolder}/conception/${fileName}`,
    lifecycle_state: card.lifecycle_state || 'draft',
    workflow_stage: card.workflow_stage || 'intent',
    stage_status: card.stage_status || 'in_progress',
    approval_status: card.approval_status || 'pending',
  });
}
```

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TS-100030 | Create card triggers auto-save | Markdown file created after 1s |
| TS-100031 | Edit card triggers auto-save | File updated after 1s |
| TS-100032 | Multiple quick edits | Only one save after last edit |
| TS-100033 | Initial load | No auto-save triggered |
| TS-100034 | Index file generated | Contains mermaid diagram |
| TS-100035 | Connection data saved | Connections in index file |
