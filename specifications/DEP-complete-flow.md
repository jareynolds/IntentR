# Complete Dependency Flow Diagram

**Generated**: 2025-11-24
**Version**: 1.0
**Type**: Dependency Documentation

## Overview

This document provides a comprehensive view of all dependencies within the IntentR application, showing how capabilities, enablers, and external services interact.

## Capability-Level Dependencies

### Dependency Flow Diagram

```mermaid
flowchart TD
    %% External Dependencies
    FIGMA["Figma API<br/>External Design Platform<br/>🌐"]
    DELM["DELM Service<br/>AI Image Generation<br/>🤖"]

    %% Infrastructure Capability
    CAP_471395["CAP-471395<br/>Container Orchestration<br/>📦"]

    %% Core Capabilities
    CAP_582341["CAP-582341<br/>Figma Integration Management<br/>🔗"]
    CAP_694827["CAP-694827<br/>Design Artifact Management<br/>📁"]
    CAP_318652["CAP-318652<br/>Capability Tracking<br/>📊"]
    CAP_847293["CAP-847293<br/>UI Designer<br/>🎨"]
    CAP_944623["CAP-944623<br/>Display UI<br/>🖥️"]

    %% External to Internal Dependencies
    FIGMA --> CAP_582341
    DELM --> CAP_847293

    %% Infrastructure Dependencies
    CAP_471395 --> CAP_582341
    CAP_471395 --> CAP_694827
    CAP_471395 --> CAP_318652

    %% Core Capability Dependencies
    CAP_582341 --> CAP_694827
    CAP_582341 --> CAP_944623
    CAP_694827 --> CAP_318652
    CAP_694827 --> CAP_944623
    CAP_847293 --> CAP_944623

    %% Styling
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef infrastructure fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef core fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef ui fill:#fff3e0,stroke:#f57c00,stroke-width:2px

    class FIGMA,DELM external
    class CAP_471395 infrastructure
    class CAP_582341,CAP_694827,CAP_318652,CAP_847293 core
    class CAP_944623 ui
```

## Capability Dependency Matrix

| Capability | Depends On (Upstream) | Required By (Downstream) |
|------------|----------------------|--------------------------|
| CAP-471395<br/>Container Orchestration | None (Infrastructure) | CAP-582341, CAP-694827, CAP-318652 |
| CAP-582341<br/>Figma Integration | Figma API (External)<br/>CAP-471395 | CAP-694827, CAP-944623 |
| CAP-694827<br/>Design Artifact Mgmt | CAP-582341<br/>CAP-471395 | CAP-318652, CAP-944623 |
| CAP-318652<br/>Capability Tracking | CAP-694827<br/>CAP-471395 | None (End Consumer) |
| CAP-847293<br/>UI Designer | DELM Service (External) | CAP-944623 |
| CAP-944623<br/>Display UI | CAP-582341, CAP-694827, CAP-847293 | None (End User Interface) |

## Enabler-Level Dependencies

### Figma Integration Management (CAP-582341) Enablers

```mermaid
flowchart TD
    ENB_748192["ENB-748192<br/>Figma API Client"]
    ENB_837461["ENB-837461<br/>File Retrieval Service"]
    ENB_926583["ENB-926583<br/>Comment Retrieval Service"]
    ENB_451729["ENB-451729<br/>Integration HTTP Handlers"]

    ENB_837461 --> ENB_748192
    ENB_926583 --> ENB_748192
    ENB_451729 --> ENB_837461
    ENB_451729 --> ENB_926583

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_748192,ENB_837461,ENB_926583,ENB_451729 enabler
```

### Design Artifact Management (CAP-694827) Enablers

```mermaid
flowchart TD
    ENB_512834["ENB-512834<br/>Design Service Endpoint"]
    ENB_639271["ENB-639271<br/>Health Monitoring"]

    ENB_639271 --> ENB_512834

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_512834,ENB_639271 enabler
```

### Capability Tracking (CAP-318652) Enablers

```mermaid
flowchart TD
    ENB_724938["ENB-724938<br/>Capability Service Endpoint"]
    ENB_861452["ENB-861452<br/>Health Monitoring"]

    ENB_861452 --> ENB_724938

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_724938,ENB_861452 enabler
```

