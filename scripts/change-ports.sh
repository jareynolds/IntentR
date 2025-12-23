#!/bin/bash

# IntentR Port Configuration Script
# This script allows administrators to change all service ports to avoid conflicts
# Usage: ./scripts/change-ports.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}IntentR Port Configuration Tool${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to validate port number
validate_port() {
    local port=$1
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
        echo -e "${RED}Error: Invalid port number. Must be between 1024-65535${NC}"
        return 1
    fi
    return 0
}

# Function to check if port is in use
check_port_available() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}Warning: Port $port is currently in use${NC}"
        return 1
    fi
    return 0
}

# Display current configuration
echo -e "${GREEN}Current Port Configuration:${NC}"
echo "-------------------------------------"
echo "Integration Service:    8080"
echo "Design Service:         8081"
echo "Capability Service:     8082"
echo "Auth Service:           8083"
echo "Collaboration Server:   8084"
echo "Specification API:      3001"
echo "Shared Workspace API:   3002"
echo "Web UI (Vite):          5173"
echo "PostgreSQL Database:    5432"
echo ""

# Ask if user wants to use suggested ports or custom
echo -e "${BLUE}Choose an option:${NC}"
echo "1) Use suggested alternative ports (no conflicts)"
echo "2) Enter custom ports manually"
echo "3) Exit without changes"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        # Suggested alternative ports (safe ranges)
        INTEGRATION_PORT=9080
        DESIGN_PORT=9081
        CAPABILITY_PORT=9082
        AUTH_PORT=9083
        COLLABORATION_PORT=9084
        SPEC_API_PORT=4001
        SHARED_WS_PORT=4002
        VITE_PORT=6173
        DB_PORT=6432
        echo -e "${GREEN}Using suggested alternative ports${NC}"
        ;;
    2)
        # Custom ports
        echo -e "${YELLOW}Enter custom port numbers:${NC}"

        read -p "Integration Service port [8080]: " INTEGRATION_PORT
        INTEGRATION_PORT=${INTEGRATION_PORT:-8080}
        validate_port $INTEGRATION_PORT || exit 1

        read -p "Design Service port [8081]: " DESIGN_PORT
        DESIGN_PORT=${DESIGN_PORT:-8081}
        validate_port $DESIGN_PORT || exit 1

        read -p "Capability Service port [8082]: " CAPABILITY_PORT
        CAPABILITY_PORT=${CAPABILITY_PORT:-8082}
        validate_port $CAPABILITY_PORT || exit 1

        read -p "Auth Service port [8083]: " AUTH_PORT
        AUTH_PORT=${AUTH_PORT:-8083}
        validate_port $AUTH_PORT || exit 1

        read -p "Collaboration Server port [8084]: " COLLABORATION_PORT
        COLLABORATION_PORT=${COLLABORATION_PORT:-8084}
        validate_port $COLLABORATION_PORT || exit 1

        read -p "Specification API port [3001]: " SPEC_API_PORT
        SPEC_API_PORT=${SPEC_API_PORT:-3001}
        validate_port $SPEC_API_PORT || exit 1

        read -p "Shared Workspace API port [3002]: " SHARED_WS_PORT
        SHARED_WS_PORT=${SHARED_WS_PORT:-3002}
        validate_port $SHARED_WS_PORT || exit 1

        read -p "Web UI (Vite) port [5173]: " VITE_PORT
        VITE_PORT=${VITE_PORT:-5173}
        validate_port $VITE_PORT || exit 1

        read -p "PostgreSQL Database port [5432]: " DB_PORT
        DB_PORT=${DB_PORT:-5432}
        validate_port $DB_PORT || exit 1
        ;;
    3)
        echo -e "${YELLOW}Exiting without changes${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}New Port Configuration:${NC}"
echo "-------------------------------------"
echo "Integration Service:    $INTEGRATION_PORT"
echo "Design Service:         $DESIGN_PORT"
echo "Capability Service:     $CAPABILITY_PORT"
echo "Auth Service:           $AUTH_PORT"
echo "Collaboration Server:   $COLLABORATION_PORT"
echo "Specification API:      $SPEC_API_PORT"
echo "Shared Workspace API:   $SHARED_WS_PORT"
echo "Web UI (Vite):          $VITE_PORT"
echo "PostgreSQL Database:    $DB_PORT"
echo ""

read -p "Apply these changes? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Applying port configuration changes...${NC}"

# Backup original files
BACKUP_DIR="$ROOT_DIR/.port-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${YELLOW}Creating backups in $BACKUP_DIR${NC}"

