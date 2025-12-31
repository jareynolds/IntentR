#!/bin/bash

# IntentR Application Startup Script
# This script starts all services required for the IntentR application
# Usage: ./start.sh [options]
#   Options:
#     --build    Force rebuild of Docker containers
#     --logs     Show Docker logs after starting
#     --fg       Run Vite dev server in foreground (default: background)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
WEB_UI_DIR="$ROOT_DIR/web-ui"

# Log files
LOG_DIR="$ROOT_DIR/logs"
SPEC_API_LOG="$LOG_DIR/specification-api.log"
COLLAB_LOG="$LOG_DIR/collaboration-server.log"
SHARED_WS_LOG="$LOG_DIR/shared-workspace-server.log"
VITE_LOG="$LOG_DIR/vite-dev-server.log"
CLAUDE_PROXY_LOG="$LOG_DIR/claude-proxy.log"

# PID files
PID_DIR="$ROOT_DIR/.pids"
SPEC_API_PID="$PID_DIR/specification-api.pid"
COLLAB_PID="$PID_DIR/collaboration-server.pid"
SHARED_WS_PID="$PID_DIR/shared-workspace-server.pid"
VITE_PID="$PID_DIR/vite-dev-server.pid"
CLAUDE_PROXY_PID="$PID_DIR/claude-proxy.pid"

# Parse command line options
BUILD_FLAG=""
SHOW_LOGS=false
VITE_FOREGROUND=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --build)
      BUILD_FLAG="--build"
      shift
      ;;
    --logs)
      SHOW_LOGS=true
      shift
      ;;
    --fg)
      VITE_FOREGROUND=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: ./start.sh [--build] [--logs] [--fg]"
      exit 1
      ;;
  esac
done

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

echo -e "${BOLD}${BLUE}========================================${NC}"
echo -e "${BOLD}${BLUE}  IntentR Application Startup${NC}"
echo -e "${BOLD}${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to wait for service with timeout
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    echo -ne "${CYAN}Waiting for $name to be ready...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done

    echo -e " ${RED}✗ (timeout)${NC}"
    return 1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker found"

if ! command_exists docker compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}Error: docker compose is not installed${NC}"
    echo "Please install docker compose"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} docker compose found"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js found ($(node --version))"

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} npm found ($(npm --version))"

# Check .env file
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Using defaults.${NC}"
    echo "  For Figma integration, create .env with FIGMA_TOKEN"
else
    echo -e "  ${GREEN}✓${NC} .env file found"
fi

# Check if web-ui dependencies are installed
if [ ! -d "$WEB_UI_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing web-ui dependencies...${NC}"
    cd "$WEB_UI_DIR"
    npm install
    cd "$ROOT_DIR"
    echo -e "  ${GREEN}✓${NC} Dependencies installed"
else
    # Verify critical dependencies
    echo -e "${YELLOW}Verifying web-ui dependencies...${NC}"
    cd "$WEB_UI_DIR"

    # Check for common missing dependencies
    MISSING_DEPS=""
    for pkg in autoprefixer postcss tailwindcss; do
        if [ ! -d "node_modules/$pkg" ]; then
            MISSING_DEPS="$MISSING_DEPS $pkg"
        fi
    done

    if [ -n "$MISSING_DEPS" ]; then
        echo -e "${YELLOW}  Missing dependencies detected:$MISSING_DEPS${NC}"
        echo -e "${YELLOW}  Running npm install to fix...${NC}"
        npm install
    fi

    cd "$ROOT_DIR"
    echo -e "  ${GREEN}✓${NC} web-ui dependencies verified"
fi

echo ""

# Stop any running services
echo -e "${YELLOW}Checking for running services...${NC}"

# Check Docker containers
if docker compose ps -q 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}Stopping existing Docker containers...${NC}"
    docker compose down
    sleep 2
fi

# Stop Node.js servers if running
if [ -f "$SPEC_API_PID" ] && kill -0 $(cat "$SPEC_API_PID") 2>/dev/null; then
    echo -e "${YELLOW}Stopping existing Specification API...${NC}"
    kill $(cat "$SPEC_API_PID") 2>/dev/null || true
    rm -f "$SPEC_API_PID"
fi

if [ -f "$COLLAB_PID" ] && kill -0 $(cat "$COLLAB_PID") 2>/dev/null; then
    echo -e "${YELLOW}Stopping existing Collaboration Server...${NC}"
    kill $(cat "$COLLAB_PID") 2>/dev/null || true
    rm -f "$COLLAB_PID"
fi

if [ -f "$SHARED_WS_PID" ] && kill -0 $(cat "$SHARED_WS_PID") 2>/dev/null; then
    echo -e "${YELLOW}Stopping existing Shared Workspace API...${NC}"
    kill $(cat "$SHARED_WS_PID") 2>/dev/null || true
    rm -f "$SHARED_WS_PID"
fi

