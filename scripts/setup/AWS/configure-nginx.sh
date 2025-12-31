#!/bin/bash
#
# IntentR - Nginx Configuration Script
# Configures nginx reverse proxy for IntentR services
#
# This script can configure:
# 1. System nginx (for non-Docker deployments)
# 2. Docker nginx (verifies and updates the Docker nginx config)
#
# Usage:
#   ./configure-nginx.sh [OPTIONS]
#
# Options:
#   --system        Configure system nginx only
#   --docker        Configure Docker nginx only (default)
#   --both          Configure both system and Docker nginx
#   --verify        Only verify nginx configuration
#   --help          Show this help message
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOCKER_NGINX_CONF="$PROJECT_ROOT/nginx/nginx.conf"
SYSTEM_NGINX_CONF="/etc/nginx/conf.d/intentr.conf"

# Default options
CONFIGURE_SYSTEM=false
CONFIGURE_DOCKER=true
VERIFY_ONLY=false

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    head -25 "$0" | tail -20
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --system)
                CONFIGURE_SYSTEM=true
                CONFIGURE_DOCKER=false
                shift
                ;;
            --docker)
                CONFIGURE_DOCKER=true
                CONFIGURE_SYSTEM=false
                shift
                ;;
            --both)
                CONFIGURE_SYSTEM=true
                CONFIGURE_DOCKER=true
                shift
                ;;
            --verify)
                VERIFY_ONLY=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

verify_docker_nginx_config() {
    log_info "Verifying Docker nginx configuration..."

    if [[ ! -f "$DOCKER_NGINX_CONF" ]]; then
        log_error "Docker nginx config not found at $DOCKER_NGINX_CONF"
        return 1
    fi

    local issues=0

    # Check for /api/auth/ location without rewrite (correct)
    if grep -q "location /api/auth/" "$DOCKER_NGINX_CONF"; then
        if grep -A2 "location /api/auth/" "$DOCKER_NGINX_CONF" | grep -q "rewrite"; then
            log_warning "/api/auth/ location has rewrite rule - auth service expects full path"
            issues=$((issues + 1))
        else
            log_success "/api/auth/ location configured correctly (no rewrite)"
        fi
    else
        log_warning "/api/auth/ location not found"
        issues=$((issues + 1))
    fi

    # Check for /api/users location
    if grep -q "location /api/users" "$DOCKER_NGINX_CONF"; then
        log_success "/api/users location found"
    else
        log_warning "/api/users location not found - user management won't work via proxy"
        issues=$((issues + 1))
    fi

    # Check upstream definitions
    for upstream in frontend integration_service design_service capability_service auth_service; do
        if grep -q "upstream $upstream" "$DOCKER_NGINX_CONF"; then
            log_success "Upstream $upstream defined"
        else
            log_warning "Upstream $upstream not found"
            issues=$((issues + 1))
        fi
    done

    if [[ $issues -eq 0 ]]; then
        log_success "Docker nginx configuration looks good!"
        return 0
    else
        log_warning "Found $issues issue(s) in Docker nginx configuration"
        return 1
    fi
}

fix_docker_nginx_config() {
    log_info "Fixing Docker nginx configuration..."

    local modified=false

    # Remove rewrite rule from /api/auth/ if present
    if grep -A2 "location /api/auth/" "$DOCKER_NGINX_CONF" | grep -q "rewrite ^/api/auth"; then
        log_info "Removing rewrite rule from /api/auth/ location..."
        sed -i '/location \/api\/auth\//,/}/ { /rewrite \^\/api\/auth/d }' "$DOCKER_NGINX_CONF"
        modified=true
    fi

    # Add /api/users location if missing
    if ! grep -q "location /api/users" "$DOCKER_NGINX_CONF"; then
        log_info "Adding /api/users location..."

        # Find the line after /api/auth/ block and insert /api/users
        sed -i '/# Auth Service API/,/^[[:space:]]*}$/ {
            /^[[:space:]]*}$/ a\
\
        # User Management API (Auth Service)\
        location /api/users {\
            proxy_pass http://auth_service;\
            proxy_set_header Host $host;\
            proxy_set_header X-Real-IP $remote_addr;\
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
            proxy_set_header X-Forwarded-Proto $scheme;\
        }
        }' "$DOCKER_NGINX_CONF"
        modified=true
    fi

    if [[ "$modified" == "true" ]]; then
        log_success "Docker nginx configuration updated"

        # Restart nginx container if running
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "intentr-nginx"; then
            log_info "Restarting Docker nginx container..."
            docker restart intentr-nginx-1 2>/dev/null || sudo docker restart intentr-nginx-1
            log_success "Docker nginx container restarted"
        fi
    else
        log_info "No changes needed to Docker nginx configuration"
    fi
}

