# Capability: Version Control Integration

## Metadata
- **ID**: CAP-100003
- **Name**: Version Control Integration
- **Type**: Capability
- **Component**: IntentR Web UI
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: High
- **Last Updated**: 2025-12-30

## Business Context

### Purpose
Provide Git-based version control for workspace specifications, enabling users to save versions, view history, and collaborate with teams. This capability integrates with GitHub for remote repository operations and supports README auto-generation using AI.

### Business Value
- Track changes to specifications over time
- Enable team collaboration on shared workspaces
- Automatic README generation from conception folder
- Support for branching and pull request workflows
- Audit trail of all specification changes

### Users
- Individual contributors saving their work
- Teams collaborating on specifications
- Reviewers tracking changes over time
- Project managers monitoring progress

## Functional Description

### Core Features
1. **Git Status** - Show uncommitted changes
2. **Save Version** - Commit changes with message
3. **View History** - Browse commit history
4. **Revert** - Restore to previous version
5. **Team Mode** - Branch/PR workflows
6. **README Generation** - AI-powered README from conception folder

### User Workflow
1. User makes changes to specifications
2. User opens version control panel
3. System shows pending changes (staged/unstaged/untracked)
4. User enters commit message and saves version
5. System generates/updates README.md
6. System commits changes locally
7. System pushes to remote (if configured)

## Scope

### In Scope
- Git status display
- Commit and push operations
- History viewing
- Commit revert
- Branch operations (team mode)
- Pull request creation
- README auto-generation

### Out of Scope
- Merge conflict resolution UI
- Git LFS support
- Submodule management
- Stash operations

## Dependencies

### Upstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| WorkspaceContext | Context | Current workspace path |
| Specification API | Service | Git operations endpoint |
| Anthropic API | Integration | README generation |
| GitHub API | Integration | Remote operations |

### Downstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| Workspace Components | UI | Status indicators |
| Settings Page | Configuration | API keys |

## Enablers

| Enabler ID | Name | Description | Status |
|------------|------|-------------|--------|
| ENB-100020 | Execute Git Status Operations | Check repo status and changes | Implemented |
| ENB-100021 | Execute Git Commit Operations | Save versions with messages | Implemented |
| ENB-100022 | Execute Git History Operations | View and navigate history | Implemented |
| ENB-100023 | Execute Team Mode Operations | Branch and PR workflows | Implemented |
| ENB-100024 | Generate README from Conception | AI-powered README creation | Implemented |

## Acceptance Criteria

### AC-1: Check Git Status
**Given** a workspace with a git repository
**When** the version control panel opens
**Then** the system shows branch name, pending changes, and ahead/behind counts
**And** changes are categorized as staged/unstaged/untracked

### AC-2: Save Version
**Given** uncommitted changes in the workspace
**When** the user enters a message and clicks "Save Version"
**Then** README.md is generated/updated from conception folder
**And** all changes are committed with the message
**And** changes are pushed to remote if configured

### AC-3: View History
**Given** a git repository with commits
**When** the user opens history view
**Then** commits are displayed with hash, message, author, date
**And** user can click to view commit details

### AC-4: Team Mode Operations
**Given** team mode is enabled
**When** the user creates a branch and makes changes
**Then** user can submit for review (create PR)
**And** user can sync changes with remote

### AC-5: README Generation
**Given** markdown files exist in conception folder
**When** save version is triggered
**Then** system calls AI to generate summary README
**And** README.md is created/updated in workspace root

## Technical Specifications

### State Model

```typescript
interface VersionControlState {
  isLoading: boolean;
  error: string | null;
  status: GitStatus | null;
  isGitInitialized: boolean;
  teamModeEnabled: boolean;
  currentBranch: string;
  mainBranch: string;
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  pendingChanges: GitDiff[];
  isHistoryOpen: boolean;
  isPanelOpen: boolean;
}
```

### Git Status Interface

```typescript
interface GitStatus {
  branch: string;
  isClean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/git/status` | GET | Get repository status |
| `/git/commit` | POST | Create commit |
| `/git/push` | POST | Push to remote |
| `/git/pull` | POST | Pull from remote |
| `/git/log` | GET | Get commit history |
| `/git/show` | GET | Get commit details |
| `/git/revert` | POST | Revert to commit |
| `/git/branch` | POST | Create branch |
| `/git/checkout` | POST | Switch branch |
| `/git/pr` | POST | Create pull request |
| `/generate-readme` | POST | Generate README |

### Authentication

```typescript
// GitHub token from integrations config
const getGitHubToken = (): string | null => {
  const config = localStorage.getItem('integration_config_github');
  // ... parse and return token
};

// Anthropic API key for README generation
const getAnthropicApiKey = (): string | null => {
  // Check Settings page location first
  const settingsKey = localStorage.getItem('anthropic_api_key');
  // Fall back to integrations config
  // ...
};
```

## Implementation Files

| File | Purpose |
|------|---------|
| `web-ui/src/context/VersionControlContext.tsx` | State management and API calls |
| `web-ui/src/components/WorkspaceVersionControl.tsx` | UI components |
| `cmd/specification-api/git.go` | Backend git operations |
| `cmd/specification-api/readme.go` | README generation |
