# IntentR Capability and Enabler Markdown Structure Analysis

**Analysis Date**: December 27, 2025
**Purpose**: Document the exact field names and section headers used in capability and enabler markdown files to ensure sync-code-to-spec analysis produces properly structured updates.

---

## Executive Summary

The IntentR codebase uses a standardized markdown format for capabilities and enablers, defined in `CODE_RULES/TEMPLATES.md`. The React components (`Capabilities.tsx` and `Enablers.tsx`) parse these markdown files by extracting specific section headers and metadata fields.

This document provides the exact field names and section headers for both capability and enabler markdown files, along with parsing examples from the React code.

---

## Part 1: CAPABILITY MARKDOWN STRUCTURE

### Metadata Section (Capability)

**Location in Markdown**: `## Metadata`

**Fields** (as bullet points):
```
- **Name**: [Capability Name]
- **Type**: Capability
- **System**: [System Name]
- **Component**: [Component Name]
- **ID**: CAP-XXXXXX
- **Owner**: [Team/Person]
- **Status**: [Current State]
- **Approval**: [Not Approved/Approved/Rejected]
- **Priority**: [High/Medium/Low]
- **Analysis Review**: [Required/Not Required]
```

**Field Names (for programmatic parsing)**:
- `Name`
- `Type`
- `System`
- `Component`
- `ID`
- `Owner`
- `Status`
- `Approval`
- `Priority`
- `Analysis Review`

---

### Business Context Section (Capability)

**Location in Markdown**: `## Business Context`

**Subsections**:
```
### Problem Statement
[Description of the problem]

### Value Proposition
[Why it matters]

### Business Value (Optional)
[Quantified business impact]

### Success Metrics
- [Metric 1]
- [Metric 2]
```

---

### User Perspective Section (Capability)

**Location in Markdown**: `## User Perspective`

**Subsections**:
```
### Primary Persona
[User profile]

### Target Users
[List of user types]

### User Journey (Before/After)
**Before**: [Current experience]
**After**: [Improved experience]

### User Scenarios
1. **Scenario 1**: [Description]
2. **Scenario 2**: [Description]
```

---

### Boundaries Section (Capability)

**Location in Markdown**: `## Boundaries`

**Subsections**:
```
### In Scope
- [Item 1]
- [Item 2]

### Out of Scope
- [Item 1]
- [Item 2]

### Assumptions
- [Assumption 1]
- [Assumption 2]

### Constraints
- [Constraint 1]
- [Constraint 2]
```

---

### Enablers Section (Capability)

**Location in Markdown**: `## Enablers`

**Format**: Markdown table
```
| ID | Name | Purpose | State |
|----|------|---------|-------|
| ENB-XXXXXX | [Name] | [One-line purpose] | [state] |
```

---

### Dependencies Section (Capability)

**Location in Markdown**: `## Dependencies`

**Subsections**:
```
### Internal Upstream Dependency
| Capability ID | Description |
|---------------|-------------|
| CAP-XXXXXX | [Description] |

### Internal Downstream Impact
| Capability ID | Description |
|---------------|-------------|
| CAP-XXXXXX | [Description] |
```

---

### Acceptance Criteria Section (Capability)

**Location in Markdown**: `## Acceptance Criteria`

**Format**: Checklist
```
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]
```

---

### Technical Specifications Section (Capability)

**Location in Markdown**: `## Technical Specifications (Template)` or `## Technical Specifications`

**Subsections**:
```
### Capability Dependency Flow Diagram
[Mermaid flowchart code]

### Optional: Mermaid Diagrams
[Various diagram types]
```

---

### Design Artifacts Section (Capability)

**Location in Markdown**: `## Design Artifacts`

**Format**: Link list
```
- [Link to Figma/design files]
- [Link to wireframes]
```

---

### Approval History Section (Capability)

**Location in Markdown**: `## Approval History`

**Format**: Markdown table
```
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| [Date] | [Stage] | [Approved/Rejected] | [Person] | [Notes] |
```

---

### Related Stories Section (Optional in newer docs)

**Location in Markdown**: `## Related Stories`

**Format**: List with wiki-style links
```
- [[STORY-NAME]]
- [[STORY-NAME]]
```

---

## Part 2: ENABLER MARKDOWN STRUCTURE

### Metadata Section (Enabler)

