# AI Policy - Preset 3 (Enforced with Warnings - Controlled)

**Version**: 1.0.0
**Date**: 2025-11-19
**Workspace**: BALUT
**Enforcement Level**: Level 3 - Enforced with Warnings (Controlled)

## Overview

This AI Policy document defines the complete governance framework for **Preset 3: Enforced with Warnings (Controlled)** mode. This preset is designed for production environments, regulated industries, quality-critical systems, and teams that require strict adherence to standards with controlled exceptions.

**Use Cases:**
- Production environments
- Regulated industries
- Quality-critical systems
- Enterprise teams and large codebases
- Quality-focused teams
- Production deployments and release management
- Enterprise workflows and compliance environments
- Platform development and service meshes
- Product teams and SaaS applications

---

## 1. Workflow Governance & State Machine Compliance

### Policy Statement
AI must strictly follow state machine compliance with explicit warnings before any deviation.

### Implementation Rules

```
AI must strictly follow state machine compliance with explicit warnings before any deviation.
- NEVER skip states without explicit user confirmation
- ALWAYS verify current state before proceeding
- REQUIRE user acknowledgment for any workflow deviations
- Document all state transitions in audit log
- Block task execution if state requirements not met
- Provide detailed explanation of violated rules
```

### Behavioral Guidelines
- **MANDATORY**: Verify current state matches required state before proceeding
- **BLOCKING**: Prevent automatic progression if state mismatch detected
- **WARNING**: Issue explicit, detailed warnings for any deviation attempt
- **CONFIRMATION**: Require explicit user acknowledgment to deviate
- **AUDIT**: Log all state transitions and deviations
- **EXPLANATION**: Provide complete explanation of violated rules

### Enforcement Mechanisms
- Pre-execution state verification
- Automatic workflow blocking on state mismatch
- Explicit warning messages with rule citations
- User confirmation requirement for deviations
- Comprehensive audit logging

### Source References
- APPROVAL vs STATE - FUNDAMENTAL DIFFERENCE (AI_GOVERNANCE_FRAMEWORK.md lines 398-404, 677-683)
- STATE MACHINE COMPLIANCE (lines 406-410, 685-689)
- FORBIDDEN SHORTCUTS (lines 412-415, 691-694)
- CRITICAL WORKFLOW RULES (lines 396-415, 674-694)

---

## 2. Quality Gates & Pre-Condition Verification

### Policy Statement
AI must verify all pre-conditions and provide explicit warnings before allowing any overrides.

### Implementation Rules

```
AI must verify all pre-conditions and provide explicit warnings before allowing any overrides.
- MANDATORY: Check every pre-condition in the table
- DISPLAY: Show pre-condition verification results in structured format
- WARN: Provide clear warnings for each failed pre-condition
- BLOCK: Prevent automatic progression if pre-conditions fail
- REQUIRE: Explicit user acknowledgment to override failures
- AUDIT: Log all pre-condition states and override decisions
- EXPLAIN: Detailed consequences of proceeding with failures
```

### Behavioral Guidelines
- **VERIFICATION**: Check every single pre-condition
- **DISPLAY**: Present verification results in clear, structured format
- **WARNING**: Issue specific warnings for each failure
- **BLOCKING**: Prevent automatic continuation on failures
- **OVERRIDE**: Allow override only with explicit user acknowledgment
- **CONSEQUENCES**: Explain detailed consequences of proceeding

### Enforcement Mechanisms
- Comprehensive pre-condition verification
- Structured verification result display
- Automatic blocking on failures
- Explicit override confirmation requirement
- Detailed consequence explanation
- Complete audit trail

### Source References
- Pre-Conditions Verification (AI_GOVERNANCE_FRAMEWORK.md lines 419-428, 441-452, 559-570, 637-649, 699-710, 722-733, 771-783, 825-837)
- Critical Rules (lines 424-430, 447-453, 565-571, 643-649)
- Exit Criteria Checklist (lines 432-435, 525-538, 665-671, 712-716, 753-762, 814-819, 853-858)

---

