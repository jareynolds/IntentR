#!/bin/bash

# Find and Replace Script
# Usage: ./find-replace.sh "search_string" "replacement_string"

set -e

# Fix for macOS "illegal byte sequence" error
export LC_ALL=C
export LANG=C

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${YELLOW}Usage: $0 \"search_string\" \"replacement_string\" [directory]${NC}"
    echo ""
    echo "Arguments:"
    echo "  search_string      - The text to find"
    echo "  replacement_string - The text to replace it with"
    echo "  directory          - Optional: directory to search (default: current directory)"
    exit 1
fi

SEARCH="$1"
REPLACE="$2"
DIR="${3:-.}"

echo -e "${YELLOW}Find and Replace${NC}"
echo "================"
echo -e "Search:  ${RED}$SEARCH${NC}"
echo -e "Replace: ${GREEN}$REPLACE${NC}"
echo -e "Directory: $DIR"
echo ""

# Find files containing the search string (excluding common dirs)
echo -e "${YELLOW}Searching for occurrences...${NC}"

# Use temp file to handle spaces in filenames
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

grep -rl --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=vendor --exclude-dir=dist --exclude-dir=build --exclude="*.log" "$SEARCH" "$DIR" 2>/dev/null > "$TMPFILE" || true

if [ ! -s "$TMPFILE" ]; then
    echo -e "${YELLOW}No occurrences of '$SEARCH' found.${NC}"
    exit 0
fi

# Count occurrences
TOTAL_COUNT=0
FILE_COUNT=0
echo ""
echo -e "${YELLOW}Files containing '$SEARCH':${NC}"
while IFS= read -r file; do
    if [ -f "$file" ]; then
        COUNT=$(grep -c "$SEARCH" "$file" 2>/dev/null || echo "0")
        TOTAL_COUNT=$((TOTAL_COUNT + COUNT))
        FILE_COUNT=$((FILE_COUNT + 1))
        echo "  $file ($COUNT occurrences)"
    fi
done < "$TMPFILE"

echo ""
echo -e "${YELLOW}Total: $TOTAL_COUNT occurrences in $FILE_COUNT files${NC}"
echo ""

# Confirm before replacing
read -p "Do you want to proceed with the replacement? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}Replacing...${NC}"

# Perform replacement
while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Use different sed syntax for macOS vs Linux
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|$SEARCH|$REPLACE|g" "$file"
        else
            sed -i "s|$SEARCH|$REPLACE|g" "$file"
        fi
        echo -e "  ${GREEN}Updated:${NC} $file"
    fi
done < "$TMPFILE"

echo ""
echo -e "${GREEN}Done! Replaced $TOTAL_COUNT occurrences of '$SEARCH' with '$REPLACE'.${NC}"
