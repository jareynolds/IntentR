#!/bin/bash
# IntentR — Copyright © 2025 James Reynolds
#
# This file is part of IntentR.
# You may use this file under either:
#   • The AGPLv3 Open Source License, OR
#   • The IntentR Commercial License
# See the LICENSE.AGPL and LICENSE.COMMERCIAL files for details.

# Git Push Script - Uploads all changes to GitHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  IntentR - Git Push Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}Error: Not inside a git repository${NC}"
    exit 1
fi

# Show current branch
BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch:${NC} $BRANCH"
echo ""

# Show status
echo -e "${YELLOW}Changes to be committed:${NC}"
git status --short
echo ""

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${YELLOW}No changes to commit.${NC}"
    exit 0
fi

# Get commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    echo -e "${YELLOW}Enter commit message (or press Enter for default):${NC}"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
fi

echo ""
echo -e "${YELLOW}Commit message:${NC} $COMMIT_MSG"
echo ""

# Stage all changes
echo -e "${GREEN}Staging all changes...${NC}"
git add -A

# Commit changes
echo -e "${GREEN}Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

# Push to remote
echo ""
echo -e "${GREEN}Pushing to origin/$BRANCH...${NC}"
git push origin "$BRANCH"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Successfully pushed to GitHub!${NC}"
echo -e "${GREEN}========================================${NC}"
