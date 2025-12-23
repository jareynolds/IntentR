# Intentr Codebase Structure Analysis

**Project:** IntentR (Intentr)  
**Framework:** INTENT (Scaled Agile With AI)  
**Analysis Date:** December 2025  
**Repository:** /Users/jamesreynolds/Documents/Development/Intentr

---

## EXECUTIVE SUMMARY

The Intentr repository is a **moderately complex microservices application** using Go backend services and React frontend. While the core Go project follows standard conventions (cmd/, internal/, pkg/), there are **significant organizational issues** that should be addressed:

### Key Issues Identified:
1. **Binary executables at repository root** (should be in `.gitignore`)
2. **Duplicate/overlapping specification directories** (specifications/ vs ori-specifications/)
3. **Scattered root-level artifacts** (logs, databases, configs, temporary files)
4. **Confusing UI page duplication** (Welcome.tsx vs wizard pages)
5. **Orphaned root-level directories** (path/, Users/, .claude/)
6. **Generated files and build artifacts** in source control
7. **Inconsistent documentation structure** across multiple locations

---

## PART 1: CURRENT DIRECTORY STRUCTURE

### A. Top-Level Directory Organization (56 items)

```
/Intentr/ (repository root)
├── Core Go Modules
│   ├── cmd/                    # Service entry points (CORRECT)
│   ├── internal/               # Private service logic (CORRECT)
│   ├── pkg/                    # Shared public libraries (CORRECT)
│   ├── migrations/             # Database migrations (CORRECT)
│
├── Frontend Application
│   └── web-ui/                 # React + Vite (CORRECT)
│
├── Specifications & Documentation
│   ├── specifications/         # Current specs (111 files)
│   ├── ori-specifications/     # Original specs (93 files) ← DUPLICATE
│   ├── docs/                   # Feature & API docs (CORRECT)
│   ├── CODE_RULES/             # Development guidelines (CORRECT)
│   └── workspaces/             # Multi-project workspace support (CORRECT)
│
├── Configuration & Deployment
│   ├── scripts/                # Build & setup scripts (CORRECT)
│   ├── docker-compose.yml      # Container orchestration (CORRECT)
│   ├── Dockerfile              # Image definition (CORRECT)
│   ├── Makefile                # Build automation (CORRECT)
│   ├── nginx/                  # Web server config (CORRECT)
│   ├── .env.example            # Config template (CORRECT)
│   └── .ubecli.yaml            # CLI config (CORRECT)
│
├── Runtime & Execution Environment
│   ├── logs/                   # Log files (SHOULD BE GITIGNORED)
│   ├── .pids/                  # PID files (SHOULD BE GITIGNORED)
│   ├── bin/                    # Built binaries (SHOULD BE GITIGNORED)
│   └── uploaded-assets/        # Design artifacts & resources (UNCLEAR PURPOSE)
│
├── PROBLEMATIC ARTIFACTS & ORPHANED DIRECTORIES
│   ├── integration-service     # Binary executable (SHOULD BE GITIGNORED)
│   ├── claude-proxy            # Binary executable (SHOULD BE GITIGNORED)
│   ├── Users/                  # Unknown user directory (MISPLACED)
│   ├── path/                   # Empty directory (MISPLACED)
│   ├── code/                   # Contains old SDP markdown (MISPLACED)
│   ├── enh-code/               # Python test code (MISPLACED)
│   ├── .claude/                # Claude AI local settings (MISPLACED)
│   ├── Philosophy/             # Presentation files (MISPLACED)
│   ├── AI_Principles/          # Policy presets (COULD BE BETTER ORGANIZED)
│   ├── tests/                  # Old test artifact (MISPLACED)
│   │
│   ├── integration-service.log # Log file at root (SHOULD BE GITIGNORED)
│   ├── workspaces.db           # Database file (SHOULD BE GITIGNORED)
│   ├── darkblue-UI-design-guide.html # Design doc (MISPLACED)
│   │
│   ├── CODEBASE_EXPLORATION_SUMMARY.md # Generated doc (CONSIDER REMOVING)
│   ├── QUICK_REFERENCE.md      # Documentation (ACCEPTABLE)
│   └── find-replace.sh         # Utility script (COULD BE IN scripts/)
│
├── Documentation & Metadata
│   ├── CLAUDE.md               # AI instructions (CORRECT)
│   ├── README.md               # Project readme (CORRECT)
│   ├── CONTRIBUTIONS.md        # Contribution guide (CORRECT)
│   ├── LICENSE*                # License files (CORRECT)
│   │
│   ├── go.mod / go.sum         # Go dependencies (CORRECT)
│   ├── .git/                   # Git repository (CORRECT)
│   ├── .gitignore              # Git exclusions (NEEDS UPDATE)
│   └── .env                    # Live config (SHOULD NOT BE IN GIT)
│
├── Startup & Control Scripts
│   ├── start.sh                # Start all services (CORRECT)
│   ├── stop.sh                 # Stop all services (CORRECT)
│   ├── status.sh               # Show service status (CORRECT)
│   └── git-push.sh             # Git automation (DEBATABLE)
│
└── Generated/Build Artifacts (AT ROOT)
    └── .DS_Store               # macOS files (SHOULD BE GITIGNORED)
```