if [ -f "$VITE_PID" ] && kill -0 $(cat "$VITE_PID") 2>/dev/null; then
    echo -e "${YELLOW}Stopping existing Vite dev server...${NC}"
    kill $(cat "$VITE_PID") 2>/dev/null || true
    rm -f "$VITE_PID"
fi

if [ -f "$CLAUDE_PROXY_PID" ] && kill -0 $(cat "$CLAUDE_PROXY_PID") 2>/dev/null; then
    echo -e "${YELLOW}Stopping existing Claude CLI Proxy...${NC}"
    kill $(cat "$CLAUDE_PROXY_PID") 2>/dev/null || true
    rm -f "$CLAUDE_PROXY_PID"
fi

echo ""

# Start Docker services
echo -e "${BOLD}${BLUE}Starting Docker Services...${NC}"
echo -e "${CYAN}This may take a few minutes on first run (building images)${NC}"
echo ""

cd "$ROOT_DIR"

if [ -n "$BUILD_FLAG" ]; then
    echo -e "${YELLOW}Building Docker containers...${NC}"
    docker compose build
    echo ""
fi

docker compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start Docker services${NC}"
    echo "Run 'docker compose logs' for details"
    exit 1
fi

echo ""
echo -e "${YELLOW}Waiting for Docker services to be healthy...${NC}"

# Wait for PostgreSQL
echo -ne "${CYAN}  Checking PostgreSQL...${NC}"
attempt=0
while [ $attempt -lt 30 ]; do
    if docker compose exec -T postgres pg_isready -U intentr_user -d intentr_db > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

if [ $attempt -eq 30 ]; then
    echo -e " ${RED}✗ (timeout)${NC}"
    echo -e "${RED}PostgreSQL failed to start${NC}"
    docker compose logs postgres
    exit 1
fi

# Wait for backend services
wait_for_service "http://localhost:9080/health" "Integration Service" || {
    echo -e "${RED}Integration Service failed to start${NC}"
    docker compose logs integration-service
    exit 1
}

wait_for_service "http://localhost:9081/health" "Design Service" || {
    echo -e "${RED}Design Service failed to start${NC}"
    docker compose logs design-service
    exit 1
}

wait_for_service "http://localhost:9082/health" "Capability Service" || {
    echo -e "${RED}Capability Service failed to start${NC}"
    docker compose logs capability-service
    exit 1
}

wait_for_service "http://localhost:9083/health" "Auth Service" || {
    echo -e "${RED}Auth Service failed to start${NC}"
    docker compose logs auth-service
    exit 1
}

echo -e "${GREEN}✓ All Docker services are healthy${NC}"
echo ""

# Start Claude CLI Proxy (runs on host, used by Docker containers)
echo -e "${BOLD}${BLUE}Starting Claude CLI Proxy...${NC}"
echo ""

# Build the proxy if needed
CLAUDE_PROXY_BIN="$ROOT_DIR/cmd/claude-proxy/claude-proxy"
if [ ! -f "$CLAUDE_PROXY_BIN" ] || [ "$ROOT_DIR/cmd/claude-proxy/main.go" -nt "$CLAUDE_PROXY_BIN" ]; then
    echo -e "${CYAN}Building Claude CLI Proxy...${NC}"
    cd "$ROOT_DIR"
    go build -o "$CLAUDE_PROXY_BIN" ./cmd/claude-proxy/
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to build Claude CLI Proxy${NC}"
        echo -e "${YELLOW}Code generation via CLI will not be available${NC}"
    else
        echo -e "  ${GREEN}✓${NC} Claude CLI Proxy built"
    fi
fi

# Start the proxy
if [ -f "$CLAUDE_PROXY_BIN" ]; then
    echo -e "${CYAN}Starting Claude CLI Proxy (port 9085)...${NC}"
    cd "$ROOT_DIR"
    "$CLAUDE_PROXY_BIN" > "$CLAUDE_PROXY_LOG" 2>&1 &
    echo $! > "$CLAUDE_PROXY_PID"
    sleep 1

    if wait_for_service "http://localhost:9085/health" "Claude CLI Proxy"; then
        echo -e "  ${GREEN}✓${NC} Claude CLI Proxy started (PID: $(cat $CLAUDE_PROXY_PID))"
    else
        echo -e "  ${YELLOW}⚠${NC} Claude CLI Proxy may not be running correctly"
        echo "  Check log: $CLAUDE_PROXY_LOG"
        echo -e "  ${YELLOW}Code generation via CLI will not be available${NC}"
    fi
else
    echo -e "${YELLOW}⚠${NC} Claude CLI Proxy binary not found"
    echo -e "  ${YELLOW}Code generation via CLI will not be available${NC}"
fi

echo ""

# Start Node.js servers
echo -e "${BOLD}${BLUE}Starting Node.js Services...${NC}"
echo ""

cd "$WEB_UI_DIR"

# Start Specification API
echo -e "${CYAN}Starting Specification API (port 4001)...${NC}"
node server.js > "$SPEC_API_LOG" 2>&1 &
echo $! > "$SPEC_API_PID"
sleep 1

