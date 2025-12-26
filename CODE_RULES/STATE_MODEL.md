# STATE MODEL
**Version**: 1.0.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)

---

## Overview

This document defines the simplified state model for tracking Capabilities, Enablers, and Requirements within the INTENT Framework. The model separates concerns into distinct dimensions, each with a single responsibility.

**Core Principle**: Status should tell you WHERE something is, not WHAT you're doing to it. Activities are actions; states are positions.

---

## State Model Architecture

The state model has four orthogonal dimensions:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. LIFECYCLE STATE - Where is this in its overall life?            │
│    Draft → Active → Implemented → Maintained → Retired              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (when Active)
┌─────────────────────────────────────────────────────────────────────┐
│ 2. WORKFLOW STAGE - Which of the 5 stages is it in?                │
│    Intent → Specification → UI-Design → Implementation → Control-Loop│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (within each stage)
┌─────────────────────────────────────────────────────────────────────┐
│ 3. STAGE STATUS - What's the progress within this stage?           │
│    In Progress → Ready for Approval → Approved                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (at approval gates)
┌─────────────────────────────────────────────────────────────────────┐
│ 4. APPROVAL STATUS - What's the authorization decision?            │
│    Pending → Approved / Rejected                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dimension 1: Lifecycle State

Lifecycle State indicates where a Capability is in its overall existence, independent of workflow progress.

### Values

| State | Description | Can Transition To |
|-------|-------------|-------------------|
| **Draft** | Capability exists but hasn't entered the workflow. Initial ideas, not yet committed. | Active |
| **Active** | Currently progressing through the 5-stage workflow. Work is happening. | Implemented, Retired |
| **Implemented** | Completed Control-Loop stage. In production, delivering value. | Maintained, Retired |
| **Maintained** | Post-implementation. Receiving bug fixes, minor updates, monitoring. | Active (re-entry), Retired |
| **Retired** | Decommissioned. No longer active or supported. | (terminal) |

### State Transition Diagram

```
                                    ┌─────────────────┐
                                    │                 │
                                    ▼                 │ (Evolution:
┌─────────┐      ┌─────────┐      ┌─────────────┐    │  re-specify)
│  Draft  │ ───▶ │  Active │ ───▶ │ Implemented │ ───┘
└─────────┘      └────┬────┘      └──────┬──────┘
                      │                  │
                      │                  ▼
                      │           ┌────────────┐
                      │           │ Maintained │ ───┐
                      │           └─────┬──────┘    │
                      │                 │           │ (Evolution:
                      │                 │           │  major change)
                      │                 ▼           │
                      │           ┌─────────┐       │
                      └─────────▶ │ Retired │ ◀─────┘
                                  └─────────┘
```

### Lifecycle Rules

| Rule | Description |
|------|-------------|
| **Entry** | All Capabilities start as Draft |
| **Activation** | Draft → Active when entering Intent stage |
| **Completion** | Active → Implemented when Control-Loop stage approved |
| **Maintenance** | Implemented → Maintained for ongoing support |
| **Re-entry** | Maintained → Active when significant changes needed (Evolution) |
| **Retirement** | Any state except Draft can transition to Retired |

---

## Dimension 2: Workflow Stage

Workflow Stage indicates which of the 5 INTENT Lifecycle stages a Capability is currently in. Only applies when Lifecycle State = **Active**.

### The 5 Stages

| Stage | Focus | Key Question | Deliverables |
|-------|-------|--------------|--------------|
| **Intent** | WHY | Why are we doing this? | Vision, goals, constraints, success criteria, stakeholders |
| **Specification** | WHAT | What are we building? | Requirements, enablers, scope boundaries, dependencies |
| **UI-Design** | HOW (Visual) | How will it look and work? | Visual designs, UX flows, API contracts, data models, technical specs |
| **Implementation** | BUILD | Does it work correctly? | Code, tests, integrations, deployments |
| **Control-Loop** | VALIDATE | Does it match intent? | Validation results, metrics, acceptance sign-off |

### Stage Flow

```
┌──────────┐    ┌───────────────┐    ┌───────────┐    ┌────────────────┐    ┌──────────────┐
│  Intent  │───▶│ Specification │───▶│ UI-Design │───▶│ Implementation │───▶│ Control-Loop │
└──────────┘    └───────────────┘    └───────────┘    └────────────────┘    └──────────────┘
     │                 │                  │                   │                    │
     ▼                 ▼                  ▼                   ▼                    ▼
 [APPROVE]         [APPROVE]          [APPROVE]           [APPROVE]           [COMPLETE]
```

### Stage Details

#### Stage 1: Intent

**Purpose**: Capture and validate the human intent before any detailed work begins.

