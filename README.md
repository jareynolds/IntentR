
# IntentR - Design- and Capability-Driven Software Development

## What it is and why it matters
IntentR is an open-source platform for DESIGN- and CAPABILITY-driven software development, treating capabilities as the structural backbone that connects specification, design, delivery, and AI governance.


## Why IntentR Exists
Modern software teams operate across an increasingly fragmented toolchain—design systems, backlogs, repositories, AI assistants, and collaboration tools—none of which share a common understanding of what the system is actually intended to do.

This fragmentation was tolerable when delivery speed was constrained by human implementation. With AI-assisted development, that constraint has shifted.

As AI accelerates code generation, the primary bottleneck is no longer execution—it is specification.
Most existing agile and scaled agile frameworks were not designed for this reality. They optimize for managing work, not for expressing intent, governing AI behavior, or preserving architectural clarity at scale.

IntentR is built around INTENT (Scaled Agile With AI)—an evolution of scaled agile practices specifically designed for AI-amplified software development.

### What is INTENT
**INTENT (Scaled Agile With AI)** is an evolution of traditional scaled agile frameworks designed specifically for AI-assisted development. Key principles:

- **Specification-First**: With AI accelerating code generation, the bottleneck shifts to specification quality. INTENT emphasizes thorough Vision, Ideation, and Storyboarding before implementation.
- **Five-Phase Workflow**:
  1. **CONCEPTION** - Define what to build (Product Vision, Ideation, Storyboard)
  2. **DEFINITION** - Define the scope (Capabilities, Enablers, Narrative/Story Map)
  3. **DESIGN** - Define how it looks (UI Assets, UI Framework, UI Styles, UI Designer)
  4. **TESTING** - Define quality criteria (Test Scenarios with AI-generated BDD/Gherkin)
  5. **IMPLEMENTATION** - Build and run (System, AI Principles, Code, Run)
- **AI-Amplified Delivery**: Traditional sprint velocities are superseded by AI-assisted generation, making well-defined requirements the primary success factor.
- **Simplified Hierarchy**: Capabilities → Enablers → Requirements (no Epics needed with AI assistance)
- **Phase Approvals**: Each phase includes a dedicated approval gate for human-in-the-loop governance


## Quick Start
IntentR is designed to be explored quickly, without requiring deep setup or prior framework knowledge.
Prerequisites
Git
Node.js (LTS)
Docker (recommended for local and cloud environments)
1. Clone the Repository
git clone https://github.com/jareynolds/intentr.git
cd intentr
2. Set Up Your Development Environment
IntentR provides environment-specific setup scripts to streamline local and cloud development.
Choose the script that matches your environment:
./setup-osx-environment.sh
./setup-aws-environment.sh
(more env coming in the future)
Each script installs required dependencies, configures services, and prepares the environment for running IntentR. Refer to the script contents if you need to customize or extend the setup for your environment.
3. Start the Platform
./start.sh
This launches:
+ The IntentR web UI
+ Core backend services
+ A local development workspace
4. Open the Web Interface
http://localhost:6175
You can now:
- Create a workspace
- Define capabilities and enablers
- Capture specification and design artifacts
- Generate AI-powered test scenarios
- Explore how capabilities structure delivery and AI governance
5. Explore the INTENT Workflow
Begin in the Conception phase:
- Define vision, ideation, and storyboards
- Get phase approval before proceeding

Then progress through:
- **Definition** → Capabilities, Enablers, and Narrative/Story Map
- **Design** → UI assets, frameworks, styles, and visual design
- **Testing** → AI-generated BDD/Gherkin test scenarios
- **Implementation** → System configuration, AI principles, code, and runtime

Each phase includes an approval gate for human oversight. Rejections are tracked and surfaced in the sidebar navigation.
6. Make Your First Contribution (Optional)
Interested in contributing?
Browse issues labeled good-first-issue
Review the architecture overview
Open a discussion or submit a pull request
IntentR is built in the open and welcomes contributions across engineering, design systems, and AI governance.