if wait_for_service "http://localhost:4001/api/health" "Specification API"; then
    echo -e "  ${GREEN}✓${NC} Specification API started (PID: $(cat $SPEC_API_PID))"
else
    echo -e "  ${RED}✗${NC} Specification API failed to start"
    echo "  Check log: $SPEC_API_LOG"
    exit 1
fi

# Start Collaboration Server
echo -e "${CYAN}Starting Collaboration Server (port 9084)...${NC}"
node collaboration-server.js > "$COLLAB_LOG" 2>&1 &
echo $! > "$COLLAB_PID"
sleep 1

# Collaboration server doesn't have a health endpoint, so just check if process is running
if kill -0 $(cat "$COLLAB_PID") 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Collaboration Server started (PID: $(cat $COLLAB_PID))"
else
    echo -e "  ${RED}✗${NC} Collaboration Server failed to start"
    echo "  Check log: $COLLAB_LOG"
    exit 1
fi

# Start Shared Workspace API
echo -e "${CYAN}Starting Shared Workspace API (port 4002)...${NC}"
node shared-workspace-server.js > "$SHARED_WS_LOG" 2>&1 &
echo $! > "$SHARED_WS_PID"
sleep 1

if wait_for_service "http://localhost:4002/api/health" "Shared Workspace API"; then
    echo -e "  ${GREEN}✓${NC} Shared Workspace API started (PID: $(cat $SHARED_WS_PID))"
else
    echo -e "  ${RED}✗${NC} Shared Workspace API failed to start"
    echo "  Check log: $SHARED_WS_LOG"
    exit 1
fi

echo ""

# Start Vite dev server
echo -e "${BOLD}${BLUE}Starting Frontend (Vite Dev Server)...${NC}"
echo ""

if [ "$VITE_FOREGROUND" = true ]; then
    echo -e "${CYAN}Starting Vite dev server in foreground (port 6175)...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    npm run dev
else
    echo -e "${CYAN}Starting Vite dev server in background (port 6175)...${NC}"
    npm run dev > "$VITE_LOG" 2>&1 &
    echo $! > "$VITE_PID"

    # Wait a bit longer for Vite to start
    sleep 3

    if wait_for_service "http://localhost:6175" "Vite Dev Server"; then
        echo -e "  ${GREEN}✓${NC} Vite dev server started (PID: $(cat $VITE_PID))"
    else
        echo -e "  ${YELLOW}⚠${NC} Vite dev server may still be starting..."
        echo "  Check log: $VITE_LOG"
    fi
fi

cd "$ROOT_DIR"

echo ""
echo -e "${BOLD}${GREEN}========================================${NC}"
echo -e "${BOLD}${GREEN}  IntentR Application Started!${NC}"
echo -e "${BOLD}${GREEN}========================================${NC}"
echo ""
echo -e "${BOLD}Service URLs:${NC}"
echo -e "  ${CYAN}Frontend (Web UI):${NC}       http://localhost:6175"
echo -e "  ${CYAN}Integration Service:${NC}     http://localhost:9080"
echo -e "  ${CYAN}Design Service:${NC}          http://localhost:9081"
echo -e "  ${CYAN}Capability Service:${NC}      http://localhost:9082"
echo -e "  ${CYAN}Auth Service:${NC}            http://localhost:9083"
echo -e "  ${CYAN}Collaboration Server:${NC}    http://localhost:9084"
echo -e "  ${CYAN}Claude CLI Proxy:${NC}        http://localhost:9085"
echo -e "  ${CYAN}Specification API:${NC}       http://localhost:4001"
echo -e "  ${CYAN}Shared Workspace API:${NC}    http://localhost:4002"
echo -e "  ${CYAN}PostgreSQL:${NC}              localhost:6432"
echo ""
echo -e "${BOLD}Logs:${NC}"
echo -e "  Docker services:         ${CYAN}docker compose logs -f${NC}"
echo -e "  Specification API:       ${CYAN}tail -f $SPEC_API_LOG${NC}"
echo -e "  Collaboration Server:    ${CYAN}tail -f $COLLAB_LOG${NC}"
echo -e "  Shared Workspace API:    ${CYAN}tail -f $SHARED_WS_LOG${NC}"
echo -e "  Claude CLI Proxy:        ${CYAN}tail -f $CLAUDE_PROXY_LOG${NC}"
echo -e "  Vite Dev Server:         ${CYAN}tail -f $VITE_LOG${NC}"
echo ""
echo -e "${BOLD}Management:${NC}"
echo -e "  Check status:            ${CYAN}./status.sh${NC}"
echo -e "  Stop all services:       ${CYAN}./stop.sh${NC}"
echo ""

if [ "$SHOW_LOGS" = true ]; then
    echo -e "${YELLOW}Showing Docker logs (Ctrl+C to exit)...${NC}"
    echo ""
    docker compose logs -f
fi