### B. Go Project Structure (Standard Layout)

```
cmd/                                    # CORRECT - Service entry points
├── integration-service/main.go         # Port 9080
├── design-service/main.go              # Port 9081  
├── capability-service/main.go          # Port 9082
├── auth-service/main.go                # Port 9083
├── balut/main.go                       # Unknown service
├── claude-proxy/main.go                # Proxy service
└── ubecli/                             # CLI tool (8 subdirectories)

internal/                               # CORRECT - Private service logic
├── auth/                               # Auth handlers & services (6 files)
└── integration/                        # Integration handlers (8 files)

pkg/                                    # CORRECT - Shared libraries
├── client/                             # Figma API client
├── container/                          # Container orchestration
├── database/                           # PostgreSQL wrapper
├── middleware/                         # HTTP middleware (auth)
├── models/                             # 9 data structures
└── repository/                         # Data access layer (6 repos)

migrations/                             # CORRECT - Database migration scripts
├── 001_create_integrations_tables.sql
├── 002_create_workspace_tables.sql
└── 003_create_enablers_and_acceptance_criteria.sql
```

### C. Frontend (React + Vite)

```
web-ui/
├── src/
│   ├── api/                    # Axios HTTP clients (CORRECT)
│   ├── assets/                 # Images/static assets (CORRECT)
│   ├── components/             # 37 React components (CORRECT)
│   │   ├── wizard/             # Wizard flow components (14 files)
│   │   ├── GettingStartedWizard.tsx
│   │   └── [other components]
│   ├── context/                # React Context providers (CORRECT)
│   │   ├── AppContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── WorkspaceContext.tsx
│   │   ├── WizardContext.tsx
│   │   └── [other contexts]
│   ├── pages/                  # Route components (40 pages)
│   │   ├── Welcome.tsx         # ← Potential duplicate
│   │   ├── wizard/             # ← Wizard pages directory (14 files)
│   │   │   ├── WizardConceptionStart.tsx
│   │   │   ├── WizardDesign.tsx
│   │   │   ├── WizardTesting.tsx
│   │   │   ├── WizardDiscovery.tsx
│   │   │   └── [others]
│   │   └── [other pages]
│   ├── styles/                 # CSS & design systems (CORRECT)
│   └── types/                  # TypeScript definitions (CORRECT)
├── index.html
├── package.json
└── vite.config.ts
```

---

## PART 2: PROBLEM AREAS & ISSUES IDENTIFIED

### CRITICAL ISSUES (Fix Immediately)

#### 1. **Binary Executables in Repository Root**
**Location:** `/Intentr/` root  
**Files:**
- `integration-service` (44.8 MB Mach-O executable)
- `claude-proxy` (9.7 MB Mach-O executable)