# Function to backup and update file
backup_and_update() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/$(basename $file)"
        echo "  ✓ Backed up $(basename $file)"
    fi
}

# Backup files
backup_and_update "$ROOT_DIR/.env"
backup_and_update "$ROOT_DIR/docker-compose.yml"
backup_and_update "$ROOT_DIR/web-ui/.env"
backup_and_update "$ROOT_DIR/web-ui/vite.config.ts"
backup_and_update "$ROOT_DIR/web-ui/server.js"
backup_and_update "$ROOT_DIR/web-ui/collaboration-server.js"
backup_and_update "$ROOT_DIR/web-ui/shared-workspace-server.js"
backup_and_update "$ROOT_DIR/web-ui/src/context/WorkspaceContext.tsx"
backup_and_update "$ROOT_DIR/web-ui/src/context/CollaborationContext.tsx"

echo ""
echo -e "${BLUE}Updating configuration files...${NC}"

# 1. Update root .env file
if [ -f "$ROOT_DIR/.env" ]; then
    sed -i.tmp "s/INTEGRATION_SERVICE_PORT=.*/INTEGRATION_SERVICE_PORT=$INTEGRATION_PORT/" "$ROOT_DIR/.env"
    sed -i.tmp "s/DESIGN_SERVICE_PORT=.*/DESIGN_SERVICE_PORT=$DESIGN_PORT/" "$ROOT_DIR/.env"
    sed -i.tmp "s/CAPABILITY_SERVICE_PORT=.*/CAPABILITY_SERVICE_PORT=$CAPABILITY_PORT/" "$ROOT_DIR/.env"
    rm -f "$ROOT_DIR/.env.tmp"
    echo "  ✓ Updated .env"
fi

# 2. Update docker-compose.yml
if [ -f "$ROOT_DIR/docker-compose.yml" ]; then
    # Use sed to update port mappings
    sed -i.tmp "s/- \"8080:8080\"/- \"$INTEGRATION_PORT:$INTEGRATION_PORT\"/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- \"8081:8081\"/- \"$DESIGN_PORT:$DESIGN_PORT\"/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- \"8082:8082\"/- \"$CAPABILITY_PORT:$CAPABILITY_PORT\"/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- \"8083:8083\"/- \"$AUTH_PORT:$AUTH_PORT\"/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- \"5432:5432\"/- \"$DB_PORT:5432\"/" "$ROOT_DIR/docker-compose.yml"

    # Update PORT environment variables
    sed -i.tmp "s/- PORT=8080/- PORT=$INTEGRATION_PORT/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- PORT=8081/- PORT=$DESIGN_PORT/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- PORT=8082/- PORT=$CAPABILITY_PORT/" "$ROOT_DIR/docker-compose.yml"
    sed -i.tmp "s/- PORT=8083/- PORT=$AUTH_PORT/" "$ROOT_DIR/docker-compose.yml"

    rm -f "$ROOT_DIR/docker-compose.yml.tmp"
    echo "  ✓ Updated docker-compose.yml"
fi

# 3. Update/create web-ui/.env
cat > "$ROOT_DIR/web-ui/.env" << EOF
# Auto-generated by change-ports.sh on $(date)
VITE_INTEGRATION_SERVICE_URL=http://localhost:$INTEGRATION_PORT
VITE_DESIGN_SERVICE_URL=http://localhost:$DESIGN_PORT
VITE_CAPABILITY_SERVICE_URL=http://localhost:$CAPABILITY_PORT
VITE_AUTH_SERVICE_URL=http://localhost:$AUTH_PORT
EOF
echo "  ✓ Updated web-ui/.env"

# 4. Update vite.config.ts
if [ -f "$ROOT_DIR/web-ui/vite.config.ts" ]; then
    sed -i.tmp "s/port: [0-9]*/port: $VITE_PORT/" "$ROOT_DIR/web-ui/vite.config.ts"
    rm -f "$ROOT_DIR/web-ui/vite.config.ts.tmp"
    echo "  ✓ Updated vite.config.ts"
fi

# 5. Update server.js
if [ -f "$ROOT_DIR/web-ui/server.js" ]; then
    sed -i.tmp "s/const PORT = [0-9]*/const PORT = $SPEC_API_PORT/" "$ROOT_DIR/web-ui/server.js"
    rm -f "$ROOT_DIR/web-ui/server.js.tmp"
    echo "  ✓ Updated server.js"
fi

