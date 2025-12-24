# IntentR

> **Intent-Centered, Engineering-Driven Notation for Transformation**

An open-source platform for specification-first software development in the age of AI.

### Why IntentR Exists

AI can generate code faster than humans ever could—but speed without direction is chaos. Without guardrails, AI-assisted development drifts from intent: features creep, architectures erode, and systems become what no one asked for.

**IntentR ensures that what gets built is what was intended.**

By capturing human intent as structured, engineering-grade specifications *before* AI generates code, IntentR keeps development aligned with purpose—preventing the drift that turns promising projects into unmaintainable accidents.

---

## Philosophy

**INTENT** is a philosophy that asserts: *human intent, captured with engineering rigor, is the primary determinant of system correctness, scalability, and speed in the age of AI.*

### The Acronym

| Letters | Meaning |
|---------|---------|
| **INT** | Intent-Centered |
| **E** | Engineering-Driven |
| **N** | Notation for |
| **T** | Transformation |

### The 7 Principles

| # | Principle | Insight |
|---|-----------|---------|
| 1 | **Intent precedes implementation** | If intent is unclear, execution will amplify the error |
| 2 | **Specification is a first-class artifact** | What cannot be specified precisely cannot be reliably built |
| 3 | **Notation over narration** | Precision is kindness to both humans and machines |
| 4 | **Humans decide, AI executes** | Authority stays with humans; leverage comes from machines |
| 5 | **Derivation over construction** | Reproducibility beats craftsmanship at scale |
| 6 | **Precision before velocity** | Speed emerges from clarity, not shortcuts |
| 7 | **Transformation is continuous** | A system that cannot preserve intent cannot scale |

---

## Quick Start

### Prerequisites
- Git, Node.js (LTS), Docker

### Install & Run

```bash
git clone https://github.com/jareynolds/intentr.git
cd intentr
./start.sh
```

### Open
```
http://localhost:6175
```

---

## The INTENT Framework

A six-phase workflow for specification-first development:

```
Intent → Specification → UI-Design → Implementation → Control-Loop → Evolution
```

### Phases

| Phase | Purpose | Key Activities |
|-------|---------|----------------|
| **Intent** | Define what and why | Vision, Ideation, Storyboard |
| **Specification** | Define the scope | Capabilities, Enablers, Story Map |
| **UI-Design** | Define how it looks | UI Assets, Framework, Styles, Designer |
| **Implementation** | Build the system | System Config, AI Principles, Code |
| **Control-Loop** | Validate quality | Testing, BDD/Gherkin Scenarios |
| **Evolution** | Continuous refinement | Feedback, Iteration, Improvement |

### Hierarchy

```
Strategic Themes
    └── Components (Systems/Applications)
            └── Capabilities (Business Functions)
                    └── Enablers (Technical Implementations)
                            └── Requirements (Specific Needs)
```

**No Epics needed** — AI handles the complexity that traditionally required Epic-level grouping.

### Human-in-the-Loop

Every phase includes an **approval gate** for human oversight. Rejections are tracked and surfaced in navigation.

---

## IntentR Platform

IntentR operationalizes the INTENT framework as a unified web platform.

### Core Features

| Feature | Description |
|---------|-------------|
| **Workspace Management** | Isolated project environments with configuration |
| **Capability Tracking** | Define and track capabilities, enablers, requirements |
| **Design Integration** | Connect with Figma, manage UI assets and design systems |
| **AI Governance** | 5 enforcement levels from Advisory to Zero-Tolerance |
| **Phase Approvals** | Human-in-the-loop gates at each phase |
| **Real-time Collaboration** | Workspace sharing with cursor tracking |
| **BDD Test Generation** | AI-powered Gherkin scenario generation |
| **Story Mapping** | Visual narrative and requirement traceability |

### AI Governance Levels

| Level | Name | Use Case |
|-------|------|----------|
| 1 | Awareness (Advisory) | Prototyping, learning |
| 2 | Guided Recommendations | Development, iteration |
| 3 | Enforced with Warnings | Production, quality-critical |
| 4 | Strict Enforcement | Mission-critical, compliance |
| 5 | Zero-Tolerance | Safety-critical systems |

### Architecture

```
┌──────────────────────────────────────────┐
│         Web UI (React + Vite)            │
│              Port 6175                   │
└──────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐ ┌───────▼───────┐ ┌─────▼─────┐
│ Design │ │  Capability   │ │Integration│
│ :9081  │ │    :9082      │ │   :9080   │
└────────┘ └───────────────┘ └───────────┘
    │               │               │
    └───────────────┼───────────────┘
                    │
           ┌────────▼────────┐
           │   PostgreSQL    │
           │     :6432       │
           └─────────────────┘
```

**Additional Services:**
- Auth Service (:9083) — JWT authentication, Google OAuth
- Claude Proxy (:9085) — AI-assisted code generation
- Specification API (:4001) — Markdown file management
- Collaboration Server (:9084) — Real-time WebSocket updates

