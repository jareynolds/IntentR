#!/bin/bash

################################################################################
# UbeCode Environment Configuration Script for macOS
################################################################################
# This script helps configure the UbeCode microservices environment
#
# Usage:
#   ./configure-environment.sh [options]
#
# Options:
#   --figma-token TOKEN       Set Figma API token
#   --anthropic-key KEY       Set Anthropic API key
#   --interactive             Interactive mode (default)
#   --help                    Show this help message
#
# Sequence: Run scripts in numerical order (Step 4 of 5)
#   1-install-dependencies.sh   (completed)
#   2-install-docker.sh         (completed)
#   3-install-golang.sh         (completed)
#   4-configure-environment.sh  <-- YOU ARE HERE
#   5-verify-setup.sh
#
# IDEMPOTENT: If .env already exists, you will be prompted before overwriting.
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
INTERACTIVE=true
FIGMA_TOKEN=""
ANTHROPIC_API_KEY=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

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

# Show help
show_help() {
    cat << EOF
UbeCode Environment Configuration Script (macOS)

Usage:
    ./configure-environment.sh [options]

Options:
    --figma-token TOKEN       Set Figma API token
    --anthropic-key KEY       Set Anthropic API key
    --interactive             Interactive mode (default)
    --help                    Show this help message

Examples:
    # Interactive mode (prompts for values)
    ./configure-environment.sh

    # Non-interactive mode with tokens
    ./configure-environment.sh --figma-token figd_abc123 --anthropic-key sk-ant-abc123

Environment Variables Required:
    FIGMA_TOKEN           Figma Personal Access Token (for Figma integration)
    ANTHROPIC_API_KEY     Anthropic API Key (for AI chat features)

For more information on getting tokens:
    Figma: https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens
    Anthropic: https://console.anthropic.com/account/keys

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --figma-token)
                FIGMA_TOKEN="$2"
                INTERACTIVE=false
                shift 2
                ;;
            --anthropic-key)
                ANTHROPIC_API_KEY="$2"
                shift 2
                ;;
            --interactive)
                INTERACTIVE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

# Interactive configuration
interactive_config() {
    log "Starting interactive configuration..."
    echo ""

    # Check if .env file already exists
    if [ -f "$ENV_FILE" ]; then
        warn "Configuration file already exists: $ENV_FILE"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Keeping existing configuration"
            return 0
        fi
    fi

    echo ""
    info "==================================================="
    info "  UbeCode Environment Configuration"
    info "==================================================="
    echo ""

    # Figma Token
    echo "Figma Personal Access Token:"
    echo "  - Required for Figma integration features"
    echo "  - Get your token from: https://www.figma.com/developers/api#access-tokens"
    echo "  - Press Enter to skip if you don't have one yet"
    echo ""
    read -p "Enter Figma Token: " -r FIGMA_TOKEN
    echo ""

    # Anthropic API Key
    echo "Anthropic API Key:"
    echo "  - Required for AI chat features"
    echo "  - Get your key from: https://console.anthropic.com/account/keys"
    echo "  - Press Enter to skip if you don't have one yet"
    echo ""
    read -p "Enter Anthropic API Key: " -r ANTHROPIC_API_KEY
    echo ""

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    log "Generated JWT secret"

    # Confirm configuration
    echo ""
    info "Configuration Summary:"
    echo "  Figma Token:     ${FIGMA_TOKEN:+configured}${FIGMA_TOKEN:-<not set>}"
    echo "  Anthropic Key:   ${ANTHROPIC_API_KEY:+configured}${ANTHROPIC_API_KEY:-<not set>}"
    echo "  JWT Secret:      generated"
    echo ""
    read -p "Save this configuration? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        warn "Configuration cancelled"
        exit 0
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -hex 32)
    fi
}