## Env
A GoLang-based microservices application for massively streamlined comprehensive software development using the **INTENT (Scaled Agile With AI)** methodology.

## INTENT Principles

INTENT is based on several core principles:

**Specification-first development**
When AI can generate implementation rapidly, the quality of vision, ideation, and specification becomes the dominant success factor.

**A structured, five-phase workflow**
INTENT formalizes the lifecycle of software intent and delivery into five explicit phases:
- **Conception** — Define what to build (Vision, Ideation, Storyboarding)
- **Definition** — Define the scope (Capabilities, Enablers, Narrative)
- **Design** — Define how it looks and behaves (UI assets, frameworks, styles, designer tools)
- **Testing** — Define quality criteria (BDD/Gherkin test scenarios, AI-assisted analysis)
- **Implementation** — Build and run (System, AI Principles, Code, Runtime)

**Capability-driven hierarchy**
INTENT simplifies traditional agile hierarchies by treating capabilities as the primary unit of intent, with enablers representing technical implementations and requirements serving as execution specifications. No Epics needed—AI handles the complexity that traditionally required Epic-level grouping.

**AI-amplified delivery with governance**
AI is not an add-on tool, but a governed participant in the development process, guided by explicit principles, constraints, and traceability back to the capabilities it affects. Each phase includes approval gates for human oversight.

**Phase Approvals**
Every phase includes a dedicated approval page where stakeholders can review, approve, or reject items before progressing to the next phase. Rejections are tracked and surfaced in the sidebar navigation.

Existing tools struggle to support this model because they are artifact-centric—tickets, boards, files, and pipelines—rather than capability-centric.
IntentR exists to provide a unified, open-source platform that operationalizes INTENT by making capabilities the first-class abstraction that connects specification, design, testing, delivery, collaboration, and AI governance in a single, coherent system.

## Overview

IntentR is a web application that facilitates capability-driven software development by providing:

- **Web UI** - Modern React-based interface with design system
- **Design Service** - Manages design artifacts and versioning
- **Capability Service** - Tracks capabilities, enablers, and requirements with approval workflows
- **Integration Service** - Connects with external design tools (Figma) and AI services
- **Claude Proxy Service** - Executes Claude CLI commands for AI-assisted development
- **Role-Based Access Control** - Granular permission management for all pages
- **Real-time Collaboration** - Workspace sharing and cursor tracking
- **AI Governance** - Configurable AI principles and presets (5 enforcement levels)
- **Phase Approval Workflow** - Human-in-the-loop approval gates for each development phase
- **AI-Powered Testing** - Automatic BDD/Gherkin test scenario generation from enablers
- **Narrative/Story Map** - Visual story mapping for requirement traceability

## AI-Powered Features

IntentR integrates AI throughout the development workflow:

- **AI Chat Assistant** - Context-aware AI assistant for development questions and guidance
- **Test Scenario Generation** - Automatically generates BDD/Gherkin test scenarios from enabler specifications
- **Ideation Analysis** - AI-assisted analysis of ideation cards and concepts
- **Vision Analysis** - AI-powered refinement of product vision statements
- **Storyboard Enhancement** - AI suggestions for storyboard improvements
- **Code Generation** - AI-assisted code generation from specifications (via Claude CLI)

**AI Governance Levels:**
| Level | Name | Use Case |
|-------|------|----------|
| 1 | Awareness (Advisory) | Prototyping, learning environments |
| 2 | Guided Recommendations | Development, iterative work |
| 3 | Enforced with Warnings | Production, quality-critical systems |
| 4 | Strict Enforcement | Mission-critical, compliance-heavy |
| 5 | Zero-Tolerance | Safety-critical systems |

## Architecture

