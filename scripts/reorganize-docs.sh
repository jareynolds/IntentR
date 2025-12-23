#!/bin/bash

# =============================================================================
# IntentR Documentation Reorganization Script
# =============================================================================
# This script reorganizes markdown files from the root directory into a
# structured docs/ folder hierarchy.
#
# Usage:
#   ./scripts/reorganize-docs.sh          # Dry run (shows what would happen)
#   ./scripts/reorganize-docs.sh --execute # Actually move the files
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"

# Check for --execute flag
DRY_RUN=true
if [[ "$1" == "--execute" ]]; then
    DRY_RUN=false
fi

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  IntentR Documentation Reorganization${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

if $DRY_RUN; then
    echo -e "${YELLOW}DRY RUN MODE - No files will be moved${NC}"
    echo -e "${YELLOW}Run with --execute to actually move files${NC}"
else
    echo -e "${RED}EXECUTE MODE - Files will be moved!${NC}"
    read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi
echo ""

# Function to create directory
create_dir() {
    local dir="$1"
    if $DRY_RUN; then
        echo -e "${GREEN}[CREATE DIR]${NC} $dir"
    else
        mkdir -p "$dir"
        echo -e "${GREEN}[CREATED]${NC} $dir"
    fi
}

# Function to move file
move_file() {
    local src="$1"
    local dest="$2"

    if [[ ! -f "$src" ]]; then
        echo -e "${RED}[SKIP]${NC} $src (file not found)"
        return
    fi

    if $DRY_RUN; then
        echo -e "${BLUE}[MOVE]${NC} $(basename "$src") -> $dest"
    else
        mv "$src" "$dest"
        echo -e "${GREEN}[MOVED]${NC} $(basename "$src") -> $dest"
    fi
}

# Function to show consolidation note
consolidation_note() {
    local note="$1"
    echo -e "${YELLOW}[NOTE]${NC} $note"
}

echo "============================================="
echo "STEP 1: Creating new directory structure"
echo "============================================="
echo ""

# Create new directories
create_dir "$DOCS_DIR/getting-started"
create_dir "$DOCS_DIR/operations"
create_dir "$DOCS_DIR/features/figma"
create_dir "$DOCS_DIR/features/approval"
create_dir "$DOCS_DIR/reports"

echo ""
echo "============================================="
echo "STEP 2: Moving files to getting-started/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/QUICKSTART.md" "$DOCS_DIR/getting-started/"
move_file "$PROJECT_ROOT/QUICKSTART_WEB_UI.md" "$DOCS_DIR/getting-started/"
move_file "$PROJECT_ROOT/QUICK_START_FIGMA.md" "$DOCS_DIR/getting-started/"
move_file "$PROJECT_ROOT/GOOGLE_OAUTH_SETUP.md" "$DOCS_DIR/getting-started/"
move_file "$PROJECT_ROOT/TROUBLESHOOTING.md" "$DOCS_DIR/getting-started/"

consolidation_note "Consider merging QUICKSTART*.md files into a single comprehensive guide"

echo ""
echo "============================================="
echo "STEP 3: Moving files to operations/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/STARTUP_GUIDE.md" "$DOCS_DIR/operations/"
move_file "$PROJECT_ROOT/STARTUP-GUIDE.md" "$DOCS_DIR/operations/"
move_file "$PROJECT_ROOT/STARTUP-SCRIPTS-SUMMARY.md" "$DOCS_DIR/operations/"
move_file "$PROJECT_ROOT/MULTI-INSTANCE-GUIDE.md" "$DOCS_DIR/operations/"

consolidation_note "Consider merging STARTUP_GUIDE.md and STARTUP-GUIDE.md into one file"

echo ""
echo "============================================="
echo "STEP 4: Moving files to features/figma/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/FIGMA_WORKSPACE_INTEGRATION.md" "$DOCS_DIR/features/figma/"
move_file "$PROJECT_ROOT/FIGMA_INTEGRATION_TESTING.md" "$DOCS_DIR/features/figma/"

echo ""
echo "============================================="
echo "STEP 5: Moving files to features/approval/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/APPROVAL_WORKFLOW_ANALYSIS.md" "$DOCS_DIR/features/approval/"
move_file "$PROJECT_ROOT/APPROVAL_IMPLEMENTATION_SUMMARY.md" "$DOCS_DIR/features/approval/"
move_file "$PROJECT_ROOT/README_APPROVAL_ANALYSIS.md" "$DOCS_DIR/features/approval/"

consolidation_note "Consider merging approval docs or removing README_APPROVAL_ANALYSIS.md"

echo ""
echo "============================================="
echo "STEP 6: Moving files to features/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/MARKDOWN_EXPORT_FEATURE.md" "$DOCS_DIR/features/"
move_file "$PROJECT_ROOT/WORKSPACE-FOLDER-FIX.md" "$DOCS_DIR/features/"

echo ""
echo "============================================="
echo "STEP 7: Moving files to reports/"
echo "============================================="
echo ""

move_file "$PROJECT_ROOT/REVERSE_ENGINEERING_REPORT.md" "$DOCS_DIR/reports/"
move_file "$PROJECT_ROOT/PROJECT_SUMMARY.md" "$DOCS_DIR/reports/"
move_file "$PROJECT_ROOT/IMPLEMENTATION_SUMMARY.md" "$DOCS_DIR/reports/"
move_file "$PROJECT_ROOT/REFACTOR_ANALYSIS_CAP-944623.md" "$DOCS_DIR/reports/"
move_file "$PROJECT_ROOT/REFACTOR_IMPLEMENTATION_SUMMARY.md" "$DOCS_DIR/reports/"

consolidation_note "Consider merging REFACTOR_*.md files into a single CAP-944623 report"

echo ""
echo "============================================="
echo "STEP 8: Files requiring manual review"
echo "============================================="
echo ""

echo -e "${YELLOW}The following files need manual review:${NC}"
echo ""
echo "  1. DEVELOPMENT_GUIDE.md"
echo "     - Check if content overlaps with CODE_RULES/INTENT.md"
echo "     - If unique content exists, move to docs/getting-started/"
echo "     - Otherwise, consider removing"
echo ""

echo ""
echo "============================================="
echo "Files staying in root directory"
echo "============================================="
echo ""
echo -e "${GREEN}[KEEP]${NC} README.md - Main project entry point"
echo -e "${GREEN}[KEEP]${NC} CLAUDE.md - AI agent configuration"

echo ""
echo "============================================="
echo "Summary"
echo "============================================="
echo ""

if $DRY_RUN; then
    echo -e "${YELLOW}This was a DRY RUN. No files were moved.${NC}"
    echo ""
    echo "To execute the reorganization, run:"
    echo -e "  ${GREEN}./scripts/reorganize-docs.sh --execute${NC}"
else
    echo -e "${GREEN}Reorganization complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the consolidation notes above"
    echo "  2. Manually review DEVELOPMENT_GUIDE.md"
    echo "  3. Update any internal links in documentation"
    echo "  4. Update CLAUDE.md if it references moved files"
fi

echo ""
echo "New documentation structure:"
echo ""
echo "docs/"
echo "├── getting-started/"
echo "│   ├── QUICKSTART.md"
echo "│   ├── QUICKSTART_WEB_UI.md"
echo "│   ├── QUICK_START_FIGMA.md"
echo "│   ├── GOOGLE_OAUTH_SETUP.md"
echo "│   └── TROUBLESHOOTING.md"
echo "├── operations/"
echo "│   ├── STARTUP_GUIDE.md"
echo "│   ├── STARTUP-GUIDE.md"
echo "│   ├── STARTUP-SCRIPTS-SUMMARY.md"
echo "│   └── MULTI-INSTANCE-GUIDE.md"
echo "├── features/"
echo "│   ├── figma/"
echo "│   │   ├── FIGMA_WORKSPACE_INTEGRATION.md"
echo "│   │   └── FIGMA_INTEGRATION_TESTING.md"
echo "│   ├── approval/"
echo "│   │   ├── APPROVAL_WORKFLOW_ANALYSIS.md"
echo "│   │   ├── APPROVAL_IMPLEMENTATION_SUMMARY.md"
echo "│   │   └── README_APPROVAL_ANALYSIS.md"
echo "│   ├── MARKDOWN_EXPORT_FEATURE.md"
echo "│   └── WORKSPACE-FOLDER-FIX.md"
echo "├── reports/"
echo "│   ├── REVERSE_ENGINEERING_REPORT.md"
echo "│   ├── PROJECT_SUMMARY.md"
echo "│   ├── IMPLEMENTATION_SUMMARY.md"
echo "│   ├── REFACTOR_ANALYSIS_CAP-944623.md"
echo "│   └── REFACTOR_IMPLEMENTATION_SUMMARY.md"
echo "├── architecture/  (existing)"
echo "├── api/           (existing)"
echo "└── [other existing docs]"
echo ""