**Location in Markdown**: `## Metadata`

**Fields** (as bullet points):
```
- **Name**: [Enabler Name]
- **Type**: Enabler
- **ID**: ENB-XXXXXX
- **Capability ID**: CAP-XXXXXX
- **Owner**: Product Team
- **Status**: [In Draft/Ready for Analysis/In Analysis/Ready for Design/In Design/Ready for Implementation/In Implementation/Implemented/In Testing/Tested]
- **Approval**: [Pending/Approved/Rejected]
- **Priority**: [High/Medium/Low]
- **Analysis Review**: [Required/Not Required]
- **Code Review**: [Required/Not Required]
```

**Field Names (for programmatic parsing)**:
- `Name`
- `Type`
- `ID`
- `Capability ID`
- `Owner`
- `Status`
- `Approval`
- `Priority`
- `Analysis Review`
- `Code Review`

---

### Technical Context Section (Enabler)

**Location in Markdown**: `## Technical Context`

**Subsections**:
```
### Purpose
[One paragraph: what this enabler does technically]

### Architecture Fit
[How it fits into the system architecture]

### Existing Patterns to Follow
- [Pattern 1: e.g., "Use repository pattern from /internal/auth/repository.go"]
- [Pattern 2: e.g., "Follow error handling style in /pkg/errors"]
```

---

### Functional Requirements Section (Enabler)

**Location in Markdown**: `## Functional Requirements`

**Format**: Markdown table
```
| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-XXXXXX | [Name] | [Requirement Description] | [Status] | [Priority] | [Approval] |
```

---

### Non-Functional Requirements Section (Enabler)

**Location in Markdown**: `## Non-Functional Requirements`

**Format**: Markdown table
```
| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-XXXXXX | [Name] | [Requirement Description] | [Type] | [Status] | [Priority] | [Approval] |
```

---

### Technical Specifications Section (Enabler)

**Location in Markdown**: `## Technical Specifications` (replaces `(Template)` after design phase)

**Subsections** (all are optional but documented below):
```
### Enabler Dependency Flow Diagram
[Mermaid flowchart]

### API Technical Specifications (if applicable)
| API Type | Operation | Channel / Endpoint | Description | Request Payload | Response Data |
|----------|-----------|-------------------|-------------|-----------------|---------------|
| [Type] | [Op] | [Endpoint] | [Desc] | [Request] | [Response] |

### Data Models
[Mermaid ER diagram]

### Class Diagrams
[Mermaid class diagram]

### Sequence Diagrams
[Mermaid sequence diagram]

### Dataflow Diagrams
[Mermaid flowchart]

### State Diagrams
[Mermaid state diagram]

### Implementation Details (From newer docs)
- **Enable Type**: [service/library/UI component/data pipeline/infra module/policy/runbook]
- **Responsibility**: [Single responsibility statement]
- **Public Interface**: [Endpoints/functions/events with signatures]
- **Internal Design**: [Key algorithms, data structures, invariants]
- **Dependencies**: [Packages, services, cloud resources]
- **Configuration**: [Environment variables, feature flags, secrets, defaults]
- **Data Contracts**: [Schemas, versioning strategy, migrations]
- **Operational Requirements**: [SLOs, scaling, quotas, rate limits]
- **Security Controls**: [Authn/authz, encryption, secret handling, audit logs]
- **Testing Strategy**: [Unit/contract/integration/e2e; test data approach]
- **Observability**: [Logs/metrics/traces, dashboards, alerts]
- **Deployment**: [Build steps, runtime, rollback, canary strategy]
- **Runbook**: [Failure modes + remediation]
- **Cost Profile**: [Main cost drivers and guardrails]
```

---

### Edge Cases and Error Handling Section (Enabler)

**Location in Markdown**: `## Edge Cases and Error Handling`

**Format**: Markdown table
```
| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| [Scenario] | [Expected result] | [Test name] |
```

---

### External Dependencies Section (Enabler)

**Location in Markdown**: `## External Dependencies`

**Format**: List
```
[External dependencies, APIs, services]
- [Dependency 1]
- [Dependency 2]
```

---

### Acceptance Scenarios (Gherkin) Section (Enabler)

**Location in Markdown**: `## Acceptance Scenarios (Gherkin)`

