# IntentR Capability & Enabler Markdown Structure Documentation

**Created**: December 27, 2025
**Status**: Complete Analysis
**Purpose**: Comprehensive guide for understanding and maintaining capability and enabler markdown files

---

## Overview

This folder contains two comprehensive documents that describe how capabilities and enablers are structured in IntentR:

1. **capability_enabler_structure_analysis.md** - Detailed analysis (20KB)
   - Complete field-by-field breakdown
   - React component parsing logic
   - INTENT state model documentation
   - Example code from actual components

2. **quick_reference_card.txt** - Quick lookup reference (8KB)
   - Section headers in order
   - Critical formatting rules
   - ID generation patterns
   - Sync recommendations

---

## Key Findings

### Exact Section Headers (Capability)

```
## Metadata
## Purpose
## Business Context
### Problem Statement
### Value Proposition
### Success Metrics
## User Perspective
### Target Users
### User Scenarios
## Boundaries
### In Scope
### Out of Scope
## Dependencies
### Upstream Dependencies (This capability depends on)
### Downstream Dependencies (Capabilities that depend on this)
## Related Stories (optional)
## Enablers (table)
## Acceptance Criteria
## Technical Specifications
### Capability Dependency Flow Diagram
## Design Artifacts (optional)
## Approval History (optional)
```

### Exact Section Headers (Enabler)

```
## Metadata
## Technical Context
### Purpose
### Architecture Fit
### Existing Patterns to Follow
## Functional Requirements (table)
## Non-Functional Requirements (table)
## Technical Specifications
### Enabler Dependency Flow Diagram
### API Technical Specifications (if applicable)
### Data Models
### Class Diagrams
### Sequence Diagrams
### Dataflow Diagrams
### State Diagrams
## Edge Cases and Error Handling (optional)
## External Dependencies (optional)
## Acceptance Scenarios (Gherkin) (optional)
### Test Suite: TST-XXXXXX - [Name] Tests
## Test Scenario Summary (optional)
## Test Architecture (optional)
## Testing Strategy (optional)
### Unit Testing
### Integration Testing
### End-to-End Testing
## Implementation Hints (optional)
### Suggested Approach
### Known Gotchas
### Reference Implementations
## Approval History (optional)
```

---

## Metadata Field Names

### Capability Metadata Fields

- Name
- Type
- System
- Component
- ID
- Owner
- Status
- Approval
- Priority
- Analysis Review

### Enabler Metadata Fields

- Name
- Type
- ID
- Capability ID
- Owner
- Status
- Approval
- Priority
- Analysis Review
- Code Review

---

## Critical Formatting Rules

### 1. Header Levels

- Use `##` for main sections (Metadata, Technical Context, etc.)
- Use `###` for subsections (Purpose, Problem Statement, etc.)
- **NO VARIATIONS** in capitalization or punctuation

**Correct:**
```markdown
## Metadata
## Technical Context
### Purpose
```

**Incorrect:**
```markdown
## metadata
## TECHNICAL CONTEXT
### purpose
```

### 2. Metadata Fields

All metadata fields must use **bold** field names with colons:

**Correct:**
```markdown
- **Name**: My Capability
- **ID**: CAP-123456
```

**Incorrect:**
```markdown
- Name: My Capability
- **Name** My Capability
```

### 3. Tables

Must use exact format with proper alignment:

**Correct:**
```markdown
| ID | Name | Purpose | State |
|----|------|---------|-------|
| ENB-123456 | My Enabler | Does X | Draft |
```

**Incorrect:**
```markdown
| ID | Name | Purpose | State|
|---|---|---|---|
|ENB-123456|My Enabler|Does X|Draft|
```

### 4. Mermaid Diagrams

Preserve exact syntax:
- `flowchart TD` - Dependency flows
- `erDiagram` - Entity-relationship models
- `classDiagram` - Class hierarchies
- `sequenceDiagram` - Interaction sequences
- `stateDiagram-v2` - State machines

### 5. Story References

Use wiki-style links:

**Correct:**
```markdown
- [[STORY-ENTER-CITY]]
- [[STORY-DISPLAY-WEATHER-DATA]]
```

**Incorrect:**
```markdown
- [STORY-ENTER-CITY]
- STORY-ENTER-CITY
```

### 6. User Scenarios

Format: `N. **Title**: Description`

**Correct:**
```markdown
1. **User enters city name**: The user opens the app and types "New York"
2. **System fetches data**: The application calls the weather API
```

**Incorrect:**
```markdown
1. User enters city name - The user opens the app
1) User enters city name: The user opens the app
```

---

## ID Generation Pattern

### Format

All IDs follow: **PREFIX-XXXXXX** (6-digit numeric part)

- Capabilities: **CAP-XXXXXX**
- Enablers: **ENB-XXXXXX**
- Functional Requirements: **FR-XXXXXX**
- Non-Functional Requirements: **NFR-XXXXXX**
- Test Scenarios: **TS-XXXXXX**
- Test Suites: **TST-XXXXXX**

### Algorithm

```javascript
function generateSemiUniqueNumber() {
  const now = Date.now();
  const timeComponent = parseInt(now.toString().slice(-4));
  const randomComponent = Math.floor(Math.random() * 100);
  const combined = timeComponent * 100 + randomComponent;
  return combined.toString().padStart(6, '0').slice(-6);
}
```

**Steps:**
1. Extract last 4 digits of timestamp
2. Generate random number 0-99
3. Combine: (timeComponent × 100) + randomComponent
4. Pad to 6 digits
5. Check uniqueness in existing files

---

