#!/bin/bash

################################################################################
# UbeCode Environment Configuration Script
################################################################################
# This script helps configure the UbeCode microservices environment
#
# Usage:
#   ./configure-environment.sh [options]
#
# Options:
#   --figma-token TOKEN    Set Figma API token
#   --interactive          Interactive mode (default)
#   --help                 Show this help message
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
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
UbeCode Environment Configuration Script

Usage:
    ./configure-environment.sh [options]

Options:
    --figma-token TOKEN    Set Figma API token
    --interactive          Interactive mode (default)
    --help                 Show this help message

Examples:
    # Interactive mode (prompts for values)
    ./configure-environment.sh

    # Non-interactive mode with token
    ./configure-environment.sh --figma-token figd_abc123xyz

Environment Variables:
    FIGMA_TOKEN           Figma Personal Access Token (required for Figma integration)

For more information on getting a Figma token:
    https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens

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
            exit 0
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

    # Confirm configuration
    echo ""
    info "Configuration Summary:"
    echo "  Figma Token: ${FIGMA_TOKEN:-<not set>}"
    echo ""
    read -p "Save this configuration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Configuration cancelled"
        exit 0
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

    # Create .env file
    cat > "$ENV_FILE" << EOF
# UbeCode Microservices Environment Configuration
# Generated on $(date)

# Figma Integration
# Get your token from: https://www.figma.com/developers/api#access-tokens
FIGMA_TOKEN=${FIGMA_TOKEN}

# Service Ports (default values)
INTEGRATION_SERVICE_PORT=8080
DESIGN_SERVICE_PORT=8081
CAPABILITY_SERVICE_PORT=8082

# Docker Network
NETWORK_NAME=ubecode-network

# Logging
LOG_LEVEL=info

# Environment
ENV=development
EOF

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

# Figma Integration
# Get your token from: https://www.figma.com/developers/api#access-tokens
FIGMA_TOKEN=your_figma_personal_access_token_here

# Service Ports (default values)
INTEGRATION_SERVICE_PORT=8080
DESIGN_SERVICE_PORT=8081
CAPABILITY_SERVICE_PORT=8082

# Docker Network
NETWORK_NAME=ubecode-network

# Logging
LOG_LEVEL=info

# Environment
ENV=development
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
        warn "You can set it later by editing: $ENV_FILE"
        issues=$((issues + 1))
    fi

    if [ $issues -gt 0 ]; then
        warn "Configuration has $issues warning(s)"
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
    info "Next steps:"
    echo ""
    echo "  1. Review your configuration:"
    echo "     cat $ENV_FILE"
    echo ""
    echo "  2. Build and start the services:"
    echo "     cd $PROJECT_ROOT"
    echo "     make docker-build"
    echo "     make docker-up"
    echo ""
    echo "  3. Verify services are running:"
    echo "     docker-compose ps"
    echo "     curl http://localhost:8080/health"
    echo ""
    echo "  4. View logs:"
    echo "     make docker-logs"
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
