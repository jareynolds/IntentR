# KNOWLEDGE BASE
**Version**: 1.0.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)

---

## Overview

This document defines how organizational and project knowledge is captured, structured, and made available to AI agents within the INTENT framework. Effective knowledge management ensures AI has the context needed to produce high-quality, consistent outputs while preserving human expertise.

**Core Principle**: Knowledge not captured is knowledge lost. AI amplifies both good and bad patterns—invest in documenting the good.

---

## Knowledge Categories

### Category 1: Domain Knowledge

Business and domain-specific knowledge that AI needs to understand the problem space.

| Knowledge Type | Description | Example |
|----------------|-------------|---------|
| **Business Rules** | Invariants and constraints | "Users can only have one active subscription" |
| **Domain Vocabulary** | Ubiquitous language | "A 'workspace' contains projects and capabilities" |
| **Industry Standards** | Regulatory requirements | "PCI-DSS compliance for payment data" |
| **User Personas** | Target user profiles | "Enterprise architects, product managers" |
| **Business Processes** | Workflow definitions | "Approval requires manager + security review" |

### Category 2: Technical Knowledge

Architecture, patterns, and technical decisions that guide implementation.

| Knowledge Type | Description | Example |
|----------------|-------------|---------|
| **Architecture Decisions** | ADRs and design choices | "Chose PostgreSQL over MongoDB for ACID" |
| **Design Patterns** | Approved patterns | "Repository pattern for data access" |
| **Code Conventions** | Style and structure | "Error messages use structured logging" |
| **Integration Points** | External dependencies | "Figma API rate limit: 60 req/min" |
| **Performance Targets** | NFR benchmarks | "API response < 200ms p95" |

### Category 3: Historical Knowledge

Lessons learned from past implementations and decisions.

| Knowledge Type | Description | Example |
|----------------|-------------|---------|
| **Past Decisions** | Why we chose X over Y | "Tried Redis sessions, switched to JWT for statelessness" |
| **Known Issues** | Documented gotchas | "Safari doesn't support X feature" |
| **Migration History** | Schema evolution | "Users table split in v2.0" |
| **Deprecated Patterns** | What NOT to do | "Don't use global state for user context" |
| **Success Patterns** | What works well | "Feature flags via environment variables" |

### Category 4: Team Knowledge

Human expertise and tacit knowledge that needs explicit capture.

| Knowledge Type | Description | Example |
|----------------|-------------|---------|
| **Expert Contacts** | Who knows what | "Sarah is the auth expert" |
| **Undocumented Behavior** | Tribal knowledge | "The batch job must run before 6am EST" |
| **Decision Authority** | Who decides what | "Security changes need CISO approval" |
| **Communication Channels** | How to escalate | "Critical issues go to #incidents Slack" |

---

## Knowledge Base Structure

### File Organization

```
workspace/
├── CODE_RULES/
│   ├── INTENT.md              # Philosophy
│   ├── SW_OPERATIONS.md       # Procedures
│   ├── PROMPT_STANDARDS.md    # How to prompt
│   ├── AI_AUDIT.md            # Audit requirements
│   ├── ROLLBACK.md            # Recovery procedures
│   └── KNOWLEDGE_BASE.md      # This document
├── knowledge/
│   ├── domain/
│   │   ├── BUSINESS_RULES.md
│   │   ├── GLOSSARY.md
│   │   └── PERSONAS.md
│   ├── technical/
│   │   ├── ARCHITECTURE.md
│   │   ├── PATTERNS.md
│   │   ├── CONVENTIONS.md
│   │   └── INTEGRATIONS.md
│   ├── historical/
│   │   ├── DECISIONS.md
│   │   ├── LESSONS_LEARNED.md
│   │   └── DEPRECATED.md
│   └── team/
│       ├── EXPERTS.md
│       └── PROCESSES.md
```

### Document Templates

Each knowledge document should follow this structure:

```markdown
# [Knowledge Title]

## Metadata
- **Category**: [Domain / Technical / Historical / Team]
- **Last Updated**: [Date]
- **Maintainer**: [Person/Team]
- **Review Cycle**: [Monthly / Quarterly / As-needed]

## Summary
[1-2 sentence overview for quick reference]

## Details
[Full knowledge content]

## AI Usage Guidelines
[How AI should use this knowledge]

## Related Knowledge
- [Link to related documents]

## Change History
| Date | Change | Author |
|------|--------|--------|
```

---

## Core Knowledge Documents

### BUSINESS_RULES.md