create_system_nginx_config() {
    log_info "Creating system nginx configuration..."

    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        log_warning "System nginx not installed. Install with: sudo dnf install nginx"
        return 1
    fi

    cat > /tmp/intentr-nginx.conf << 'NGINX_CONF'
# IntentR Reverse Proxy Configuration
# Generated by configure-nginx.sh

upstream web-ui {
    server 127.0.0.1:6175;
}

upstream integration-service {
    server 127.0.0.1:9080;
}

upstream design-service {
    server 127.0.0.1:9081;
}

upstream capability-service {
    server 127.0.0.1:9082;
}

upstream auth-service {
    server 127.0.0.1:9083;
}

upstream collaboration-server {
    server 127.0.0.1:9084;
}

upstream specification-api {
    server 127.0.0.1:4001;
}

upstream workspace-api {
    server 127.0.0.1:4002;
}

server {
    listen 80;
    server_name _;

    # Increase buffer sizes for large requests
    client_max_body_size 50M;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    # Common proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Integration Service API (port 9080)
    location /ai-chat {
        proxy_pass http://integration-service;
        proxy_read_timeout 120s;
    }
    location /figma/ {
        proxy_pass http://integration-service;
    }
    location /generate-code {
        proxy_pass http://integration-service;
        proxy_read_timeout 120s;
    }
    location /analyze- {
        proxy_pass http://integration-service;
        proxy_read_timeout 120s;
    }
    location /save- {
        proxy_pass http://integration-service;
    }
    location /delete- {
        proxy_pass http://integration-service;
    }
    location /folders/ {
        proxy_pass http://integration-service;
    }
    location /workspace/ {
        proxy_pass http://integration-service;
    }
    location /specifications/ {
        proxy_pass http://integration-service;
    }

    # Design Service API (port 9081)
    location /designs {
        proxy_pass http://design-service;
    }
    location /designs/ {
        proxy_pass http://design-service;
    }

    # Capability Service API (port 9082)
    location /capabilities {
        proxy_pass http://capability-service;
    }
    location /capabilities/ {
        proxy_pass http://capability-service;
    }
    location /enablers {
        proxy_pass http://capability-service;
    }
    location /enablers/ {
        proxy_pass http://capability-service;
    }
    location /approvals {
        proxy_pass http://capability-service;
    }
    location /approvals/ {
        proxy_pass http://capability-service;
    }
    location /components {
        proxy_pass http://capability-service;
    }
    location /components/ {
        proxy_pass http://capability-service;
    }

    # Auth Service API (port 9083)
    # NOTE: No rewrite - auth service expects full /api/auth/ path
    location /api/auth/ {
        proxy_pass http://auth-service;
    }

    # User Management API (port 9083)
    location /api/users {
        proxy_pass http://auth-service;
    }

    # Collaboration Server - WebSocket (port 9084)
    location /socket.io/ {
        proxy_pass http://collaboration-server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Specification API (port 4001)
    location /api/specifications {
        proxy_pass http://specification-api;
    }
    location /api/specifications/ {
        proxy_pass http://specification-api;
    }
    location /api/workspaces {
        proxy_pass http://specification-api;
    }
    location /api/workspaces/ {
        proxy_pass http://specification-api;
    }

    # Shared Workspace API (port 4002)
    location /api/shared-workspace {
        proxy_pass http://workspace-api;
    }
    location /api/shared-workspace/ {
        proxy_pass http://workspace-api;
    }

    # Web UI - catch all (port 6175)
    location / {
        proxy_pass http://web-ui;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_CONF

    sudo cp /tmp/intentr-nginx.conf "$SYSTEM_NGINX_CONF"
    rm /tmp/intentr-nginx.conf

    # Test nginx configuration
    if sudo nginx -t; then
        log_success "System nginx configuration created at $SYSTEM_NGINX_CONF"
        log_info "To enable: sudo systemctl enable --now nginx"
        log_info "To reload: sudo systemctl reload nginx"
    else
        log_error "Nginx configuration test failed"
        return 1
    fi
}

configure_frontend_proxy() {
    log_info "Configuring frontend proxy settings..."

    local env_file="$PROJECT_ROOT/web-ui/.env"
    local env_dev_file="$PROJECT_ROOT/web-ui/.env.development"

    # Create/update .env
    if [[ ! -f "$env_file" ]] || ! grep -q "VITE_USE_PROXY=true" "$env_file"; then
        cat > "$env_file" << 'ENV_FILE'
# IntentR Web UI Environment Configuration
#
# When running behind nginx proxy (production/external access):
#   VITE_USE_PROXY=true - All API calls go through nginx on port 80
#
# When running locally for development:
#   VITE_USE_PROXY=false or unset - Direct connections to services

VITE_USE_PROXY=true

ENV_FILE
        log_success "Created $env_file with VITE_USE_PROXY=true"
    else
        log_info "$env_file already configured"
    fi

    # Update .env.development
    if [[ -f "$env_dev_file" ]]; then
        if grep -q "VITE_USE_PROXY=false" "$env_dev_file"; then
            sed -i 's/VITE_USE_PROXY=false/VITE_USE_PROXY=true/' "$env_dev_file"
            log_success "Updated $env_dev_file: VITE_USE_PROXY=true"
        elif ! grep -q "VITE_USE_PROXY" "$env_dev_file"; then
            echo "VITE_USE_PROXY=true" >> "$env_dev_file"
            log_success "Added VITE_USE_PROXY=true to $env_dev_file"
        else
            log_info "$env_dev_file already configured"
        fi
    fi
}

main() {
    echo "=================================================="
    echo "IntentR Nginx Configuration"
    echo "=================================================="
    echo ""

    parse_args "$@"

    if [[ "$VERIFY_ONLY" == "true" ]]; then
        verify_docker_nginx_config
        exit $?
    fi

    # Configure frontend proxy settings
    configure_frontend_proxy

    # Configure Docker nginx
    if [[ "$CONFIGURE_DOCKER" == "true" ]]; then
        echo ""
        log_info "=== Docker Nginx Configuration ==="
        if ! verify_docker_nginx_config; then
            fix_docker_nginx_config
            verify_docker_nginx_config
        fi
    fi

    # Configure system nginx
    if [[ "$CONFIGURE_SYSTEM" == "true" ]]; then
        echo ""
        log_info "=== System Nginx Configuration ==="
        create_system_nginx_config
    fi

    echo ""
    log_success "Nginx configuration complete!"
    echo ""
    echo "Next steps:"
    echo "  1. If using Docker nginx, restart the application: ./start.sh"
    echo "  2. If using system nginx, enable it: sudo systemctl enable --now nginx"
    echo "  3. Access the application at http://<your-ip>/"
}

main "$@"
