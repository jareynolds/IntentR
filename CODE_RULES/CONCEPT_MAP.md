# INTENT Framework Concept Map
**Version**: 1.1.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)

---

## Overview

This document provides a conceptual overview of the INTENT Framework, mapping all core concepts to their source documents and showing their relationships.

---

## Concept Reference Table

| Concept | Document | Location | Description |
|---------|----------|----------|-------------|
| **Philosophy** | INTENT.md | CODE_RULES/INTENT.md | Core beliefs: human intent is highest-value input, AI is derivation engine, specifications are executable artifacts |
| **Framework** | INTENT.md | CODE_RULES/INTENT.md | Lifecycle: Intent → Specification → UI-Design → Implementation → Control-Loop → Evolution |
| **Methodology** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | INTENT (Scaled Agile With AI) - streamlined agile for AI-assisted development |
| **Principles** | INTENT.md | CODE_RULES/INTENT.md | 7 INTENT Principles (Intent precedes implementation, Notation over narration, etc.) |
| **State Model** | STATE_MODEL.md | CODE_RULES/STATE_MODEL.md | Unified state tracking: Lifecycle State, Workflow Stage, Stage Status, Approval Status |
| **Workflow Stages** | STATE_MODEL.md | CODE_RULES/STATE_MODEL.md | 5 stages aligned with INTENT Lifecycle: Intent → Specification → UI-Design → Implementation → Control-Loop |
| **Activity Types** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | Development activities: Discovery, Analysis, Design, Implementation, Testing, Refactoring, Reverse-to-Design, Retirement |
| **Procedures** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | Capability Development Plan, Enabler Development Plan |
| **Policy** | ACTIVE_AI_PRINCIPLES.md | CODE_RULES/ACTIVE_AI_PRINCIPLES.md | 5-level AI governance presets (Advisory → Zero-Tolerance) |
| **Governance** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | Forbidden actions, mandatory behaviors, AI code editing standards |
| **Compliance** | SW_OPERATIONS.md + AI_AUDIT.md | CODE_RULES/ | Approval workflows, stage gates, audit logging |
| **Prompt Standards** | PROMPT_STANDARDS.md | CODE_RULES/PROMPT_STANDARDS.md | CIDER model, Options & Recommendations requirement, Specification Verification |
| **Audit Trail** | AI_AUDIT.md | CODE_RULES/AI_AUDIT.md | Decision/Action/Rejection/Learning audit categories, JSON schema, retention policies |
| **Rollback Procedures** | ROLLBACK.md | CODE_RULES/ROLLBACK.md | 4 rollback levels, triggers, decision matrix, emergency procedures |
| **Knowledge Base** | KNOWLEDGE_BASE.md | CODE_RULES/KNOWLEDGE_BASE.md | Domain/Technical/Historical/Team knowledge capture, templates, expert preservation |
| **Testing** | SW_OPERATIONS.md + TESTING.md | CODE_RULES/ | Gherkin/BDD framework, test scenario IDs, coverage requirements |
| **Templates** | TEMPLATES.md | CODE_RULES/TEMPLATES.md | Capability and Enabler document templates |
| **Tech Stack** | TECH_STACK.md | CODE_RULES/TECH_STACK.md | Approved technologies, libraries, patterns |

---

## The Unified State Model

The INTENT Framework uses a **unified state model** that aligns Philosophy, Operations, and Application around the same 5-stage workflow.

### The 5 Workflow Stages

```
Intent → Specification → UI-Design → Implementation → Control-Loop
  │           │              │             │              │
  ▼           ▼              ▼             ▼              ▼
[WHY]      [WHAT]         [HOW]        [BUILD]       [VALIDATE]
  │           │              │             │              │
  ▼           ▼              ▼             ▼              ▼
[APPROVE]  [APPROVE]     [APPROVE]     [APPROVE]     [COMPLETE]
```

### Four State Dimensions

| Dimension | Purpose | Values |
|-----------|---------|--------|
| **Lifecycle State** | Where is this in its overall life? | Draft, Active, Implemented, Maintained, Retired |
| **Workflow Stage** | Which stage is it in? (when Active) | Intent, Specification, UI-Design, Implementation, Control-Loop |
| **Stage Status** | Progress within current stage | In Progress, Ready for Approval, Approved, Blocked |
| **Approval Status** | Authorization decision | Pending, Approved, Rejected |

### Evolution as Re-Entry