```markdown
# Business Rules

## Metadata
- **Category**: Domain
- **Last Updated**: December 24, 2025
- **Maintainer**: Product Team
- **Review Cycle**: Monthly

## Summary
Invariant business rules that must never be violated by any implementation.

## Rules

### BR-001: Single Active Subscription
**Rule**: A user can only have one active subscription at any time.
**Enforcement**: Database constraint + application validation
**Violation Handling**: Reject new subscription, show error to user
**Exceptions**: None
**AI Guidance**: Always check for existing active subscription before creating new one.

### BR-002: Workspace Isolation
**Rule**: Data from one workspace must never be visible to another workspace.
**Enforcement**: Row-level security + API middleware
**Violation Handling**: Security incident, immediate investigation
**Exceptions**: System administrators with explicit permission
**AI Guidance**: Always include workspace_id in queries. Never implement cross-workspace features without security review.

### BR-003: Approval Chain
**Rule**: Capabilities must be approved before implementation can begin.
**Enforcement**: Workflow state machine
**Violation Handling**: Implementation blocked, alert raised
**Exceptions**: Discovery mode for documenting existing code
**AI Guidance**: Check approval status before any implementation task. See SW_OPERATIONS.md for workflow.

[Additional rules follow same pattern...]
```

### GLOSSARY.md

```markdown
# Domain Glossary

## Metadata
- **Category**: Domain
- **Last Updated**: December 24, 2025
- **Maintainer**: Product Team
- **Review Cycle**: Quarterly

## Summary
Ubiquitous language definitions. All team members and AI agents should use these terms consistently.

## Terms

### Workspace
**Definition**: A container for projects, capabilities, and team configurations. Provides isolation boundary.
**Usage**: "Each customer has their own workspace"
**NOT**: Don't confuse with "project" or "environment"
**Related**: Project, Capability, Team

### Capability
**Definition**: A high-level business function that delivers value. Contains multiple enablers.
**Usage**: "User Authentication is a capability"
**NOT**: Not the same as a feature or user story
**Related**: Enabler, Requirement, Component

### Enabler
**Definition**: A technical implementation that realizes part of a capability.
**Usage**: "JWT Token Service is an enabler for User Authentication"
**NOT**: Not a task or ticket
**Related**: Capability, Requirement, Specification

### Intent
**Definition**: Explicit declaration of human decisions, goals, and constraints.
**Usage**: "Capture the intent before implementing"
**NOT**: Not just requirements or wishes
**Related**: Specification, INTENT Framework

### Intent Drift
**Definition**: When a system evolves away from its original intent.
**Usage**: "Code changes caused intent drift from the original design"
**NOT**: Not the same as scope creep (that's planned changes)
**Related**: Control Loop, Specification

[Additional terms follow same pattern...]
```

### PATTERNS.md

```markdown
# Approved Design Patterns

## Metadata
- **Category**: Technical
- **Last Updated**: December 24, 2025
- **Maintainer**: Architecture Team
- **Review Cycle**: Quarterly

## Summary
Design patterns approved for use in this project. AI should follow these patterns when implementing features.

## Patterns

### Repository Pattern
**Purpose**: Abstract data access from business logic
**When to Use**: All database operations
**Reference Implementation**: `internal/users/repository.go`
**Structure**:
```go
type Repository interface {
    Create(ctx context.Context, entity *Entity) error
    GetByID(ctx context.Context, id string) (*Entity, error)
    Update(ctx context.Context, entity *Entity) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, filter Filter) ([]*Entity, error)
}
```
**AI Guidance**: Always create a repository interface for new entities. Implement against interface, not concrete type.

### Handler Pattern
**Purpose**: HTTP request handling
**When to Use**: All API endpoints
**Reference Implementation**: `internal/auth/handler.go`
**Structure**:
```go
type Handler struct {
    service Service
    logger  *zap.Logger
}

func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    // 1. Parse request
    // 2. Validate input
    // 3. Call service
    // 4. Write response
}
```
**AI Guidance**: Keep handlers thin. Business logic belongs in services.

### Service Pattern
**Purpose**: Business logic encapsulation
**When to Use**: All business operations
**Reference Implementation**: `internal/capability/service.go`
**AI Guidance**: Services orchestrate repositories and other services. No direct HTTP or DB access.

[Additional patterns follow same format...]
```

### CONVENTIONS.md

```markdown
# Code Conventions

## Metadata
- **Category**: Technical
- **Last Updated**: December 24, 2025
- **Maintainer**: Engineering Team
- **Review Cycle**: As-needed

## Summary
Coding conventions and style guidelines for consistent codebase.

## Naming Conventions

### Go Code
| Element | Convention | Example |
|---------|------------|---------|
| Package | lowercase, single word | `auth`, `capability` |
| Exported Function | PascalCase | `CreateUser` |
| Unexported Function | camelCase | `validateEmail` |
| Interface | -er suffix when possible | `Reader`, `Handler` |
| Constant | PascalCase | `MaxRetries` |
| Variable | camelCase | `userCount` |

### TypeScript/React
| Element | Convention | Example |
|---------|------------|---------|
| Component | PascalCase | `UserProfile` |
| Hook | use- prefix | `useAuth` |
| Context | -Context suffix | `AuthContext` |
| Type | PascalCase | `UserData` |
| Constant | SCREAMING_SNAKE | `MAX_RETRIES` |

### API Endpoints
| Convention | Example |
|------------|---------|
| Plural nouns | `/users`, `/capabilities` |
| Kebab-case | `/save-specification` |
| Version prefix | `/api/v1/users` |
| Action suffix for RPC-style | `/users/{id}/approve` |

## Error Handling

### Go Errors
```go
// Always wrap errors with context
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}

