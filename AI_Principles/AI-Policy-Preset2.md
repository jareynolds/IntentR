# AI Policy - Preset 2 (Guided Recommendations - Suggested)

**Version**: 1.0.0
**Date**: 2025-11-19
**Workspace**: BALUT
**Enforcement Level**: Level 2 - Guided Recommendations (Suggested)

## Overview

This AI Policy document defines the complete governance framework for **Preset 2: Guided Recommendations (Suggested)** mode. This preset is designed for development environments, feature development, iterative work, and teams that understand best practices but need gentle guidance and tracking.

**Use Cases:**
- Development environments and feature development
- Iterative work and continuous integration
- Medium teams with structured workflows
- Quality-focused development
- Scrum teams and product development
- Growing teams and standardization initiatives
- Small teams with experienced developers
- Team projects and collaborative work

---

## 1. Workflow Governance & State Machine Compliance

### Policy Statement
AI should follow state machine compliance and provide warnings when deviations occur.

### Implementation Rules

```
AI should follow state machine compliance and provide warnings when deviations occur.
- Follow tasks in sequential order by default
- Warn when attempting to skip states
- Explain consequences of workflow deviations
- Suggest corrections when state mismatches detected
- Log all workflow deviations for review
```
## Mandatory Testing Before Completion

  **NEVER claim a feature is "ready" or "done" without:**

  1. **For backend changes**: Rebuild the service (`go build`) and restart it
  2. **For API endpoints**: Test with `curl` and verify the response
  3. **For file operations**: Verify the file exists at the expected path using `ls` or `cat`
  4. **For frontend changes**: Verify no TypeScript/compilation errors

  **After ANY code change that writes files:**
  - Execute the functionality (via curl, API call, or UI action)
  - Verify the file was created: `ls -la <expected-path>`
  - Show the user the verification output

  **Do NOT say "should work" or "will be saved to" - PROVE IT WORKS FIRST.**

### Behavioral Guidelines
- Execute tasks in sequential workflow order by default
- Detect and warn about state skipping attempts
- Provide clear explanations of deviation consequences
- Suggest corrective actions for state mismatches
- Maintain logs of all workflow deviations
- Allow deviations only with user awareness

### Source References
- APPROVAL vs STATE - FUNDAMENTAL DIFFERENCE (AI_GOVERNANCE_FRAMEWORK.md lines 398-404, 677-683)
- STATE MACHINE COMPLIANCE (lines 406-410, 685-689)
- FORBIDDEN SHORTCUTS (lines 412-415, 691-694)
- CRITICAL WORKFLOW RULES (lines 396-415, 674-694)

---

## 2. Quality Gates & Pre-Condition Verification

### Policy Statement
AI should verify pre-conditions and recommend stopping if failures detected.

### Implementation Rules

```
AI should verify pre-conditions and recommend stopping if failures detected.
- Verify ALL pre-conditions before proceeding
- Highlight failed pre-conditions in clear format
- Recommend appropriate actions for each failure
- Suggest how to resolve pre-condition failures
- Allow override with user confirmation
- Log all pre-condition overrides
```

### Behavioral Guidelines
- Perform comprehensive pre-condition verification
- Present failed pre-conditions in structured, clear format
- Provide specific recommendations for each failure
- Suggest remediation steps for failed pre-conditions
- Allow user override with explicit confirmation
- Log all override decisions for audit trail

### Source References
- Pre-Conditions Verification (AI_GOVERNANCE_FRAMEWORK.md lines 419-428, 441-452, 559-570, 637-649, 699-710, 722-733, 771-783, 825-837)
- Critical Rules (lines 424-430, 447-453, 565-571, 643-649)
- Exit Criteria Checklist (lines 432-435, 525-538, 665-671, 712-716, 753-762, 814-819, 853-858)

---

## 3. Documentation Standards & Templates

### Policy Statement
AI should recommend template usage and highlight missing required sections.

### Implementation Rules

```
AI should recommend template usage and highlight missing required sections.
- Use standard templates by default
- Highlight deviations from template structure
- Suggest completing missing metadata fields
- Warn about incomplete documentation
- Provide examples of properly formatted sections
- Allow justified deviations with explanation
```

### Behavioral Guidelines
- Apply standard templates to all new documents
- Identify and highlight structural deviations
- Recommend completing all metadata fields
- Issue warnings for incomplete documentation
- Provide concrete examples of proper formatting
- Accept deviations when properly justified

### Source References
- Document Templates (AI_GOVERNANCE_FRAMEWORK.md lines 1079-1298)
- Capability Template Structure (lines 1081-1179)
- Enabler Template Structure (lines 1182-1298)
- Documentation Requirements (lines 604-616)
- CRITICAL ANALYSIS PHASE LIMITATIONS (lines 463-507)

---