**Activities**:
- Identify business need or opportunity
- Define vision and goals
- Specify constraints and non-goals
- Identify stakeholders and users
- Define success criteria and metrics

**Entry Criteria**:
- Lifecycle State = Active
- Idea or need has been identified

**Exit Criteria**:
- [ ] Vision statement documented
- [ ] Goals clearly articulated
- [ ] Constraints and non-goals defined
- [ ] Stakeholders identified
- [ ] Success metrics defined
- [ ] **HUMAN APPROVAL OBTAINED**

---

#### Stage 2: Specification

**Purpose**: Translate intent into precise, engineering-grade specifications.

**Activities**:
- Define functional requirements
- Define non-functional requirements
- Break capability into enablers
- Identify dependencies and integration points
- Define scope boundaries (in/out)
- Create user scenarios with examples

**Entry Criteria**:
- Intent stage approved
- Vision and goals are clear

**Exit Criteria**:
- [ ] All enablers identified and documented
- [ ] Requirements defined with examples
- [ ] Dependencies mapped
- [ ] Scope boundaries explicit
- [ ] **HUMAN APPROVAL OBTAINED**

---

#### Stage 3: UI-Design

**Purpose**: Create detailed visual and technical designs before implementation.

**Activities**:
- Create visual designs (wireframes, mockups)
- Define UX flows and interactions
- Design API contracts with request/response examples
- Create data models with constraints
- Document component interactions
- Specify edge cases and error handling
- AI reviews specifications for ambiguities

**Entry Criteria**:
- Specification stage approved
- Requirements are clear and testable

**Exit Criteria**:
- [ ] Visual designs complete (if applicable)
- [ ] API contracts defined with examples
- [ ] Data models documented
- [ ] Edge cases specified
- [ ] AI review completed - no ambiguities
- [ ] **HUMAN APPROVAL OBTAINED**

---

#### Stage 4: Implementation

**Purpose**: Build, test, and integrate the solution.

**Activities**:
- Implement code following design specs
- Write unit and integration tests
- Integrate with existing systems
- Deploy to appropriate environment
- Validate against acceptance criteria

**Entry Criteria**:
- UI-Design stage approved
- Technical specifications complete

**Exit Criteria**:
- [ ] Code implemented and working
- [ ] Tests passing (unit, integration)
- [ ] Integration verified
- [ ] Deployed to target environment
- [ ] **HUMAN APPROVAL OBTAINED**

---

#### Stage 5: Control-Loop

**Purpose**: Validate the implementation against the original intent and ensure ongoing conformance.

**Activities**:
- Verify implementation matches intent
- Run acceptance tests
- Validate against success metrics
- Check for intent drift
- Obtain stakeholder sign-off
- Set up monitoring and alerting

**Entry Criteria**:
- Implementation stage approved
- System is deployed and accessible

**Exit Criteria**:
- [ ] Implementation validated against intent
- [ ] Acceptance criteria met
- [ ] Success metrics baseline established
- [ ] Monitoring in place
- [ ] Stakeholder sign-off obtained
- [ ] **MARKED COMPLETE**

---

## Dimension 3: Stage Status

Stage Status indicates progress within the current Workflow Stage. Applies to whatever stage the Capability is currently in.

### Values

| Status | Description | Next Status |
|--------|-------------|-------------|
| **In Progress** | Work is actively being done on this stage | Ready for Approval, Blocked |
| **Ready for Approval** | Stage work complete, awaiting human review | Approved, In Progress (if rejected) |
| **Approved** | Human has approved, can advance to next stage | (advances to next stage) |
| **Blocked** | Cannot proceed, needs resolution | In Progress (when unblocked) |

### Status Flow Within a Stage

```
┌─────────────┐
│ In Progress │◀─────────────────────────────┐
└──────┬──────┘                              │
       │                                     │
       ▼                                     │
┌──────────────────┐    (rejected)    ┌──────┴─────┐
│ Ready for        │─────────────────▶│            │
│ Approval         │                  │  Blocked   │
└────────┬─────────┘                  │            │
         │                            └──────┬─────┘
         │ (approved)                        │
         ▼                                   │
┌─────────────┐                              │
│  Approved   │                              │
└──────┬──────┘                              │
       │                                     │
       ▼                                     │
  [Next Stage] ◀─────────────────────────────┘
               (when unblocked)
```

### Status Rules

| Rule | Description |
|------|-------------|
| **Initial Status** | When entering a new stage, status is always "In Progress" |
| **Approval Request** | Only move to "Ready for Approval" when all exit criteria met |
| **Rejection Handling** | If approval rejected, status returns to "In Progress" with feedback |
| **Blocking** | Any status can transition to "Blocked" if an impediment arises |
| **Advancement** | "Approved" automatically advances to next stage as "In Progress" |

