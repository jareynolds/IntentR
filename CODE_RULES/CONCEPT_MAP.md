# INTENT Framework Concept Map
**Version**: 1.0.0
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
| **Process** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | 8 Development Phases: Discovery → Design → Analysis → Implementation → Testing → Refactoring → Reverse-to-Design → Retirement |
| **Procedures** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | Capability Development Plan (Tasks 1-4), Enabler Development Plan (Tasks 1-5) |
| **Workflow Engine** | SW_OPERATIONS.md | CODE_RULES/SW_OPERATIONS.md | State machine: Specification → Definition → Design → Execution with approval gates |
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
Principles Framework  Process   Procedures   Policy  Compliance
 (7 core)  (Lifecycle) (8 phases) (Dev Plans) (5 levels) (Approvals)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   OPERATIONS            QUALITY               KNOWLEDGE
        │                     │                     │
   ┌────┴────┐          ┌─────┴─────┐          ┌────┴────┐
   │         │          │           │          │         │
Workflow  Rollback   Testing    Audit      Knowledge  Prompt
Engine   Procedures  Framework   Trail       Base    Standards
```

---

## Document Dependencies

```
CLAUDE.md (Entry Point)
    │
    ├── @CODE_RULES/INTENT.md ─────────────────── Philosophy, Principles
    │
    ├── @CODE_RULES/SW_OPERATIONS.md ──────────── Methodology, Process, Procedures
    │       │
    │       ├── References: ACTIVE_AI_PRINCIPLES.md
    │       ├── References: TESTING.md
    │       └── References: TEMPLATES.md
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
├── SW_OPERATIONS.md          # Methodology, Process, Procedures, Workflow
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

| # | Concept | Status |
|---|---------|--------|
| 1 | Philosophy | Defined |
| 2 | Framework | Defined |
| 3 | Methodology | Defined |
| 4 | Principles | Defined (7) |
| 5 | Process | Defined (8 phases) |
| 6 | Procedures | Defined (Dev Plans) |
| 7 | Workflow Engine | Defined (State Machine) |
| 8 | Policy | Defined (5 levels) |
| 9 | Governance | Defined |
| 10 | Compliance | Defined |
| 11 | Prompt Standards | Defined (CIDER + Options + Spec Check) |
| 12 | Audit Trail | Defined |
| 13 | Rollback Procedures | Defined |
| 14 | Knowledge Base | Defined |
| 15 | Testing Framework | Defined (Gherkin/BDD) |
| 16 | Templates | Defined |

---

## Quick Navigation

### By Category

**Philosophy & Principles**
- [INTENT.md](./INTENT.md) - The "why" of INTENT

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

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
