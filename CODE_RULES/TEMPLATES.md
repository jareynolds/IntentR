# INTENT Document Templates

**Part of**: MAIN_SWDEV_PLAN.md
**Framework**: INTENT (Scaled Agile With AI)

---

## Capability Template

```markdown
# [Capability Name]

## Metadata
- **Name**: [Business Function Name]
- **Type**: Capability
- **System**: [System Name]
- **Component**: [Component Name]
- **ID**: CAP-XXXXXX
- **Owner**: [Team/Person]
- **Status**: [Current State]
- **Approval**: Not Approved
- **Priority**: [High/Medium/Low]
- **Analysis Review**: [Required/Not Required]

## Business Context

### Problem Statement
[What specific problem does this capability solve? Be concrete.]

### Value Proposition
[Why does this matter to users/business? Quantify if possible.]

### Success Metrics
- [Metric 1: e.g., "Reduce login time by 50%"]
- [Metric 2: e.g., "Support 10,000 concurrent users"]

## User Perspective

### Primary Persona
[Who benefits most from this capability?]

### User Journey (Before/After)
**Before**: [Current painful experience]
**After**: [Improved experience with this capability]

### User Scenarios
1. **Scenario 1**: [Concrete example with specific inputs/outputs]
2. **Scenario 2**: [Another concrete example]
3. **Scenario 3**: [Edge case scenario]

## Boundaries

### In Scope
- [Explicitly what IS included]

### Out of Scope
- [Explicitly what is NOT included]

### Assumptions
- [What we're assuming to be true]

### Constraints
- [Technical, business, or regulatory limits]

## Enablers
| ID | Name | Purpose | State |
|----|------|---------|-------|
| ENB-XXXXXX | [Name] | [One-line purpose] | [state] |

## Dependencies

### Internal Upstream Dependency
| Capability ID | Description |
|---------------|-------------|
| | |

### Internal Downstream Impact
| Capability ID | Description |
|---------------|-------------|
| | |

## Acceptance Criteria
- [ ] [Specific, testable criterion with verification method]
- [ ] [Another criterion]

## Technical Specifications (Template)

### Capability Dependency Flow Diagram
```mermaid
flowchart TD
    %% Current Capability
    CURRENT["Current Capability<br/>Primary Business Function<br/>🎯"]

    %% Internal Capabilities (Same Organization)
    INT1["Supporting Capability A<br/>Core Service<br/>⚙️"]
    INT2["Supporting Capability B<br/>Data Management<br/>📊"]

    %% External Capabilities (Different Organization)
    EXT1["External Capability A<br/>Third-party Service<br/>🌐"]

    %% Dependencies Flow
    INT1 --> CURRENT
    CURRENT --> INT2
    EXT1 --> CURRENT

    %% Styling
    classDef current fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef internal fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px

    class CURRENT current
    class INT1,INT2 internal
    class EXT1 external
` ` `

## Design Artifacts
- [Link to Figma/design files]
- [Link to wireframes]

## Approval History
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
```

---

## Enabler Template

```markdown
# [Enabler Name]

## Metadata
- **Name**: [Enabler Name]
- **Type**: Enabler
- **ID**: ENB-XXXXXX
- **Capability ID**: CAP-XXXXXX
- **Owner**: Product Team
- **Status**: In Draft
- **Approval**: Not Approved
- **Priority**: High
- **Analysis Review**: Required
- **Code Review**: Not Required

## Technical Context

### Purpose
[One paragraph: what this enabler does technically]

### Architecture Fit
[How does this fit into the existing system architecture?]

### Existing Patterns to Follow
- [Pattern 1: e.g., "Use repository pattern from /internal/auth/repository.go"]
- [Pattern 2: e.g., "Follow error handling style in /pkg/errors"]

## Functional Requirements
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-XXXXXX | [Name] | [Requirement Description] | [Status] | [Priority] | [Approval] |

## Non-Functional Requirements
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-XXXXXX | [Name] | [Requirement Description] | [Type] | [Status] | [Priority] | [Approval] |

## Technical Specifications (Template)

### Enabler Dependency Flow Diagram
```mermaid
flowchart TD
    ENB_XXXXXX["ENB-XXXXXX<br/>[Enabler Name]<br/>📡"]

    %% Add your dependency flows here

    classDef enabler fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    class ENB_XXXXXX enabler
` ` `

### API Technical Specifications (if applicable)
| API Type | Operation | Channel / Endpoint | Description | Request Payload | Response Data |
|----------|-----------|-------------------|-------------|-----------------|---------------|
| | | | | | |

### Data Models
```mermaid
erDiagram
    Entity {
        string id PK
        string name
        string description
    }

    %% Add relationships and more entities here
` ` `

### Class Diagrams
```mermaid
classDiagram
    class ENB_XXXXXX_Class {
        +String property
        +method() void
    }

    %% Add more classes and relationships here
` ` `

### Sequence Diagrams
```mermaid
sequenceDiagram
    participant A as Actor
    participant S as System

    A->>S: Request
    S-->>A: Response

    %% Add more interactions here
` ` `

### Dataflow Diagrams
```mermaid
flowchart TD
    Input[Input Data] --> Process[Process]
    Process --> Output[Output Data]

    %% Add your dataflow diagrams here
` ` `

### State Diagrams
```mermaid
stateDiagram-v2
    [*] --> Initial
    Initial --> Processing
    Processing --> Complete
    Complete --> [*]

    %% Add more states and transitions here
` ` `

## Edge Cases and Error Handling
| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| Null input | Return 400 error | `test_null_input()` |
| Duplicate entry | Return 409 conflict | `test_duplicate()` |

## External Dependencies
[External dependencies, APIs, services]

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-XXXXXX - [Enabler Name] Tests

```gherkin
@TST-XXXXXX
Feature: [Enabler Name]
  As a [user role]
  I want to [action/goal]
  So that [business value/outcome]

  Background:
    Given [common preconditions]

  @TS-XXXXXX @FR-XXXXXX @critical
  Scenario: [Scenario Name]
    Given [precondition]
    When [action]
    Then [expected outcome]
    And [additional assertion]

  @TS-XXXXXX @FR-XXXXXX
  Scenario Outline: [Parameterized Scenario Name]
    Given [precondition with "<variable>"]
    When [action with "<variable>"]
    Then [expected "<result>"]

    Examples:
      | variable | result |
      | value1   | outcome1 |
      | value2   | outcome2 |
` ` `

### Test Scenario Summary
| Scenario ID | Name | Requirement | Priority | Status | Automation |
|-------------|------|-------------|----------|--------|------------|
| TS-XXXXXX | [Scenario Name] | FR-XXXXXX | Critical | Draft | Pending |

## Test Architecture
- **Framework**: [Jest/Vitest/godog/Cucumber.js]
- **Coverage Target**: [80%+]
- **Test Types**: [Unit, Integration, E2E]
- **Step Definition Location**: [path/to/steps]
- **Feature File Location**: [path/to/features]

## Testing Strategy

### Unit Testing
- [Component/function level tests]

### Integration Testing
- [Service integration tests]

### End-to-End Testing
- [User journey tests]

## Implementation Hints

### Suggested Approach
[High-level approach recommendation]

### Known Gotchas
- [Gotcha 1]
- [Gotcha 2]

### Reference Implementations
- [Link to similar code in codebase]

## Approval History
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
```