## 3. Documentation Standards & Templates

### Policy Statement
AI must use standard templates and provide warnings for any deviations or missing sections.

### Implementation Rules

```
AI must use standard templates and provide warnings for any deviations or missing sections.
- MANDATORY: Use complete template structure for all documents
- VERIFY: Check all metadata fields are present
- WARN: Explicit warnings for missing required sections
- VALIDATE: Ensure proper section headers and formatting
- REQUIRE: User acknowledgment for template deviations
- DOCUMENT: Log all deviations from standard templates
- COMPLETENESS CHECK: Verify no placeholder text remains
```

### Behavioral Guidelines
- **TEMPLATE USAGE**: All documents must use complete template structure
- **METADATA**: Verify all metadata fields are present
- **WARNINGS**: Issue explicit warnings for missing sections
- **VALIDATION**: Validate section headers and formatting
- **DEVIATIONS**: Require user acknowledgment for any deviations
- **PLACEHOLDERS**: Ensure no template placeholders remain

### Enforcement Mechanisms
- Mandatory template application
- Metadata field verification
- Section completeness validation
- Placeholder detection
- Deviation logging
- User confirmation for exceptions

### Source References
- Document Templates (AI_GOVERNANCE_FRAMEWORK.md lines 1079-1298)
- Capability Template Structure (lines 1081-1179)
- Enabler Template Structure (lines 1182-1298)
- Documentation Requirements (lines 604-616)
- CRITICAL ANALYSIS PHASE LIMITATIONS (lines 463-507)

---

## 4. Security & Authorization Compliance

### Policy Statement
AI must verify approval status and provide explicit warnings before proceeding with non-approved items.

### Implementation Rules

```
AI must verify approval status and provide explicit warnings before proceeding with non-approved items.
- MANDATORY: Check approval status for all items
- DISPLAY: Show clear approval status for each item
- WARN: Explicit warnings for non-approved items
- FILTER: Separate approved from non-approved items
- BLOCK: Prevent automatic processing of non-approved items
- REQUIRE: User confirmation to work with pending approvals
- AUDIT: Log all approval status decisions
- READ-ONLY: Never modify approval status fields
```

### Behavioral Guidelines
- **VERIFICATION**: Check approval status for every item
- **DISPLAY**: Show clear approval status information
- **FILTERING**: Separate approved from non-approved items
- **WARNINGS**: Issue explicit warnings for non-approved items
- **BLOCKING**: Prevent automatic processing of non-approved items
- **READ-ONLY**: Never modify approval status (immutable to AI)

### Enforcement Mechanisms
- Comprehensive approval status verification
- Approval status display requirements
- Automatic filtering by approval status
- Processing blocks for non-approved items
- Read-only enforcement for approval fields
- Complete audit logging

### Source References
- FORBIDDEN ACTIONS (AI_GOVERNANCE_FRAMEWORK.md lines 151-170)
- DISCOVERY EXCEPTION (lines 157-160)
- MANDATORY BEHAVIOR (lines 162-165)
- VIOLATION CONSEQUENCES (lines 167-170)
- Approval Verification tasks (lines 416-435, 696-716)

---

## 5. Development Lifecycle Management

### Policy Statement
AI must follow lifecycle phases strictly with explicit warnings for deviations.

### Implementation Rules

```
AI must follow lifecycle phases strictly with explicit warnings for deviations.
- MANDATORY: Complete each phase before proceeding
- VERIFY: Check phase completion criteria
- WARN: Explicit warnings for incomplete phases
- BLOCK: Prevent automatic phase skipping
- REQUIRE: User acknowledgment to skip phases
- DOCUMENT: Log all phase transitions and skips
- VALIDATE: Ensure phase deliverables completed
- PHASE GATES: Implement quality gates between phases
```

### Behavioral Guidelines
- **SEQUENTIAL**: Phases must complete in proper order
- **COMPLETION**: Verify phase completion criteria met
- **WARNINGS**: Issue explicit warnings for incomplete phases
- **BLOCKING**: Prevent automatic phase progression
- **GATES**: Enforce quality gates between phases
- **DELIVERABLES**: Validate phase deliverables exist

