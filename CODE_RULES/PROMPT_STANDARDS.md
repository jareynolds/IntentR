# PROMPT STANDARDS
**Version**: 1.1.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)
**Change Log**: v1.1.0 - Added Options & Recommendations requirement, Specification Verification requirement

---

## Overview

This document defines standards for how humans should communicate intent to AI agents within the INTENT framework. Effective prompting is a skill that directly impacts the quality of AI-derived artifacts. Poor prompts lead to ambiguous outputs, rework, and intent drift.

**Core Principle**: The quality of AI output is bounded by the quality of human input. Invest in prompt clarity.

---

## AI Response Requirements

### Options and Recommendations Requirement

For **Discovery**, **Design**, and **Implementation** prompts, AI agents MUST:

1. **Propose Multiple Options**: Present 2-4 viable approaches when decisions are required
2. **Provide Recommendation**: Clearly state which option is recommended
3. **Explain Rationale**: Justify the recommendation with specific reasons

**Response Format**:
```
OPTIONS ANALYSIS

Option 1: [Name]
- Description: [What this approach entails]
- Pros: [Benefits]
- Cons: [Drawbacks]
- Effort: [Low / Medium / High]

Option 2: [Name]
- Description: [What this approach entails]
- Pros: [Benefits]
- Cons: [Drawbacks]
- Effort: [Low / Medium / High]

Option 3: [Name]
- Description: [What this approach entails]
- Pros: [Benefits]
- Cons: [Drawbacks]
- Effort: [Low / Medium / High]

RECOMMENDATION: Option [X] - [Name]

RATIONALE:
[Detailed explanation of why this option is recommended, considering:
- Alignment with existing patterns
- Technical fit
- Effort vs. value trade-off
- Risk considerations
- Long-term maintainability]

DECISION REQUIRED: Please confirm your preferred approach before I proceed.
```

**When to Apply**:
| Prompt Category | Options Required When |
|-----------------|----------------------|
| Discovery | Multiple valid ways to structure capabilities/enablers |
| Design | Architectural choices, technology selection, pattern options |
| Implementation | Algorithm choices, library selection, implementation approaches |

**Exceptions** (single approach acceptable):
- Explicit pattern/approach specified in prompt
- Only one viable option exists
- Following established ADR or team decision
- Bug fix with clear solution

---

### Specification Verification Requirement (Implementation Prompts)

Before proceeding with any **Implementation** request, AI agents MUST:

1. **Check for Existing Specification**: Verify if the implementation references an existing Capability (CAP-XXXXXX) or Enabler (ENB-XXXXXX)
2. **Notify User if Missing**: If no specification exists, explicitly inform the user
3. **Request Confirmation**: Ask if the user wants to proceed and whether specifications should be created

**Required AI Response When No Specification Exists**:
```
SPECIFICATION CHECK

I notice this implementation request is not linked to an existing
Capability or Enabler specification.

Current Request: [Summary of what was requested]

Per INTENT methodology, implementations should be derived from
approved specifications to ensure:
- Intent is captured before code
- Proper approval workflows are followed
- Traceability from requirement to implementation

OPTIONS:

1. CREATE SPECIFICATIONS FIRST (Recommended)
   - I will create the necessary Capability and/or Enabler documents
   - You review and approve before implementation proceeds
   - Follows full INTENT workflow

2. PROCEED WITHOUT SPECIFICATIONS
   - I will implement as requested
   - Specifications can be created retroactively (Discovery mode)
   - Risk: May result in intent drift

3. USE DISCOVERY MODE
   - I will analyze the request and create specifications only
   - No implementation until specifications are approved
   - You can then request implementation in a follow-up

Please confirm:
- [ ] Which option do you prefer? (1, 2, or 3)
- [ ] If Option 1: Should I create a new Capability, Enabler, or both?
- [ ] If Option 2: Do you want me to create specifications afterward?
```

**Decision Tree**:
```
Implementation Request Received
            │
            ▼
┌───────────────────────────┐
│ Specification Referenced? │
└───────────────────────────┘
            │
       No   │   Yes
            │    │
            ▼    ▼
┌──────────────┐ ┌───────────────────┐
│ STOP & NOTIFY│ │ Verify Approval   │
│ User         │ │ Status = Approved │
└──────────────┘ └───────────────────┘
            │              │
            ▼         Yes  │  No
┌──────────────┐           │   │
│ Present      │           │   ▼
│ 3 Options    │           │ ┌──────────────┐
└──────────────┘           │ │ STOP: Not    │
            │              │ │ Approved     │
            ▼              │ └──────────────┘
┌──────────────┐           │
│ Await User   │           │
│ Decision     │◄──────────┘
└──────────────┘
            │
            ▼
    Proceed per choice
```