**Subsection**:
```
### Test Suite: TST-XXXXXX - [Enabler Name] Tests

[Gherkin feature code block]
@TST-XXXXXX
Feature: [Feature name]
  As a [user role]
  I want to [action]
  So that [outcome]

  @TS-XXXXXX @FR-XXXXXX @critical
  Scenario: [Scenario name]
    Given [precondition]
    When [action]
    Then [expected outcome]
```

---

### Test Scenario Summary Section (Enabler)

**Location in Markdown**: `## Test Scenario Summary`

**Format**: Markdown table
```
| Scenario ID | Name | Requirement | Priority | Status | Automation |
|-------------|------|-------------|----------|--------|------------|
| TS-XXXXXX | [Name] | FR-XXXXXX | Critical | Draft | Pending |
```

---

### Test Architecture Section (Enabler)

**Location in Markdown**: `## Test Architecture`

**Fields**:
```
- **Framework**: [Jest/Vitest/godog/Cucumber.js]
- **Coverage Target**: [80%+]
- **Test Types**: [Unit, Integration, E2E]
- **Step Definition Location**: [path/to/steps]
- **Feature File Location**: [path/to/features]
```

---

### Testing Strategy Section (Enabler)

**Location in Markdown**: `## Testing Strategy`

**Subsections**:
```
### Unit Testing
- [Component/function level tests]

### Integration Testing
- [Service integration tests]

### End-to-End Testing
- [User journey tests]
```

---

### Implementation Hints Section (Enabler)

**Location in Markdown**: `## Implementation Hints`

**Subsections**:
```
### Suggested Approach
[High-level approach recommendation]

### Known Gotchas
- [Gotcha 1]
- [Gotcha 2]

### Reference Implementations
- [Link to similar code in codebase]
```

---

### Approval History Section (Enabler)

**Location in Markdown**: `## Approval History`

**Format**: Markdown table
```
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| [Date] | [Stage] | [Approved/Rejected] | [Person] | [Notes] |
```

---

## Part 3: REACT COMPONENT PARSING LOGIC

### How Capabilities.tsx Generates Markdown

**Key sections generated** (from lines 806-950):
1. `## Metadata` - with bullet points
2. `## Purpose`
3. `## Business Context` → `### Problem Statement`, `### Value Proposition`, `### Success Metrics`
4. `## User Perspective` → `### Target Users`, `### User Scenarios`
5. `## Boundaries` → `### In Scope`, `### Out of Scope`
6. `## Dependencies` → `### Upstream Dependencies`, `### Downstream Dependencies`
7. `## Related Stories`
8. `## Enablers` (table)
9. `## Acceptance Criteria` (checklist)

**Example metadata generation** (lines 807-814):
```typescript
markdown += `## Metadata\n`;
markdown += `- **Name**: ${suggestion.name}\n`;
markdown += `- **Type**: Capability\n`;
markdown += `- **Status**: Ready for Analysis\n`;
markdown += `- **Approval**: Pending\n`;
markdown += `- **Priority**: ${priority}\n`;
markdown += `- **Analysis Review**: Required\n`;
markdown += `- **Generated**: ${new Date().toLocaleString()}\n`;
markdown += `- **Source**: Capability-Driven Architecture Map Analysis\n\n`;
```

---

### How Enablers.tsx Generates Markdown

**Key sections generated** (from lines 1114-1142):
1. `## Metadata` - with bullet points
2. `## Technical Context` → `### Purpose`
3. `## Enabler Dependency Flow Diagram` (Mermaid)
4. `## API Technical Specifications` (table)
5. `## Data Models` (Mermaid ER)
6. `## Class Diagrams` (Mermaid)
7. `## Sequence Diagrams` (Mermaid)
8. `## Dataflow Diagrams` (Mermaid)
9. `## State Diagrams` (Mermaid)
10. `## Functional Requirements` (table)
11. `## Non-Functional Requirements` (table)
12. `## Acceptance Criteria`