### Container Orchestration (CAP-471395) Enablers

```mermaid
flowchart TD
    ENB_283746["ENB-283746<br/>Container Interface"]
    ENB_592183["ENB-592183<br/>Orchestrator Service"]
    ENB_147825["ENB-147825<br/>Health Check System"]
    ENB_836419["ENB-836419<br/>Graceful Shutdown"]

    ENB_592183 --> ENB_283746
    ENB_147825 --> ENB_283746
    ENB_836419 --> ENB_592183

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_283746,ENB_592183,ENB_147825,ENB_836419 enabler
```

### UI Designer (CAP-847293) Enabler

```mermaid
flowchart TD
    ENB_958471["ENB-958471<br/>DELM Service Integration"]

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_958471 enabler
```

### Display UI (CAP-944623) Enablers

```mermaid
flowchart TD
    ENB_173294["ENB-173294<br/>React Bootstrap"]
    ENB_284951["ENB-284951<br/>Design System"]
    ENB_395762["ENB-395762<br/>Routing"]
    ENB_486513["ENB-486513<br/>Page Components"]
    ENB_597324["ENB-597324<br/>State Management"]
    ENB_648135["ENB-648135<br/>API Integration"]
    ENB_729481["ENB-729481<br/>Authentication"]
    ENB_836247["ENB-836247<br/>Workspace Mgmt"]
    ENB_942158["ENB-942158<br/>Storyboard Canvas"]
    ENB_517389["ENB-517389<br/>AI Chat"]

    ENB_173294 --> ENB_284951
    ENB_173294 --> ENB_395762
    ENB_284951 --> ENB_486513
    ENB_395762 --> ENB_486513
    ENB_597324 --> ENB_486513
    ENB_648135 --> ENB_486513
    ENB_729481 --> ENB_395762
    ENB_836247 --> ENB_597324
    ENB_942158 --> ENB_486513
    ENB_517389 --> ENB_486513

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_173294,ENB_284951,ENB_395762,ENB_486513,ENB_597324,ENB_648135,ENB_729481,ENB_836247,ENB_942158,ENB_517389 enabler
```

## External Dependencies

### External Services

| External Service | Used By Capability | Purpose | Critical |
|-----------------|-------------------|---------|----------|
| Figma API | CAP-582341 | Design file retrieval, comments | Yes |
| DELM Service | CAP-847293 | AI-powered image generation | Yes |
| Docker | CAP-471395 | Container orchestration | Yes |

### External Libraries and Technologies

| Technology | Used By | Purpose | Version |
|------------|---------|---------|---------|
| Go | Multiple | Backend services | 1.22+ |
| React | CAP-944623 | Web UI framework | 18.x |
| TypeScript | CAP-944623 | Type-safe JavaScript | 5.x |
| Python | CAP-847293 | DELM service runtime | 3.9+ |
| mflux | CAP-847293 | Stable Diffusion runtime | Latest |
| Docker Compose | CAP-471395 | Service orchestration | Latest |

## Port Allocation

| Service | Port | Capability | Status |
|---------|------|------------|--------|
| Integration Service | 8080 | CAP-582341 | Active |
| Design Service | 8081 | CAP-694827 | Active |
| Capability Service | 8082 | CAP-318652 | Active |
| Web UI | 3000 | CAP-944623 | Active |
| API Server | 3001 | CAP-944623 | Active |
| DELM Service | 3005 | CAP-847293 | Active |

## Network Dependencies

```mermaid
flowchart TD
    subgraph External["External Services"]
        FIGMA_EXT["Figma API<br/>api.figma.com"]
        HF["Hugging Face<br/>Model Downloads"]
    end

    subgraph DockerNetwork["intentr-network"]
        INTEGRATION["Integration Service<br/>:8080"]
        DESIGN["Design Service<br/>:8081"]
        CAPABILITY["Capability Service<br/>:8082"]
        WEBUI["Web UI<br/>:3000"]
        API_SERVER["API Server<br/>:3001"]
        DELM_SVC["DELM Service<br/>:3005"]
    end

    subgraph Client["Client Browser"]
        BROWSER["Web Browser"]
    end

    INTEGRATION --> FIGMA_EXT
    DELM_SVC --> HF
    BROWSER --> WEBUI
    WEBUI --> API_SERVER
    WEBUI --> DELM_SVC
    WEBUI --> INTEGRATION
    WEBUI --> DESIGN
    WEBUI --> CAPABILITY

    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef client fill:#fff3e0,stroke:#f57c00,stroke-width:2px

    class FIGMA_EXT,HF external
    class INTEGRATION,DESIGN,CAPABILITY,WEBUI,API_SERVER,DELM_SVC service
    class BROWSER client
```