**Problem:**
- Binary executables should never be committed to source control
- They bloat the repository and cause merge conflicts
- They are platform-specific (macOS ARM64)
- Built binaries belong in `bin/` directory or `.gitignore`

**Recommendation:**
```bash
git rm --cached integration-service claude-proxy
echo "integration-service" >> .gitignore
echo "claude-proxy" >> .gitignore
# OR ensure build output goes to bin/
```

#### 2. **Duplicate Specification Directories**
**Location:** `/Intentr/specifications/` vs `/Intentr/ori-specifications/`

**Content Analysis:**
- `specifications/`: 111 files (19,769 lines total), including:
  - CAP-*.md (capability specs)
  - ENB-*.md (enabler specs)
  - CHG-*.md (change documents)
  - DEP-*.md (deployment docs)
  - INDEX.md
  
- `ori-specifications/`: 93 files with "STORY-" prefixed variants:
  - Similar capability and enabler files
  - "STORY-*" metadata variants
  - Older structure with numeric-only filenames

**Problem:**
- Significant duplication of specification content
- Unclear which is authoritative
- Makes maintenance confusing
- Creates divergence risk

**Recommendation:**
- Determine which directory is the current source of truth
- Archive or remove the deprecated version
- Consider: Keep only `/specifications/` as canonical
- Refactor `ori-specifications/` → archived backup or deleted

#### 3. **Log Files & Runtime Artifacts at Root**
**Location:** `/Intentr/` root

**Files in Source Control (Should NOT Be):**
```
integration-service.log          (44.8 KB) - Application log
logs/
├── auth-service.log             (66 B)
├── claude-proxy.log             (216 B)
├── collaboration-server.log     (1.1 MB) ← LARGE
├── osx-setup.log                (12 KB)
├── shared-workspace-server.log  (244 B)
├── specification-api.log        (18 KB)
└── vite-dev-server.log          (74 KB)

.pids/
├── claude-proxy.pid
├── collaboration-server.pid
├── shared-workspace-server.pid
├── specification-api.pid
└── vite-dev-server.pid
```

**Problem:**
- Runtime artifacts bloat repository
- Logs change frequently (merge conflicts)
- PID files are environment-specific
- No development value in version control

**Recommendation:**
```bash
# Add to .gitignore
echo "*.log" >> .gitignore
echo ".pids/" >> .gitignore
echo "logs/*.log" >> .gitignore

# Remove from git history
git rm --cached integration-service.log
git rm --cached logs/*.log
git rm --cached .pids/*.pid
```

#### 4. **Database File in Repository**
**Location:** `/Intentr/workspaces.db`

**Problem:**
- SQLite database with runtime data
- Will cause merge conflicts if edited by multiple developers
- Contains local state that should not be in git

**Recommendation:**
```bash
git rm --cached workspaces.db
echo "*.db" >> .gitignore
```

---

### MAJOR ISSUES (Fix Soon)

#### 5. **Orphaned & Misplaced Root-Level Directories**

| Directory | Contents | Status | Recommendation |
|-----------|----------|--------|-----------------|
| `Users/jamesreynolds/` | User profile folder | Misplaced | Remove from git |
| `path/` | Empty directory | Orphaned | Remove |
| `code/` | SOFTWARE_DEVELOPMENT_PLAN.md | Misplaced | Move to docs/ |
| `enh-code/` | Python test scripts (api.py, test_api.py) | Misplaced | Move to scripts/ or remove |
| `.claude/settings.local.json` | Claude AI local config | User-specific | Add to .gitignore |
| `Philosophy/` | Presentation PowerPoint files | Misplaced | Move to docs/presentations/ |
| `tests/` | Single old SDP file | Orphaned | Merge into documentation |

#### 6. **Confusing Frontend Page Structure**

**Issue:** Potential duplication between Welcome and Wizard flows

