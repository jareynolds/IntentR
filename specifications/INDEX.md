# UbeCode Enhanced Specifications Index

**Generated**: November 24, 2025
**Version**: 2.0 (Enhanced Organization)
**Total Files**: 89 specification files + 4 code files

## Quick Navigation

- [Overview](#overview)
- [Capabilities](#-capabilities-6-files)
- [Enablers](#-enablers-27-files)
- [Storyboards](#-storyboards-26-files)
- [Dependencies](#-dependencies-1-file)
- [Platform Documentation](#-platform-documentation-15-files)
- [Other Documentation](#-other-documentation-12-files)
- [Code Files](#-code-files-4-files)
- [File Organization](#file-organization)
- [Statistics](#statistics)
- [Getting Started](#-getting-started)

---

## Overview

This index catalogs all reverse-engineered specifications from the UbeCode application. Files have been reorganized with standardized naming conventions:

- **CAP-XXXXXX.md** - Business capabilities
- **ENB-XXXXXX.md** - Technical enablers
- **STORY-name.md** - User story documentation
- **DEP-name.md** - Dependency documentation
- **OTHER-name.md** - Supporting documentation

**Reverse Engineering Date**: November 24, 2025
**Source**: ./specifications folder
**Output**: ./enh-specifications, ./enh-code, ./enh-assets folders
**AI Policy**: Preset 2 (Guided Recommendations)

---

## 🎯 Capabilities (6 files)

### CAP-582341: Figma Integration Management
**File**: [CAP-582341.md](./CAP-582341.md)
**Component**: Integration Service
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: Enable external design tool connectivity and synchronization with Figma API

**Enablers**:
- ENB-748192 (Figma API Client)
- ENB-837461 (File Retrieval Service)
- ENB-926583 (Comment Retrieval Service)
- ENB-451729 (Integration HTTP Handlers)

**Implementation**: Port 8080 - Go microservice with Figma REST API integration

---

### CAP-694827: Design Artifact Management
**File**: [CAP-694827.md](./CAP-694827.md)
**Component**: Design Service
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: Manage design artifacts, versions, and metadata from external design tools

**Enablers**:
- ENB-512834 (Design Service Endpoint)
- ENB-639271 (Health Monitoring)

**Implementation**: Port 8081 - Go microservice for design artifact storage

---

### CAP-318652: Capability Tracking
**File**: [CAP-318652.md](./CAP-318652.md)
**Component**: Capability Service
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: Track SAFe capabilities, features, and user stories to support scaled agile framework

**Enablers**:
- ENB-724938 (Capability Service Endpoint)
- ENB-861452 (Health Monitoring)

**Implementation**: Port 8082 - Go microservice for SAFe capability tracking

---

### CAP-471395: Container Orchestration
**File**: [CAP-471395.md](./CAP-471395.md)
**Component**: UbeCode Orchestrator
**Priority**: Medium
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: Manage lifecycle of application containers and services with graceful startup/shutdown

**Enablers**:
- ENB-283746 (Container Interface Definition)
- ENB-592183 (Orchestrator Service)
- ENB-147825 (Health Check System)
- ENB-836419 (Graceful Shutdown Management)

**Implementation**: Core infrastructure - Go-based container lifecycle manager

---

### CAP-847293: UI Designer
**File**: [CAP-847293.md](./CAP-847293.md)
**Component**: Web UI
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: AI-powered UI design generation through DELM integration for mockups, icons, logos, illustrations, and AI images

**Enablers**:
- ENB-958471 (DELM Service Integration)

**Implementation**: Port 3005 - Python-based AI image generation service

---

### CAP-944623: Display UI
**File**: [CAP-944623.md](./CAP-944623.md)
**Component**: Web UI
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Required

**Purpose**: Complete design-driven development workflow management system with React UI

**Features**:
- Login page with authentication
- Main navigation sidebar
- Workspace creation and management
- Interactive storyboard canvas with drag-and-drop
- Capabilities section for defining requirements
- AI chat interface for code generation

**Enablers**: 14 enablers (ENB-173294 through ENB-942158)

**Implementation**: Port 3000/3001 - React/TypeScript web application

---

### CAP-759314: LLM Request Interception (ModelProxy)
**File**: [CAP-759314.md](./CAP-759314.md)
**Component**: ModelProxy / UbeCLI
**Priority**: High
**Status**: Implemented ✅
**Analysis Review**: Not Required

**Purpose**: Generic, LLM-agnostic system for intercepting, transforming, and forwarding LLM requests with automatic context injection and SAWai rule enforcement

**Features**:
- UbeCLI interactive shell with Claude CLI-like experience
- Prework pipeline for prompt transformation
- Automatic injection of CLAUDE.md and MAIN_SWDEV_PLAN.md
- Pluggable LLM adapter architecture (Claude CLI, Claude API, OpenAI, Ollama)
- SAWai approval workflow enforcement
- Configuration via .ubecli.yaml

**Enablers**: 5 enablers (ENB-759321 through ENB-759325)

**Implementation**: Go-based CLI tool with HTTP API

---

## ⚙️ Enablers (32 files)

### Figma Integration Management Enablers (4 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-748192 | Figma API Client | [ENB-748192.md](./ENB-748192.md) | Implemented | High |
| ENB-837461 | File Retrieval Service | [ENB-837461.md](./ENB-837461.md) | Implemented | High |
| ENB-926583 | Comment Retrieval Service | [ENB-926583.md](./ENB-926583.md) | Implemented | High |
| ENB-451729 | Integration HTTP Handlers | [ENB-451729.md](./ENB-451729.md) | Implemented | High |

**Technology**: Go, Figma REST API v1, HTTP/JSON

---

### Design Artifact Management Enablers (2 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-512834 | Design Service Endpoint | [ENB-512834.md](./ENB-512834.md) | Implemented | High |
| ENB-639271 | Health Monitoring (Design) | [ENB-639271.md](./ENB-639271.md) | Implemented | High |

**Technology**: Go, HTTP server, Health checks

---

### Capability Tracking Enablers (2 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-724938 | Capability Service Endpoint | [ENB-724938.md](./ENB-724938.md) | Implemented | High |
| ENB-861452 | Health Monitoring (Capability) | [ENB-861452.md](./ENB-861452.md) | Implemented | High |

**Technology**: Go, HTTP server, SAFe framework alignment

---

### Container Orchestration Enablers (4 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-283746 | Container Interface Definition | [ENB-283746.md](./ENB-283746.md) | Implemented | Medium |
| ENB-592183 | Orchestrator Service | [ENB-592183.md](./ENB-592183.md) | Implemented | High |
| ENB-147825 | Health Check System | [ENB-147825.md](./ENB-147825.md) | Implemented | Medium |
| ENB-836419 | Graceful Shutdown Management | [ENB-836419.md](./ENB-836419.md) | Implemented | High |

**Technology**: Go interfaces, sync.RWMutex, Context, Signal handling

---

### UI Designer Enabler (1 file)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-958471 | DELM Service Integration | [ENB-958471.md](./ENB-958471.md) | Implemented | High |

**Technology**: Python, mflux, Stable Diffusion, Flux.1-schnell, REST API

---

### Display UI Enablers (14 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-173294 | React Application Bootstrap | [ENB-173294.md](./ENB-173294.md) | Ready for Implementation | High |
| ENB-214759 | React Application Bootstrap (Alt) | [ENB-214759.md](./ENB-214759.md) | Ready for Analysis | High |
| ENB-284951 | Ford Design System Integration | [ENB-284951.md](./ENB-284951.md) | Ready for Implementation | High |
| ENB-385926 | Ford Design System Integration (Alt) | [ENB-385926.md](./ENB-385926.md) | Ready for Analysis | High |
| ENB-395762 | UI Routing and Navigation | [ENB-395762.md](./ENB-395762.md) | Implemented | High |
| ENB-486513 | Page Component Library | [ENB-486513.md](./ENB-486513.md) | Ready for Implementation | High |
| ENB-517389 | AI Chat Interface | [ENB-517389.md](./ENB-517389.md) | Implemented | High |
| ENB-547813 | Routing and Navigation (Alt) | [ENB-547813.md](./ENB-547813.md) | Ready for Analysis | High |
| ENB-597324 | State Management System | [ENB-597324.md](./ENB-597324.md) | Ready for Implementation | Medium |
| ENB-648135 | Backend API Integration Layer | [ENB-648135.md](./ENB-648135.md) | Ready for Implementation | High |
| ENB-691482 | UI Component Library | [ENB-691482.md](./ENB-691482.md) | Ready for Analysis | High |
| ENB-729481 | Authentication System | [ENB-729481.md](./ENB-729481.md) | Implemented | High |
| ENB-836247 | Workspace Management | [ENB-836247.md](./ENB-836247.md) | Implemented | High |
| ENB-942158 | Interactive Storyboard Canvas | [ENB-942158.md](./ENB-942158.md) | Implemented | High |

**Technology**: React, TypeScript, Vite, React Router, Context API/Redux, CSS

---

### LLM Request Interception (ModelProxy) Enablers (5 files)

| ID | Name | File | Status | Priority |
|----|------|------|--------|----------|
| ENB-759321 | UbeCLI Interactive Shell | [ENB-759321.md](./ENB-759321.md) | Implemented | High |
| ENB-759322 | Prework Pipeline | [ENB-759322.md](./ENB-759322.md) | Implemented | High |
| ENB-759323 | Context Loader | [ENB-759323.md](./ENB-759323.md) | Implemented | High |
| ENB-759324 | LLM Adapter Interface | [ENB-759324.md](./ENB-759324.md) | Implemented | High |
| ENB-759325 | Configuration Management | [ENB-759325.md](./ENB-759325.md) | Implemented | Medium |

**Technology**: Go, YAML, Claude CLI, Claude API, OpenAI API, Ollama

---

## 📖 Storyboards (26 files)

### Story: Storyboard Ideation Tags Feature (STORY-439932)

| File | Description | Status |
|------|-------------|--------|
| [STORY-overview.md](./STORY-overview.md) | Feature overview and summary | Implemented |
| [STORY-description.md](./STORY-description.md) | Detailed feature description | Pending |
| [STORY-problem-statement.md](./STORY-problem-statement.md) | Problem being solved | Pending |
| [STORY-feature-summary.md](./STORY-feature-summary.md) | Feature capabilities summary | Pending |
| [STORY-features.md](./STORY-features.md) | Feature list and details | Pending |
| [STORY-benefits.md](./STORY-benefits.md) | Business benefits and value | Pending |
| [STORY-user-stories.md](./STORY-user-stories.md) | User stories for feature | Pending |
| [STORY-user-interface.md](./STORY-user-interface.md) | UI specifications and mockups | Pending |
| [STORY-technical-architecture.md](./STORY-technical-architecture.md) | Architecture diagrams | Pending |
| [STORY-technical-implementation.md](./STORY-technical-implementation.md) | Implementation details | Pending |
| [STORY-workflows.md](./STORY-workflows.md) | User workflows and processes | Pending |
| [STORY-integration-points.md](./STORY-integration-points.md) | Integration with other systems | Pending |
| [STORY-dependencies.md](./STORY-dependencies.md) | Card dependency mapping | Pending |
| [STORY-flow-visualization.md](./STORY-flow-visualization.md) | Visual flow diagrams | Pending |
| [STORY-complete-flow-diagram.md](./STORY-complete-flow-diagram.md) | Complete workflow visualization | Modified |
| [STORY-accessibility.md](./STORY-accessibility.md) | Accessibility considerations | Pending |
| [STORY-testing-scenarios.md](./STORY-testing-scenarios.md) | Test scenarios and cases | Pending |
| [STORY-migration-strategy.md](./STORY-migration-strategy.md) | Migration and deployment | Pending |
| [STORY-future-enhancements.md](./STORY-future-enhancements.md) | Future roadmap items | Pending |
| [STORY-implementation-notes.md](./STORY-implementation-notes.md) | Implementation notes | Pending |
| [STORY-success-criteria.md](./STORY-success-criteria.md) | Success criteria | Pending |
| [STORY-success-metrics.md](./STORY-success-metrics.md) | Success measurement KPIs | Pending |
| [STORY-metadata.md](./STORY-metadata.md) | Story metadata (ID, cards) | 3 cards, 2 connections |
| [STORY-story-cards.md](./STORY-story-cards.md) | Individual story card details | Pending |
| [STORY-statistics.md](./STORY-statistics.md) | Statistical overview | Pending |
| [STORY-conclusion.md](./STORY-conclusion.md) | Story conclusion | Pending |

**Story Purpose**: Create traceable links between ideation concepts and storyboard cards, enabling teams to track how ideas evolve into structured user stories and implementation plans.

---

## 🔗 Dependencies (1 file)

### DEP-complete-flow: Complete Dependency Flow Diagram
**File**: [DEP-complete-flow.md](./DEP-complete-flow.md)
**Generated**: November 24, 2025
**Type**: Dependency Documentation

**Contents**:
- Capability-level dependencies with Mermaid diagrams
- Enabler-level dependencies for each capability
- External service dependencies (Figma API, DELM Service)
- Network architecture and port allocation
- Data flow diagrams
- Critical paths and failure modes
- Health check matrix

**Key Diagrams**:
- Complete capability dependency flow
- Enabler dependencies per capability
- Network topology (Docker bridge network)
- Design workflow data flow
- AI generation workflow data flow

---

## 📄 Platform Documentation (15 files)

| File | Description | Type |
|------|-------------|------|
| [OTHER-platform-overview.md](./OTHER-platform-overview.md) | Platform capabilities overview | Platform Docs |
| [OTHER-executive-summary.md](./OTHER-executive-summary.md) | Executive summary of platform | Platform Docs |
| [OTHER-platform-capabilities.md](./OTHER-platform-capabilities.md) | Platform capabilities inventory | Platform Docs |
| [OTHER-technical-enablers.md](./OTHER-technical-enablers.md) | Technical enablers overview | Platform Docs |
| [OTHER-platform-architecture.md](./OTHER-platform-architecture.md) | Platform architecture diagrams | Platform Docs |
| [OTHER-current-limitations.md](./OTHER-current-limitations.md) | Current platform limitations | Platform Docs |
| [OTHER-security-model.md](./OTHER-security-model.md) | Security architecture and model | Platform Docs |
| [OTHER-scalability.md](./OTHER-scalability.md) | Scalability considerations | Platform Docs |
| [OTHER-deployment-model.md](./OTHER-deployment-model.md) | Deployment architecture | Platform Docs |
| [OTHER-integration-points.md](./OTHER-integration-points.md) | Integration architecture | Platform Docs |
| [OTHER-extensibility.md](./OTHER-extensibility.md) | Extensibility framework | Platform Docs |
| [OTHER-monitoring-observability.md](./OTHER-monitoring-observability.md) | Monitoring and observability | Platform Docs |
| [OTHER-roadmap-enablers.md](./OTHER-roadmap-enablers.md) | Roadmap and future enablers | Platform Docs |
| [OTHER-platform-maturity.md](./OTHER-platform-maturity.md) | Platform maturity assessment | Platform Docs |
| [OTHER-conclusion.md](./OTHER-conclusion.md) | Platform docs conclusion | Platform Docs |

**Platform Capabilities Covered**:
1. Ideation Management
2. Storyboard Planning
3. Workspace Management
4. Traceability System
5. Export and Documentation
6. Design System Compliance

---

## 📑 Other Documentation (12 files)

| File | Description | Version/Date |
|------|-------------|--------------|
| [OTHER-development-plan.md](./OTHER-development-plan.md) | Anvil framework development guide | v3.0.1 |
| [OTHER-discovery-summary.md](./OTHER-discovery-summary.md) | Project discovery report | Nov 13, 2025 |
| [OTHER-index.md](./OTHER-index.md) | Original specification index | v1.1, Nov 23, 2025 |
| [OTHER-api-documentation.md](./OTHER-api-documentation.md) | DELM API documentation | v1.0.0 |
| [OTHER-delm-readme.md](./OTHER-delm-readme.md) | DELM system overview | RAG-powered SLM |
| [OTHER-ideation-feature.md](./OTHER-ideation-feature.md) | Ideation Canvas feature spec | v1.0, Implemented |
| [OTHER-navigation-updates.md](./OTHER-navigation-updates.md) | UI/navigation improvements | v1.0, Apple HIG |
| [OTHER-changes-2025-11-14.md](./OTHER-changes-2025-11-14.md) | Technical changes log | Nov 14, 2025 |
| [OTHER-changes-2025-11-21.md](./OTHER-changes-2025-11-21.md) | Technical changes log | Nov 21, 2025 |
| [OTHER-changes-2025-11-23.md](./OTHER-changes-2025-11-23.md) | Technical changes log | Nov 23, 2025 |
| [OTHER-ai-policy-preset2.md](./OTHER-ai-policy-preset2.md) | AI governance policy | Level 2 - Guided |
| [OTHER-analysis-blocker-944623.md](./OTHER-analysis-blocker-944623.md) | Analysis blocker report | CAP-944623 Figma issue |

---

## 💻 Code Files (4 files)

**Location**: `../enh-code/`

| File | Description | Language | Purpose |
|------|-------------|----------|---------|
| api.py | DELM API server implementation | Python | REST API server for AI image generation |
| test_api.py | API test suite | Python | Pytest-based API testing |
| generate_expanded.py | Specification generation script | Python | Auto-generates expanded specs |
| run_tests.sh | Test runner script | Shell | Automated test execution |

**Usage**:
```bash
# Run DELM API server
python3 ../enh-code/api.py

# Run tests
../enh-code/run_tests.sh

# Generate expanded specs
python3 ../enh-code/generate_expanded.py
```

---

## File Organization

### Naming Conventions

All files follow standardized naming patterns established during reverse engineering:

1. **Capabilities** (6 files):
   - Format: `CAP-{6-digit-number}.md`
   - Example: `CAP-582341.md`
   - Represents high-level business functions

2. **Enablers** (27 files):
   - Format: `ENB-{6-digit-number}.md`
   - Example: `ENB-748192.md`
   - Represents technical implementations

3. **Stories** (26 files):
   - Format: `STORY-{descriptive-name}.md`
   - Example: `STORY-overview.md`
   - Represents user story documentation

4. **Dependencies** (1 file):
   - Format: `DEP-{descriptive-name}.md`
   - Example: `DEP-complete-flow.md`
   - Represents dependency documentation

5. **Other** (27 files):
   - Format: `OTHER-{descriptive-name}.{ext}`
   - Example: `OTHER-development-plan.md`
   - Represents supporting documentation

### Directory Structure

```
enh-specifications/
├── CAP-318652.md                      # Capability Tracking
├── CAP-471395.md                      # Container Orchestration
├── CAP-582341.md                      # Figma Integration Management
├── CAP-694827.md                      # Design Artifact Management
├── CAP-847293.md                      # UI Designer
├── CAP-944623.md                      # Display UI
│
├── ENB-147825.md                      # Health Check System
├── ENB-173294.md                      # React Application Bootstrap
├── ENB-214759.md                      # React Application Bootstrap (Alt)
├── ENB-283746.md                      # Container Interface Definition
├── ENB-284951.md                      # Ford Design System Integration
├── ENB-385926.md                      # Ford Design System (Alt)
├── ENB-395762.md                      # UI Routing and Navigation
├── ENB-451729.md                      # Integration HTTP Handlers
├── ENB-486513.md                      # Page Component Library
├── ENB-512834.md                      # Design Service Endpoint
├── ENB-517389.md                      # AI Chat Interface
├── ENB-547813.md                      # Routing and Navigation (Alt)
├── ENB-592183.md                      # Orchestrator Service
├── ENB-597324.md                      # State Management System
├── ENB-639271.md                      # Health Monitoring (Design)
├── ENB-648135.md                      # Backend API Integration
├── ENB-691482.md                      # UI Component Library
├── ENB-724938.md                      # Capability Service Endpoint
├── ENB-729481.md                      # Authentication System
├── ENB-748192.md                      # Figma API Client
├── ENB-836247.md                      # Workspace Management
├── ENB-836419.md                      # Graceful Shutdown Management
├── ENB-837461.md                      # File Retrieval Service
├── ENB-861452.md                      # Health Monitoring (Capability)
├── ENB-926583.md                      # Comment Retrieval Service
├── ENB-942158.md                      # Interactive Storyboard Canvas
├── ENB-958471.md                      # DELM Service Integration
│
├── STORY-accessibility.md
├── STORY-benefits.md
├── STORY-complete-flow-diagram.md
├── STORY-conclusion.md
├── STORY-dependencies.md
├── STORY-description.md
├── STORY-feature-summary.md
├── STORY-features.md
├── STORY-flow-visualization.md
├── STORY-future-enhancements.md
├── STORY-implementation-notes.md
├── STORY-integration-points.md
├── STORY-metadata.md
├── STORY-overview.md
├── STORY-problem-statement.md
├── STORY-statistics.md
├── STORY-story-cards.md
├── STORY-success-criteria.md
├── STORY-success-metrics.md
├── STORY-technical-architecture.md
├── STORY-technical-implementation.md
├── STORY-testing-scenarios.md
├── STORY-user-interface.md
├── STORY-user-stories.md
├── STORY-workflows.md
├── STORY-migration-strategy.md
│
├── DEP-complete-flow.md               # Complete dependency documentation
│
├── OTHER-ai-policy-preset2.md
├── OTHER-analysis-blocker-944623.md
├── OTHER-api-documentation.md
├── OTHER-changes-2025-11-14.md
├── OTHER-changes-2025-11-21.md
├── OTHER-changes-2025-11-23.md
├── OTHER-conclusion.md
├── OTHER-current-limitations.md
├── OTHER-delm-readme.md
├── OTHER-deployment-model.md
├── OTHER-development-plan.md
├── OTHER-discovery-summary.md
├── OTHER-executive-summary.md
├── OTHER-extensibility.md
├── OTHER-ideation-feature.md
├── OTHER-index.md
├── OTHER-integration-points.md
├── OTHER-monitoring-observability.md
├── OTHER-navigation-updates.md
├── OTHER-platform-architecture.md
├── OTHER-platform-capabilities.md
├── OTHER-platform-maturity.md
├── OTHER-platform-overview.md
├── OTHER-roadmap-enablers.md
├── OTHER-scalability.md
├── OTHER-security-model.md
├── OTHER-technical-enablers.md
│
└── INDEX.md                           # This file

../enh-code/
├── api.py
├── generate_expanded.py
├── test_api.py
└── run_tests.sh

../enh-assets/
└── (No files generated - placeholder for future graphical assets)
```

---

## Statistics

### File Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| Capabilities | 6 | 6.7% |
| Enablers | 27 | 30.3% |
| Stories | 26 | 29.2% |
| Dependencies | 1 | 1.1% |
| Platform Docs | 15 | 16.9% |
| Other Docs | 12 | 13.5% |
| Code Files | 4 | 4.5% |
| **Total** | **91** | **100%** |

### Implementation Status

| Status | Capabilities | Enablers |
|--------|-------------|----------|
| Implemented | 6 (100%) | 8 (30%) |
| Ready for Implementation | 0 | 5 (19%) |
| Ready for Analysis | 0 | 4 (15%) |
| In Analysis | 0 | 0 |
| **Total** | **6** | **27** |

### Priority Distribution

| Priority | Capabilities | Enablers |
|----------|-------------|----------|
| High | 5 (83%) | 21 (78%) |
| Medium | 1 (17%) | 6 (22%) |
| Low | 0 | 0 |

### Technology Stack Summary

| Technology | Usage | Files |
|------------|-------|-------|
| Go | Backend services | 12 enablers |
| React/TypeScript | Web UI | 14 enablers |
| Python | AI generation | 1 enabler + 3 code files |
| Docker | Containerization | Infrastructure |
| Figma API | Design integration | 4 enablers |
| DELM/Stable Diffusion | AI images | 1 enabler |

### Code Statistics (from Discovery)

| Component | Files | Lines of Code | Coverage |
|-----------|-------|---------------|----------|
| Integration Service | 5 | ~300 LOC | 100% tested |
| Design Service | 1 | ~70 LOC | Manual tested |
| Capability Service | 1 | ~70 LOC | Manual tested |
| Container Framework | 3 | ~150 LOC | Unit tested |
| **Total** | **10** | **~590 LOC** | **High** |

### Port Allocation

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| Integration Service | 8080 | HTTP | Active |
| Design Service | 8081 | HTTP | Active |
| Capability Service | 8082 | HTTP | Active |
| Web UI | 3000 | HTTP | Active |
| API Server | 3001 | HTTP | Active |
| DELM Service | 3005 | HTTP | Active |

---

## 🚀 Getting Started

### For Product Owners

1. **Review Capabilities**: Start with the [6 capability files](#-capabilities-6-files) to understand business value
2. **Check Priorities**: Review implementation status and prioritize next features
3. **Assess Dependencies**: Review [DEP-complete-flow.md](./DEP-complete-flow.md) for impact analysis
4. **Review Stories**: Examine [story files](#-storyboards-26-files) for user journey understanding

### For Developers

1. **Read Development Plan**: Start with [OTHER-development-plan.md](./OTHER-development-plan.md) for Anvil framework workflow
2. **Understand Architecture**: Review [OTHER-platform-architecture.md](./OTHER-platform-architecture.md)
3. **Review Enablers**: Study [27 enabler specifications](#-enablers-27-files) for technical details
4. **Check Dependencies**: Review [DEP-complete-flow.md](./DEP-complete-flow.md) for integration points
5. **Setup Environment**: Follow setup instructions in enabler files for each service

### For Architects

1. **Review System Architecture**: Study [DEP-complete-flow.md](./DEP-complete-flow.md)
2. **Assess Capabilities**: Review all [6 capability files](#-capabilities-6-files) for capability relationships
3. **Evaluate Integration Points**: Check [OTHER-integration-points.md](./OTHER-integration-points.md)
4. **Review Scalability**: Read [OTHER-scalability.md](./OTHER-scalability.md)
5. **Plan Future Enhancements**: Review roadmap in [OTHER-roadmap-enablers.md](./OTHER-roadmap-enablers.md)

### For QA Engineers

1. **Review Test Strategy**: Check [OTHER-development-plan.md](./OTHER-development-plan.md) for testing requirements
2. **Study Enablers**: Each enabler file contains "Testing Strategy" section
3. **Review Stories**: [Story files](#-storyboards-26-files) contain acceptance criteria
4. **Run Tests**: Use code files in `../enh-code/` for API testing
5. **Check Scenarios**: Review [STORY-testing-scenarios.md](./STORY-testing-scenarios.md)

---

## Key Relationships

### Capability → Enabler Mapping

```
CAP-582341 (Figma Integration)
├── ENB-748192 (Figma API Client)
├── ENB-837461 (File Retrieval)
├── ENB-926583 (Comment Retrieval)
└── ENB-451729 (HTTP Handlers)

CAP-694827 (Design Artifacts)
├── ENB-512834 (Service Endpoint)
└── ENB-639271 (Health Monitoring)

CAP-318652 (Capability Tracking)
├── ENB-724938 (Service Endpoint)
└── ENB-861452 (Health Monitoring)

CAP-471395 (Container Orchestration)
├── ENB-283746 (Container Interface)
├── ENB-592183 (Orchestrator)
├── ENB-147825 (Health Checks)
└── ENB-836419 (Graceful Shutdown)

CAP-847293 (UI Designer)
└── ENB-958471 (DELM Integration)

CAP-944623 (Display UI)
├── ENB-173294 (React Bootstrap)
├── ENB-214759 (React Bootstrap Alt)
├── ENB-284951 (Design System)
├── ENB-385926 (Design System Alt)
├── ENB-395762 (Routing)
├── ENB-486513 (Page Components)
├── ENB-517389 (AI Chat)
├── ENB-547813 (Routing Alt)
├── ENB-597324 (State Management)
├── ENB-648135 (API Integration)
├── ENB-691482 (UI Components)
├── ENB-729481 (Authentication)
├── ENB-836247 (Workspace Mgmt)
└── ENB-942158 (Storyboard Canvas)
```

### Capability Dependencies

```
External Services
├── Figma API → CAP-582341
└── DELM Service → CAP-847293

Infrastructure
└── CAP-471395 → [CAP-582341, CAP-694827, CAP-318652]

Core Flow
├── CAP-582341 → CAP-694827 → CAP-318652
└── CAP-582341 → CAP-944623

UI Integration
├── CAP-694827 → CAP-944623
└── CAP-847293 → CAP-944623
```

---

## Search by ID

| ID | Type | Name | File |
|----|------|------|------|
| CAP-318652 | Capability | Capability Tracking | [CAP-318652.md](./CAP-318652.md) |
| CAP-471395 | Capability | Container Orchestration | [CAP-471395.md](./CAP-471395.md) |
| CAP-582341 | Capability | Figma Integration Management | [CAP-582341.md](./CAP-582341.md) |
| CAP-694827 | Capability | Design Artifact Management | [CAP-694827.md](./CAP-694827.md) |
| CAP-847293 | Capability | UI Designer | [CAP-847293.md](./CAP-847293.md) |
| CAP-944623 | Capability | Display UI | [CAP-944623.md](./CAP-944623.md) |
| CAP-759314 | Capability | LLM Request Interception (ModelProxy) | [CAP-759314.md](./CAP-759314.md) |
| ENB-147825 | Enabler | Health Check System | [ENB-147825.md](./ENB-147825.md) |
| ENB-173294 | Enabler | React Application Bootstrap | [ENB-173294.md](./ENB-173294.md) |
| ENB-214759 | Enabler | React Application Bootstrap (Alt) | [ENB-214759.md](./ENB-214759.md) |
| ENB-283746 | Enabler | Container Interface Definition | [ENB-283746.md](./ENB-283746.md) |
| ENB-284951 | Enabler | Ford Design System Integration | [ENB-284951.md](./ENB-284951.md) |
| ENB-385926 | Enabler | Ford Design System Integration (Alt) | [ENB-385926.md](./ENB-385926.md) |
| ENB-395762 | Enabler | UI Routing and Navigation | [ENB-395762.md](./ENB-395762.md) |
| ENB-451729 | Enabler | Integration HTTP Handlers | [ENB-451729.md](./ENB-451729.md) |
| ENB-486513 | Enabler | Page Component Library | [ENB-486513.md](./ENB-486513.md) |
| ENB-512834 | Enabler | Design Service Endpoint | [ENB-512834.md](./ENB-512834.md) |
| ENB-517389 | Enabler | AI Chat Interface | [ENB-517389.md](./ENB-517389.md) |
| ENB-547813 | Enabler | Routing and Navigation (Alt) | [ENB-547813.md](./ENB-547813.md) |
| ENB-592183 | Enabler | Orchestrator Service | [ENB-592183.md](./ENB-592183.md) |
| ENB-597324 | Enabler | State Management System | [ENB-597324.md](./ENB-597324.md) |
| ENB-639271 | Enabler | Health Monitoring (Design) | [ENB-639271.md](./ENB-639271.md) |
| ENB-648135 | Enabler | Backend API Integration Layer | [ENB-648135.md](./ENB-648135.md) |
| ENB-691482 | Enabler | UI Component Library | [ENB-691482.md](./ENB-691482.md) |
| ENB-724938 | Enabler | Capability Service Endpoint | [ENB-724938.md](./ENB-724938.md) |
| ENB-729481 | Enabler | Authentication System | [ENB-729481.md](./ENB-729481.md) |
| ENB-748192 | Enabler | Figma API Client | [ENB-748192.md](./ENB-748192.md) |
| ENB-836247 | Enabler | Workspace Management | [ENB-836247.md](./ENB-836247.md) |
| ENB-836419 | Enabler | Graceful Shutdown Management | [ENB-836419.md](./ENB-836419.md) |
| ENB-837461 | Enabler | File Retrieval Service | [ENB-837461.md](./ENB-837461.md) |
| ENB-861452 | Enabler | Health Monitoring (Capability) | [ENB-861452.md](./ENB-861452.md) |
| ENB-926583 | Enabler | Comment Retrieval Service | [ENB-926583.md](./ENB-926583.md) |
| ENB-942158 | Enabler | Interactive Storyboard Canvas | [ENB-942158.md](./ENB-942158.md) |
| ENB-958471 | Enabler | DELM Service Integration | [ENB-958471.md](./ENB-958471.md) |
| ENB-759321 | Enabler | UbeCLI Interactive Shell | [ENB-759321.md](./ENB-759321.md) |
| ENB-759322 | Enabler | Prework Pipeline | [ENB-759322.md](./ENB-759322.md) |
| ENB-759323 | Enabler | Context Loader | [ENB-759323.md](./ENB-759323.md) |
| ENB-759324 | Enabler | LLM Adapter Interface | [ENB-759324.md](./ENB-759324.md) |
| ENB-759325 | Enabler | Configuration Management | [ENB-759325.md](./ENB-759325.md) |

---

## Next Steps

### Immediate Actions
1. Review this index to understand file organization
2. Read [OTHER-development-plan.md](./OTHER-development-plan.md) for Anvil framework methodology
3. Study [DEP-complete-flow.md](./DEP-complete-flow.md) for system dependencies
4. Review capability files for business understanding
5. Check enabler files for technical implementation details

### Development Workflow
1. Follow Anvil framework workflow (Discovery → Analysis → Design → Implementation)
2. Respect approval gates and pre-condition verification
3. Use AI Policy Preset 2 guidelines for development
4. Maintain documentation alongside code changes
5. Update this index when adding new specifications

### Quality Gates
- All capabilities require approval before implementation
- Enablers must complete analysis and design phases
- Pre-conditions must be verified before each phase
- Testing strategies must be documented in each enabler
- Dependencies must be documented in DEP files

---

**Document Version**: 2.0 (Enhanced)
**Generated**: November 24, 2025
**Status**: Active
**Maintainer**: Development Team
**AI Agent**: Claude Code (Anthropic)
**Methodology**: Anvil Framework with AI Policy Preset 2

---

*This index was automatically generated during reverse engineering of the UbeCode application specifications. Files have been reorganized with standardized naming conventions for improved discoverability and maintainability.*