## 4. Security & Authorization Compliance

### Policy Statement
AI should check approval status and recommend waiting for approval before proceeding.

### Implementation Rules

```
AI should check approval status and recommend waiting for approval before proceeding.
- Verify approval status before starting tasks
- Recommend obtaining approval for pending items
- Highlight items requiring approval
- Suggest approval workflow steps
- Allow override with explicit user decision
- Log all approval status checks
```

### Behavioral Guidelines
- Check approval status at task initiation
- Recommend obtaining necessary approvals
- Clearly identify items awaiting approval
- Guide users through approval workflow
- Allow proceeding with explicit user override
- Maintain comprehensive approval check logs

### Source References
- FORBIDDEN ACTIONS (AI_GOVERNANCE_FRAMEWORK.md lines 151-170)
- DISCOVERY EXCEPTION (lines 157-160)
- MANDATORY BEHAVIOR (lines 162-165)
- VIOLATION CONSEQUENCES (lines 167-170)
- Approval Verification tasks (lines 416-435, 696-716)

---

## 5. Development Lifecycle Management

### Policy Statement
AI should follow lifecycle phases and recommend proper sequencing.

### Implementation Rules

```
AI should follow lifecycle phases and recommend proper sequencing.
- Follow standard phase progression
- Recommend completing current phase before advancing
- Highlight phase-specific requirements
- Warn about skipping phases
- Suggest remediation for phase gaps
- Allow justified phase skipping with documentation
- Track phase completion status
```

### Behavioral Guidelines
- Follow standard lifecycle phase progression
- Recommend phase completion before advancement
- Identify phase-specific deliverables and requirements
- Warn users attempting to skip phases
- Provide remediation guidance for incomplete phases
- Allow justified phase skipping with documentation
- Track and report phase completion status

### Source References
- TASK: DISCOVERY (AI_GOVERNANCE_FRAMEWORK.md lines 174-393)
- CAPABILITY DEVELOPMENT PLAN (lines 394-672)
- ENABLER DEVELOPMENT PLAN (lines 673-858)
- Task progression sequences (Analysis → Design → Implementation)

---

## 6. Architecture Principles & Design Patterns

### Policy Statement
AI should follow architecture principles and recommend standard patterns.

### Implementation Rules

```
AI should follow architecture principles and recommend standard patterns.
- Apply component-capability-enabler model by default
- Recommend appropriate naming conventions
- Suggest design patterns for common scenarios
- Highlight architectural deviations
- Warn about anti-patterns
- Provide architectural alternatives
- Document architectural decisions
```

### Behavioral Guidelines
- Apply the component-capability-enabler-requirement model
- Recommend proper naming conventions (verbs for drivers, nouns for driven)
- Suggest appropriate design patterns
- Identify architectural deviations
- Warn about architectural anti-patterns
- Offer architectural alternatives
- Document all architectural decisions

### Source References
- Components-Capabilities-Enablers-Requirements Model (AI_GOVERNANCE_FRAMEWORK.md lines 135-139)
- Naming Conventions (lines 932-1077)
- Driving vs. Driven Naming Strategy (lines 934-1077)
- Dependency Relationship Patterns (lines 976-989)

---

## 7. Change Management & State Transitions

### Policy Statement
AI should manage states carefully and recommend proper transitions.

### Implementation Rules

```
AI should manage states carefully and recommend proper transitions.
- Track all state fields (Status, Approval, etc.)
- Recommend appropriate state transitions
- Warn about skipping state transitions
- Suggest completing current phase before state change
- Log all state changes
- Validate state transition logic
```

### Behavioral Guidelines
- Track all state-related fields continuously
- Recommend appropriate state transitions
- Warn about attempts to skip state transitions
- Suggest phase completion before state changes
- Log all state changes with timestamps
- Validate state transition logic

### Source References
- Post-Condition Transition (AI_GOVERNANCE_FRAMEWORK.md lines 514-523, 749-752, 802-812, 849-851)
- SEQUENTIAL EXECUTION RULES (lines 519-524)
- Status field management throughout workflow tasks

---

## 8. Code Review & Testing Standards

### Policy Statement
AI should recommend testing and code review based on settings.

### Implementation Rules

```
AI should recommend testing and code review based on settings.
- Check "Code Review" metadata field
- Recommend tests for all implementations
- Suggest appropriate testing strategies
- Highlight untested code
- Warn about missing test coverage
- Log testing status
```

### Behavioral Guidelines
- Check "Code Review" metadata field in documents
- Recommend appropriate tests for all implementations
- Suggest suitable testing strategies
- Identify untested code sections
- Warn about insufficient test coverage
- Log testing status and coverage metrics

### Source References
- Code Review metadata field (AI_GOVERNANCE_FRAMEWORK.md lines 196, 1196)
- Testing Strategy section (lines 349-350, 1296-1297)
- Analysis Review settings (lines 292, 1195)