The application follows a microservices architecture pattern where each service:
- Runs independently in its own container
- Communicates via REST APIs
- Can be scaled independently
- Has its own data store (when needed)

```
┌──────────────────────────────────────────┐
│         Web UI (React + Vite)            │
│     Ford Design System - Port 6175       │
└──────────────────────────────────────────┘
              │
    ┌─────────┼─────────┬─────────┬─────────┐
    │         │         │         │         │
┌───▼────┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼─────┐ ┌──▼──────┐
│ Design │ │Capability│ │Integration│ │ Auth  │ │ Claude  │
│Service │ │ Service  │ │ Service   │ │Service│ │  Proxy  │
│ :9081  │ │  :9082   │ │  :9080    │ │ :9083 │ │  :9085  │
└────────┘ └────┬─────┘ └─────┬─────┘ └───┬───┘ └────┬────┘
                │              │           │         │
           ┌────▼──────────────▼───────────▼─────────┘
           │      PostgreSQL Database :6432           │
           └──────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
               ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
               │Figma API│ │Claude│ │Anthropic│
               └─────────┘ │ CLI  │ │  API    │
                           └──────┘ └─────────┘
```

## Prerequisites

- Go 1.21 or higher
- Node.js 18+ or 20+ (for Web UI)
- Docker and Docker Compose
- Make (optional, but recommended)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/jareynolds/intentr.git
cd intentr
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Required
FIGMA_TOKEN=your_figma_personal_access_token
ANTHROPIC_API_KEY=your_anthropic_api_key
JWT_SECRET=your_jwt_signing_secret

# Optional - Google OAuth (for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database (defaults shown - override if needed)
DB_HOST=localhost
DB_PORT=6432
DB_USER=intentr_user
DB_PASSWORD=intentr_pass
DB_NAME=intentr_db
```

**Getting API Keys:**

- **Figma Token**: Go to Figma Settings > Account > Personal access tokens > Generate new token
- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com/)
- **JWT Secret**: Generate a secure random string (e.g., `openssl rand -hex 32`)
- **Google OAuth**: Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### 3. Quick Start (Recommended)

Use the provided scripts to start everything:

```bash
# Start all services (backend + web UI)
./start.sh

# Check status of all services
./status.sh

# Stop all services
./stop.sh
```

The start script will:
- ✅ Check prerequisites (Docker, Node.js)
- ✅ Install Web UI dependencies automatically
- ✅ Start PostgreSQL database
- ✅ Start backend services in Docker (Integration, Design, Capability, Auth)
- ✅ Start Node.js API servers (Specification, Collaboration, Shared Workspace)
- ✅ Start Web UI development server (Vite)
- ✅ Display all service URLs and management commands

**Troubleshooting Tips:**
- Run `./status.sh` to check service health
- Check logs in `logs/` directory for errors
- Ensure Docker is running before starting services
- Use `lsof -i :PORT` to check for port conflicts

### 4. Build and Run with Docker Compose (Backend Only)

```bash
# Build all services
make docker-build

# Start all services
make docker-up

# View logs
make docker-logs

# Stop all services
make docker-down
```

### 5. Run Web UI Separately

```bash
cd web-ui
npm install
npm run dev
```

### 6. Run Services Locally (Development)

```bash
# Terminal 1 - Integration Service
make run-integration

# Terminal 2 - Design Service
make run-design

# Terminal 3 - Capability Service
make run-capability

# Terminal 4 - Web UI
cd web-ui && npm run dev
```

## Application URLs

After running `./start.sh`, the application will be available at:

### Frontend (Port 6175)

- **Web UI**: `http://localhost:6175/`
- **Dashboard**: `http://localhost:6175/`
- **Workspaces**: `http://localhost:6175/workspaces`

**Phase 1: CONCEPTION**
- Product Vision: `http://localhost:6175/vision`
- Ideation: `http://localhost:6175/ideation`
- Storyboard: `http://localhost:6175/storyboard`
- Phase Approval: `http://localhost:6175/conception-approval`

