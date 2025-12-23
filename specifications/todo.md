# Jira Integration - Development Phases

## Overview
This document tracks the phased development of the Jira integration feature for importing Jira artifacts as INTENT Capabilities and Enablers.

---

## Phase 1: Basic Epic Import (COMPLETE)
**Status**: Complete

### Features
- [x] Backend endpoint to fetch Jira Epics from a project (`POST /fetch-jira-epics`)
- [x] Backend endpoint to generate Capability files from Epics (`POST /import-jira-epics`)
- [x] JiraImportModal component with Epic selection UI
- [x] "Import Epics as Capabilities" button in WorkspaceIntegrations
- [x] Status mapping (Jira → INTENT)
- [x] Priority mapping (Jira → INTENT)
- [x] Generated Capability markdown follows MAIN_SWDEV_PLAN.md template

### Files Modified
- `internal/integration/resources.go` - FetchJiraEpics function
- `internal/integration/handler.go` - HandleFetchJiraEpics, HandleImportJiraEpics
- `cmd/integration-service/main.go` - Routes
- `web-ui/src/components/JiraImportModal.tsx` - New component
- `web-ui/src/components/WorkspaceIntegrations.tsx` - Import button integration

---

## Phase 2: Hierarchical Import (Child Stories as Enablers)
**Status**: Pending

### Features
- [ ] Fetch child issues (Stories, Tasks) for each Epic
- [ ] Import Stories as Enablers linked to parent Capability
- [ ] Create proper parent-child relationships in generated files
- [ ] Update JiraImportModal to show hierarchical structure
- [ ] Option to expand/collapse Epics to see child issues
- [ ] Selective import of child issues

### Technical Notes
- Use Jira API to fetch issues with `parent` field
- JQL: `project=X AND parent=EPIC-KEY ORDER BY created`
- Enabler files should reference parent Capability ID
- Consider batch import for performance

---

## Phase 3: Smart Field Mapping
**Status**: Pending

### Features
- [ ] Map Jira custom fields to Capability/Enabler fields
- [ ] Support for different Jira project configurations
- [ ] User-configurable field mappings per workspace
- [ ] Extract acceptance criteria from Jira if present
- [ ] Map Jira labels to tags/categories
- [ ] Map Jira components to INTENT components

### Technical Notes
- Store field mappings in workspace configuration
- Create UI for mapping Jira fields → INTENT fields
- Handle different Jira issue type schemas

---

## Phase 4: Incremental Sync
**Status**: Pending

### Features
- [ ] Track which Jira issues have been imported
- [ ] Detect changes in Jira since last import
- [ ] Show "New" / "Updated" badges in import modal
- [ ] Option to update existing Capabilities from Jira changes
- [ ] Conflict detection for locally modified Capabilities
- [ ] Import history/audit log

### Technical Notes
- Store import metadata (Jira issue key, last sync timestamp)
- Use Jira's `updated` field for change detection
- Consider using Jira webhooks for real-time updates (future)

---

## Phase 5: Bi-directional Sync (Advanced)
**Status**: Future

### Features
- [ ] Push Capability status changes back to Jira
- [ ] Create new Jira issues from Capabilities
- [ ] Link Enabler completion to Jira Story status
- [ ] Real-time webhook integration
- [ ] Conflict resolution UI

### Technical Notes
- Requires Jira write permissions
- Need careful conflict handling
- Consider opt-in per workspace

---

## Phase 6: Reporting & Analytics
**Status**: Future

### Features
- [ ] Import progress dashboard
- [ ] Coverage report (imported vs total issues)
- [ ] Status synchronization report
- [ ] Import/sync history timeline

---

## Known Issues & Bugs

| Issue | Status | Notes |
|-------|--------|-------|
| API migration needed | Fixed | Migrated from `/rest/api/3/search` to `/rest/api/3/search/jql` |

---

## API Reference

### Current Endpoints
- `POST /fetch-jira-epics` - Fetch Epics from a Jira project
- `POST /import-jira-epics` - Generate Capability files from selected Epics

### Planned Endpoints
- `POST /fetch-jira-children` - Fetch child issues for an Epic
- `POST /import-jira-stories` - Generate Enabler files from Stories
- `GET /jira-import-status` - Get import history for a workspace
- `POST /sync-jira-capabilities` - Sync changes from Jira

---

**Last Updated**: 2025-12-22

---
---

# Codebase Reorganization - Development Phases