---

## The INTENT Prompt Model

### Structure: CIDER

Every prompt to an AI agent should follow the **CIDER** model:

| Element | Description | Required |
|---------|-------------|----------|
| **C**ontext | Background information, current state, relevant history | Yes |
| **I**ntent | What you want to achieve (the "why") | Yes |
| **D**eliverables | Specific outputs expected (the "what") | Yes |
| **E**xamples | Concrete samples of expected input/output | Recommended |
| **R**estrictions | Constraints, anti-patterns, what NOT to do | Recommended |

### Example: Good vs Poor Prompts

**Poor Prompt:**
```
Make the login faster
```

**Good Prompt (CIDER Model):**
```
CONTEXT:
- Current login flow takes 3.2 seconds average
- Bottleneck identified in JWT token generation (2.1s)
- Using HS256 algorithm with 4096-bit key
- Auth service at internal/auth/token.go

INTENT:
Reduce login response time to under 500ms while maintaining security standards.

DELIVERABLES:
1. Optimized token generation code
2. Performance comparison (before/after)
3. Security impact assessment

EXAMPLES:
- Current: POST /login → 3200ms response
- Target: POST /login → <500ms response

RESTRICTIONS:
- Do NOT reduce key size below 2048 bits
- Do NOT switch to symmetric-only authentication
- Do NOT modify the token payload structure (breaks existing clients)
- Must remain compatible with existing refresh token flow
```

---

## Prompt Categories

### Category 1: Discovery Prompts

**Purpose**: Analyze existing code, understand architecture, document systems.

**Required Elements**:
- Scope boundaries (which directories/files)
- Output format (capability docs, enabler docs, diagrams)
- Depth level (surface scan vs deep analysis)