**Example metadata generation**:
```typescript
markdown += `## Metadata\n`;
markdown += `- **Name**: ${enablerFormData.name}\n`;
markdown += `- **Type**: Enabler\n`;
markdown += `- **ID**: ${enablerFormData.enabler_id}\n`;
markdown += `- **Capability ID**: ${enablerFormData.capability_id}\n`;
// ... more fields
```

---

## Part 4: SPECIAL FIELD HANDLING

### INTENT State Model Fields

The codebase uses a 4-dimensional state model that must be captured:

**Dimensions**:
1. **lifecycle_state**: `draft`, `active`, `implemented`, `maintained`, `retired`
2. **workflow_stage**: `intent`, `specification`, `ui_design`, `implementation`, `control_loop`
3. **stage_status**: `in_progress`, `ready_for_approval`, `approved`, `blocked`
4. **approval_status**: `pending`, `approved`, `rejected`

**Storage**: These are typically stored in the database via `EntityStateContext` but can be included in markdown metadata for reference.

---

### ID Generation Pattern

**Format**: `{PREFIX}-{NUMERIC}`
- Capabilities: `CAP-XXXXXX`
- Enablers: `ENB-XXXXXX`
- Functional Requirements: `FR-XXXXXX`
- Non-Functional Requirements: `NFR-XXXXXX`
- Test Scenarios: `TS-XXXXXX`
- Test Suites: `TST-XXXXXX`

**Generation Algorithm** (from SW_OPERATIONS.md):
```javascript
function generateSemiUniqueNumber() {
  const now = Date.now();
  const timeComponent = parseInt(now.toString().slice(-4));
  const randomComponent = Math.floor(Math.random() * 100);
  const combined = timeComponent * 100 + randomComponent;
  return combined.toString().padStart(6, '0').slice(-6);
}
```

---

## Part 5: CRITICAL PARSING NOTES FOR CODE-TO-SPEC SYNC

### Section Header Conventions

1. **Markdown Headers Must Match Exactly**:
   - Use `##` for top-level sections (Metadata, Technical Context, etc.)
   - Use `###` for subsections (Purpose, Problem Statement, etc.)
   - No variations in capitalization or punctuation

2. **Field Name Case Sensitivity**:
   - Metadata fields use **bold** with colons: `- **Name**: value`
   - Extraction typically uses case-insensitive regex but should preserve exact format

3. **Table Headers Must Match**:
   - Enablers table: `| ID | Name | Purpose | State |`
   - Requirements table: `| ID | Name | Requirement | Status | Priority | Approval |`
   - Do not add extra columns or reorder

4. **Template Placeholders**:
   - `## Technical Specifications (Template)` → becomes `## Technical Specifications` after design phase
   - Content like `_No X defined yet._` is placeholder and should be replaced with actual content

### Common Mermaid Diagram Types

The codebase includes several diagram types that should be preserved:
- `flowchart TD` - Dependency flows, capability/enabler relationships
- `erDiagram` - Entity-relationship models for data structures
- `classDiagram` - OO class hierarchies
- `sequenceDiagram` - Interaction sequences
- `stateDiagram-v2` - State machine transitions

### Table Format Requirements

All tables must follow this format:
```
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| value    | value    | value    |
```

No extra pipes, consistent spacing.

---

## Part 6: SUMMARY TABLE: EXACT SECTION HEADERS

### Capability Sections (in order of template)

| Section | Level | Required? | Format |
|---------|-------|-----------|--------|
| `## Metadata` | H2 | YES | Bullet list (bold field names) |
| `## Purpose` | H2 | NO | Paragraph |
| `## Business Context` | H2 | YES | Contains subsections |
| `### Problem Statement` | H3 | YES | Paragraph |
| `### Value Proposition` | H3 | YES | Paragraph |
| `### Business Value` | H3 | NO | Paragraph |
| `### Success Metrics` | H3 | YES | Bullet list |
| `### Key Features` | H3 | NO | Bullet list |
| `## User Perspective` | H2 | YES | Contains subsections |
| `### Target Users` | H3 | YES | Bullet list |
| `### User Scenarios` | H3 | YES | Numbered list with format: `N. **Title**: Description` |
| `## Boundaries` | H2 | YES | Contains subsections |
| `### In Scope` | H3 | YES | Bullet list |
| `### Out of Scope` | H3 | YES | Bullet list |
| `### Assumptions` | H3 | NO | Bullet list |
| `### Constraints` | H3 | NO | Bullet list |
| `## Dependencies` | H2 | YES | Contains subsections + tables |
| `### Upstream Dependencies (This capability depends on)` | H3 | YES | Bullet list or "None identified" |
| `### Downstream Dependencies (Capabilities that depend on this)` | H3 | YES | Bullet list or "None identified" |
| `## Related Stories` | H2 | NO | Bullet list with `[[STORY-NAME]]` format |
| `## Enablers` | H2 | YES | Table: `\| ID \| Name \| Purpose \| State \|` |
| `## Acceptance Criteria` | H2 | YES | Checkbox list: `- [ ] criterion` |
| `## Technical Specifications` | H2 | NO | May contain diagram subsections |
| `### Capability Dependency Flow Diagram` | H3 | NO | Mermaid flowchart |
| `## Design Artifacts` | H2 | NO | Bullet list of links |
| `## Approval History` | H2 | NO | Table: `\| Date \| Stage \| Decision \| By \| Feedback \|` |