## Data Flow Dependencies

### Design Workflow Data Flow

```mermaid
flowchart LR
    DESIGNER["Designer<br/>Figma"]
    FIGMA_API["Figma API"]
    INTEGRATION_SVC["Integration<br/>Service"]
    DESIGN_SVC["Design<br/>Service"]
    UI["Web UI"]
    CAPABILITY_SVC["Capability<br/>Service"]

    DESIGNER -->|Creates| FIGMA_API
    FIGMA_API -->|API Call| INTEGRATION_SVC
    INTEGRATION_SVC -->|File Data| DESIGN_SVC
    DESIGN_SVC -->|Metadata| UI
    UI -->|Updates| CAPABILITY_SVC

    classDef person fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#388e3c,stroke-width:2px

    class DESIGNER person
    class FIGMA_API api
    class INTEGRATION_SVC,DESIGN_SVC,CAPABILITY_SVC service
    class UI service
```

### AI Generation Workflow Data Flow

```mermaid
flowchart LR
    USER["User"]
    UI["Web UI<br/>Designer Page"]
    DELM["DELM<br/>Service"]
    SD["Stable<br/>Diffusion"]
    MODEL["Flux.1<br/>Model"]

    USER -->|Prompt| UI
    UI -->|API Request| DELM
    DELM -->|Generate| SD
    SD -->|Inference| MODEL
    MODEL -->|Image| SD
    SD -->|Response| DELM
    DELM -->|Base64| UI
    UI -->|Display| USER

    classDef person fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef ai fill:#e1f5fe,stroke:#0277bd,stroke-width:2px

    class USER person
    class UI,DELM service
    class SD,MODEL ai
```

## Critical Paths

### Critical Path 1: Figma to Capability Tracking
```
Figma API → CAP-582341 (Figma Integration) → CAP-694827 (Design Artifacts) → CAP-318652 (Capability Tracking)
```

**Impact**: Design-driven development workflow
**Risk**: High - Any failure breaks design import pipeline

### Critical Path 2: AI Generation to UI Display
```
DELM Service → CAP-847293 (UI Designer) → CAP-944623 (Display UI)
```

**Impact**: AI-powered design generation
**Risk**: Medium - Fallback to manual design possible

### Critical Path 3: Container Orchestration
```
CAP-471395 (Container Orchestration) → All Services
```

**Impact**: System startup and lifecycle management
**Risk**: High - System-wide failure if orchestration fails

## Dependency Health Checks

### Health Check Matrix

| Dependency | Check Method | Frequency | Timeout | Critical |
|------------|-------------|-----------|---------|----------|
| Figma API | HTTP GET /v1/me | On-demand | 30s | Yes |
| DELM Service | HTTP GET /health | Before generation | 5s | Yes |
| Integration Service | HTTP GET /health | 30s interval | 5s | Yes |
| Design Service | HTTP GET /health | 30s interval | 5s | Yes |
| Capability Service | HTTP GET /health | 30s interval | 5s | Yes |

## Failure Modes and Mitigation

| Failure | Impact | Mitigation | Recovery Time |
|---------|--------|------------|---------------|
| Figma API Down | No design imports | Cached data, manual upload | API recovery time |
| DELM Service Down | No AI generation | Manual design creation | Service restart (~30s) |
| Integration Service Down | No Figma connectivity | Restart via orchestrator | ~10s |
| Design Service Down | No artifact storage | Restart via orchestrator | ~10s |
| Capability Service Down | No tracking updates | Restart via orchestrator | ~10s |
| Container Orchestrator Down | System-wide failure | Manual service restart | ~60s |

---

**Document Status**: Complete
**Last Updated**: 2025-11-24
**Maintainer**: Development Team