**AI Response Requirement**: Present options for capability/enabler structure with recommendation. See [Options and Recommendations Requirement](#options-and-recommendations-requirement).

**Template**:
```
DISCOVERY REQUEST

Scope: [directories/files to analyze]
Boundary: [explicit exclusions]
Output Format: [capability specs / enabler specs / architecture diagram / etc.]
Depth: [surface / moderate / comprehensive]
Focus Areas: [specific aspects to emphasize]

Context:
[Why this discovery is needed, what decisions it will inform]
```

**Example**:
```
DISCOVERY REQUEST

Scope: internal/auth/
Boundary: Exclude test files, focus on production code only
Output Format: Capability and Enabler specifications
Depth: Comprehensive
Focus Areas: Authentication flows, token management, OAuth integration

Context:
We're planning to add MFA support. Need to understand current auth
architecture before designing the enhancement.
```

**Expected AI Response Pattern**:
```
DISCOVERY ANALYSIS: internal/auth/

I've analyzed the authentication module. Here are options for
structuring the capability/enabler hierarchy:

OPTIONS ANALYSIS

Option 1: Single Capability with Multiple Enablers
- Description: One "User Authentication" capability containing
  JWT, OAuth, and Session enablers
- Pros: Simple hierarchy, clear ownership
- Cons: Large capability scope, may be hard to manage
- Effort: Low

Option 2: Separate Capabilities by Auth Method
- Description: Separate capabilities for "JWT Authentication",
  "OAuth Integration", "Session Management"
- Pros: Fine-grained control, independent workflows
- Cons: More documents to maintain, potential overlap
- Effort: Medium

Option 3: Layered Capabilities
- Description: Base "Authentication Core" capability with
  "Authentication Methods" capability depending on it
- Pros: Clean separation of concerns, reusable core
- Cons: More complex dependency management
- Effort: Medium

RECOMMENDATION: Option 1 - Single Capability with Multiple Enablers

RATIONALE:
The current codebase shows tight coupling between auth methods.
A single capability with clear enabler boundaries provides:
- Easier approval workflow (one capability to approve)
- Matches current code organization
- Sufficient granularity for MFA addition

DECISION REQUIRED: Please confirm your preferred structure.
```

---

### Category 2: Implementation Prompts

**Purpose**: Generate code, implement features, fix bugs.

**Required Elements**:
- Reference to approved specification (capability/enabler ID)
- Acceptance criteria
- Patterns to follow (existing code references)
- Test requirements

**AI Response Requirements**:
1. **Specification Verification**: Check for existing capability/enabler before implementing. See [Specification Verification Requirement](#specification-verification-requirement-implementation-prompts).
2. **Options Analysis**: Present implementation approach options with recommendation. See [Options and Recommendations Requirement](#options-and-recommendations-requirement).

**Template**:
```
IMPLEMENTATION REQUEST

Specification Reference: [CAP-XXXXXX / ENB-XXXXXX]
Requirement: [FR-XXXXXX / NFR-XXXXXX]

Task:
[Specific implementation task]

Acceptance Criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]

Patterns to Follow:
- [Reference to existing similar code]
- [Coding conventions to apply]

Test Requirements:
- Unit tests: [yes/no, coverage target]
- Integration tests: [yes/no]
- Gherkin scenarios: [reference TS-XXXXXX]

Restrictions:
- [What NOT to do]
```

**When Specification is Missing** (AI must respond):
```
SPECIFICATION CHECK

I notice this implementation request does not reference an existing
Capability or Enabler specification:

Request: "Add user profile photo upload feature"

Per INTENT methodology, implementations should be derived from
approved specifications. This ensures:
- Intent is captured before code
- Proper approval workflows are followed
- Traceability from requirement to implementation

OPTIONS:

1. CREATE SPECIFICATIONS FIRST (Recommended)
   - I will create:
     - Capability: "User Profile Management" (if not exists)
     - Enabler: "Profile Photo Upload"
   - You review and approve before implementation
   - Follows full INTENT workflow

2. PROCEED WITHOUT SPECIFICATIONS
   - I will implement the feature directly
   - Specifications can be created retroactively
   - Risk: Intent drift, no approval trail

3. USE DISCOVERY MODE
   - I will analyze requirements and create specifications only
   - No implementation until you approve
   - Implementation in follow-up request

Please confirm your preference before I proceed.
```

**When Specification Exists** (AI proceeds with options):
```
IMPLEMENTATION ANALYSIS: ENB-654321 - Profile Photo Upload

Specification verified: ENB-654321 (Approved)
Parent Capability: CAP-123456 (Approved)
Requirements: FR-789012, FR-789013, NFR-789014

OPTIONS ANALYSIS

Option 1: Local File Storage
- Description: Store photos in local filesystem, serve via static endpoint
- Pros: Simple, no external dependencies, fast for small scale
- Cons: Not scalable, no CDN, single point of failure
- Effort: Low

Option 2: Cloud Storage (S3/GCS)
- Description: Upload to cloud storage, use signed URLs
- Pros: Scalable, CDN support, reliable
- Cons: External dependency, cost, slightly more complex
- Effort: Medium

Option 3: Database BLOB Storage
- Description: Store photos directly in PostgreSQL
- Pros: Single data store, transactional with user data
- Cons: Database bloat, slower queries, not recommended for large files
- Effort: Low

RECOMMENDATION: Option 2 - Cloud Storage (S3/GCS)

RATIONALE:
- Matches existing pattern for document uploads (see internal/docs/storage.go)
- Scales with user growth
- NFR-789014 requires 99.9% availability (cloud storage provides this)
- Cost-effective for expected photo sizes (<5MB)

DECISION REQUIRED: Please confirm your preferred approach.
```

---

### Category 3: Design Prompts

**Purpose**: Create technical designs, API specs, data models.

**Required Elements**:
- Business context (what problem are we solving)
- Integration points (what existing systems does this touch)
- Non-functional requirements (performance, security, scalability)
- Constraints

**AI Response Requirement**: Present architectural/design options with recommendation. See [Options and Recommendations Requirement](#options-and-recommendations-requirement).

**Template**:
```
DESIGN REQUEST

Capability: [CAP-XXXXXX - Name]
Business Context: [Problem being solved]

Design Scope:
- [ ] API design
- [ ] Data model
- [ ] Sequence diagrams
- [ ] Component architecture

Integration Points:
- [Existing service/component this interacts with]

Non-Functional Requirements:
- Performance: [specific targets]
- Security: [requirements]
- Scalability: [expectations]

Constraints:
- [Technical limitations]
- [Business rules]
- [Compliance requirements]

Output Format:
[Mermaid diagrams / OpenAPI spec / markdown tables / etc.]
```

**Expected AI Response Pattern**:
```
DESIGN ANALYSIS: CAP-456789 - Real-time Notifications

Business Context: Users need immediate notification of approval status changes.

OPTIONS ANALYSIS

Option 1: WebSocket-based Push Notifications
- Description: Persistent WebSocket connection, server pushes events
- Pros: Real-time (<100ms), bi-directional, efficient for frequent updates
- Cons: Connection management complexity, scaling challenges
- Effort: Medium
- Architecture:
  ```
  Client ←WebSocket→ Notification Service → Message Queue → Event Source
  ```

Option 2: Server-Sent Events (SSE)
- Description: HTTP-based server push, simpler than WebSocket
- Pros: Simpler implementation, HTTP-native, auto-reconnect
- Cons: Unidirectional only, some proxy issues
- Effort: Low
- Architecture:
  ```
  Client ←SSE→ Notification Service → Event Source
  ```

Option 3: Polling with Long-Poll Fallback
- Description: Client polls every N seconds, long-poll for near-real-time
- Pros: Simple, works everywhere, no special infrastructure
- Cons: Higher latency, more server load, not truly real-time
- Effort: Low
- Architecture:
  ```
  Client →Poll→ Notification Service → Database
  ```

Option 4: Hybrid (WebSocket + SSE Fallback)
- Description: WebSocket primary, SSE fallback for unsupported clients
- Pros: Best of both worlds, graceful degradation
- Cons: More code to maintain, testing complexity
- Effort: High

RECOMMENDATION: Option 1 - WebSocket-based Push Notifications

RATIONALE:
- NFR requires <500ms notification latency (rules out Option 3)
- Existing collaboration feature uses WebSocket (reuse infrastructure)
- Bi-directional needed for future features (read receipts, typing indicators)
- Team has WebSocket experience from collaboration server

TRADE-OFF ACKNOWLEDGMENT:
- Accept complexity of connection management
- Mitigate scaling with existing Socket.IO cluster setup

DECISION REQUIRED: Please confirm your preferred architecture.
```

---

### Category 4: Review Prompts

**Purpose**: Review code, specifications, or designs for quality.

**Required Elements**:
- What to review (file paths, PR reference, doc reference)
- Review criteria (what aspects to evaluate)
- Severity classification expectations

**Template**:
```
REVIEW REQUEST

Subject: [file paths / PR #XXX / specification ID]

Review Criteria:
- [ ] Code correctness
- [ ] Security vulnerabilities
- [ ] Performance concerns
- [ ] Adherence to patterns
- [ ] Test coverage
- [ ] Documentation quality

Severity Classification:
- CRITICAL: [definition for this review]
- HIGH: [definition]
- MEDIUM: [definition]
- LOW: [definition]

Output Format:
| Location | Severity | Issue | Recommendation |
```

---

### Category 5: Refactoring Prompts

**Purpose**: Improve existing code without changing behavior.

**Required Elements**:
- Current state (what exists)
- Target state (what improvement looks like)
- Behavior preservation requirements
- Test verification approach

**Template**:
```
REFACTORING REQUEST

Current State:
- File(s): [paths]
- Issue: [what's wrong - code smell, performance, maintainability]

Target State:
- [Specific improvement expected]

Behavior Preservation:
- Existing tests that must continue to pass: [test file paths]
- Manual verification steps: [if applicable]

Refactoring Approach:
- [ ] Extract method/function
- [ ] Rename for clarity
- [ ] Simplify conditionals
- [ ] Remove duplication
- [ ] Improve error handling
- [ ] Other: [specify]

Restrictions:
- Do NOT change: [public interfaces / API contracts / etc.]
```

---

## Anti-Patterns to Avoid

### 1. Vague Intent
**Bad**: "Make it better"
**Good**: "Reduce cyclomatic complexity in handleAuth() from 15 to under 10"

### 2. Missing Context
**Bad**: "Add validation"
**Good**: "Add email format validation to the user registration endpoint (POST /users) following the validation pattern used in internal/validation/rules.go"

### 3. Unbounded Scope
**Bad**: "Refactor the codebase"
**Good**: "Refactor the authentication module (internal/auth/) to use the repository pattern, following the example in internal/users/repository.go"

### 4. Implicit Assumptions
**Bad**: "Use the standard approach"
**Good**: "Use Go's standard library net/http (not Gin) consistent with existing services"

### 5. Missing Restrictions
**Bad**: "Optimize the database queries"
**Good**: "Optimize the user lookup query in GetUserByEmail(). Do NOT add new indexes without approval. Do NOT denormalize the schema."

### 6. No Examples
**Bad**: "Format the output correctly"
**Good**: "Format dates as ISO 8601 (e.g., '2025-12-24T10:30:00Z'), amounts as decimal with 2 places (e.g., '1234.56')"

---

## Context Provision Guidelines

### What Context to Include

| Context Type | When to Include | Example |
|--------------|-----------------|---------|
| **File References** | Always for code tasks | "See internal/auth/handler.go:45-67" |
| **Specification IDs** | For any implementation | "Per ENB-123456, FR-789012" |
| **Pattern References** | When following existing patterns | "Follow pattern in pkg/repository/base.go" |
| **Previous Decisions** | When building on prior work | "Per ADR-003, we chose PostgreSQL over MongoDB" |
| **Constraints** | When limits exist | "Must complete in <100ms per NFR-345678" |
| **Business Rules** | For domain logic | "Users can only have one active subscription" |

### What Context to Omit

- Irrelevant historical information
- Already-known framework defaults
- Information the AI can derive from code
- Speculative future requirements

---

## Prompt Complexity Levels

### Level 1: Simple (Single Action)
- One clear task
- Minimal context needed
- Example: "Add null check to line 45 of handler.go"

### Level 2: Moderate (Multi-Step)
- Related set of changes
- Some context required
- Example: "Implement the login endpoint per ENB-123456"

### Level 3: Complex (Feature Implementation)
- Full feature with multiple components
- Extensive context required
- Should reference complete specification
- Example: "Implement MFA capability per CAP-456789"

### Level 4: Strategic (Architecture/Design)
- System-level decisions
- Requires business context
- Should involve human review at multiple points
- Example: "Design event-driven architecture for notification system"

---

## Verification Prompts

After receiving AI output, use verification prompts to ensure quality:

### Completeness Check
```
Verify that your implementation:
1. Addresses all acceptance criteria in [specification]
2. Includes error handling for: [list edge cases]
3. Has test coverage for: [list scenarios]
```

### Consistency Check
```
Confirm that your changes:
1. Follow naming conventions in [reference file]
2. Use error handling pattern from [reference file]
3. Match the API style of existing endpoints
```

### Restriction Compliance
```
Confirm that you did NOT:
1. [Restriction 1]
2. [Restriction 2]
3. [Restriction 3]
```

---

## Prompt Templates Library

### Template: Bug Fix
```
BUG FIX REQUEST

Issue: [Description of the bug]
Reproduction: [Steps to reproduce]
Expected: [What should happen]
Actual: [What currently happens]

Location: [File path and line numbers if known]
Related: [Related issues, PRs, or discussions]

Restrictions:
- Minimize scope of changes
- Do not refactor unrelated code
- Preserve existing test behavior
```

### Template: New Endpoint
```
NEW ENDPOINT REQUEST

Specification: ENB-XXXXXX
Requirement: FR-XXXXXX

Endpoint: [METHOD] [path]
Purpose: [What this endpoint does]

Request:
- Headers: [required headers]
- Body: [schema or example]

Response:
- Success (200): [schema or example]
- Error (4xx): [error response format]

Authentication: [required / optional / none]
Authorization: [role requirements]

Follow patterns from: [existing endpoint reference]
```

### Template: Database Migration
```
MIGRATION REQUEST

Purpose: [Why this migration is needed]
Specification: ENB-XXXXXX

Changes:
- [ ] New table: [table name, columns]
- [ ] Alter table: [table name, changes]
- [ ] New index: [table, columns]
- [ ] Data migration: [description]

Rollback Plan: [How to reverse this migration]

Restrictions:
- Must be backwards compatible with current code
- Must complete in under [X] seconds for production data volume
- Do not drop columns without deprecation period
```

---

## Quality Metrics

### Prompt Quality Scorecard

| Criterion | Weight | Score (1-5) |
|-----------|--------|-------------|
| Context completeness | 20% | |
| Intent clarity | 25% | |
| Deliverables specificity | 20% | |
| Examples provided | 15% | |
| Restrictions defined | 20% | |
| **Total** | 100% | |

**Scoring Guide**:
- 5: Exceptional - No ambiguity, comprehensive
- 4: Good - Minor gaps, clear overall
- 3: Adequate - Some ambiguity, workable
- 2: Poor - Significant gaps, likely rework
- 1: Inadequate - Major rewrites needed

**Target**: All prompts for Level 3+ complexity should score 4.0 or higher.

---

## Integration with INTENT Workflow

| Workflow Stage | Prompt Category | Key Focus |
|----------------|-----------------|-----------|
| Discovery | Discovery Prompts | Scope boundaries, output format |
| Specification | Design Prompts | Business context, constraints |
| Definition | Design Prompts | Technical integration points |
| Design | Design Prompts | NFRs, patterns, examples |
| Implementation | Implementation Prompts | Spec references, acceptance criteria |
| Testing | Review Prompts | Test coverage, scenario validation |
| Refactoring | Refactoring Prompts | Behavior preservation |

---

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