### Enabler Sections (in order of template)

| Section | Level | Required? | Format |
|---------|-------|-----------|--------|
| `## Metadata` | H2 | YES | Bullet list (bold field names) |
| `## Technical Context` | H2 | YES | Contains subsections |
| `### Purpose` | H3 | YES | Paragraph |
| `### Architecture Fit` | H3 | NO | Paragraph |
| `### Existing Patterns to Follow` | H3 | NO | Bullet list |
| `## Functional Requirements` | H2 | YES | Table: `\| ID \| Name \| Requirement \| Status \| Priority \| Approval \|` |
| `## Non-Functional Requirements` | H2 | YES | Table: `\| ID \| Name \| Requirement \| Type \| Status \| Priority \| Approval \|` |
| `## Technical Specifications` | H2 | YES | Contains diagram subsections |
| `### Enabler Dependency Flow Diagram` | H3 | NO | Mermaid flowchart |
| `### API Technical Specifications (if applicable)` | H3 | NO | Table |
| `### Data Models` | H3 | NO | Mermaid ER diagram |
| `### Class Diagrams` | H3 | NO | Mermaid class diagram |
| `### Sequence Diagrams` | H3 | NO | Mermaid sequence diagram |
| `### Dataflow Diagrams` | H3 | NO | Mermaid flowchart |
| `### State Diagrams` | H3 | NO | Mermaid state diagram |
| `## Edge Cases and Error Handling` | H2 | NO | Table: `\| Scenario \| Expected Behavior \| Test Case \|` |
| `## External Dependencies` | H2 | NO | Paragraph or bullet list |
| `## Acceptance Scenarios (Gherkin)` | H2 | NO | Gherkin code block |
| `### Test Suite: TST-XXXXXX - [Enabler Name] Tests` | H3 | NO | Gherkin with tags |
| `## Test Scenario Summary` | H2 | NO | Table: `\| Scenario ID \| Name \| Requirement \| Priority \| Status \| Automation \|` |
| `## Test Architecture` | H2 | NO | Bullet list with bold field names |
| `## Testing Strategy` | H2 | NO | Contains subsections |
| `### Unit Testing` | H3 | NO | Bullet list |
| `### Integration Testing` | H3 | NO | Bullet list |
| `### End-to-End Testing` | H3 | NO | Bullet list |
| `## Implementation Hints` | H2 | NO | Contains subsections |
| `### Suggested Approach` | H3 | NO | Paragraph |
| `### Known Gotchas` | H3 | NO | Bullet list |
| `### Reference Implementations` | H3 | NO | Bullet list of links |
| `## Approval History` | H2 | NO | Table: `\| Date \| Stage \| Decision \| By \| Feedback \|` |

---

## Part 7: RECOMMENDATIONS FOR CODE-TO-SPEC SYNC

When implementing sync-code-to-spec analysis, follow these guidelines:

1. **Respect Template Structure**: Always preserve the exact section headers and order
2. **Preserve Metadata**: Don't modify the Metadata section unless there are valid state/approval changes
3. **Markdown Formatting**: Use proper markdown with correct header levels (##, ###)
4. **Table Alignment**: Keep table columns in the exact order defined
5. **Mermaid Diagrams**: Preserve diagram syntax and styling classes
6. **Avoid Template Removal**: Don't remove "(Template)" from section headers unless design phase is complete
7. **ID Preservation**: Never modify IDs in the markdown
8. **Content Addition**: Add implementation details under Technical Specifications subsections
9. **Link References**: Use wiki-style `[[NAME]]` for story references

---

**End of Analysis Document**