**Phase 2: DEFINITION**
- Capabilities: `http://localhost:6175/capabilities`
- Enablers: `http://localhost:6175/enablers`
- Narrative (Story Map): `http://localhost:6175/story-map`
- Phase Approval: `http://localhost:6175/definition-approval`

**Phase 3: DESIGN**
- UI Assets: `http://localhost:6175/designs`
- UI Framework: `http://localhost:6175/ui-framework`
- UI Styles: `http://localhost:6175/ui-styles`
- UI Designer: `http://localhost:6175/ui-designer`
- Phase Approval: `http://localhost:6175/design-approval`

**Phase 4: TESTING**
- Test Scenarios: `http://localhost:6175/testing`
- Phase Approval: `http://localhost:6175/testing-approval`

**Phase 5: IMPLEMENTATION**
- System: `http://localhost:6175/system`
- AI Principles: `http://localhost:6175/ai-principles`
- Code: `http://localhost:6175/code`
- Run: `http://localhost:6175/run`
- Phase Approval: `http://localhost:6175/implementation-approval`

**Other Pages**
- AI Assistant: `http://localhost:6175/ai-chat`
- Integrations: `http://localhost:6175/integrations`
- Settings: `http://localhost:6175/settings`
- Admin Panel: `http://localhost:6175/admin` (Admins only)

## API Endpoints

### Integration Service (Port 9080)

- `GET /health` - Health check
- `GET /figma/files/{fileKey}` - Get Figma file details
- `GET /figma/files/{fileKey}/comments` - Get Figma file comments
- `POST /analyze-application` - Analyze application structure
- `POST /export-ideation` - Export ideation cards
- `POST /ai-chat` - AI chat for assistance and analysis
- `POST /generate-test-scenarios` - AI-powered BDD/Gherkin test scenario generation

### Design Service (Port 9081)

- `GET /health` - Health check
- `GET /designs` - List designs

### Capability Service (Port 9082)

- `GET /health` - Health check
- `GET /capabilities` - List capabilities
- `POST /approvals/request` - Request approval for a capability stage
- `GET /approvals/pending` - Get all pending approvals
- `POST /approvals/{id}/approve` - Approve a request
- `POST /approvals/{id}/reject` - Reject a request (requires feedback)
- `GET /capabilities/{id}/approvals` - Get approval history
- `GET /approval-permissions/{role}` - Get approval permissions for a role

### Auth Service (Port 9083)

- `GET /health` - Health check
- `POST /register` - User registration
- `POST /login` - User login (returns JWT)
- `POST /google/login` - Google OAuth login
- `GET /me` - Get current user info (requires auth)
- `GET /users` - List users (admin only)
- `PUT /users/{id}/role` - Update user role (admin only)

### Claude Proxy Service (Port 9085)

- `GET /health` - Health check
- `POST /execute` - Execute Claude CLI command in workspace
- `POST /run-app` - Run application in workspace
- `POST /stop-app` - Stop running application
- `GET /check-app-status` - Check application status

### Node.js APIs

- **Specification API** (Port 4001): `http://localhost:4001/api/health`
  - Manages markdown specification files (capabilities, enablers, requirements)
- **Collaboration Server** (Port 9084): WebSocket server for real-time collaboration
- **Shared Workspace API** (Port 4002): `http://localhost:4002/api/health`

### Database

- **PostgreSQL** (Port 6432): `localhost:6432` (user: intentr_user, db: intentr_db)

## Testing

```bash
# Run all Go tests
make test

# Run tests with coverage
make test-coverage

# Run specific test
go test -v ./internal/integration -run TestName

# Run frontend tests
cd web-ui && npm test
```

### Test Frameworks

- **Go**: Standard `testing` package + `testify` for assertions
- **BDD/Gherkin**: `godog` for behavior-driven tests
- **React**: Jest + React Testing Library