---

## Dimension 4: Approval Status

Approval Status tracks the authorization decision for a specific approval request. This is separate from Stage Status.

### Values

| Status | Description |
|--------|-------------|
| **Pending** | Approval requested, awaiting decision |
| **Approved** | Authorized to proceed |
| **Rejected** | Not authorized, revision needed |

### Approval Rules

| Rule | Description |
|------|-------------|
| **AI Cannot Approve** | AI agents can never change approval status to "Approved" |
| **AI Cannot Reject** | AI agents can never change approval status to "Rejected" |
| **Human Authority** | Only humans can grant or deny approval |
| **Rejection Feedback** | Rejection must include feedback explaining why |
| **Re-submission** | After addressing feedback, a new approval request can be submitted |

### Automatic State Transitions on Approval (Business Rules)

**CRITICAL REQUIREMENT**: When an entity is approved/rejected/reset on a Phase Approval page, ALL relevant state dimensions MUST be set to ensure consistency.

#### On APPROVE Action

All 4 dimensions must be set:

| Dimension | Value | Rationale |
|-----------|-------|-----------|
| `lifecycle_state` | `active` | Entity is now actively in the workflow |
| `workflow_stage` | *Current phase* (e.g., `intent`, `specification`, etc.) | Confirms which stage approval was granted |
| `stage_status` | `approved` | Stage work is complete and approved |
| `approval_status` | `approved` | Authorization granted to proceed |

#### On REJECT Action

All 4 dimensions must be set:

| Dimension | Value | Rationale |
|-----------|-------|-----------|
| `lifecycle_state` | `active` | Entity remains in workflow but blocked |
| `workflow_stage` | *Current phase* (e.g., `intent`, `specification`, etc.) | Confirms which stage rejection occurred |
| `stage_status` | `blocked` | Cannot proceed until issues resolved |
| `approval_status` | `rejected` | Authorization denied, revision needed |

#### On RESET Action

Only stage_status changes:

| Dimension | Value | Rationale |
|-----------|-------|-----------|
| `stage_status` | `in_progress` | Work is resuming on this stage |

Note: lifecycle_state and workflow_stage remain unchanged on reset.

#### Workflow Stage by Approval Page

| Approval Page | workflow_stage Value |
|---------------|---------------------|
| Intent Approval | `intent` |
| Specification Approval | `specification` |
| UI-Design Approval | `ui_design` |
| Implementation Approval | `implementation` |
| Control-Loop Approval | `control_loop` |

**Implementation Notes**:
1. These transitions MUST be atomic - all fields update together in a single API call
2. This logic applies at ALL approval pages for Capabilities, Enablers, and other entities
3. The database is the single source of truth for these values
4. UI components that change approval status MUST set all required dimensions

**Code Example** (TypeScript):
```typescript
// When APPROVING an entity on the Specification Approval page
await updateCapabilityState(entityId, {
  lifecycle_state: 'active',           // REQUIRED
  workflow_stage: 'specification',     // REQUIRED: matches current phase
  stage_status: 'approved',            // REQUIRED
  approval_status: 'approved',         // REQUIRED
  version: currentVersion,
  change_reason: 'Approved via Specification Approval page',
});

// When REJECTING an entity on the Specification Approval page
await updateCapabilityState(entityId, {
  lifecycle_state: 'active',           // REQUIRED
  workflow_stage: 'specification',     // REQUIRED: matches current phase
  stage_status: 'blocked',             // REQUIRED
  approval_status: 'rejected',         // REQUIRED
  version: currentVersion,
  change_reason: 'Rejected: [reason]',
});

// When RESETTING an entity (only stage_status changes)
await updateCapabilityState(entityId, {
  stage_status: 'in_progress',         // REQUIRED
  version: currentVersion,
  change_reason: 'Reset via approval workflow',
});
```

---

## Evolution: The Re-Entry Mechanism

Evolution is not a stage—it's the process of re-entering the workflow when intent changes.

### When Evolution Occurs

| Trigger | Re-Entry Point | Lifecycle Transition |
|---------|----------------|---------------------|
| Minor bug fix | Implementation | Maintained → Active |
| Feature enhancement | Specification | Maintained → Active |
| Major redesign | Intent | Maintained → Active |
| New requirements | Specification | Implemented → Active |
| Intent drift detected | Intent | Any → Active |

### Evolution Flow

