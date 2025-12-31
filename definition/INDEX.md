# IntentR Definition Index

**Last Updated**: 2025-12-30

This folder contains capability and enabler documentation for the IntentR application following the INTENT Framework methodology.

## Capabilities

| ID | Name | Description | Status |
|----|------|-------------|--------|
| CAP-100001 | [Intent Phase Approval Management](./CAP-INTENT-PHASE-APPROVAL-MANAGEMENT-1.md) | Human-in-the-loop approval workflow for intent items | Implemented |
| CAP-100002 | [Storyboard Management](./CAP-STORYBOARD-MANAGEMENT-2.md) | Visual canvas for story cards and dependencies | Implemented |
| CAP-100003 | [Version Control Integration](./CAP-VERSION-CONTROL-INTEGRATION-3.md) | Git-based version control with README generation | Implemented |
| CAP-100004 | [API Client Configuration](./CAP-API-CLIENT-CONFIGURATION-4.md) | Centralized API client with proxy/direct modes | Implemented |
| CAP-100005 | [User Interface Components](./CAP-USER-INTERFACE-COMPONENTS-5.md) | Reusable UI components (PageHeader, etc.) | Implemented |

## Enablers by Capability

### Intent Phase Approval Management (CAP-100001)

| ID | Name | Description | Status |
|----|------|-------------|--------|
| ENB-100001 | [Execute Item Approval Processing](./ENB-EXECUTE-ITEM-APPROVAL-PROCESSING-100001.md) | Handle individual item approve/reject/reset | Implemented |
| ENB-100002 | [Execute Phase Approval Processing](./ENB-EXECUTE-PHASE-APPROVAL-PROCESSING-100002.md) | Handle phase-level approval and revocation | Implemented |

### Storyboard Management (CAP-100002)

| ID | Name | Description | Status |
|----|------|-------------|--------|
| ENB-100010 | [Manage Story Card Operations](./ENB-MANAGE-STORY-CARD-OPERATIONS-100010.md) | Create, edit, delete story cards | Implemented |
| ENB-100012 | [Execute Auto-Save to Markdown](./ENB-EXECUTE-AUTO-SAVE-TO-MARKDOWN-100012.md) | Generate and save markdown files | Implemented |

### Version Control Integration (CAP-100003)

| ID | Name | Description | Status |
|----|------|-------------|--------|
| ENB-100021 | [Execute Git Commit Operations](./ENB-EXECUTE-GIT-COMMIT-OPERATIONS-100021.md) | Save versions with README generation | Implemented |

### User Interface Components (CAP-100005)

| ID | Name | Description | Status |
|----|------|-------------|--------|
| ENB-100040 | [Render Page Header](./ENB-RENDER-PAGE-HEADER-100040.md) | Display page title and expandable info | Implemented |

## Recent Changes (2025-12-30)

Based on the latest code changes, the following capabilities and enablers were documented:

### IntentApproval.tsx Changes
- Database-backed approval state (single source of truth)
- Item-level and phase-level approval workflows
- Optimistic UI updates with rollback
- INTENT 4-dimension state model integration

### Storyboard.tsx Changes
- Auto-save to markdown files
- Database state synchronization
- Connection deduplication
- State fields stored in database only

### client.ts Changes
- Proxy mode (nginx) support
- Direct mode for development
- Claude proxy URL addition

### PageHeader.tsx
- New expandable page header component
- Click-outside and Escape key handling
- Responsive design

### VersionControlContext.tsx Changes
- README auto-generation with Anthropic API
- GitHub token handling for push
- Improved error isolation

## Document Structure

Each capability document contains:
- **Metadata**: ID, status, priority
- **Business Context**: Purpose, value, users
- **Functional Description**: Features, workflow
- **Scope**: In/out of scope
- **Dependencies**: Upstream/downstream
- **Enablers**: Child enabler references
- **Acceptance Criteria**: Testable requirements
- **Technical Specifications**: Implementation details
- **Implementation Files**: Source file references

Each enabler document contains:
- **Metadata**: ID, parent capability, status
- **Purpose**: What the enabler does
- **Technical Context**: Files, functions, dependencies
- **Requirements**: FR and NFR specifications
- **Technical Specifications**: Code patterns, APIs
- **Test Scenarios**: Test case references