Evolution is not a stage—it's the mechanism for re-entering the workflow when intent changes:

```
Implemented/Maintained → (change needed) → Active at appropriate stage
```

**See**: [STATE_MODEL.md](./STATE_MODEL.md) for complete state model documentation.

---

## Visual Concept Hierarchy

```
                         INTENT FRAMEWORK
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   PHILOSOPHY            METHODOLOGY            GOVERNANCE
   (INTENT.md)        (SW_OPERATIONS.md)    (ACTIVE_AI_PRINCIPLES.md)
        │                     │                     │
   ┌────┴────┐          ┌─────┴─────┐          ┌────┴────┐
   │         │          │           │          │         │
Principles Framework  Activities Procedures   Policy  Compliance
 (7 core)  (Lifecycle) (8 types)  (Dev Plans) (5 levels) (Approvals)
                              │
                              ▼
                    ┌─────────────────┐
                    │   STATE MODEL   │
                    │ (STATE_MODEL.md)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   LIFECYCLE            WORKFLOW             STATUS
   STATES               STAGES              TRACKING
        │                    │                    │
   ┌────┴────┐    ┌──────────┴──────────┐   ┌────┴────┐
   │         │    │                     │   │         │
 Draft    Active  Intent → Spec →      Stage    Approval
 Impl'd   Maint'd UI-Design → Impl →   Status   Status
 Retired          Control-Loop
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   OPERATIONS            QUALITY               KNOWLEDGE
        │                     │                     │
   ┌────┴────┐          ┌─────┴─────┐          ┌────┴────┐
   │         │          │           │          │         │
  Dev      Rollback   Testing    Audit      Knowledge  Prompt
Activities Procedures  Framework   Trail       Base    Standards
```

---

## Relationship Between Concepts

### Philosophy → Operations → Tracking

```
INTENT.md                    SW_OPERATIONS.md              STATE_MODEL.md
(Philosophy)                 (Operations)                  (Tracking)
─────────────────────────────────────────────────────────────────────────

Lifecycle Phases ──────────▶ Workflow Stages ────────────▶ Stage Status
(conceptual)                 (what to work on)            (progress within)

Intent                       Intent                        In Progress
Specification                Specification                 Ready for Approval
UI-Design                    UI-Design                     Approved
Implementation               Implementation                Blocked
Control-Loop                 Control-Loop
Evolution ─────────────────▶ (re-entry trigger) ─────────▶ (back to Active)
```

### Activities vs Stages

**Stages** are WHERE you are. **Activities** are WHAT you do.

| Workflow Stage | Activities Performed |
|----------------|---------------------|
| Intent | Discovery, Analysis |
| Specification | Analysis, Discovery |
| UI-Design | Design |
| Implementation | Implementation, Testing, Refactoring |
| Control-Loop | Testing, Validation |
| (Post-workflow) | Refactoring, Reverse-to-Design, Retirement |

---

## Document Dependencies

```
CLAUDE.md (Entry Point)
    │
    ├── @CODE_RULES/INTENT.md ─────────────────── Philosophy, Principles
    │
    ├── @CODE_RULES/SW_OPERATIONS.md ──────────── Methodology, Activities, Procedures
    │       │
    │       ├── References: STATE_MODEL.md (Workflow Stages)
    │       ├── References: ACTIVE_AI_PRINCIPLES.md
    │       ├── References: TESTING.md
    │       └── References: TEMPLATES.md
    │
    ├── @CODE_RULES/STATE_MODEL.md ───────────── Unified State Tracking
    │       │
    │       ├── Lifecycle States (5)
    │       ├── Workflow Stages (5) ◀─── Aligned with INTENT Lifecycle
    │       ├── Stage Status (4)
    │       └── Approval Status (3)
    │
    ├── @CODE_RULES/PROMPT_STANDARDS.md ───────── How to communicate with AI
    │       │
    │       └── Enforces: Specification Verification
    │
    ├── @CODE_RULES/AI_AUDIT.md ───────────────── Decision/Action logging
    │
    ├── @CODE_RULES/ROLLBACK.md ───────────────── Recovery procedures
    │
    └── @CODE_RULES/KNOWLEDGE_BASE.md ─────────── Organizational knowledge
            │
            ├── knowledge/domain/ ─────── Business rules, glossary
            ├── knowledge/technical/ ──── Patterns, conventions, ADRs
            ├── knowledge/historical/ ─── Lessons learned, deprecated
            └── knowledge/team/ ───────── Experts, processes
```