## INTENT State Model

The system uses a 4-dimensional state model:

### Dimension 1: lifecycle_state
- `draft` - Initial state
- `active` - In active development
- `implemented` - Completed and deployed
- `maintained` - In maintenance phase
- `retired` - Decommissioned

### Dimension 2: workflow_stage
- `intent` - Define WHY
- `specification` - Define WHAT
- `ui_design` - Define HOW (visual/tech design)
- `implementation` - BUILD and TEST
- `control_loop` - VALIDATE against intent

### Dimension 3: stage_status
- `in_progress` - Actively being worked on
- `ready_for_approval` - Awaiting human approval
- `approved` - Approved to proceed
- `blocked` - Blocked by issues

### Dimension 4: approval_status
- `pending` - Awaiting decision
- `approved` - Approved to proceed
- `rejected` - Rejected with feedback

---

## React Component Parsing

### Capabilities.tsx (lines 806-950)

Generates markdown sections in this order:

1. Metadata (lines 807-814)
2. Purpose (lines 818-823)
3. Business Context (lines 825-846)
4. User Perspective (lines 857-880)
5. Boundaries (lines 883-901)
6. Dependencies (lines 904-922)
7. Related Stories (lines 925-932)
8. Enablers table (lines 935-938)
9. Acceptance Criteria (lines 941-948)

**Metadata generation pattern:**
```typescript
markdown += `## Metadata\n`;
markdown += `- **Name**: ${suggestion.name}\n`;
markdown += `- **Type**: Capability\n`;
markdown += `- **Status**: Ready for Analysis\n`;
markdown += `- **Approval**: Pending\n`;
// ... more fields
```

### Enablers.tsx (lines 1114-1142)

Generates markdown sections in this order:

1. Metadata
2. Technical Context → Purpose
3. Enabler Dependency Flow Diagram (Mermaid)
4. API Technical Specifications (table)
5. Data Models (Mermaid ER)
6. Class Diagrams (Mermaid)
7. Sequence Diagrams (Mermaid)
8. Dataflow Diagrams (Mermaid)
9. State Diagrams (Mermaid)
10. Functional Requirements (table)
11. Non-Functional Requirements (table)
12. Acceptance Criteria

---

## Code-to-Spec Sync Guidelines

When implementing sync-code-to-spec analysis, follow these rules:

### DO

- Preserve exact section headers and order
- Add content to Technical Specifications subsections
- Update state fields in Metadata section
- Replace "(Template)" headers when design phase completes
- Maintain markdown formatting and table alignment
- Keep ID fields unchanged
- Use `flowchart TD` for dependency diagrams
- Use `erDiagram` for data models
- Use `classDiagram` for class relationships
- Use `sequenceDiagram` for interactions
- Use `stateDiagram-v2` for state machines

### DON'T

- Modify section header capitalization or punctuation
- Reorder table columns
- Change ID values
- Add extra columns to tables
- Modify template placeholder text prematurely
- Remove subsection headers when building content
- Change approval status in markdown (use database only)
- Add new top-level sections without updating the template
- Break mermaid diagram syntax

---

## File Locations

### Template Files

- `/Users/jamesreynolds/Documents/Development/Intentr/CODE_RULES/TEMPLATES.md` - Official templates
- `/Users/jamesreynolds/Documents/Development/Intentr/CODE_RULES/SW_OPERATIONS.md` - Operational procedures
- `/Users/jamesreynolds/Documents/Development/Intentr/CODE_RULES/STATE_MODEL.md` - State model definition

### Example Files

- `/Users/jamesreynolds/Documents/Development/Intentr/workspaces/SecureChat/definition/` - Example capabilities and enablers
- `/Users/jamesreynolds/Documents/Development/Intentr/workspaces/openFlo-web/definition/` - More examples

### React Components

- `/Users/jamesreynolds/Documents/Development/Intentr/web-ui/src/pages/Capabilities.tsx` - Capability page (markdown generation)
- `/Users/jamesreynolds/Documents/Development/Intentr/web-ui/src/pages/Enablers.tsx` - Enabler page (markdown generation)
- `/Users/jamesreynolds/Documents/Development/Intentr/web-ui/src/components/CapabilityForm.tsx` - Capability form
- `/Users/jamesreynolds/Documents/Development/Intentr/web-ui/src/context/EnablerContext.tsx` - Enabler context

---

## Quick Lookup

For detailed information, see:

1. **capability_enabler_structure_analysis.md** - Full technical breakdown
2. **quick_reference_card.txt** - Quick lookup by section

For templates, see:

- **CODE_RULES/TEMPLATES.md** - Official markdown templates
- **CODE_RULES/SW_OPERATIONS.md** - Development workflow and procedures

For examples, see actual files in:

- **workspaces/SecureChat/definition/** - Real capability and enabler examples
- **workspaces/openFlo-web/definition/** - More examples with different structures

---

## Contact & Updates

This analysis was created on **December 27, 2025** based on:

- CODE_RULES/TEMPLATES.md (official templates)
- CODE_RULES/SW_OPERATIONS.md (operational procedures)
- web-ui/src/pages/Capabilities.tsx (capability page code)
- web-ui/src/pages/Enablers.tsx (enabler page code)
- Actual example files from SecureChat and openFlo-web workspaces

For updates or corrections, verify against:
1. The official TEMPLATES.md file
2. The actual React component code
3. Real example files in the workspaces

---

**Document**: MARKDOWN_STRUCTURE_README.md
**Version**: 1.0
**Last Updated**: December 27, 2025
**Status**: Complete and Verified