---

## 9. Dependency Management & Integration

### Policy Statement
AI should document dependencies and recommend proper management.

### Implementation Rules

```
AI should document dependencies and recommend proper management.
- Document all internal upstream dependencies
- Document all internal downstream impacts
- Identify external dependencies
- Recommend dependency version control
- Warn about missing dependency documentation
- Suggest dependency flow diagrams
- Log dependency changes
```

### Behavioral Guidelines
- Document all internal upstream dependencies
- Document all internal downstream impacts
- Identify and document external dependencies
- Recommend version control for dependencies
- Warn about undocumented dependencies
- Suggest creating dependency flow diagrams
- Log all dependency changes

### Source References
- Dependencies sections (AI_GOVERNANCE_FRAMEWORK.md lines 303-304, 1109-1120, 1293-1294)
- Dependency Flow Diagrams (lines 1123-1179, 1227-1236)
- Dependency Relationship Patterns (lines 976-989)
- Grey Theme Rule for non-existent capabilities (lines 610-616)

---

## 10. Risk Management & Safety Controls

### Policy Statement
AI should follow safety rules and recommend risk mitigation.

### Implementation Rules

```
AI should follow safety rules and recommend risk mitigation.
- Follow discovery safety rules
- Warn about forbidden actions
- Recommend read-only operations during discovery
- Suggest safe implementation approaches
- Log risky operations
- Provide risk assessment
```

### Behavioral Guidelines
- Adhere to discovery safety rules
- Warn users about forbidden or risky actions
- Recommend read-only operations during discovery phase
- Suggest safe implementation approaches
- Log all risky operations
- Provide risk assessments for proposed actions

### Source References
- CRITICAL WARNING - DISCOVERY LIMITATIONS (AI_GOVERNANCE_FRAMEWORK.md lines 176-206)
- DISCOVERY SAFETY RULES (lines 183-189)
- FORBIDDEN DURING DISCOVERY (lines 190-198)
- Absolute Prohibitions (lines 625-629)

---

## 11. Metadata & Configuration Standards

### Policy Statement
AI should recommend complete metadata and highlight missing fields.

### Implementation Rules

```
AI should recommend complete metadata and highlight missing fields.
- Check for all standard metadata fields
- Recommend appropriate values for each field
- Highlight missing required fields
- Suggest configuration based on "Analysis Review" settings
- Warn about incomplete metadata
- Log metadata completion status
```

### Behavioral Guidelines
- Verify presence of all standard metadata fields
- Recommend appropriate values for each metadata field
- Highlight missing required fields
- Apply configuration logic based on "Analysis Review" settings
- Warn about incomplete metadata
- Log metadata completion status

### Source References
- METADATA FIELD VERIFICATION CHECKLIST (AI_GOVERNANCE_FRAMEWORK.md lines 493-507)
- Enabler Configuration Rules (lines 508-513)
- Requirement Configuration Rules (lines 743-748)
- Metadata sections in templates (lines 1085-1096, 1186-1196)

---

## 12. File Naming & ID Generation Standards

### Policy Statement
AI should generate proper IDs and recommend standard file naming.

### Implementation Rules

```
AI should generate proper IDs and recommend standard file naming.
- Generate IDs using standard algorithm
- Recommend numeric filename format
- Warn about naming convention violations
- Suggest proper file placement
- Check for obvious ID collisions
- Log all generated IDs
```

### Behavioral Guidelines
- Use standard ID generation algorithm
- Recommend numeric filename format (remove CAP-/ENB- prefix)
- Warn about naming convention violations
- Suggest proper file placement strategies
- Check for obvious ID collisions
- Log all generated IDs with metadata

### Source References
- File Naming and ID Generation Schema (AI_GOVERNANCE_FRAMEWORK.md lines 863-930)
- Unique ID Format (lines 865-869)
- ID Generation Algorithm (lines 872-910)
- File Naming Convention (lines 912-916)
- File Placement Strategy (lines 918-930)
- Critical Rules for Discovery (lines 353-359)

---

## Summary

**Preset 2 (Guided Recommendations - Suggested)** provides active guidance and recommendations while allowing flexibility. This level is ideal for:

- Development teams with experienced members
- Iterative development processes
- Teams building toward standardization
- Quality-focused development environments
- Collaborative projects requiring coordination

AI agents operating under Preset 2 will:
- ✓ Follow best practices by default
- ✓ Provide clear warnings for deviations
- ✓ Recommend corrective actions
- ✓ Log deviations and overrides
- ✓ Allow user overrides with confirmation
- ✓ Guide users toward compliance

This preset creates a supportive environment that guides teams toward best practices while maintaining operational flexibility for justified deviations.

---

**End of Document**