```
web-ui/src/pages/
├── Welcome.tsx                 # Entry point for first-time users
└── wizard/                      # Separate wizard implementation
    ├── WizardConceptionStart.tsx
    ├── WizardDesign.tsx
    ├── WizardTesting.tsx
    ├── WizardDiscovery.tsx
    ├── ... (14 files total)
```

**Also:**
```
web-ui/src/components/
├── GettingStartedWizard.tsx    # Wizard component at root level
└── wizard/                      # Wizard subcomponents (14 files)
```

**Problem:**
- Unclear relationship between `Welcome.tsx` and `wizard/` pages
- Duplicate context: `WizardContext.tsx` in context/ AND component organization
- Multiple entry points for first-time user flow
- Component vs Page-level wizard may have overlapping logic

**Recommendation:**
- Audit which wizard/welcome flow is actually used
- Consolidate into single cohesive user onboarding path
- Clarify: Is Welcome → Wizard, or are they alternatives?
- Remove or refactor redundant components

#### 7. **Design System Assets Scattered**

**Location:** Multiple places with inconsistent organization

```
/uploaded-assets/                          # Design artifacts root
├── BalutDesignSystem/                     # Copy of design system
├── balut ds.html
├── balut-default-reverse-engineered.html
├── Balut Web Platform Design.html
├── ford-design-system.html
├── purple-design-system.html

/darkblue-UI-design-guide.html             # At root level ← Misplaced

/web-ui/src/styles/
├── apple-hig-theme.css
├── ford-design-system.css
└── [CSS files]
```

**Problem:**
- Design system assets scattered across multiple directories
- HTML exports alongside SCSS/CSS implementations
- Unclear relationship between Balut, Ford, Purple, and Apple themes
- Not clear which is the active design system

**Recommendation:**
- Consolidate into `/docs/design-systems/`
- Create index documenting each design system's purpose
- Move HTML artifacts to `docs/design-systems/exports/`

#### 8. **AI Principles Organization Issue**

**Location:** `/AI_Principles/` root directory

**Contents:**
```
AI_Principles/
├── AI_GOVERNANCE_FRAMEWORK.md          # Main framework
├── AI-Policy-Preset1.md                # Level 1: Awareness
├── AI-Policy-Preset2.md                # Level 2: Guided
├── AI-Policy-Preset3.md                # Level 3: Enforced
├── AI-Policy-Preset4.md                # Level 4: Strict
└── AI-Policy-Preset5.md                # Level 5: Zero-Tolerance
```

**Problem:**
- Could be better organized in `CODE_RULES/` as it's development guidance
- Or move to `docs/AI_GOVERNANCE/`
- Current location at root is non-standard

**Recommendation:**
```
CODE_RULES/
├── MAIN_SWDEV_PLAN.md
├── INTENT.md
├── CODE_COMPLETE.md
├── ACTIVE_AI_PRINCIPLES.md (workspace-specific)
└── AI_GOVERNANCE/
    ├── FRAMEWORK.md
    ├── Preset-1-Awareness.md
    ├── Preset-2-Guided.md
    ├── Preset-3-Enforced.md
    ├── Preset-4-Strict.md
    └── Preset-5-Zero-Tolerance.md
```

---

### MINOR ISSUES (Nice to Fix)

#### 9. **.DS_Store Files Everywhere**
**Found:** 45+ .DS_Store files across directories

**Problem:**
- macOS-specific system files
- Should never be in version control
- Cause unnecessary diffs

**Already in .gitignore?** Check if present:
```bash
grep -i "\.DS_Store" /Intentr/.gitignore
# Should show: .DS_Store
```

**Recommendation:** Confirm it's in .gitignore and run:
```bash
find . -name ".DS_Store" -type f -delete
git rm --cached $(git ls-files -o -i --exclude-standard | grep -i ds_store)
```

#### 10. **Generated Documentation Files**
**Location:** Root level and various places

**Files:**
- `CODEBASE_EXPLORATION_SUMMARY.md` - Generated report
- `QUICK_REFERENCE.md` - Generated reference

**Question:** Are these generated or manually maintained?
- If generated: Remove from git, add to .gitignore
- If maintained: Document their purpose clearly