---

## Complete CODE_RULES Directory

```
CODE_RULES/
├── INTENT.md                 # Philosophy, 7 Principles, Framework, Manifesto
├── SW_OPERATIONS.md          # Methodology, Activities, Procedures
├── STATE_MODEL.md            # Unified State Model (Lifecycle, Stages, Status)
├── ACTIVE_AI_PRINCIPLES.md   # Policy (5 governance levels)
├── PROMPT_STANDARDS.md       # Prompt model, Options requirement, Spec verification
├── AI_AUDIT.md               # Audit categories, schemas, retention, compliance
├── ROLLBACK.md               # Rollback levels, triggers, procedures, automation
├── KNOWLEDGE_BASE.md         # Knowledge categories, templates, capture process
├── TESTING.md                # Gherkin syntax, test IDs, coverage requirements
├── TEMPLATES.md              # Capability/Enabler document templates
├── TECH_STACK.md             # Approved technologies and libraries
├── CONCEPT_MAP.md            # This document - conceptual overview
└── CLAUDE.md                 # AI agent configuration (copied to workspaces)
```

---

## Core Concepts Summary

| # | Concept | Document | Status |
|---|---------|----------|--------|
| 1 | Philosophy | INTENT.md | Defined |
| 2 | Framework | INTENT.md | Defined |
| 3 | Methodology | SW_OPERATIONS.md | Defined |
| 4 | Principles | INTENT.md | Defined (7) |
| 5 | State Model | STATE_MODEL.md | Defined (unified) |
| 6 | Workflow Stages | STATE_MODEL.md | Defined (5 stages) |
| 7 | Activity Types | SW_OPERATIONS.md | Defined (8 types) |
| 8 | Procedures | SW_OPERATIONS.md | Defined (Dev Plans) |
| 9 | Policy | ACTIVE_AI_PRINCIPLES.md | Defined (5 levels) |
| 10 | Governance | SW_OPERATIONS.md | Defined |
| 11 | Compliance | SW_OPERATIONS.md + AI_AUDIT.md | Defined |
| 12 | Prompt Standards | PROMPT_STANDARDS.md | Defined (CIDER + Options + Spec Check) |
| 13 | Audit Trail | AI_AUDIT.md | Defined |
| 14 | Rollback Procedures | ROLLBACK.md | Defined |
| 15 | Knowledge Base | KNOWLEDGE_BASE.md | Defined |
| 16 | Testing Framework | SW_OPERATIONS.md + TESTING.md | Defined (Gherkin/BDD) |
| 17 | Templates | TEMPLATES.md | Defined |

---

## Quick Navigation

### By Category

**Philosophy & Principles**
- [INTENT.md](./INTENT.md) - The "why" of INTENT

**State & Workflow**
- [STATE_MODEL.md](./STATE_MODEL.md) - Unified state tracking model

**Operational**
- [SW_OPERATIONS.md](./SW_OPERATIONS.md) - The "how" of development
- [TEMPLATES.md](./TEMPLATES.md) - Document templates
- [TECH_STACK.md](./TECH_STACK.md) - Technology choices

**Governance & Compliance**
- [ACTIVE_AI_PRINCIPLES.md](./ACTIVE_AI_PRINCIPLES.md) - AI policy levels
- [AI_AUDIT.md](./AI_AUDIT.md) - Audit requirements
- [ROLLBACK.md](./ROLLBACK.md) - Recovery procedures

**Quality**
- [TESTING.md](./TESTING.md) - Testing framework
- [PROMPT_STANDARDS.md](./PROMPT_STANDARDS.md) - Prompt quality

**Knowledge**
- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) - Organizational knowledge

---

## Key Insight: One Vocabulary

The INTENT Framework now uses **one consistent vocabulary** across all layers:

| Layer | Uses These 5 Stages |
|-------|---------------------|
| **Philosophy** (INTENT.md) | Intent → Specification → UI-Design → Implementation → Control-Loop |
| **Operations** (SW_OPERATIONS.md) | Intent → Specification → UI-Design → Implementation → Control-Loop |
| **State Tracking** (STATE_MODEL.md) | Intent → Specification → UI-Design → Implementation → Control-Loop |
| **Application** (IntentR) | Intent → Specification → UI-Design → Implementation → Control-Loop |

This alignment eliminates confusion between competing models and ensures everyone—humans and AI—speak the same language.

---

**Document Version**: 1.1.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