### Enforcement Mechanisms
- Phase completion verification
- Sequential phase enforcement
- Quality gate implementation
- Deliverable validation
- Phase skip blocking
- Comprehensive phase logging

### Source References
- TASK: DISCOVERY (AI_GOVERNANCE_FRAMEWORK.md lines 174-393)
- CAPABILITY DEVELOPMENT PLAN (lines 394-672)
- ENABLER DEVELOPMENT PLAN (lines 673-858)
- Task progression sequences (Analysis → Design → Implementation)

---

## 6. Architecture Principles & Design Patterns

### Policy Statement
AI must follow architecture principles with warnings for deviations.

### Implementation Rules

```
AI must follow architecture principles with warnings for deviations.
- MANDATORY: Use component-capability-enabler-requirement model
- ENFORCE: Proper naming conventions (verbs for drivers, nouns for driven)
- VALIDATE: Dependency relationships follow patterns
- WARN: Explicit warnings for architectural violations
- BLOCK: Prevent creation of non-compliant structures
- REQUIRE: Justification for architectural deviations
- DOCUMENT: Log all architectural decisions
- CONSISTENCY: Enforce consistent patterns across codebase
```

### Behavioral Guidelines
- **MODEL**: Use component-capability-enabler-requirement model exclusively
- **NAMING**: Enforce proper naming conventions strictly
- **VALIDATION**: Validate dependency relationships
- **WARNINGS**: Issue explicit warnings for violations
- **BLOCKING**: Prevent non-compliant structure creation
- **CONSISTENCY**: Enforce pattern consistency

### Enforcement Mechanisms
- Architecture model enforcement
- Naming convention validation
- Dependency pattern verification
- Violation warnings
- Structure creation blocking
- Pattern consistency checking

### Source References
- Components-Capabilities-Enablers-Requirements Model (AI_GOVERNANCE_FRAMEWORK.md lines 135-139)
- Naming Conventions (lines 932-1077)
- Driving vs. Driven Naming Strategy (lines 934-1077)
- Dependency Relationship Patterns (lines 976-989)

---

## 7. Change Management & State Transitions

### Policy Statement
AI must manage state transitions strictly with explicit warnings for violations.

### Implementation Rules

```
AI must manage state transitions strictly with explicit warnings for violations.
- MANDATORY: Set status to "In [Phase]" when starting phase work
- VERIFY: Status reflects current phase accurately
- WARN: Explicit warnings for premature state transitions
- BLOCK: Prevent jumping ahead to final status during phase work
- REQUIRE: Completion of phase work before final status
- SEQUENTIAL: Status must accurately represent current phase
- POST-CONDITIONS ONLY AT END: Transition only when ALL work complete
- DOCUMENT: Log every state transition with timestamp
```

### Behavioral Guidelines
- **STATUS ACCURACY**: Status must reflect actual current phase
- **SEQUENCING**: Prevent premature state transitions
- **WARNINGS**: Issue explicit warnings for violations
- **BLOCKING**: Block attempts to skip state transitions
- **COMPLETION**: Require phase completion before final status
- **LOGGING**: Log all state transitions

### Enforcement Mechanisms
- State-phase alignment verification
- Premature transition blocking
- Sequential state enforcement
- State transition validation
- Comprehensive state logging
- Timestamp tracking

### Source References
- Post-Condition Transition (AI_GOVERNANCE_FRAMEWORK.md lines 514-523, 749-752, 802-812, 849-851)
- SEQUENTIAL EXECUTION RULES (lines 519-524)
- Status field management throughout workflow tasks

---

## 8. Code Review & Testing Standards

### Policy Statement
AI must enforce testing and code review requirements based on metadata settings.

### Implementation Rules

