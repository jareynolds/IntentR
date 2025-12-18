#!/bin/sh

# HelloWorld Application Start Script
# Starts the Vite development server on port 3000

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  HelloWorld Application"
echo "========================================"

# Check if node_modules exists and is for the correct platform
NEEDS_INSTALL=false
if [ ! -d "node_modules" ]; then
    NEEDS_INSTALL=true
elif [ -f "node_modules/.platform" ]; then
    # Check if platform matches
    CURRENT_PLATFORM="$(uname -s)-$(uname -m)"
    INSTALLED_PLATFORM="$(cat node_modules/.platform)"
    if [ "$CURRENT_PLATFORM" != "$INSTALLED_PLATFORM" ]; then
        echo "Platform mismatch detected (installed: $INSTALLED_PLATFORM, current: $CURRENT_PLATFORM)"
        echo "Reinstalling dependencies..."
        rm -rf node_modules package-lock.json
        NEEDS_INSTALL=true
    fi
else
    # No platform marker - check if we're in Alpine/musl and rollup might be wrong
    if [ -f /etc/alpine-release ]; then
        echo "Running in Alpine container, reinstalling dependencies for compatibility..."
        rm -rf node_modules package-lock.json
        NEEDS_INSTALL=true
    fi
fi

if [ "$NEEDS_INSTALL" = true ]; then
    echo "Installing dependencies..."
    npm install
    # Save platform marker
    echo "$(uname -s)-$(uname -m)" > node_modules/.platform
fi

# Check if already running on port 3000
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Port 3000 is already in use."
    echo "Run ./stop.sh first if you want to restart."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the Vite dev server in the background
echo "Starting HelloWorld on port 3000..."
nohup npm run dev > logs/app.log 2>&1 &
echo $! > .pid

# Wait for server to start (longer wait if dependencies were just installed)
sleep 5

if lsof -i :3000 > /dev/null 2>&1; then
    echo "HelloWorld is running"
    echo ""
    echo "Application URL:  http://localhost:3000"
    echo "Logs:             ./logs/app.log"
    echo "Stop:             ./stop.sh"
else
    echo "Failed to start HelloWorld"
    echo "Check logs/app.log for details"
    exit 1
fi
