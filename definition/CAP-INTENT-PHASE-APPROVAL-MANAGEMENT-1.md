# Capability: Intent Phase Approval Management

## Metadata
- **ID**: CAP-100001
- **Name**: Intent Phase Approval Management
- **Type**: Capability
- **Component**: IntentR Web UI
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Business Context

### Purpose
Enable human reviewers to approve or reject intent declaration items (Vision, Ideation, Storyboard) before proceeding to the Specification phase. This capability implements the INTENT Framework's stage-gate approval model where human decisions authorize workflow progression.

### Business Value
- Ensures all intent artifacts are reviewed before implementation begins
- Prevents work from progressing with unclear or rejected requirements
- Provides audit trail of approvals with timestamps and comments
- Enforces the INTENT principle that "Humans decide, AI helps humans execute"

### Users
- Product Owners reviewing vision documents
- Business Analysts validating ideation boards
- Technical Leads approving storyboard cards
- Project Managers tracking phase completion

## Functional Description

### Core Features
1. **Individual Item Approval** - Approve or reject vision, ideation, and storyboard items
2. **Phase-Level Approval** - Approve the entire Intent phase when all items are approved
3. **Rejection Workflow** - Require comments when rejecting items for revision
4. **Status Tracking** - Display real-time approval progress and completion percentage
5. **Database Synchronization** - Single source of truth in database, not localStorage

### User Workflow
1. User navigates to Intent Phase Approval page
2. System loads all intent items from workspace files
3. System applies approval status from database (via EntityStateContext)
4. User reviews each item and approves or rejects
5. On approval: System sets lifecycle_state='active', approval_status='approved'
6. On rejection: System sets stage_status='blocked', requires comment
7. When all items approved: User can approve entire Intent phase
8. Phase approval unlocks Specification phase navigation

## Scope

### In Scope
- Vision item approval (VIS-*, VISION-*, THEME-* files)
- Ideation item approval (IDEA-* files)
- Storyboard item approval (STORY-*, SB-* files)
- Individual item approve/reject/reset actions
- Phase-level approval and revocation
- Database state synchronization
- Optimistic UI updates with rollback

### Out of Scope
- Automated approval rules
- Multi-user approval workflows
- Approval delegation
- Approval expiration

## Dependencies

### Upstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| WorkspaceContext | Context | Current workspace and project folder |
| EntityStateContext | Context | Database-backed state management |
| Integration Service | API | File loading endpoints |

### Downstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| Capabilities Page | Navigation | Unlocked after Intent phase approval |
| Specification Phase | Workflow | Requires Intent phase completion |

## Enablers

| Enabler ID | Name | Description | Status |
|------------|------|-------------|--------|
| ENB-100001 | Execute Item Approval Processing | Handle individual item approve/reject operations | Implemented |
| ENB-100002 | Execute Phase Approval Processing | Handle phase-level approval and revocation | Implemented |
| ENB-100003 | Render Approval Status UI | Display approval progress, badges, and actions | Implemented |
| ENB-100004 | Sync Approval State to Database | Persist approval decisions to database | Implemented |

## Acceptance Criteria

### AC-1: Item Approval
**Given** a user viewing an unapproved intent item
**When** the user clicks "Approve"
**Then** the system updates database with approval_status='approved', lifecycle_state='active'
**And** the UI immediately reflects the approved status
**And** the completion percentage updates

### AC-2: Item Rejection
**Given** a user viewing an intent item
**When** the user clicks "Reject" and provides a comment
**Then** the system updates database with approval_status='rejected', stage_status='blocked'
**And** the rejection comment is stored
**And** the item shows the rejection reason

### AC-3: Phase Approval
**Given** all intent items are approved with no rejections
**When** the user clicks "Approve Intent Phase"
**Then** the phase is marked approved in the database
**And** navigation to Specification phase is unlocked

### AC-4: Status Reset
**Given** an approved or rejected item
**When** the user clicks "Reset"
**Then** the item returns to pending status
**And** the database is updated accordingly

## Technical Specifications

### State Model Integration
The capability implements the INTENT 4-dimension state model:

```
On APPROVE:
- lifecycle_state: 'active'
- workflow_stage: 'intent'
- stage_status: 'approved'
- approval_status: 'approved'

On REJECT:
- lifecycle_state: 'active'
- workflow_stage: 'intent'
- stage_status: 'blocked'
- approval_status: 'rejected'

On RESET:
- lifecycle_state: (preserved)
- workflow_stage: (preserved)
- stage_status: 'in_progress'
- approval_status: 'pending'
```

### API Endpoints Used
- `POST /theme-files` - Load vision items
- `POST /ideation-files` - Load ideation items
- `POST /story-files` - Load storyboard items

### Database Tables
- `story_cards` - Individual item state
- `phase_approvals` - Phase-level approvals

## Implementation Files

| File | Purpose |
|------|---------|
| `web-ui/src/pages/IntentApproval.tsx` | Main approval page component |
| `web-ui/src/context/EntityStateContext.tsx` | Database state management |
| `internal/capability/phase_approval.go` | Backend phase approval service |