# 6. Update collaboration-server.js
if [ -f "$ROOT_DIR/web-ui/collaboration-server.js" ]; then
    sed -i.tmp "s/const PORT = [0-9]*/const PORT = $COLLABORATION_PORT/" "$ROOT_DIR/web-ui/collaboration-server.js"
    rm -f "$ROOT_DIR/web-ui/collaboration-server.js.tmp"
    echo "  ✓ Updated collaboration-server.js"
fi

# 7. Update shared-workspace-server.js
if [ -f "$ROOT_DIR/web-ui/shared-workspace-server.js" ]; then
    sed -i.tmp "s/const PORT = [0-9]*/const PORT = $SHARED_WS_PORT/" "$ROOT_DIR/web-ui/shared-workspace-server.js"
    rm -f "$ROOT_DIR/web-ui/shared-workspace-server.js.tmp"
    echo "  ✓ Updated shared-workspace-server.js"
fi

# 8. Update WorkspaceContext.tsx
if [ -f "$ROOT_DIR/web-ui/src/context/WorkspaceContext.tsx" ]; then
    sed -i.tmp "s|http://localhost:[0-9]*/api|http://localhost:$SHARED_WS_PORT/api|" "$ROOT_DIR/web-ui/src/context/WorkspaceContext.tsx"
    rm -f "$ROOT_DIR/web-ui/src/context/WorkspaceContext.tsx.tmp"
    echo "  ✓ Updated WorkspaceContext.tsx"
fi

# 9. Update CollaborationContext.tsx
if [ -f "$ROOT_DIR/web-ui/src/context/CollaborationContext.tsx" ]; then
    sed -i.tmp "s|http://localhost:[0-9]*'|http://localhost:$COLLABORATION_PORT'|" "$ROOT_DIR/web-ui/src/context/CollaborationContext.tsx"
    rm -f "$ROOT_DIR/web-ui/src/context/CollaborationContext.tsx.tmp"
    echo "  ✓ Updated CollaborationContext.tsx"
fi

# 10. Update Ideation.tsx hardcoded URLs
if [ -f "$ROOT_DIR/web-ui/src/pages/Ideation.tsx" ]; then
    sed -i.tmp "s|http://localhost:8080/|http://localhost:$INTEGRATION_PORT/|g" "$ROOT_DIR/web-ui/src/pages/Ideation.tsx"
    sed -i.tmp "s|http://localhost:3001/|http://localhost:$SPEC_API_PORT/|g" "$ROOT_DIR/web-ui/src/pages/Ideation.tsx"
    rm -f "$ROOT_DIR/web-ui/src/pages/Ideation.tsx.tmp"
    echo "  ✓ Updated Ideation.tsx"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Port configuration complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "1. Backups saved to: $BACKUP_DIR"
echo ""
echo "2. Fix any remaining hardcoded port references:"
echo "   ${BLUE}./scripts/fix-hardcoded-ports.sh${NC}"
echo ""
echo "3. Rebuild and restart all services:"
echo "   ${BLUE}docker-compose down${NC}"
echo "   ${BLUE}docker-compose build${NC}"
echo "   ${BLUE}docker-compose up -d${NC}"
echo ""
echo "4. For web-ui development server:"
echo "   ${BLUE}cd web-ui${NC}"
echo "   ${BLUE}npm run dev${NC}"
echo ""
echo "5. Restart Node.js servers:"
echo "   ${BLUE}cd web-ui${NC}"
echo "   ${BLUE}node server.js &${NC}"
echo "   ${BLUE}node collaboration-server.js &${NC}"
echo "   ${BLUE}node shared-workspace-server.js &${NC}"
echo ""
echo "Or use the startup script:"
echo "   ${BLUE}./stop.sh && ./start.sh${NC}"
echo ""
echo -e "${GREEN}New service URLs:${NC}"
echo "  Web UI:              http://localhost:$VITE_PORT"
echo "  Integration API:     http://localhost:$INTEGRATION_PORT"
echo "  Design API:          http://localhost:$DESIGN_PORT"
echo "  Capability API:      http://localhost:$CAPABILITY_PORT"
echo "  Auth API:            http://localhost:$AUTH_PORT"
echo "  Collaboration:       http://localhost:$COLLABORATION_PORT"
echo "  Specification API:   http://localhost:$SPEC_API_PORT"
echo "  Shared Workspace:    http://localhost:$SHARED_WS_PORT"
echo "  PostgreSQL:          localhost:$DB_PORT"
echo ""
