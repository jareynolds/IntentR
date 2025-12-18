#!/bin/sh

# HelloWorld Application Stop Script
# Stops the Vite development server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Stopping HelloWorld Application"
echo "========================================"

# Stop using PID file if it exists
if [ -f ".pid" ]; then
    PID=$(cat .pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Stopping process $PID..."
        kill $PID 2>/dev/null || true
        sleep 1
    fi
    rm -f .pid
fi

# Also kill any process on port 3000
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Killing processes on port 3000..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Verify stopped
if lsof -i :3000 > /dev/null 2>&1; then
    echo "Failed to stop HelloWorld"
    exit 1
else
    echo "HelloWorld stopped"
fi
