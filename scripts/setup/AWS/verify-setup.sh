#!/bin/bash

################################################################################
# UbeCode Setup Verification Script
################################################################################
# This script verifies that all components are properly installed and configured
#
# Usage:
#   ./verify-setup.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

total_checks=0
passed_checks=0
failed_checks=0
warning_checks=0

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

pass() {
    echo -e "${GREEN}✓${NC} $1"
    passed_checks=$((passed_checks + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    failed_checks=$((failed_checks + 1))
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    warning_checks=$((warning_checks + 1))
}

check_command() {
    local cmd=$1
    local name=$2
    local required=${3:-true}

    total_checks=$((total_checks + 1))

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        pass "$name is installed: $version"
        return 0
    else
        if [ "$required" = true ]; then
            fail "$name is not installed (required)"
            return 1
        else
            warning "$name is not installed (optional)"
            return 2
        fi
    fi
}

check_docker_service() {
    total_checks=$((total_checks + 1))

    if docker info &> /dev/null; then
        pass "Docker service is running"
        return 0
    else
        fail "Docker service is not running"
        info "Try: sudo systemctl start docker"
        return 1
    fi
}

check_docker_permissions() {
    total_checks=$((total_checks + 1))

    if docker ps &> /dev/null; then
        pass "Docker permissions configured correctly"
        return 0
    else
        warning "Current user may not have Docker permissions"
        info "Try: sudo usermod -aG docker $USER && newgrp docker"
        return 2
    fi
}

check_env_file() {
    total_checks=$((total_checks + 1))

    if [ -f "$PROJECT_ROOT/.env" ]; then
        pass "Environment configuration file exists (.env)"

        # Check if FIGMA_TOKEN is set
        if grep -q "FIGMA_TOKEN=" "$PROJECT_ROOT/.env"; then
            local token_value=$(grep "FIGMA_TOKEN=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
            if [ -n "$token_value" ] && [ "$token_value" != "your_figma_personal_access_token_here" ]; then
                pass "FIGMA_TOKEN is configured"
            else
                warning "FIGMA_TOKEN is not configured (Figma features will not work)"
                info "Edit .env file and add your Figma token"
            fi
        fi
        return 0
    else
        warning "Environment configuration file (.env) not found"
        info "Run: ./scripts/setup/configure-environment.sh"
        return 2
    fi
}

check_project_files() {
    total_checks=$((total_checks + 1))

    local required_files=(
        "docker-compose.yml"
        "Dockerfile"
        "Makefile"
        "go.mod"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -eq 0 ]; then
        pass "All required project files are present"
        return 0
    else
        fail "Missing required files: ${missing_files[*]}"
        return 1
    fi
}

check_go_modules() {
    total_checks=$((total_checks + 1))

    cd "$PROJECT_ROOT"

    if [ -f "go.mod" ]; then
        if [ -d "vendor" ] || go list -m all &> /dev/null; then
            pass "Go modules are properly configured"
            return 0
        else
            warning "Go modules not downloaded"
            info "Run: go mod download"
            return 2
        fi
    else
        fail "go.mod file not found"
        return 1
    fi
}

check_services() {
    total_checks=$((total_checks + 1))

    cd "$PROJECT_ROOT"

    local services=("design-service" "capability-service" "integration-service")
    local missing_services=()

    for service in "${services[@]}"; do
        if [ ! -d "cmd/$service" ]; then
            missing_services+=("$service")
        fi
    done

    if [ ${#missing_services[@]} -eq 0 ]; then
        pass "All service directories are present"
        return 0
    else
        fail "Missing service directories: ${missing_services[*]}"
        return 1
    fi
}

check_network_connectivity() {
    total_checks=$((total_checks + 1))

    if ping -c 1 8.8.8.8 &> /dev/null; then
        pass "Network connectivity is available"
        return 0
    else
        fail "No network connectivity"
        return 1
    fi
}

check_ports() {
    total_checks=$((total_checks + 1))

    local ports=(8080 8081 8082)
    local occupied_ports=()

    for port in "${ports[@]}"; do
        if command -v lsof &> /dev/null; then
            if lsof -i ":$port" &> /dev/null; then
                occupied_ports+=("$port")
            fi
        elif command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":$port "; then
                occupied_ports+=("$port")
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln | grep -q ":$port "; then
                occupied_ports+=("$port")
            fi
        fi
    done

    if [ ${#occupied_ports[@]} -eq 0 ]; then
        pass "Required ports (8080, 8081, 8082) are available"
        return 0
    else
        warning "Ports already in use: ${occupied_ports[*]}"
        info "These ports are needed for UbeCode services"
        return 2
    fi
}

display_summary() {
    echo ""
    log "=================================================="
    log "  Verification Summary"
    log "=================================================="
    echo ""
    echo -e "Total checks:    $total_checks"
    echo -e "${GREEN}Passed:${NC}          $passed_checks"
    echo -e "${YELLOW}Warnings:${NC}        $warning_checks"
    echo -e "${RED}Failed:${NC}          $failed_checks"
    echo ""

    if [ $failed_checks -eq 0 ]; then
        if [ $warning_checks -eq 0 ]; then
            log "✓ All checks passed! Your environment is ready."
        else
            warn "Setup is mostly complete, but there are some warnings to address."
        fi
    else
        error "Setup verification failed. Please address the issues above."
        return 1
    fi
}

display_next_steps() {
    echo ""
    info "Next steps:"
    echo ""

    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo "  1. Configure environment:"
        echo "     ./scripts/setup/configure-environment.sh"
        echo ""
    fi

    echo "  2. Download Go dependencies:"
    echo "     cd $PROJECT_ROOT"
    echo "     go mod download"
    echo ""

    echo "  3. Build and start services:"
    echo "     make docker-build"
    echo "     make docker-up"
    echo ""

    echo "  4. Verify services are running:"
    echo "     ./scripts/setup/manage-services.sh health"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    log "Starting UbeCode setup verification..."
    echo ""

    log "Checking system dependencies..."
    check_command "git" "Git" true
    check_command "docker" "Docker" true
    check_command "go" "Go" true
    check_command "make" "Make" false
    check_command "curl" "curl" false
    check_command "wget" "wget" false
    echo ""

    log "Checking Docker..."
    check_docker_service
    check_docker_permissions
    echo ""

    log "Checking project structure..."
    cd "$PROJECT_ROOT"
    check_project_files
    check_services
    check_env_file
    check_go_modules
    echo ""

    log "Checking system resources..."
    check_network_connectivity
    check_ports
    echo ""

    display_summary
    display_next_steps
}

main "$@"