#### 11. **.env File in Repository**
**Location:** `/Intentr/.env`

**Problem:**
- Should NEVER be in version control
- Contains local configuration and potentially secrets

**Already handled?** Check:
```bash
grep -i "\.env" /Intentr/.gitignore
# Should show: .env (but NOT .env.example)
```

**Recommendation:**
```bash
git rm --cached .env
# Ensure .gitignore has: .env
# Ensure .env.example exists for template
```

#### 12. **Root-Level Scripts That Could Move**
**Location:** `/Intentr/` root

**Files:**
- `find-replace.sh` - Could move to `scripts/`
- `git-push.sh` - Could move to `scripts/`

**Recommendation:** Move to `scripts/` for cleaner root:
```
scripts/
├── find-replace.sh
├── git-push.sh
├── start.sh
├── stop.sh
├── status.sh
└── [others]
```

---

## PART 3: GITIGNORE STATUS

### Current .gitignore Issues

**Should Be Added:**
```
# Build artifacts
/bin/
/dist/
*.o
*.a
*.so
*.dylib

# Runtime files
*.log
.pids/
*.db
*.pid

# OS files
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# User settings
.claude/
Users/

# Build outputs
integration-service (binary)
claude-proxy (binary)
```

**Already Present (Check):**
```bash
grep -E "workspaces|web-ui|\.env" /Intentr/.gitignore
```

---

## PART 4: ANALYSIS SUMMARY TABLE

| Category | Item | Location | Status | Priority | Action |
|----------|------|----------|--------|----------|--------|
| **CRITICAL** | Binary executables | Root | In git | P1 | `git rm --cached` + .gitignore |
| **CRITICAL** | Duplicate specs | specs/ + ori-specs/ | Both active | P1 | Archive one, consolidate |
| **CRITICAL** | Log files | logs/ + root | In git | P1 | Add to .gitignore, remove from history |
| **CRITICAL** | Workspace DB | workspaces.db | In git | P1 | `git rm --cached` + .gitignore |
| **MAJOR** | Orphaned dirs | path/, Users/ | In git | P2 | Remove from git |
| **MAJOR** | Misplaced dirs | code/, enh-code/ | In git | P2 | Reorganize or remove |
| **MAJOR** | AI Principles | AI_Principles/ | Root | P2 | Move to CODE_RULES/ |
| **MAJOR** | Design assets | uploaded-assets/ | Scattered | P2 | Consolidate |
| **MAJOR** | UI duplication | Welcome + wizard | Both present | P2 | Audit & consolidate |
| **MINOR** | .DS_Store | 45+ locations | In git | P3 | Remove + .gitignore |
| **MINOR** | Scripts | Root level | Various | P3 | Move to scripts/ |
| **MINOR** | .env | Root | In git | P3 | `git rm --cached` |
| **MINOR** | Generated docs | Root | Maybe generated | P4 | Clarify purpose |

---

## PART 5: RECOMMENDED DIRECTORY STRUCTURE (POST-CLEANUP)