// Use custom error types for domain errors
type ValidationError struct {
    Field   string
    Message string
}
```

### HTTP Error Responses
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Email format is invalid",
        "field": "email",
        "request_id": "req_abc123"
    }
}
```

[Additional conventions follow...]
```

### DECISIONS.md

```markdown
# Architecture Decision Records

## Metadata
- **Category**: Historical
- **Last Updated**: December 24, 2025
- **Maintainer**: Architecture Team
- **Review Cycle**: Append-only

## Summary
Record of significant architectural decisions and their rationale.

## ADR-001: PostgreSQL for Primary Database

**Date**: 2024-01-15
**Status**: Accepted

**Context**:
We needed to choose a primary database for the IntentR platform. Options considered:
- PostgreSQL
- MongoDB
- MySQL

**Decision**:
Use PostgreSQL as the primary database.

**Rationale**:
- ACID compliance required for approval workflows
- JSON/JSONB support for flexible metadata
- Strong ecosystem and tooling
- Team expertise

**Consequences**:
- (+) Reliable transactions for critical operations
- (+) Flexible schema with JSONB columns
- (-) Less flexible for document-heavy workloads
- (-) Schema migrations required for changes

**AI Guidance**: Always use PostgreSQL. Do not suggest MongoDB or other databases without explicit approval.

---

## ADR-002: JWT for Authentication

**Date**: 2024-02-01
**Status**: Accepted

**Context**:
Need stateless authentication for microservices architecture.

**Decision**:
Use JWT (JSON Web Tokens) with short-lived access tokens and refresh tokens.

**Rationale**:
- Stateless = horizontal scaling
- Standard format, broad library support
- Can embed claims for authorization

**Consequences**:
- (+) No session storage needed
- (+) Works across services
- (-) Can't revoke tokens immediately (mitigated with short expiry)
- (-) Token size larger than session ID

**AI Guidance**: Use JWT for all authentication. Token generation in `internal/auth/token.go`. Never store tokens in localStorage (use httpOnly cookies).

[Additional ADRs follow...]
```

### LESSONS_LEARNED.md

```markdown
# Lessons Learned

## Metadata
- **Category**: Historical
- **Last Updated**: December 24, 2025
- **Maintainer**: All Team Members
- **Review Cycle**: Append-only

## Summary
Documented lessons from past implementations, incidents, and decisions.

## LL-001: Connection Pool Exhaustion

**Date**: 2024-06-15
**Severity**: High
**Category**: Performance

**What Happened**:
Production outage due to database connection pool exhaustion. API latency spiked, then complete failure.

**Root Cause**:
New feature opened connections without closing them in error paths.

**Lesson**:
Always use `defer` for connection cleanup. Never rely on garbage collection.

**Prevention**:
```go
// ALWAYS do this:
conn, err := db.Acquire(ctx)
if err != nil {
    return err
}
defer conn.Release()  // MUST be immediately after acquire
```

**AI Guidance**: When writing database code, always include `defer conn.Release()` immediately after acquiring a connection. Review all error paths for resource cleanup.

---

## LL-002: Safari WebSocket Issues

**Date**: 2024-08-22
**Severity**: Medium
**Category**: Browser Compatibility

**What Happened**:
Real-time collaboration features not working for Safari users.

**Root Cause**:
Safari has stricter WebSocket handling, closes idle connections faster.

**Lesson**:
Implement ping/pong heartbeat for WebSocket connections.

**Prevention**:
```javascript
// Heartbeat every 30 seconds
setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
    }
}, 30000);
```

**AI Guidance**: All WebSocket implementations must include heartbeat mechanism. Test in Safari during development.

[Additional lessons follow...]
```

### DEPRECATED.md

```markdown
# Deprecated Patterns

## Metadata
- **Category**: Historical
- **Last Updated**: December 24, 2025
- **Maintainer**: Architecture Team
- **Review Cycle**: Quarterly

## Summary
Patterns, libraries, and approaches that should NOT be used. AI must avoid these.

## DEP-001: Global User Context

**Deprecated Since**: 2024-03-01
**Replacement**: Context-based user passing

**What Was Used**:
```go
// DON'T DO THIS
var currentUser *User  // Global variable
```