---

## Application URLs

### By Phase

| Phase | Pages | URLs |
|-------|-------|------|
| **Intent** | Vision, Ideation, Storyboard, Approval | `/vision`, `/ideation`, `/storyboard`, `/intent-approval` |
| **Specification** | Capabilities, Enablers, Story Map, Approval | `/capabilities`, `/enablers`, `/story-map`, `/specification-approval` |
| **UI-Design** | Assets, Framework, Styles, Designer, Approval | `/designs`, `/ui-framework`, `/ui-styles`, `/ui-designer`, `/system-approval` |
| **Implementation** | System, AI Principles, Code, Run, Approval | `/system`, `/ai-principles`, `/code`, `/run`, `/implementation-approval` |
| **Control-Loop** | Testing, Approval | `/testing`, `/control-loop-approval` |

### Other Pages

| Page | URL |
|------|-----|
| Welcome | `/` |
| Workspaces | `/workspaces` |
| AI Chat | `/ai-chat` |
| Integrations | `/integrations` |
| Settings | `/settings` |
| Admin | `/admin` |

---

## Development

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- Make (recommended)

### Environment Setup

Create `.env` in root:

```bash
# Required
FIGMA_TOKEN=your_figma_token
ANTHROPIC_API_KEY=your_anthropic_key
JWT_SECRET=your_jwt_secret

# Optional (Google OAuth)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Database (defaults)
DB_HOST=localhost
DB_PORT=6432
DB_USER=intentr_user
DB_PASSWORD=intentr_pass
DB_NAME=intentr_db
```

### Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | Start all services |
| `./stop.sh` | Stop all services |
| `./status.sh` | Check service status |
| `make build` | Build Go services |
| `make test` | Run tests |
| `make lint` | Run linter |
| `make docker-up` | Start via Docker Compose |
| `make docker-down` | Stop Docker services |

### Project Structure

```
intentr/
├── web-ui/                 # React frontend
│   ├── src/
│   │   ├── api/           # Backend clients
│   │   ├── components/    # UI components
│   │   ├── context/       # React Context
│   │   └── pages/         # Page components
├── cmd/                    # Service entry points
│   ├── auth-service/
│   ├── design-service/
│   ├── capability-service/
│   ├── integration-service/
│   └── claude-proxy/
├── internal/               # Private service logic
├── pkg/                    # Shared libraries
├── workspaces/             # User workspaces
├── CODE_RULES/             # INTENT methodology
│   └── MAIN_SWDEV_PLAN.md
└── scripts/                # Utility scripts
```

---

## API Reference

### Integration Service (:9080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/figma/files/{key}` | Get Figma file |
| POST | `/ai-chat` | AI assistant |
| POST | `/generate-test-scenarios` | BDD generation |

### Capability Service (:9082)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/capabilities` | List capabilities |
| POST | `/approvals/request` | Request approval |
| GET | `/approvals/pending` | Pending approvals |
| POST | `/approvals/{id}/approve` | Approve |
| POST | `/approvals/{id}/reject` | Reject |

### Auth Service (:9083)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register user |
| POST | `/login` | Login (JWT) |
| POST | `/google/login` | Google OAuth |
| GET | `/me` | Current user |

*See [docs/api/API.md](docs/api/API.md) for complete API documentation.*

---

## Contributing

### Workflow

1. Review [CODE_RULES/MAIN_SWDEV_PLAN.md](CODE_RULES/MAIN_SWDEV_PLAN.md)
2. Check specifications in `specifications/` folder
3. Follow Capability → Enabler → Requirement hierarchy

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation |

### Commits

```
<type>: <description>

Types: feat, fix, docs, style, refactor, test, chore
```

### Pull Requests

1. Fork → Branch → Test → Lint → Commit → Push → PR
2. Include: description, issue link, screenshots (UI changes)

---

## Security

**Report vulnerabilities privately:**
- Email: intentrsoftware@gmail.com
- Do NOT open public issues
- Allow 48 hours for response

---

## License

**Dual-licensed:**

| License | Use Case |
|---------|----------|
| **AGPLv3** | Open source — must release modifications |
| **Commercial** | Proprietary use, SaaS, support/SLA |

See [LICENSE.AGPL](LICENSE.AGPL) and [LICENSE.COMMERCIAL](LICENSE.COMMERCIAL).

Contact: intentrsoftware@gmail.com

---

## Resources

- [INTENT Development Plan](CODE_RULES/MAIN_SWDEV_PLAN.md) — Complete methodology
- [CLAUDE.md](CLAUDE.md) — AI assistant context
- [API Documentation](docs/api/API.md)
- [RBAC Documentation](docs/ROLE_BASED_ACCESS_CONTROL.md)
- [Collaboration Features](docs/REALTIME_COLLABORATION.md)

---

**Project:** [github.com/jareynolds/intentr](https://github.com/jareynolds/intentr)
**Contact:** intentrsoftware@gmail.com