```
intentr/
├── .gitignore                          # Updated with all artifacts
├── .git/
├── .github/                            # GitHub workflows
├── .env.example                        # Config template (only this)
│
├── README.md                           # Main project documentation
├── CLAUDE.md                           # AI instructions
├── CONTRIBUTIONS.md                    # Contribution guide
├── LICENSE & LICENSE.* files
│
├── go.mod / go.sum                     # Go dependencies
├── Makefile                            # Build automation
├── docker-compose.yml                  # Container orchestration
├── Dockerfile                          # Image definition
│
├── cmd/                                # Service entry points
│   ├── integration-service/
│   ├── design-service/
│   ├── capability-service/
│   ├── auth-service/
│   ├── claude-proxy/
│   ├── balut/
│   └── ubecli/
│
├── internal/                           # Private logic
│   ├── auth/
│   └── integration/
│
├── pkg/                                # Shared libraries
│   ├── client/
│   ├── container/
│   ├── database/
│   ├── middleware/
│   ├── models/
│   └── repository/
│
├── migrations/                         # Database migrations
│   ├── 001_create_integrations_tables.sql
│   ├── 002_create_workspace_tables.sql
│   └── 003_create_enablers_and_acceptance_criteria.sql
│
├── web-ui/                             # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── wizard/
│   │   │   └── [consolidated components]
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── wizard/                 # Wizard pages (if kept separate)
│   │   │   └── [other pages]
│   │   ├── styles/
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── specifications/                     # ← CANONICAL ONLY
│   ├── CAP-*.md
│   ├── ENB-*.md
│   ├── CHG-*.md
│   └── INDEX.md
│
├── docs/                               # Documentation
│   ├── api/
│   ├── architecture/
│   ├── features/
│   ├── getting-started/
│   ├── operations/
│   ├── reports/
│   ├── design-systems/                 # ← Consolidated
│   │   ├── Balut/
│   │   ├── Ford/
│   │   ├── Apple-HIG/
│   │   ├── Purple/
│   │   └── exports/
│   ├── AUTHENTICATION.md
│   ├── INTEGRATION_ANALYSIS.md
│   ├── REALTIME_COLLABORATION.md
│   ├── ROLE_BASED_ACCESS_CONTROL.md
│   └── UI_NAVIGATION_CHANGES.md
│
├── CODE_RULES/                         # Development guidelines
│   ├── MAIN_SWDEV_PLAN.md
│   ├── INTENT.md
│   ├── CODE_COMPLETE.md
│   ├── ACTIVE_AI_PRINCIPLES.md (workspace-specific)
│   └── AI_GOVERNANCE/
│       ├── FRAMEWORK.md
│       ├── Preset-1-Awareness.md
│       ├── Preset-2-Guided.md
│       ├── Preset-3-Enforced.md
│       ├── Preset-4-Strict.md
│       └── Preset-5-Zero-Tolerance.md
│
├── scripts/                            # Utility & deployment scripts
│   ├── start.sh
│   ├── stop.sh
│   ├── status.sh
│   ├── find-replace.sh
│   ├── git-push.sh
│   ├── change-ports.sh
│   ├── init-db.sql
│   ├── migration_approval.sql
│   ├── reorganize-docs.sh
│   ├── PORT-CONFIGURATION.md
│   ├── PORT-QUICK-REFERENCE.md
│   ├── README.md
│   └── setup/
│       ├── OSX/
│       ├── AWS/
│       └── [other platforms]
│
├── nginx/                              # Web server config
│   └── nginx.conf
│
├── workspaces/                         # Multi-project workspace support
│   ├── HelloWorld/
│   ├── BattleDrones/
│   ├── stickfigures/
│   ├── FloWeb/
│   └── [other workspaces]
│
├── Philosophy/                         # ← RECONSIDER LOCATION
│   ├── INTENT_Intentr_Executive_Deck.pptx
│   └── [presentation files]
│
└── (NOT COMMITTED)
    ├── .env                           # Local configuration
    ├── .pids/                         # Runtime PID files
    ├── logs/                          # Application logs
    ├── bin/                           # Build output
    ├── web-ui/node_modules/
    ├── .DS_Store
    └── *.db

```

---

## PART 6: CLEANUP CHECKLIST

### Phase 1: Critical Fixes (Do First)
- [ ] Remove binary executables from git history: `git rm --cached integration-service claude-proxy`
- [ ] Update `.gitignore` to prevent future binary commits
- [ ] Determine which specifications directory is authoritative (specifications/ vs ori-specifications/)
- [ ] Archive deprecated specifications directory
- [ ] Remove log files from git history
- [ ] Remove .pids/ directory from git
- [ ] Remove workspaces.db from git
- [ ] Verify .env is not in git (use .env.example instead)