```
AI must enforce testing and code review requirements based on metadata settings.
- VERIFY: Check "Code Review" field for each enabler
- ENFORCE: "Required" = code review must occur
- VALIDATE: Testing strategy must be documented
- WARN: Explicit warnings for missing tests
- BLOCK: Prevent implementation without testing strategy
- REQUIRE: User acknowledgment to skip tests
- COVERAGE: Recommend minimum test coverage thresholds
```

### Behavioral Guidelines
- **VERIFICATION**: Check "Code Review" metadata field
- **ENFORCEMENT**: Enforce "Required" code review settings
- **VALIDATION**: Ensure testing strategy documented
- **WARNINGS**: Issue explicit warnings for missing tests
- **BLOCKING**: Prevent progression without testing
- **COVERAGE**: Recommend coverage thresholds

### Enforcement Mechanisms
- Code review metadata verification
- Testing strategy validation
- Coverage threshold recommendations
- Implementation blocking without tests
- Test requirement warnings
- User acknowledgment for skips

### Source References
- Code Review metadata field (AI_GOVERNANCE_FRAMEWORK.md lines 196, 1196)
- Testing Strategy section (lines 349-350, 1296-1297)
- Analysis Review settings (lines 292, 1195)

---

## 9. Dependency Management & Integration

### Policy Statement
AI must document all dependencies with explicit warnings for violations.

### Implementation Rules

```
AI must document all dependencies with explicit warnings for violations.
- MANDATORY: Document all dependencies in dependency tables
- VERIFY: Internal upstream and downstream dependencies listed
- VALIDATE: External dependencies properly documented
- WARN: Explicit warnings for undocumented dependencies
- REQUIRE: Dependency flow diagrams for complex relationships
- GREY THEME RULE: Non-existent capabilities styled grey in diagrams
- PLACEHOLDER NAMING: Use "CAP-XXX01" format for placeholders
- DOCUMENT: Note explaining grey capabilities are placeholders
```

### Behavioral Guidelines
- **DOCUMENTATION**: All dependencies must be documented
- **VERIFICATION**: Verify upstream and downstream dependencies
- **VALIDATION**: Validate external dependencies
- **WARNINGS**: Issue warnings for undocumented dependencies
- **DIAGRAMS**: Require flow diagrams for complex dependencies
- **PLACEHOLDERS**: Use grey theme for non-existent capabilities

### Enforcement Mechanisms
- Dependency documentation verification
- Upstream/downstream tracking
- External dependency validation
- Flow diagram requirements
- Placeholder formatting enforcement
- Undocumented dependency warnings

### Source References
- Dependencies sections (AI_GOVERNANCE_FRAMEWORK.md lines 303-304, 1109-1120, 1293-1294)
- Dependency Flow Diagrams (lines 1123-1179, 1227-1236)
- Dependency Relationship Patterns (lines 976-989)
- Grey Theme Rule for non-existent capabilities (lines 610-616)

---

## 10. Risk Management & Safety Controls

### Policy Statement
AI must enforce safety rules with explicit warnings for violations.

### Implementation Rules

```
AI must enforce safety rules with explicit warnings for violations.
- DISCOVERY = DOCUMENTATION ONLY
- STOP AT DESIGN: Never proceed to implementation during discovery
- NO CODE CHANGES: Never modify existing application code
- NO FILE OVERWRITES: Never overwrite existing files
- READ-ONLY ANALYSIS: Discovery is purely analytical
- WARN: Explicit warnings before any risky operations
- REQUIRE: User confirmation for actions near forbidden boundaries
```

### Behavioral Guidelines
- **DISCOVERY LIMITS**: Discovery is documentation only
- **NO IMPLEMENTATION**: Never proceed to implementation during discovery
- **READ-ONLY**: No modifications to existing code
- **NO OVERWRITES**: Never overwrite existing files
- **WARNINGS**: Issue explicit warnings for risky operations
- **CONFIRMATION**: Require user confirmation for boundary actions

### Enforcement Mechanisms
- Discovery phase limitations
- Implementation blocking during discovery
- Code modification prevention
- File overwrite prevention
- Risky operation warnings
- User confirmation requirements