## Database Setup

The database is automatically initialized when using Docker. For manual setup:

```bash
# Connect to PostgreSQL (via Docker)
docker compose exec postgres psql -U intentr_user -d intentr_db

# Initialize schema manually (if needed)
docker compose exec -T postgres psql -U intentr_user -d intentr_db < scripts/init-db.sql

# Run approval workflow migration (REQUIRED for phase approvals)
docker compose exec -T postgres psql -U intentr_user -d intentr_db < scripts/migration_approval.sql
```

**Note**: The approval workflow migration creates tables for:
- `capability_approvals` - Tracks approval requests per capability stage
- `approval_workflow_rules` - Role-based approval permissions
- `approval_audit_log` - Audit trail of all approval actions

## Development

### Project Structure

```
intentr/
├── web-ui/                # React Web UI
│   ├── src/
│   │   ├── api/          # Backend API clients
│   │   ├── components/   # Ford Design System components
│   │   ├── context/      # React Context (state management)
│   │   ├── pages/        # Page components (organized by phase)
│   │   └── styles/       # Ford Design System CSS
│   ├── package.json
│   └── README.md
├── cmd/                   # Main applications
│   ├── auth-service/     # Authentication service
│   ├── design-service/   # Design artifact service
│   ├── capability-service/ # Capability & approval service
│   ├── integration-service/ # Figma & AI integration
│   ├── claude-proxy/     # Claude CLI proxy service
│   └── ubecli/           # IntentR CLI tool
├── internal/              # Private application code
│   ├── auth/             # Auth handlers & logic
│   ├── design/           # Design handlers
│   ├── capability/       # Capability handlers
│   └── integration/      # Integration handlers (AI chat, Figma)
├── pkg/                   # Public library code
│   ├── client/           # Figma API client
│   ├── models/           # Data structures
│   ├── middleware/       # HTTP middleware (auth, CORS)
│   └── repository/       # Data access layer
├── workspaces/           # User workspaces (capabilities, enablers, tests)
├── CODE_RULES/           # INTENT methodology documentation
│   └── MAIN_SWDEV_PLAN.md # Main development plan
├── scripts/              # Build and utility scripts
│   ├── init-db.sql       # Initial database schema
│   └── migration_approval.sql # Approval workflow tables
├── docs/                  # Documentation
├── start.sh              # Start all services
├── stop.sh               # Stop all services
├── status.sh             # Check service status
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── go.mod
```

### Code Style

This project follows standard Go conventions:

- Use `gofmt` for formatting
- Use `go vet` for static analysis
- Follow [Effective Go](https://golang.org/doc/effective_go) guidelines
- Document all exported functions and types

### Building

```bash
# Build all services
make build

# Build specific service
go build -o bin/integration-service ./cmd/integration-service
```

### Linting

```bash
# Run linter and formatter
make lint
```

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI assistant context and quick reference
- [INTENT Development Plan](CODE_RULES/MAIN_SWDEV_PLAN.md) - Complete INTENT methodology and workflows
- [API Documentation](docs/api/API.md) - API specifications
- [Role-Based Access Control](docs/ROLE_BASED_ACCESS_CONTROL.md) - RBAC system documentation
- [Real-time Collaboration](docs/REALTIME_COLLABORATION.md) - Collaboration features
- [Contributions Guide](CONTRIBUTIONS.md) - How to contribute to IntentR

## INTENT Framework

This project follows the **INTENT (Scaled Agile With AI)** capability-driven approach:

**Hierarchy:**
1. **Strategic Themes** - Business objectives and direction
2. **Components** - Systems or applications
3. **Capabilities** - Business functions that deliver value
4. **Enablers** - Technical implementations that realize capabilities
5. **Requirements** - Specific functional and non-functional needs

**Five-Phase Workflow with Approval Gates:**
1. **CONCEPTION** → Vision, Ideation, Storyboard → **Phase Approval**
2. **DEFINITION** → Capabilities, Enablers, Narrative → **Phase Approval**
3. **DESIGN** → UI Assets, Framework, Styles, Designer → **Phase Approval**
4. **TESTING** → AI-generated BDD/Gherkin test scenarios → **Phase Approval**
5. **IMPLEMENTATION** → System, AI Principles, Code, Run → **Phase Approval**

**Key Differences from Traditional Agile**:
- **No Epics**: Capabilities and Enablers are sufficient when AI handles implementation complexity
- **Specification Quality**: The bottleneck shifts from execution to specification quality
- **Human-in-the-Loop**: Every phase includes approval gates for governance
- **AI Governance**: Configurable AI principles with 5 enforcement levels

See [CODE_RULES/MAIN_SWDEV_PLAN.md](CODE_RULES/MAIN_SWDEV_PLAN.md) for the complete methodology.

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

This project follows the **INTENT methodology**. Before implementing features:
1. Review [CODE_RULES/MAIN_SWDEV_PLAN.md](CODE_RULES/MAIN_SWDEV_PLAN.md) for the development workflow
2. Check if specifications exist in `specifications/` folder
3. Follow the Capability → Enabler → Requirement hierarchy

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch (if used)
- `feature/*` - New features (`feature/add-dark-mode`)
- `fix/*` - Bug fixes (`fix/login-error`)
- `docs/*` - Documentation updates

### Commit Message Convention

```
<type>: <short description>

<optional body>

<optional footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example: `feat: add workspace export functionality`

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`make test`)
5. Run linting (`make lint`)
6. Commit your changes with descriptive messages
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes

### Code Style

- **Go**: Follow `gofmt` and `go vet` standards
- **TypeScript/React**: ESLint with React hooks rules
- **API endpoints**: Use kebab-case (`/save-specification`)
- **Components**: Use PascalCase (`MyComponent.tsx`)

### Testing Requirements

- Write unit tests for new functions
- Write integration tests for API endpoints
- Use BDD/Gherkin scenarios for feature tests (see `CODE_RULES/MAIN_SWDEV_PLAN.md`)
- Maintain >80% coverage for new code

## Security

### Reporting Vulnerabilities

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email security concerns to: intentrsoftware@gmail.com
3. Include detailed steps to reproduce
4. Allow 48 hours for initial response

### Security Best Practices

- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Keep dependencies updated (`go mod tidy`, `npm audit fix`)
- Review the [OWASP Top 10](https://owasp.org/www-project-top-ten/) for common vulnerabilities

## License

# IntentR — Dual Licensed (AGPLv3 or Commercial)

IntentR is available under a **dual-licensing model**:

### 🔓 Open Source License: AGPLv3
You may use IntentR under the GNU Affero General Public License v3.
If you modify IntentR or build a system that uses it and make it available
to others (including over a network), you **must** release your complete
source code under the AGPLv3.

See: LICENSE.AGPL

### 💼 Commercial License
If your company wants to:
- keep its source code proprietary,
- embed IntentR into closed-source products,
- run IntentR as part of a SaaS platform without releasing your code,
- receive support, SLA, or custom terms,

you must purchase a **commercial license**.

See: LICENSE.COMMERCIAL
Contact: intentrsoftware@gmail.com

### ⚠️ You must choose *one* license.
Using IntentR without complying with AGPLv3 or without a commercial license
is a violation of copyright law.


## Contact


Project Link: [https://github.com/jareynolds/intentr](https://github.com/jareynolds/intentr)
Email: intentrsoftware@gmail.com


## Acknowledgments

- INTENT methodology - Scaled Agile With AI (inspired by SAFe, evolved for AI-assisted development)
- [Figma API](https://www.figma.com/developers/api)
- [Go Programming Language](https://golang.org/)
- [Docker](https://www.docker.com/)