### Phase 2: Major Reorganization
- [ ] Move/remove orphaned directories: Users/, path/, code/, enh-code/, tests/
- [ ] Remove .claude/ directory or add to .gitignore
- [ ] Move AI_Principles/ content into CODE_RULES/AI_GOVERNANCE/
- [ ] Consolidate design assets into docs/design-systems/
- [ ] Audit Welcome.tsx vs wizard/ pages for duplication
- [ ] Move Philosophy/ to docs/presentations/ or docs/philosophy/

### Phase 3: Minor Cleanup
- [ ] Remove all .DS_Store files from git
- [ ] Move root-level scripts to scripts/ directory
- [ ] Verify generated documentation purpose (keep or remove?)
- [ ] Remove CODEBASE_EXPLORATION_SUMMARY.md if auto-generated
- [ ] Update .gitignore final pass

### Phase 4: Git History Cleanup
- [ ] Run: `git gc --aggressive` to reclaim space after large file removals
- [ ] Document in CONTRIBUTIONS.md what was cleaned up
- [ ] Consider: Do current developers need to force-pull after this cleanup?

---

## PART 7: IMPLEMENTATION GUIDE

### Step 1: Back Up Current State
```bash
cd /Users/jamesreynolds/Documents/Development/Intentr
git tag backup-before-cleanup
git branch backup-before-cleanup
```

### Step 2: Remove Build Artifacts
```bash
# Remove binaries
git rm --cached integration-service claude-proxy
git rm --cached logs/*.log
git rm --cached .pids/*.pid
git rm --cached workspaces.db
git rm --cached integration-service.log

# Remove .DS_Store files (all of them)
git rm --cached -r '*.DS_Store'
git rm --cached -r '.DS_Store'
```

### Step 3: Update .gitignore
```bash
cat >> .gitignore << 'EOF'

# Build artifacts and executables
*.exe
*.exe~
*.dll
*.so
*.dylib
integration-service
claude-proxy

# Runtime files
logs/
.pids/
*.db
*.pid

# OS/IDE
.DS_Store
Thumbs.db
.idea/
.vscode/
*.swp

# Local environment
.env
.claude/

# User directories
Users/
EOF
```

### Step 4: Reorganize Directories
```bash
# Move scripts
mv find-replace.sh scripts/
mv git-push.sh scripts/

# Move design assets
mkdir -p docs/design-systems
mv uploaded-assets/BalutDesignSystem docs/design-systems/
mv darkblue-UI-design-guide.html docs/design-systems/
# ... etc

# Reorganize AI Principles
mkdir -p CODE_RULES/AI_GOVERNANCE
# Move files...
```

### Step 5: Consolidate Specifications
```bash
# After determining authoritative source:
# Option A: Keep specifications/
rm -rf ori-specifications/

# Option B: Archive ori-specifications/
git rm -r ori-specifications/
mkdir _archive
mv ori-specifications _archive/ori-specifications-backup
```

### Step 6: Commit
```bash
git add .
git commit -m "refactor: Clean up repository structure

- Remove binary executables (integration-service, claude-proxy)
- Remove runtime artifacts (logs, .pids, workspaces.db)
- Archive duplicate specifications directory
- Reorganize AI Principles into CODE_RULES/
- Consolidate design system assets
- Remove orphaned directories (path/, Users/, code/, enh-code/)
- Update .gitignore for future compliance
- Remove .DS_Store files

This cleanup reduces repository size and improves maintainability."
```

---

## CONCLUSION

The Intentr project has solid Go backend and React frontend foundations with good adherence to standard directory conventions. However, **repository organization needs significant improvement** to:

1. **Remove build artifacts** cluttering the repository
2. **Consolidate duplicate specification directories**
3. **Organize scattered documentation and assets**
4. **Clean up orphaned and misplaced directories**
5. **Improve frontend component organization**

**Estimated cleanup effort:** 4-6 hours  
**Risk level:** Low (mainly file reorganization, can be backed up easily)  
**Recommended approach:** Do this cleanup in a dedicated PR once current work is committed

The recommended directory structure provided in Part 5 will make the repository more maintainable and align with Go project best practices.