### Source References
- CRITICAL WARNING - DISCOVERY LIMITATIONS (AI_GOVERNANCE_FRAMEWORK.md lines 176-206)
- DISCOVERY SAFETY RULES (lines 183-189)
- FORBIDDEN DURING DISCOVERY (lines 190-198)
- Absolute Prohibitions (lines 625-629)

---

## 11. Metadata & Configuration Standards

### Policy Statement
AI must enforce metadata completeness with warnings for missing fields.

### Implementation Rules

```
AI must enforce metadata completeness with warnings for missing fields.
- VERIFY: All metadata fields present before proceeding
- VALIDATE: Metadata values follow configuration rules
- WARN: Explicit warnings for missing fields
- CONFIGURATION RULES: Apply enabler/requirement configuration rules
- BLOCK: Prevent progression with incomplete metadata
- CHECKLIST: Use metadata field verification checklist
- REQUIRE: User acknowledgment for metadata gaps
```

### Behavioral Guidelines
- **VERIFICATION**: Verify all metadata fields present
- **VALIDATION**: Validate metadata values
- **WARNINGS**: Issue explicit warnings for missing fields
- **CONFIGURATION**: Apply configuration rules
- **BLOCKING**: Prevent progression with incomplete metadata
- **CHECKLIST**: Use verification checklist

### Enforcement Mechanisms
- Metadata completeness verification
- Configuration rule application
- Missing field warnings
- Progression blocking
- Verification checklist usage
- User acknowledgment for gaps

### Source References
- METADATA FIELD VERIFICATION CHECKLIST (AI_GOVERNANCE_FRAMEWORK.md lines 493-507)
- Enabler Configuration Rules (lines 508-513)
- Requirement Configuration Rules (lines 743-748)
- Metadata sections in templates (lines 1085-1096, 1186-1196)

---

## 12. File Naming & ID Generation Standards

### Policy Statement
AI must follow naming standards strictly with collision detection.

### Implementation Rules

```
AI must follow naming standards strictly with collision detection.
- MANDATORY: Scan for existing IDs before generating new ones
- ALGORITHM: Use ID generation algorithm exactly
- NUMERIC FILENAME: Extract numeric part from full ID
- COLLISION DETECTION: Check all markdown files for ID collisions
- WARN: Explicit warnings for naming violations
- PLACEMENT: Follow file placement strategy
- RELATIONSHIP: Maintain ID relationships in metadata
- DOCUMENT: Log all ID generation with collision checks
```

### Behavioral Guidelines
- **ID SCANNING**: Scan for existing IDs before generation
- **ALGORITHM**: Use standard algorithm exactly
- **COLLISION DETECTION**: Check for ID collisions
- **NAMING**: Follow numeric filename format
- **WARNINGS**: Issue warnings for violations
- **PLACEMENT**: Follow file placement strategy

### Enforcement Mechanisms
- Pre-generation ID scanning
- Algorithm adherence
- Collision detection
- Naming convention validation
- File placement verification
- ID generation logging

### Source References
- File Naming and ID Generation Schema (AI_GOVERNANCE_FRAMEWORK.md lines 863-930)
- Unique ID Format (lines 865-869)
- ID Generation Algorithm (lines 872-910)
- File Naming Convention (lines 912-916)
- File Placement Strategy (lines 918-930)
- Critical Rules for Discovery (lines 353-359)

---

## Summary

**Preset 3 (Enforced with Warnings - Controlled)** provides strict enforcement with controlled exceptions through explicit user acknowledgment. This level is ideal for:

- Production environments
- Regulated industries requiring compliance
- Quality-critical systems
- Enterprise teams and platforms
- Customer-facing applications
- Teams requiring strong governance

AI agents operating under Preset 3 will:
- ✓ Strictly enforce governance rules
- ✓ Issue explicit warnings for violations
- ✓ Block automatic progression on failures
- ✓ Require user acknowledgment for exceptions
- ✓ Maintain comprehensive audit trails
- ✓ Validate all compliance requirements

This preset creates a controlled environment with strong governance while allowing justified exceptions through explicit user decision-making.

---

**End of Document**
