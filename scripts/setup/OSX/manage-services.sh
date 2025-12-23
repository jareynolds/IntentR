#!/bin/bash

################################################################################
# IntentR Services Management Script for macOS
################################################################################
# This script provides convenient commands for managing IntentR microservices
#
# Usage:
#   ./manage-services.sh [command]
#
# Commands:
#   start       Start all services
#   stop        Stop all services
#   restart     Restart all services
#   status      Show service status
#   logs        Show service logs
#   health      Check service health
#   build       Build all services
#   clean       Clean up containers and images
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Show usage
show_usage() {
    cat << EOF
IntentR Services Management Script (macOS)

Usage:
    ./manage-services.sh [command]

Commands:
    start       Start all services (Docker Compose)
    stop        Stop all services
    restart     Restart all services
    status      Show service status
    logs        Show service logs (follow mode)
    health      Check service health endpoints
    build       Build all service images
    rebuild     Rebuild services (no cache)
    clean       Stop and remove containers, networks, volumes
    ps          Show running containers

Quick Commands:
    dev         Start development environment (web-ui + services)
    web         Start web UI only (npm run dev)
    db          Start PostgreSQL only

Examples:
    ./manage-services.sh start
    ./manage-services.sh status
    ./manage-services.sh logs
    ./manage-services.sh health

EOF
}

# Check if Docker is running
check_docker() {
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker Desktop first."
    fi
}

# Check if in project directory
check_project_dir() {
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        error "docker-compose.yml not found in $PROJECT_ROOT"
    fi
    cd "$PROJECT_ROOT"
}

# Start services
start_services() {
    log "Starting IntentR microservices..."
    docker compose up -d
    log "Services started!"
    echo ""
    show_status
}

# Stop services
stop_services() {
    log "Stopping IntentR microservices..."
    docker compose down
    log "Services stopped!"
}

# Restart services
restart_services() {
    log "Restarting IntentR microservices..."
    docker compose restart
    log "Services restarted!"
    echo ""
    show_status
}

# Show service status
show_status() {
    log "Service Status:"
    echo ""
    docker compose ps
    echo ""
}

# Show logs
show_logs() {
    local service="${1:-}"

    log "Showing service logs (Ctrl+C to exit)..."
    echo ""

    if [ -n "$service" ]; then
        docker compose logs -f "$service"
    else
        docker compose logs -f
    fi
}

# Check health endpoints
check_health() {
    log "Checking service health..."
    echo ""

    # Load ports from .env if available
    source "$PROJECT_ROOT/.env" 2>/dev/null || true

    local services=(
        "Web UI:http://localhost:${WEB_UI_PORT:-6173}"
        "Integration Service:http://localhost:${INTEGRATION_SERVICE_PORT:-9080}/health"
        "Design Service:http://localhost:${DESIGN_SERVICE_PORT:-9081}/health"
        "Capability Service:http://localhost:${CAPABILITY_SERVICE_PORT:-9082}/health"
        "Auth Service:http://localhost:${AUTH_SERVICE_PORT:-9083}/health"
        "PostgreSQL:localhost:${POSTGRES_PORT:-6432}"
    )

    for service_info in "${services[@]}"; do
        IFS=':' read -r name protocol host_and_rest <<< "$service_info"

        if [[ "$name" == "PostgreSQL" ]]; then
            # Check PostgreSQL with nc
            local pg_host=$(echo "$protocol" | cut -d'/' -f1)
            local pg_port="$host_and_rest"
            if nc -z "$pg_host" "$pg_port" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} $name - Running on port $pg_port"
            else
                echo -e "${RED}✗${NC} $name - Not responding on port $pg_port"
            fi
        elif [[ "$name" == "Web UI" ]]; then
            # Check Web UI
            local url="$protocol:$host_and_rest"
            if curl -sf "$url" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $name - Healthy ($url)"
            else
                echo -e "${YELLOW}⚠${NC} $name - Not running (start with: npm run dev in web-ui/)"
            fi
        else
            # Check HTTP health endpoints
            local url="$protocol:$host_and_rest"
            if curl -sf "$url" > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $name - Healthy"
            else
                echo -e "${RED}✗${NC} $name - Unhealthy or not responding"
            fi
        fi
    done
    echo ""
}

# Build services
build_services() {
    log "Building service images..."
    docker compose build
    log "Build complete!"
}

# Rebuild services (no cache)
rebuild_services() {
    log "Rebuilding service images (no cache)..."
    docker compose build --no-cache
    log "Rebuild complete!"
}

# Clean up
clean_services() {
    warn "This will stop and remove all containers, networks, and volumes."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Cleaning up..."
        docker compose down -v --remove-orphans
        log "Cleanup complete!"
    else
        log "Cleanup cancelled"
    fi
}

# Show running containers
show_containers() {
    log "Running containers:"
    echo ""
    docker compose ps
}

# Start development environment
start_dev() {
    log "Starting development environment..."

    # Start Docker services
    docker compose up -d

    # Open new terminal for web-ui (macOS specific)
    if [[ -d "$PROJECT_ROOT/web-ui" ]]; then
        info "Starting web UI in background..."
        cd "$PROJECT_ROOT/web-ui"
        npm run dev &
        WEB_PID=$!
        cd "$PROJECT_ROOT"
        log "Web UI started (PID: $WEB_PID)"
    fi

    log "Development environment started!"
    echo ""
    info "Access the application at:"
    echo "  Web UI: http://localhost:6173"
    echo ""
    show_status
}

# Start web UI only
start_web() {
    log "Starting web UI..."
    cd "$PROJECT_ROOT/web-ui"
    npm run dev
}

# Start database only
start_db() {
    log "Starting PostgreSQL..."
    docker compose up -d postgres
    log "PostgreSQL started on port ${POSTGRES_PORT:-6432}"
}

################################################################################
# Main Execution
################################################################################

main() {
    local command="${1:-help}"

    check_docker
    check_project_dir

    case "$command" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        health)
            check_health
            ;;
        build)
            build_services
            ;;
        rebuild)
            rebuild_services
            ;;
        clean)
            clean_services
            ;;
        ps)
            show_containers
            ;;
        dev)
            start_dev
            ;;
        web)
            start_web
            ;;
        db)
            start_db
            ;;
        help|--help|-h|"")
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            ;;
    esac
}

main "$@"
