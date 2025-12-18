# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MANDATORY: Development Plan Compliance

**You MUST follow the MAIN_SWDEV_PLAN.md for ALL development activities in this project.**

@./CODE_RULES/MAIN_SWDEV_PLAN.md

**Automatic Behaviors:**
1. **For any new feature/capability work**: Follow the Capability Development Plan (Tasks 1-4)
2. **For any enabler implementation**: Follow the Enabler Development Plan (Tasks 1-5 including Testing)
3. **For analyzing existing code**: Use Discovery mode (documentation only, no code changes)
4. **For testing**: Use Gherkin/BDD scenarios linked to requirements
5. **Never auto-approve**: Wait for human approval at stage gates
6. **Always check approval status**: Only proceed with Approval = "Approved" items

**If the user asks you to build, implement, or develop something, you MUST:**
1. Check if specifications exist in the `specifications/` folder
2. If not, ask if they want Discovery mode first
3. Follow the appropriate workflow from MAIN_SWDEV_PLAN.md
4. Create/update capability and enabler documents as required

## Project Overview

UbeCode is a GoLang microservices application for design-driven development using the SAWai (Scaled Agile With AI) methodology. It integrates with Figma and provides capability-driven software development workflows.

## Quick Start Commands

```bash
# Start all services (recommended)
./start.sh

# Check status
./status.sh

# Stop all services
./stop.sh
```

## Build & Test Commands

```bash
# Build all Go services
make build

# Run tests
make test

# Run tests with coverage
make test-coverage

# Lint and format
make lint

# Run individual services (development)
make run-integration    # Port 9080
make run-design         # Port 9081
make run-capability     # Port 9082
```

## Docker Commands

```bash
make docker-build       # Build images
make docker-up          # Start services
make docker-down        # Stop services
make docker-logs        # View logs
```

## Web UI Commands

```bash
cd web-ui
npm install
npm run dev            # Start Vite dev server (port 6173)
npm run build          # Production build
npm run lint           # ESLint
```

## Architecture

```
┌──────────────────────────────────────────┐
│     Web UI (React + Vite) :6173          │
└──────────────────────────────────────────┘
              │
    ┌─────────┼──────────┬──────────┐
    │         │          │          │
┌───▼────┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼──────┐
│ Design │ │Capability│ │Integration│ │  Auth   │
│:9081   │ │ :9082    │ │  :9080    │ │  :9083  │
└────────┘ └──────────┘ └──────────┘ └─────────┘
                │              │
           ┌────▼──────────────▼───┐
           │  PostgreSQL :6432     │
           └───────────────────────┘
```

**Additional Node.js Services:**
- Specification API (:4001) - Markdown file management
- Collaboration Server (:9084) - WebSocket real-time updates
- Shared Workspace Server (:4002) - Workspace sync

## Tech Stack

**Backend:** Go 1.24+, standard `net/http`, PostgreSQL 16
**Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 4, Socket.IO
**Auth:** JWT (golang-jwt/jwt/v5), bcrypt, Google OAuth2

## Key Directory Structure

```
cmd/                    # Service entry points (main.go for each service)
internal/               # Private service logic (handlers, services)
  integration/          # Figma, AI chat, code generation
  auth/                 # JWT, OAuth, user management
pkg/                    # Shared libraries
  client/               # Figma API client
  models/               # Data structures
  middleware/           # HTTP middleware (auth)
  repository/           # Data access layer
web-ui/src/
  api/                  # Axios API clients
  components/           # Ford Design System components
  context/              # React Context (AppContext, AuthContext, WorkspaceContext, etc.)
  pages/                # Route components
```

## Service Ports

| Service | Port |
|---------|------|
| Web UI | 6173 |
| Integration Service | 9080 |
| Design Service | 9081 |
| Capability Service | 9082 |
| Auth Service | 9083 |
| Collaboration Server | 9084 |
| Specification API | 4001 |
| Shared Workspace API | 4002 |
| PostgreSQL | 6432 |

## Environment Variables

Required in `.env`:
- `FIGMA_TOKEN` - Figma personal access token
- `ANTHROPIC_API_KEY` - Claude AI API key
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth2 (optional)

## Key Patterns

**Go HTTP Handlers:**
```go
// Routes in cmd/service-name/main.go
mux.HandleFunc("POST /endpoint", corsMiddleware(handler.HandleEndpoint))

// Handler in internal/service/handler.go
func (h *Handler) HandleEndpoint(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

**React API Calls:**
```typescript
// API clients in web-ui/src/api/client.ts
const integrationClient = axios.create({ baseURL: 'http://localhost:9080' });

// Usage in components
const response = await integrationClient.post('/ai-chat', { messages });
```

**State Management:** Uses React Context API exclusively (AppContext, AuthContext, WorkspaceContext, RoleAccessContext, ThemeContext, CollaborationContext)

## Running Individual Tests

```bash
# Run specific Go test
go test -v ./internal/integration -run TestName

# Run all tests in a package
go test -v ./pkg/client/...
```

## Database Access

```bash
# Connect to PostgreSQL
psql -h localhost -p 6432 -U ubecode_user -d ubecode_db

# Initialize schema (automatic on Docker startup)
# Manual: scripts/init-db.sql
```

## Debugging

```bash
# Check if port is in use
lsof -i :9080

# View service logs
tail -f logs/*.log

# Check all service status
./status.sh
```

## Code Style

- **Go:** Use `gofmt` and `go vet` (run `make lint`)
- **TypeScript:** ESLint with React hooks rules
- **API endpoints:** kebab-case (`/save-specification`)
- **Go exports:** PascalCase, unexported: camelCase
- **React components:** PascalCase

## Documentation References

- `docs/api/API.md` - API endpoint documentation
- `docs/ROLE_BASED_ACCESS_CONTROL.md` - RBAC system
- `docs/REALTIME_COLLABORATION.md` - WebSocket features
- `DEVELOPMENT_GUIDE.md` - SAWai methodology details

## Development Methodology

This project uses the **SAWai (Scaled Agile With AI)** methodology. See the MANDATORY section at the top of this file for the primary reference (MAIN_SWDEV_PLAN.md).

**Key Concepts:**
- **Hierarchy:** Component → Capability → Enabler → Requirement (no Epics)
- **5-Stage Enabler Workflow:** Analysis → Design → Implementation → Testing → Done
- **4-Stage Capability Workflow:** Specification → Definition → Design → Execution
- **Human-in-the-Loop:** Manual approval required at each stage gate
- **Discovery Mode:** For documenting existing code without modification
- **BDD/Gherkin Testing:** Test scenarios linked to requirements

**Supporting References:**
- `CODE_RULES/SAWai.md` - SAWai methodology overview
- `CODE_RULES/CODE_COMPLETE.md` - Implementation best practices

## Approval Workflow

The application includes a manual approval workflow system for capabilities:

**API Endpoints (Capability Service :9082):**
- `POST /approvals/request` - Request approval for a capability stage
- `GET /approvals/pending` - Get all pending approvals
- `POST /approvals/{id}/approve` - Approve a request
- `POST /approvals/{id}/reject` - Reject a request (requires feedback)
- `GET /capabilities/{id}/approvals` - Get approval history

**Frontend Components:**
- `ApprovalQueue` page (`/approvals`) - Manage pending approvals
- `ApprovalSection` component - Add to capability forms
- `ApprovalStatusBadge` component - Display approval status

**Database Migration:**
Run `scripts/migration_approval.sql` to add approval tables.