## Overview
This document tracks the phased reorganization of the Intentr codebase to improve structure, maintainability, and developer experience.

---

## Phase 1: Immediate Cleanup (COMPLETE)
**Status**: Complete
**Date**: 2025-12-22

### Completed Tasks
- [x] Remove binary executables from git (`integration-service`, `claude-proxy`)
- [x] Remove 71 `.DS_Store` files
- [x] Remove empty orphaned directories (`path/`, `Users/`)
- [x] Archive legacy directories (`code/`, `enh-code/` → `archived-legacy/`)
- [x] Archive old specifications (`ori-specifications/` → `archived-specifications/`)
- [x] Move utility scripts to `scripts/` (`find-replace.sh`, `git-push.sh`)
- [x] Move misplaced test file (`test_figma_team.go` → `tests/`)
- [x] Remove stray log file (`integration-service.log`)
- [x] Update `.gitignore` to prevent future issues

### Results
- Reduced root directory items from 56 to 38
- Cleaner repository structure
- Build artifacts no longer tracked

---

## Phase 2: Rename UbeCode to Intentr (COMPLETE)
**Status**: Complete
**Date**: 2025-12-23

### Completed Tasks
- [x] Replace all "UbeCode" references with "Intentr" across codebase
- [x] Update 39 files (Go services, specs, docs, web-ui, configs)
- [x] Rebuild web-ui to regenerate dist folder
- [x] Verified zero remaining UbeCode references

---

## Phase 3: Advanced Reorganization (Deferred - Requires Code Changes)
**Status**: Pending
**Priority**: Medium
**Risk**: May break application functionality - requires careful testing

### Tasks
- [ ] **Move AI Principles to CODE_RULES/AI_GOVERNANCE/**
  - Currently in multiple locations
  - Consolidate all AI governance files
  - Update workspace activation logic to copy from new location
  - Update web-ui references to new paths

- [ ] **Consolidate design system files into docs/design-systems/**
  - Currently scattered in `web-ui/public/design-systems/`
  - Move reverse-engineered design files
  - Update CSS import paths
  - Update ThemeContext references

### Technical Notes
- These changes require updates to:
  - Workspace activation service (copies CLAUDE.md and MAIN_SWDEV_PLAN.md)
  - AI Principles page in web-ui
  - Theme switching logic
  - CSS loading paths
- **Recommend**: Create feature branch and test thoroughly before merging

---

## Phase 4: Documentation Consolidation
**Status**: Future
**Priority**: Low

### Tasks
- [ ] Merge duplicate operation guides (`STARTUP-GUIDE.md` vs `STARTUP_GUIDE.md`)
- [ ] Consolidate approval documentation (3 separate files)
- [ ] Create unified API documentation from scattered files
- [ ] Archive obsolete reports and analysis files
- [ ] Add README.md to key directories explaining their purpose

### Directories to Document
- `/cmd/` - Service entry points
- `/internal/` - Private service logic
- `/pkg/` - Shared libraries
- `/scripts/` - Utility and setup scripts
- `/specifications/` - INTENT specifications
- `/workspaces/` - User workspaces

---

## Phase 5: Infrastructure Improvements
**Status**: Future
**Priority**: Low

### Tasks
- [ ] Move environment examples to a dedicated `/config/` directory
- [ ] Consolidate all scripts under `/scripts/` with subdirectories:
  - `/scripts/setup/` - Installation scripts
  - `/scripts/deploy/` - Deployment scripts
  - `/scripts/dev/` - Development utilities
- [ ] Add pre-commit hooks for code quality
- [ ] Create Makefile targets for common operations
- [ ] Add GitHub Actions for CI/CD

---

## Summary of Root Directory Changes

### Before Cleanup (56 items)
```
Many binary files, .DS_Store files, orphaned directories,
duplicate specifications, stray logs
```

### After Phase 1-2 (38 items)
```
Clean source directories, proper .gitignore,
all UbeCode references renamed to Intentr
```

### Target State After All Phases (~30 items)
```
├── cmd/                    # Service entry points
├── internal/               # Private service logic
├── pkg/                    # Shared libraries
├── web-ui/                 # React frontend
├── scripts/                # All scripts consolidated
├── docs/                   # All documentation
├── specifications/         # INTENT specs
├── workspaces/             # User workspaces
├── tests/                  # Test files
├── CODE_RULES/             # AI governance & methodology
├── docker-compose.yml
├── Makefile
├── .env.example
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

**Last Updated**: 2025-12-23