**Why Deprecated**:
- Not thread-safe
- Impossible to test
- Breaks in concurrent requests

**What To Use Instead**:
```go
// DO THIS
func HandleRequest(ctx context.Context, ...) {
    user := ctx.Value(UserContextKey).(*User)
}
```

**AI Guidance**: NEVER use global variables for request-scoped data. Always use context.

---

## DEP-002: Direct Database Queries in Handlers

**Deprecated Since**: 2024-04-15
**Replacement**: Repository pattern

**What Was Used**:
```go
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    // DON'T DO THIS
    _, err := h.db.Exec("INSERT INTO users ...")
}
```

**Why Deprecated**:
- Handlers become untestable
- SQL scattered throughout codebase
- No transaction management

**What To Use Instead**:
```go
func (h *Handler) HandleCreate(w http.ResponseWriter, r *http.Request) {
    // DO THIS
    err := h.service.CreateUser(ctx, user)
}
```

**AI Guidance**: Handlers call services, services call repositories. Never skip layers.

[Additional deprecated items...]
```

---

## Knowledge Capture Process

### When to Capture Knowledge

| Trigger | Knowledge Type | Action |
|---------|----------------|--------|
| New decision made | Historical | Create ADR |
| Bug fixed | Historical | Add to Lessons Learned |
| Pattern established | Technical | Add to Patterns |
| New term defined | Domain | Add to Glossary |
| Mistake repeated | Historical | Add to Deprecated |
| External integration added | Technical | Add to Integrations |

### Knowledge Entry Template

```markdown
## [Knowledge Title]

**Date Captured**: [YYYY-MM-DD]
**Captured By**: [Name]
**Source**: [Meeting / Incident / Review / etc.]

**Summary**:
[One-line description]

**Details**:
[Full explanation]

**AI Usage**:
[How AI should apply this knowledge]

**Related**:
- [Links to related knowledge]
```

### Review Cycle

| Knowledge Type | Review Frequency | Reviewer |
|----------------|------------------|----------|
| Business Rules | Monthly | Product Owner |
| Patterns | Quarterly | Architecture Team |
| Conventions | As-needed | Tech Lead |
| Decisions (ADRs) | Never modified, only superseded | Architecture Team |
| Lessons Learned | Never modified, append-only | All Team Members |
| Deprecated | Quarterly cleanup | Engineering Lead |

---

## AI Knowledge Integration

### How AI Accesses Knowledge

1. **CLAUDE.md References**
   - Primary entry point
   - Links to CODE_RULES documents
   - Always loaded in context

2. **Specification References**
   - Capability and enabler docs
   - Loaded when working on specific features

3. **Pattern References**
   - Referenced in implementation prompts
   - Used for consistency checks

4. **Historical References**
   - Queried when similar problems arise
   - Prevents repeated mistakes

### Knowledge Priority

When multiple knowledge sources conflict, priority order:

1. **Business Rules** (highest) - Never violated
2. **Security Requirements** - Never compromised
3. **Architecture Decisions** - Follow unless superseded
4. **Patterns** - Use unless exception documented
5. **Conventions** - Follow for consistency
6. **Lessons Learned** - Consider for risk mitigation

### AI Knowledge Gaps

When AI encounters knowledge gaps:

1. **Ask for clarification** before assuming
2. **Reference similar patterns** from codebase
3. **Flag uncertainty** in output
4. **Suggest knowledge capture** if pattern emerges

---

## Knowledge Quality Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Knowledge Coverage | >80% of decisions documented | Documented / Total Decisions |
| Freshness | <30 days since review | Days since last review |
| Usage Rate | Knowledge referenced in >50% of AI sessions | References / Sessions |
| Accuracy | <5% outdated information | Outdated entries / Total |
| AI Compliance | >90% of AI output follows knowledge | Compliant outputs / Total |

### Knowledge Health Check

Monthly review questions:
- [ ] Any undocumented decisions made?
- [ ] Any patterns emerging without documentation?
- [ ] Any repeated mistakes (need lessons learned)?
- [ ] Any outdated information?
- [ ] Any conflicting guidance?

---

## Human Expertise Preservation

### Expert Knowledge Capture

When team experts leave or rotate:

1. **Exit Interview**: Capture undocumented knowledge
2. **Documentation Sprint**: Convert tacit to explicit
3. **Pairing Sessions**: Record expert reasoning
4. **Decision History**: Document the "why" behind choices

### Skill Maintenance

Ensure human expertise doesn't atrophy:

| Activity | Frequency | Purpose |
|----------|-----------|---------|
| Manual Code Review | Weekly | Maintain code reading skills |
| Architecture Discussion | Monthly | Keep design skills sharp |
| Incident Response | As-needed | Maintain troubleshooting skills |
| Knowledge Contribution | Weekly | Practice articulating expertise |

---

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