# Create .env file
create_env_file() {
    log "Creating environment configuration file..."

    # Backup existing .env if it exists
    if [ -f "$ENV_FILE" ]; then
        backup_file="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$backup_file"
        log "Backed up existing configuration to: $backup_file"
    fi

    generate_jwt_secret

    # Create .env file
    cat > "$ENV_FILE" << EOF
# UbeCode Microservices Environment Configuration
# Generated on $(date)
# Platform: macOS

# =============================================================================
# API TOKENS & SECRETS
# =============================================================================

# Figma Integration
# Get your token from: https://www.figma.com/developers/api#access-tokens
FIGMA_TOKEN=${FIGMA_TOKEN}

# Anthropic API (for AI Chat features)
# Get your key from: https://console.anthropic.com/account/keys
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# JWT Secret for authentication
JWT_SECRET=${JWT_SECRET}

# =============================================================================
# SERVICE PORTS
# =============================================================================

# Web UI (React + Vite)
WEB_UI_PORT=6173

# Go Microservices
INTEGRATION_SERVICE_PORT=9080
DESIGN_SERVICE_PORT=9081
CAPABILITY_SERVICE_PORT=9082
AUTH_SERVICE_PORT=9083

# Node.js Services
COLLABORATION_SERVER_PORT=9084
SPECIFICATION_API_PORT=4001
SHARED_WORKSPACE_PORT=4002

# Database
POSTGRES_PORT=6432

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

POSTGRES_HOST=localhost
POSTGRES_USER=ubecode_user
POSTGRES_PASSWORD=ubecode_password
POSTGRES_DB=ubecode_db

# =============================================================================
# DOCKER CONFIGURATION
# =============================================================================

NETWORK_NAME=ubecode-network

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================

# Environment (development, staging, production)
ENV=development

# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# CORS Origin (for development)
CORS_ORIGIN=http://localhost:6173
EOF

    chmod 600 "$ENV_FILE"
    log "Environment configuration saved to: $ENV_FILE"
}

# Create .env.example file
create_env_example() {
    local env_example="${PROJECT_ROOT}/.env.example"

    if [ -f "$env_example" ]; then
        return 0
    fi

    log "Creating .env.example file..."

    cat > "$env_example" << 'EOF'
# UbeCode Microservices Environment Configuration Template
# Copy this file to .env and fill in your actual values
# DO NOT commit .env to version control!

# =============================================================================
# API TOKENS & SECRETS (REQUIRED)
# =============================================================================

# Figma Integration
# Get your token from: https://www.figma.com/developers/api#access-tokens
FIGMA_TOKEN=your_figma_personal_access_token_here

# Anthropic API (for AI Chat features)
# Get your key from: https://console.anthropic.com/account/keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# JWT Secret for authentication (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here

# =============================================================================
# SERVICE PORTS (defaults shown)
# =============================================================================

WEB_UI_PORT=6173
INTEGRATION_SERVICE_PORT=9080
DESIGN_SERVICE_PORT=9081
CAPABILITY_SERVICE_PORT=9082
AUTH_SERVICE_PORT=9083
COLLABORATION_SERVER_PORT=9084
SPECIFICATION_API_PORT=4001
SHARED_WORKSPACE_PORT=4002
POSTGRES_PORT=6432

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

POSTGRES_HOST=localhost
POSTGRES_USER=ubecode_user
POSTGRES_PASSWORD=ubecode_password
POSTGRES_DB=ubecode_db

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================

ENV=development
LOG_LEVEL=info
NETWORK_NAME=ubecode-network
CORS_ORIGIN=http://localhost:6173
EOF

    log ".env.example file created"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."

    local issues=0

    # Check if FIGMA_TOKEN is set
    if [ -z "$FIGMA_TOKEN" ]; then
        warn "FIGMA_TOKEN is not set. Figma integration features will not work."
        issues=$((issues + 1))
    fi

    # Check if ANTHROPIC_API_KEY is set
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        warn "ANTHROPIC_API_KEY is not set. AI chat features will not work."
        issues=$((issues + 1))
    fi

    if [ $issues -gt 0 ]; then
        warn "Configuration has $issues warning(s)"
        info "You can set these later by editing: $ENV_FILE"
    else
        log "Configuration validated successfully"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    log "==================================================="
    log "  Configuration Complete!"
    log "==================================================="
    echo ""
    info "All installation steps completed! Next:"
    echo ""
    echo "  1. Verify your setup (Step 5 of 5):"
    echo "     ./5-verify-setup.sh"
    echo ""
    echo "  2. Start all services:"
    echo "     cd $PROJECT_ROOT"
    echo "     ./start.sh"
    echo ""
    echo "  3. Or use individual commands:"
    echo "     make docker-build   # Build Docker images"
    echo "     make docker-up      # Start services"
    echo ""
    echo "  4. Check service health:"
    echo "     ./manage-services.sh health"
    echo ""
    echo "  5. Access the application:"
    echo "     Web UI:      http://localhost:6173"
    echo "     Integration: http://localhost:9080/health"
    echo "     Design:      http://localhost:9081/health"
    echo "     Capability:  http://localhost:9082/health"
    echo ""
    echo "  For more information, see:"
    echo "     - README.md"
    echo "     - scripts/setup/OSX/README-SETUP.md"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    parse_args "$@"

    # Change to project root
    cd "$PROJECT_ROOT"

    if [ "$INTERACTIVE" = true ]; then
        interactive_config
    fi

    create_env_file
    create_env_example
    validate_config
    show_next_steps
}

main "$@"