```
┌─────────────┐
│ Implemented │
│     or      │
│ Maintained  │
└──────┬──────┘
       │
       │ (Change needed)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        EVOLUTION ASSESSMENT                       │
│                                                                  │
│  What changed?           │  Re-enter at:                        │
│  ─────────────────────────────────────────────────────────────  │
│  Goals/vision changed    │  Intent stage                        │
│  Requirements changed    │  Specification stage                 │
│  Design needs update     │  UI-Design stage                     │
│  Bug fix / minor update  │  Implementation stage                │
│  Validation gap found    │  Control-Loop stage                  │
└──────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────┐
│  Active │ (at appropriate stage)
└─────────┘
```

---

## Applying the Model to Entities

### Capabilities

Capabilities use all four dimensions:

```
Capability: User Authentication
├── Lifecycle State: Active
├── Workflow Stage: UI-Design
├── Stage Status: In Progress
└── Approval Status: (none pending)
```

### Enablers

Enablers inherit Lifecycle State from parent Capability but track their own Workflow Stage and Status:

```
Enabler: JWT Token Service
├── Parent Capability: User Authentication (Active)
├── Workflow Stage: Implementation
├── Stage Status: Ready for Approval
└── Approval Status: Pending
```

### Requirements

Requirements track only Stage Status (they exist within an Enabler's workflow):

```
Requirement: FR-123456 - Token Expiration
├── Parent Enabler: JWT Token Service
├── Stage Status: Approved
└── Approval Status: Approved
```

---

## Complete State Reference

### All Status Values (12 Total)

| Dimension | Values | Count |
|-----------|--------|-------|
| Lifecycle State | Draft, Active, Implemented, Maintained, Retired | 5 |
| Workflow Stage | Intent, Specification, UI-Design, Implementation, Control-Loop | 5 |
| Stage Status | In Progress, Ready for Approval, Approved, Blocked | 4 |
| Approval Status | Pending, Approved, Rejected | 3 |

**Note**: Workflow Stage and Stage Status only apply when Lifecycle State = Active. Total unique values = 17, but only 12 are relevant at any given time.

---

## Migration from Old Model

### Old Status Values → New Model

| Old Status | New Lifecycle | New Stage | New Stage Status |
|------------|---------------|-----------|------------------|
| Draft | Draft | - | - |
| Ready for Analysis | Active | Specification | In Progress |
| In Analysis | Active | Specification | In Progress |
| Ready for Design | Active | UI-Design | In Progress |
| In Design | Active | UI-Design | In Progress |
| Ready for Implementation | Active | Implementation | In Progress |
| In Implementation | Active | Implementation | In Progress |
| Implemented | Implemented | - | - |
| In Testing | Active | Control-Loop | In Progress |
| Tested | Implemented | - | - |
| Ready for Refactor | Maintained | - | - |
| Ready for Retirement | Maintained | - | - |

### Migration Notes

1. **"In Analysis"** → Now covered by Specification stage (which includes enabler identification)
2. **"In Testing"** → Now part of Implementation stage OR Control-Loop depending on test type
3. **"Ready for Refactor"** → Lifecycle = Maintained; triggers Evolution to re-enter at appropriate stage
4. **"Definition" stage** → Absorbed into Specification stage

---

## Visual Summary

```
                         LIFECYCLE STATES
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   Draft ──▶ Active ──▶ Implemented ──▶ Maintained   │
    │               │              │              │        │
    │               │              └──────────────┘        │
    │               │                    │                 │
    │               └────────────────────┼─────▶ Retired   │
    │                                    │                 │
    └────────────────────────────────────┼─────────────────┘
                                         │
                    ┌────────────────────┘
                    │
                    ▼ (when Lifecycle = Active)

                         WORKFLOW STAGES
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   Intent ──▶ Specification ──▶ UI-Design ──▶        │
    │      │            │               │                  │
    │      ▼            ▼               ▼                  │
    │  [APPROVE]    [APPROVE]       [APPROVE]              │
    │                                                      │
    │   ──▶ Implementation ──▶ Control-Loop               │
    │            │                   │                     │
    │            ▼                   ▼                     │
    │        [APPROVE]           [COMPLETE]                │
    │                                                      │
    └──────────────────────────────────────────────────────┘
                    │
                    │ (within each stage)
                    ▼

                         STAGE STATUS
    ┌──────────────────────────────────────────────────────┐
    │                                                      │
    │   In Progress ──▶ Ready for Approval ──▶ Approved   │
    │        │                 │                           │
    │        ▼                 ▼                           │
    │     Blocked ◀───────── (rejected)                   │
    │                                                      │
    └──────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

When implementing this state model:

- [ ] Update database schema to use new status fields
- [ ] Create migration script for existing data
- [ ] Update API endpoints to accept new values
- [ ] Update UI to display new stages and statuses
- [ ] Update SW_OPERATIONS.md to reference this model
- [ ] Update CONCEPT_MAP.md to reflect unified model
- [ ] Update validation logic in workflow engine

---

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
