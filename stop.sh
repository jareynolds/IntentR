#!/bin/bash

# IntentR Application Stop Script
# This script stops all running IntentR services
# Usage: ./stop.sh [options]
#   Options:
#     --clean    Remove containers and volumes (WARNING: deletes database data)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

# PID files
PID_DIR="$ROOT_DIR/.pids"
SPEC_API_PID="$PID_DIR/specification-api.pid"
COLLAB_PID="$PID_DIR/collaboration-server.pid"
SHARED_WS_PID="$PID_DIR/shared-workspace-server.pid"
VITE_PID="$PID_DIR/vite-dev-server.pid"
CLAUDE_PROXY_PID="$PID_DIR/claude-proxy.pid"

# Parse command line options
CLEAN_FLAG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --clean)
      CLEAN_FLAG=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: ./stop.sh [--clean]"
      exit 1
      ;;
  esac
done

echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE}  IntentR Application Shutdown${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""

# Function to stop process by PID file
stop_process() {
    local pid_file=$1
    local name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null || true

            # Wait for process to stop
            local timeout=10
            while kill -0 "$pid" 2>/dev/null && [ $timeout -gt 0 ]; do
                sleep 1
                ((timeout--))
            done

            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}  Force stopping $name...${NC}"
                kill -9 "$pid" 2>/dev/null || true
            fi

            echo -e "  ${GREEN}✓${NC} $name stopped"
        else
            echo -e "${YELLOW}  $name not running (stale PID file)${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "  ${YELLOW}$name PID file not found${NC}"
    fi
}

# Stop Node.js services
echo -e "${BOLD}Stopping Node.js Services...${NC}"
stop_process "$VITE_PID" "Vite Dev Server"
stop_process "$SPEC_API_PID" "Specification API"
stop_process "$COLLAB_PID" "Collaboration Server"
stop_process "$SHARED_WS_PID" "Shared Workspace API"
echo ""

# Stop Claude CLI Proxy
echo -e "${BOLD}Stopping Claude CLI Proxy...${NC}"
stop_process "$CLAUDE_PROXY_PID" "Claude CLI Proxy"

# Additional cleanup - kill any remaining claude-proxy processes
if pgrep -f "claude-proxy" > /dev/null; then
    echo -e "  ${YELLOW}Found remaining claude-proxy processes, stopping...${NC}"
    pkill -f "claude-proxy" || true
fi
echo ""

# Additional cleanup - kill any remaining node processes running our servers
echo -e "${YELLOW}Checking for any remaining Node.js processes...${NC}"

# Check for server.js
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "  ${YELLOW}Found remaining server.js processes, stopping...${NC}"
    pkill -f "node.*server.js" || true
fi

# Check for collaboration-server.js
if pgrep -f "node.*collaboration-server.js" > /dev/null; then
    echo -e "  ${YELLOW}Found remaining collaboration-server processes, stopping...${NC}"
    pkill -f "node.*collaboration-server.js" || true
fi

# Check for shared-workspace-server.js
if pgrep -f "node.*shared-workspace-server.js" > /dev/null; then
    echo -e "  ${YELLOW}Found remaining shared-workspace-server processes, stopping...${NC}"
    pkill -f "node.*shared-workspace-server.js" || true
fi

# Check for vite dev server
if pgrep -f "vite" > /dev/null; then
    echo -e "  ${YELLOW}Found remaining vite processes, stopping...${NC}"
    pkill -f "vite" || true
fi

echo -e "  ${GREEN}✓${NC} Node.js processes cleaned up"
echo ""

# Stop Docker services
echo -e "${BOLD}Stopping Docker Services...${NC}"
cd "$ROOT_DIR"

if [ "$CLEAN_FLAG" = true ]; then
    echo -e "${RED}${BOLD}WARNING: This will remove all containers and volumes!${NC}"
    echo -e "${RED}Database data will be permanently deleted!${NC}"
    read -p "Are you sure? [y/N]: " confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Removing containers and volumes...${NC}"
        docker compose down -v
        echo -e "  ${GREEN}✓${NC} Containers and volumes removed"
    else
        echo -e "${YELLOW}Cancelled. Stopping containers only...${NC}"
        docker compose down
        echo -e "  ${GREEN}✓${NC} Docker containers stopped"
    fi
else
    docker compose down
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} Docker containers stopped"
    else
        echo -e "  ${YELLOW}⚠${NC} Docker containers may not have stopped cleanly"
    fi
fi

echo ""

# Clean up PID directory if empty
if [ -d "$PID_DIR" ] && [ -z "$(ls -A $PID_DIR)" ]; then
    rmdir "$PID_DIR"
fi

echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  All Services Stopped${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""

# Check if any IntentR ports are still in use
echo -e "${YELLOW}Checking for any remaining port usage...${NC}"

PORTS=(6173 9080 9081 9082 9083 9084 9085 4001 4002 6432)
FOUND_PORTS=false

for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        if [ "$FOUND_PORTS" = false ]; then
            echo -e "${YELLOW}Warning: Some ports are still in use:${NC}"
            FOUND_PORTS=true
        fi
        echo -e "  Port $port: $(lsof -i :$port -sTCP:LISTEN | tail -n +2 | awk '{print $1 " (PID " $2 ")"}')"
    fi
done

if [ "$FOUND_PORTS" = false ]; then
    echo -e "  ${GREEN}✓${NC} All IntentR ports are free"
fi

echo ""
echo -e "${BOLD}To start again:${NC} ${CYAN}./start.sh${NC}"
echo ""
