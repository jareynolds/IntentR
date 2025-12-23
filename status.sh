#!/bin/bash

# IntentR Application Status Script
# This script checks the status of all IntentR services
# Usage: ./status.sh [options]
#   Options:
#     --watch    Continuously monitor services (refresh every 5 seconds)

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

# PID files
PID_DIR="$ROOT_DIR/.pids"
SPEC_API_PID="$PID_DIR/specification-api.pid"
COLLAB_PID="$PID_DIR/collaboration-server.pid"
SHARED_WS_PID="$PID_DIR/shared-workspace-server.pid"
VITE_PID="$PID_DIR/vite-dev-server.pid"

# Parse command line options
WATCH_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch)
      WATCH_MODE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: ./status.sh [--watch]"
      exit 1
      ;;
  esac
done

# Function to check HTTP service
check_http_service() {
    local url=$1
    local name=$2

    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}●${NC} $name - ${GREEN}Running${NC}"
        return 0
    else
        echo -e "  ${RED}●${NC} $name - ${RED}Not responding${NC}"
        return 1
    fi
}

# Function to check process by PID
check_process() {
    local pid_file=$1
    local name=$2
    local port=$3

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            # Check if port is actually listening
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "  ${GREEN}●${NC} $name (PID: $pid, Port: $port) - ${GREEN}Running${NC}"
                return 0
            else
                echo -e "  ${YELLOW}●${NC} $name (PID: $pid) - ${YELLOW}Running but not listening on port $port${NC}"
                return 1
            fi
        else
            echo -e "  ${RED}●${NC} $name - ${RED}Not running (stale PID file)${NC}"
            return 1
        fi
    else
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
            echo -e "  ${YELLOW}●${NC} $name (PID: $pid, Port: $port) - ${YELLOW}Running (no PID file)${NC}"
            return 0
        else
            echo -e "  ${RED}●${NC} $name - ${RED}Not running${NC}"
            return 1
        fi
    fi
}

# Function to check Docker container
check_docker_container() {
    local container_name=$1
    local service_name=$2

    local status=$(docker compose ps -q "$container_name" 2>/dev/null)

    if [ -z "$status" ]; then
        echo -e "  ${RED}●${NC} $service_name - ${RED}Not running${NC}"
        return 1
    fi

    local health=$(docker inspect --format='{{.State.Health.Status}}' $(docker compose ps -q "$container_name") 2>/dev/null || echo "unknown")
    local state=$(docker inspect --format='{{.State.Status}}' $(docker compose ps -q "$container_name") 2>/dev/null || echo "unknown")

    if [ "$state" = "running" ]; then
        if [ "$health" = "healthy" ]; then
            echo -e "  ${GREEN}●${NC} $service_name - ${GREEN}Running (healthy)${NC}"
            return 0
        elif [ "$health" = "unhealthy" ]; then
            echo -e "  ${RED}●${NC} $service_name - ${RED}Running (unhealthy)${NC}"
            return 1
        elif [ "$health" = "starting" ]; then
            echo -e "  ${YELLOW}●${NC} $service_name - ${YELLOW}Starting...${NC}"
            return 1
        else
            echo -e "  ${GREEN}●${NC} $service_name - ${GREEN}Running${NC}"
            return 0
        fi
    else
        echo -e "  ${RED}●${NC} $service_name - ${RED}$state${NC}"
        return 1
    fi
}

# Main status check function
check_status() {
    local all_running=true

    if [ "$WATCH_MODE" = true ]; then
        clear
    fi

    echo -e "${BOLD}${BLUE}========================================${NC}"
    echo -e "${BOLD}${BLUE}  IntentR Application Status${NC}"
    echo -e "${BOLD}${BLUE}========================================${NC}"
    echo ""
    echo -e "${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""

    # Check Docker services
    echo -e "${BOLD}Docker Services:${NC}"

    cd "$ROOT_DIR"

    if ! docker info > /dev/null 2>&1; then
        echo -e "  ${RED}✗ Docker daemon is not running${NC}"
        all_running=false
    else
        check_docker_container "postgres" "PostgreSQL Database" || all_running=false
        check_docker_container "integration-service" "Integration Service" || all_running=false
        check_docker_container "design-service" "Design Service" || all_running=false
        check_docker_container "capability-service" "Capability Service" || all_running=false
        check_docker_container "auth-service" "Auth Service" || all_running=false
    fi

    echo ""

    # Check Node.js services
    echo -e "${BOLD}Node.js Services:${NC}"
    check_process "$SPEC_API_PID" "Specification API" 4001 || all_running=false
    check_process "$COLLAB_PID" "Collaboration Server" 9084 || all_running=false
    check_process "$SHARED_WS_PID" "Shared Workspace API" 4002 || all_running=false
    check_process "$VITE_PID" "Vite Dev Server" 6173 || all_running=false

    echo ""

    # Check service health endpoints
    echo -e "${BOLD}Service Health Checks:${NC}"
    check_http_service "http://localhost:9080/health" "Integration Service" || all_running=false
    check_http_service "http://localhost:9081/health" "Design Service" || all_running=false
    check_http_service "http://localhost:9082/health" "Capability Service" || all_running=false
    check_http_service "http://localhost:9083/health" "Auth Service" || all_running=false
    check_http_service "http://localhost:4001/api/health" "Specification API" || all_running=false
    check_http_service "http://localhost:4002/api/health" "Shared Workspace API" || all_running=false

    echo ""

    # Port usage summary
    echo -e "${BOLD}Port Usage:${NC}"

    PORTS=(
        "6173:Vite Dev Server"
        "9080:Integration Service"
        "9081:Design Service"
        "9082:Capability Service"
        "9083:Auth Service"
        "9084:Collaboration Server"
        "4001:Specification API"
        "4002:Shared Workspace API"
        "6432:PostgreSQL"
    )

    for port_info in "${PORTS[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} Port $port ($service)"
        else
            echo -e "  ${RED}✗${NC} Port $port ($service) - ${RED}Not in use${NC}"
        fi
    done

    echo ""
    echo -e "${BOLD}========================================${NC}"

    if [ "$all_running" = true ]; then
        echo -e "${BOLD}${GREEN}  All Services Running${NC}"
    else
        echo -e "${BOLD}${YELLOW}  Some Services Not Running${NC}"
    fi

    echo -e "${BOLD}========================================${NC}"
    echo ""

    if [ "$WATCH_MODE" = false ]; then
        echo -e "${BOLD}Quick Commands:${NC}"
        echo -e "  View logs:           ${CYAN}docker compose logs -f${NC}"
        echo -e "  Restart services:    ${CYAN}./stop.sh && ./start.sh${NC}"
        echo -e "  Watch status:        ${CYAN}./status.sh --watch${NC}"
        echo ""

        echo -e "${BOLD}Service URLs:${NC}"
        echo -e "  Frontend:            ${CYAN}http://localhost:6175${NC}"
        echo -e "  Integration API:     ${CYAN}http://localhost:9080${NC}"
        echo -e "  Design API:          ${CYAN}http://localhost:9081${NC}"
        echo -e "  Capability API:      ${CYAN}http://localhost:9082${NC}"
        echo -e "  Auth API:            ${CYAN}http://localhost:9083${NC}"
        echo ""
    fi
}

# Main execution
if [ "$WATCH_MODE" = true ]; then
    echo -e "${YELLOW}Watch mode enabled. Press Ctrl+C to exit.${NC}"
    echo ""
    sleep 2

    while true; do
        check_status
        sleep 5
    done
else
    check_status
fi
