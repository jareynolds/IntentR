# AI Policy - Preset 4 (Strict Enforcement - Mandatory)

**Version**: 1.0.0
**Date**: 2025-11-19
**Workspace**: BALUT
**Enforcement Level**: Level 4 - Strict Enforcement (Mandatory)

## Overview

This AI Policy document defines the complete governance framework for **Preset 4: Strict Enforcement (Mandatory)** mode. This preset is designed for mission-critical systems, compliance-heavy environments, safety systems, regulated industries, and publicly-traded companies where compliance is absolutely mandatory with zero tolerance for violations.

**Use Cases:**
- Mission-critical systems
- Compliance-heavy environments
- Safety systems and financial systems
- Medical device software
- Aerospace systems and automotive software
- ISO-certified processes
- Production systems
- Publicly-traded companies
- Government systems
- Regulated industries
- Enterprise applications
- Customer-facing systems
- Global platforms and distributed teams

---

## 1. Workflow Governance & State Machine Compliance

### Policy Statement
AI must enforce absolute state machine compliance with zero tolerance for deviations.

### Implementation Rules

```
AI must enforce absolute state machine compliance with zero tolerance for deviations.
- FORBIDDEN: Any attempt to skip workflow states
- MANDATORY: Sequential task execution in exact order
- IMMEDIATE STOP: If current state does not match required state
- NO EXCEPTIONS: Approval does not override state requirements
- ZERO TOLERANCE: Workflow violations terminate all processing
- AUDIT TRAIL: Every state transition logged with justification
- USER NOTIFICATION: Explicit message explaining why processing stopped
```

### Behavioral Guidelines
- **ABSOLUTE PROHIBITION**: Never skip workflow states under any circumstances
- **SEQUENTIAL ENFORCEMENT**: Tasks execute in exact sequential order
- **IMMEDIATE TERMINATION**: Stop ALL processing on state mismatch
- **NO EXCEPTIONS**: No exceptions, no workarounds, no assumptions
- **ZERO TOLERANCE**: Any violation terminates processing
- **AUDIT**: Every transition logged with complete justification
- **NOTIFICATION**: Explicit messages explaining stops

### Enforcement Mechanisms
- Pre-execution state verification (mandatory)
- Immediate termination on state mismatch
- No exception handling for state violations
- Complete audit trail with justifications
- Explicit user notification system
- Workflow violation detection and blocking

### Critical Messages
- "STOPPING - Current state does not match required state"
- "WORKFLOW VIOLATION - State machine compliance required"
- "IMMEDIATE STOP - Sequential task execution mandatory"

### Source References
- APPROVAL vs STATE - FUNDAMENTAL DIFFERENCE (AI_GOVERNANCE_FRAMEWORK.md lines 398-404, 677-683)
- STATE MACHINE COMPLIANCE (lines 406-410, 685-689)
- FORBIDDEN SHORTCUTS (lines 412-415, 691-694)
- CRITICAL WORKFLOW RULES (lines 396-415, 674-694)

---

## 2. Quality Gates & Pre-Condition Verification

### Policy Statement
AI must enforce absolute pre-condition verification with zero tolerance for failures.

### Implementation Rules

```
AI must enforce absolute pre-condition verification with zero tolerance for failures.
- ABSOLUTE PROHIBITION: Never ask user to change pre-condition values
- IMMEDIATE TERMINATION: Stop ALL processing if any pre-condition fails
- NO EXCEPTIONS: Pre-condition failures = MANDATORY STOP
- WORKFLOW HALT: Do not proceed past failed verification
- RESPONSE REQUIREMENT: Must state "STOPPING due to failed pre-conditions"
- DETAILED EXPLANATION: List every failed pre-condition with required vs actual values
- NO OVERRIDE: User cannot override failed pre-conditions
- REMEDIATION GUIDANCE: Provide specific steps to fix pre-condition failures
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
- **ABSOLUTE PROHIBITION**: Never modify or ask to modify pre-condition values
- **IMMEDIATE STOP**: All processing stops on any failure
- **NO EXCEPTIONS**: Pre-condition failures are non-negotiable
- **WORKFLOW HALT**: Complete halt until remediation
- **NO OVERRIDE**: No user override capability
- **DETAILED REPORTING**: List all failures with specifics
- **REMEDIATION**: Provide specific fix guidance

### Enforcement Mechanisms
- Comprehensive pre-condition verification
- Immediate processing termination on failure
- No override mechanism
- Detailed failure reporting
- Remediation guidance generation
- Complete audit logging

### Critical Messages
- "STOPPING due to failed pre-conditions"
- "PRE-CONDITION FAILURE - IMMEDIATE TERMINATION"
- "Required: [value] | Actual: [value] | Status: FAILED"

### Source References
- Pre-Conditions Verification (AI_GOVERNANCE_FRAMEWORK.md lines 419-428, 441-452, 559-570, 637-649, 699-710, 722-733, 771-783, 825-837)
- Critical Rules (lines 424-430, 447-453, 565-571, 643-649)
- Exit Criteria Checklist (lines 432-435, 525-538, 665-671, 712-716, 753-762, 814-819, 853-858)

---

## 3. Documentation Standards & Templates

### Policy Statement
AI must enforce complete template adherence with zero tolerance for missing sections.

### Implementation Rules

```
AI must enforce complete template adherence with zero tolerance for missing sections.
- ABSOLUTE REQUIREMENT: ALL template sections must be present
- METADATA VERIFICATION: Every metadata field must be filled
- NO PLACEHOLDERS: All template text must be replaced with actual content
- SECTION VALIDATION: Verify each section contains real content, not templates
- IMMEDIATE STOP: Block document creation if template incomplete
- COMPLETENESS GATE: Documents cannot progress with missing sections
- AUDIT CHECKLIST: Verify metadata field checklist (lines 493-507)
- FAILURE MESSAGE: "DOCUMENTATION INCOMPLETE - TEMPLATE REQUIREMENTS NOT MET"
```

### Behavioral Guidelines
- **ABSOLUTE REQUIREMENT**: All template sections mandatory
- **METADATA COMPLETE**: Every metadata field must be filled
- **NO PLACEHOLDERS**: No template text can remain
- **SECTION VALIDATION**: Real content required in all sections
- **IMMEDIATE BLOCKING**: Incomplete documents blocked
- **COMPLETENESS GATE**: No progression with missing sections
- **CHECKLIST**: Full metadata verification required

### Enforcement Mechanisms
- Complete template section verification
- Metadata field completeness checking
- Placeholder text detection
- Section content validation
- Document creation blocking
- Metadata checklist verification

### Critical Messages
- "DOCUMENTATION INCOMPLETE - TEMPLATE REQUIREMENTS NOT MET"
- "MISSING REQUIRED SECTIONS - Cannot proceed"
- "METADATA INCOMPLETE - All fields must be filled"

### Source References
- Document Templates (AI_GOVERNANCE_FRAMEWORK.md lines 1079-1298)
- Capability Template Structure (lines 1081-1179)
- Enabler Template Structure (lines 1182-1298)
- Documentation Requirements (lines 604-616)
- CRITICAL ANALYSIS PHASE LIMITATIONS (lines 463-507)

---

## 4. Security & Authorization Compliance

### Policy Statement
AI must enforce absolute approval verification with zero tolerance for unauthorized work.

### Implementation Rules

```
AI must enforce absolute approval verification with zero tolerance for unauthorized work.
- FORBIDDEN: Never modify approval status from "Pending" to "Approved"
- FORBIDDEN: Never change approval status from "Approved" to any other value
- FORBIDDEN: Never modify approval status for Capabilities, Enablers, or Requirements
- APPROVAL STATUS IS READ-ONLY FOR AI AGENTS
- MANDATORY BEHAVIOR: ONLY proceed with items that have Approval = "Approved"
- SKIP: Items with Approval = "Pending", "Rejected", or any non-Approved status
- IMMEDIATE STOP: If no approved items exist for current task
- RESPONSE: "STOPPING - No approved items available for this task"
- NO ASSUMPTIONS: Never assume approval will be granted
```

### Behavioral Guidelines
- **ABSOLUTE PROHIBITION**: Approval status is completely read-only to AI
- **FORBIDDEN MODIFICATIONS**: Never modify approval status in any way
- **APPROVED ONLY**: Work only with "Approved" items
- **SKIP NON-APPROVED**: Automatically skip all non-approved items
- **IMMEDIATE STOP**: Stop if no approved items exist
- **NO ASSUMPTIONS**: Never assume future approval
- **READ-ONLY**: Approval fields are immutable to AI

### Enforcement Mechanisms
- Approval status read-only enforcement
- Approved-only item filtering
- Automatic non-approved item skipping
- Processing stop when no approved items exist
- Approval modification detection and blocking
- Complete audit logging

### Critical Messages
- "STOPPING - No approved items available for this task"
- "APPROVAL STATUS VIOLATION - Read-only enforcement"
- "Cannot proceed - No approved items found"

### Source References
- FORBIDDEN ACTIONS (AI_GOVERNANCE_FRAMEWORK.md lines 151-170)
- DISCOVERY EXCEPTION (lines 157-160)
- MANDATORY BEHAVIOR (lines 162-165)
- VIOLATION CONSEQUENCES (lines 167-170)
- Approval Verification tasks (lines 416-435, 696-716)

---

## 5. Development Lifecycle Management

### Policy Statement
AI must enforce absolute lifecycle compliance with zero tolerance for phase violations.

### Implementation Rules

```
AI must enforce absolute lifecycle compliance with zero tolerance for phase violations.
- ABSOLUTE PROHIBITION: Never skip lifecycle phases
- SEQUENTIAL ENFORCEMENT: Phases must complete in exact order
- IMMEDIATE STOP: Block progression if phase incomplete
- EXIT CRITERIA: All exit criteria must be met before phase transition
- NO EXCEPTIONS: Phase requirements are non-negotiable
- DELIVERABLE VALIDATION: Verify all phase deliverables present
- QUALITY GATES: Automated quality gate enforcement
- AUDIT TRAIL: Complete audit log of all phase activities
- FAILURE MESSAGE: "LIFECYCLE VIOLATION - PHASE REQUIREMENTS NOT MET"
```

### Behavioral Guidelines
- **ABSOLUTE PROHIBITION**: Phase skipping is forbidden
- **SEQUENTIAL**: Exact phase order mandatory
- **IMMEDIATE STOP**: Block on incomplete phases
- **EXIT CRITERIA**: All criteria must be met
- **NO EXCEPTIONS**: Requirements are non-negotiable
- **DELIVERABLES**: All deliverables must exist
- **QUALITY GATES**: Automated enforcement
- **AUDIT**: Complete logging of all activities

### Enforcement Mechanisms
- Phase completion verification
- Sequential phase order enforcement
- Exit criteria validation
- Deliverable existence checking
- Quality gate automation
- Phase progression blocking
- Complete audit trail

### Critical Messages
- "LIFECYCLE VIOLATION - PHASE REQUIREMENTS NOT MET"
- "IMMEDIATE STOP - Phase incomplete"
- "EXIT CRITERIA NOT MET - Cannot proceed"

### Source References
- TASK: DISCOVERY (AI_GOVERNANCE_FRAMEWORK.md lines 174-393)
- CAPABILITY DEVELOPMENT PLAN (lines 394-672)
- ENABLER DEVELOPMENT PLAN (lines 673-858)
- Task progression sequences (Analysis → Design → Implementation)

---

## 6. Architecture Principles & Design Patterns

### Policy Statement
AI must enforce absolute architecture compliance with zero tolerance for violations.

### Implementation Rules

```
AI must enforce absolute architecture compliance with zero tolerance for violations.
- ABSOLUTE REQUIREMENT: All elements must follow capability-enabler model
- NAMING ENFORCEMENT: Strict enforcement of driving (verb) vs driven (noun) naming
- DEPENDENCY VALIDATION: All dependencies must follow defined patterns
- IMMEDIATE STOP: Block creation of non-compliant components
- NO EXCEPTIONS: Architecture principles are non-negotiable
- AUTOMATED VALIDATION: Validate architecture against defined patterns
- TRACEABILITY: Complete traceability from components to requirements
- AUDIT: Architecture compliance tracked in all documents
- FAILURE MESSAGE: "ARCHITECTURE VIOLATION - COMPONENT MODEL NOT FOLLOWED"
```

### Behavioral Guidelines
- **ABSOLUTE REQUIREMENT**: Capability-enabler model mandatory
- **NAMING STRICT**: Verb/noun naming strictly enforced
- **DEPENDENCY VALIDATION**: Pattern compliance required
- **IMMEDIATE BLOCKING**: Non-compliant creation blocked
- **NO EXCEPTIONS**: Principles are non-negotiable
- **AUTOMATION**: Automated validation
- **TRACEABILITY**: Complete traceability required
- **AUDIT**: All compliance tracked

### Enforcement Mechanisms
- Architecture model validation
- Naming convention enforcement
- Dependency pattern verification
- Component creation blocking
- Automated validation systems
- Traceability verification
- Complete audit tracking

### Critical Messages
- "ARCHITECTURE VIOLATION - COMPONENT MODEL NOT FOLLOWED"
- "NAMING VIOLATION - Must follow verb/noun conventions"
- "DEPENDENCY PATTERN VIOLATION - Blocked"

### Source References
- Components-Capabilities-Enablers-Requirements Model (AI_GOVERNANCE_FRAMEWORK.md lines 135-139)
- Naming Conventions (lines 932-1077)
- Driving vs. Driven Naming Strategy (lines 934-1077)
- Dependency Relationship Patterns (lines 976-989)

---

## 7. Change Management & State Transitions

### Policy Statement
AI must enforce absolute state transition compliance with zero tolerance.

### Implementation Rules

```
AI must enforce absolute state transition compliance with zero tolerance.
- STEP ORDERING: Step 2 MUST be completed first (set to "In [Phase]")
- NO JUMPING AHEAD: Never set final status during phase work
- STATUS REFLECTS PHASE: Status must accurately represent current phase
- POST-CONDITIONS ONLY AT END: Final status only when ALL work complete
- IMMEDIATE STOP: Block any premature state transitions
- VALIDATION: Validate state transition against allowed transitions
- AUDIT TRAIL: Complete audit log of all state changes
- ROLLBACK: Automatic rollback of invalid state changes
- FAILURE MESSAGE: "STATE TRANSITION VIOLATION - PHASE INCOMPLETE"
```

### Behavioral Guidelines
- **STEP ORDERING**: Step 2 completion mandatory
- **NO JUMPING**: No premature final status
- **STATUS ACCURACY**: Must reflect actual current phase
- **POST-CONDITIONS**: Only at completion
- **IMMEDIATE STOP**: Block premature transitions
- **VALIDATION**: Validate all transitions
- **AUDIT**: Complete state change logging
- **ROLLBACK**: Auto rollback invalid changes

### Enforcement Mechanisms
- Step ordering verification
- Premature transition blocking
- Status-phase alignment validation
- Post-condition timing enforcement
- State transition validation
- Automatic rollback capability
- Complete audit logging

### Critical Messages
- "STATE TRANSITION VIOLATION - PHASE INCOMPLETE"
- "IMMEDIATE STOP - Premature state transition blocked"
- "STATUS ACCURACY VIOLATION - Rollback initiated"

### Source References
- Post-Condition Transition (AI_GOVERNANCE_FRAMEWORK.md lines 514-523, 749-752, 802-812, 849-851)
- SEQUENTIAL EXECUTION RULES (lines 519-524)
- Status field management throughout workflow tasks

---

## 8. Code Review & Testing Standards

### Policy Statement
AI must enforce absolute testing and code review compliance.

### Implementation Rules

```
AI must enforce absolute testing and code review compliance.
- MANDATORY: Testing strategy required for all implementations
- CODE REVIEW GATE: "Code Review: Required" blocks progression without review
- COVERAGE REQUIREMENTS: Minimum test coverage must be met
- IMMEDIATE STOP: Block implementation without adequate testing
- VALIDATION: Automated test validation required
- QUALITY GATES: Testing quality gates must pass
- AUDIT: All testing activities logged
- FAILURE MESSAGE: "QUALITY GATE FAILURE - TESTING REQUIREMENTS NOT MET"
```

### Behavioral Guidelines
- **MANDATORY TESTING**: All implementations require testing strategy
- **CODE REVIEW GATE**: Blocks progression when required
- **COVERAGE**: Minimum thresholds must be met
- **IMMEDIATE STOP**: No progression without tests
- **VALIDATION**: Automated test validation
- **QUALITY GATES**: Must pass to proceed
- **AUDIT**: All activities logged

### Enforcement Mechanisms
- Testing strategy requirement
- Code review gate enforcement
- Coverage threshold validation
- Implementation blocking
- Automated test validation
- Quality gate checking
- Complete activity logging

### Critical Messages
- "QUALITY GATE FAILURE - TESTING REQUIREMENTS NOT MET"
- "IMMEDIATE STOP - No testing strategy defined"
- "CODE REVIEW REQUIRED - Cannot proceed"

### Source References
- Code Review metadata field (AI_GOVERNANCE_FRAMEWORK.md lines 196, 1196)
- Testing Strategy section (lines 349-350, 1296-1297)
- Analysis Review settings (lines 292, 1195)

---

## 9. Dependency Management & Integration

### Policy Statement
AI must enforce absolute dependency documentation and validation.

### Implementation Rules

```
AI must enforce absolute dependency documentation and validation.
- ABSOLUTE REQUIREMENT: All dependencies must be documented
- DEPENDENCY VALIDATION: Verify all referenced capabilities exist
- IMMEDIATE STOP: Block progression with undocumented dependencies
- FLOW DIAGRAMS MANDATORY: Dependency flow diagrams required
- GREY THEME ENFORCEMENT: Non-existent capabilities must be grey
- NAMING COMPLIANCE: Placeholder naming must follow standards
- CIRCULAR DETECTION: Detect and prevent circular dependencies
- VERSION CONTROL: Dependency versions must be specified
- AUDIT: All dependency changes logged
- FAILURE MESSAGE: "DEPENDENCY VIOLATION - INCOMPLETE DOCUMENTATION"
```

### Behavioral Guidelines
- **ABSOLUTE REQUIREMENT**: All dependencies documented
- **VALIDATION**: Verify all dependencies exist
- **IMMEDIATE STOP**: Block on undocumented dependencies
- **DIAGRAMS MANDATORY**: Flow diagrams required
- **GREY THEME**: Non-existent capabilities styled grey
- **NAMING**: Placeholder standards enforced
- **CIRCULAR DETECTION**: Prevent circular dependencies
- **VERSIONS**: Versions must be specified

### Enforcement Mechanisms
- Dependency documentation verification
- Dependency existence validation
- Progression blocking
- Flow diagram requirements
- Grey theme enforcement
- Circular dependency detection
- Version specification validation
- Complete audit logging

### Critical Messages
- "DEPENDENCY VIOLATION - INCOMPLETE DOCUMENTATION"
- "IMMEDIATE STOP - Undocumented dependencies"
- "CIRCULAR DEPENDENCY DETECTED - Blocked"

### Source References
- Dependencies sections (AI_GOVERNANCE_FRAMEWORK.md lines 303-304, 1109-1120, 1293-1294)
- Dependency Flow Diagrams (lines 1123-1179, 1227-1236)
- Dependency Relationship Patterns (lines 976-989)
- Grey Theme Rule for non-existent capabilities (lines 610-616)

---

## 10. Risk Management & Safety Controls

### Policy Statement
AI must enforce absolute safety controls with zero tolerance.

### Implementation Rules

```
AI must enforce absolute safety controls with zero tolerance.
- ABSOLUTE PROHIBITION: Never proceed to implementation from discovery
- FORBIDDEN: Writing any application code during discovery
- FORBIDDEN: Modifying existing source files during discovery
- FORBIDDEN: Creating new application components during discovery
- FORBIDDEN: Deleting or moving application files during discovery
- FORBIDDEN: Running build processes during discovery
- FORBIDDEN: Making changes that could break existing applications
- IMMEDIATE STOP: Halt if any forbidden action attempted
- FAILURE MESSAGE: "SAFETY VIOLATION - FORBIDDEN ACTION BLOCKED"
```

### Behavioral Guidelines
- **ABSOLUTE PROHIBITION**: No implementation during discovery
- **FORBIDDEN ACTIONS**: Multiple absolute prohibitions
- **NO CODE WRITING**: Zero application code during discovery
- **NO MODIFICATIONS**: No source file changes
- **NO COMPONENTS**: No new component creation
- **NO FILE OPERATIONS**: No delete/move operations
- **NO BUILDS**: No build processes
- **IMMEDIATE HALT**: Stop on any forbidden action

### Enforcement Mechanisms
- Discovery phase detection
- Action classification and blocking
- File operation prevention
- Build process blocking
- Change detection and prevention
- Immediate halt capability
- Violation logging

### Critical Messages
- "SAFETY VIOLATION - FORBIDDEN ACTION BLOCKED"
- "IMMEDIATE STOP - Discovery phase limitations"
- "FORBIDDEN - Cannot modify application code"

### Source References
- CRITICAL WARNING - DISCOVERY LIMITATIONS (AI_GOVERNANCE_FRAMEWORK.md lines 176-206)
- DISCOVERY SAFETY RULES (lines 183-189)
- FORBIDDEN DURING DISCOVERY (lines 190-198)
- Absolute Prohibitions (lines 625-629)

---

## 11. Metadata & Configuration Standards

### Policy Statement
AI must enforce absolute metadata completeness with zero tolerance.

### Implementation Rules

```
AI must enforce absolute metadata completeness with zero tolerance.
- MANDATORY: ALL metadata fields must be present and filled
- VERIFICATION CHECKLIST: Must pass complete metadata checklist
- IMMEDIATE STOP: Block document creation if metadata incomplete
- CONFIGURATION ENFORCEMENT: Strict adherence to configuration rules
- ANALYSIS REVIEW LOGIC: Apply correct approval/status based on "Analysis Review"
- NO PLACEHOLDERS: All metadata must contain real values
- VALIDATION: Automated metadata validation against schema
- AUDIT: All metadata tracked and versioned
- FAILURE MESSAGE: "METADATA INCOMPLETE - CHECKLIST VERIFICATION FAILED"
```

### Behavioral Guidelines
- **MANDATORY FIELDS**: All metadata fields required
- **CHECKLIST**: Complete checklist verification
- **IMMEDIATE STOP**: Block on incomplete metadata
- **CONFIGURATION**: Strict rule enforcement
- **ANALYSIS REVIEW**: Correct logic application
- **NO PLACEHOLDERS**: Real values required
- **VALIDATION**: Automated schema validation
- **AUDIT**: Complete tracking and versioning

### Enforcement Mechanisms
- Metadata completeness verification
- Checklist-based validation
- Document creation blocking
- Configuration rule enforcement
- Analysis review logic application
- Placeholder detection
- Schema validation
- Complete audit tracking

### Critical Messages
- "METADATA INCOMPLETE - CHECKLIST VERIFICATION FAILED"
- "IMMEDIATE STOP - Missing required metadata fields"
- "CONFIGURATION VIOLATION - Rules not followed"

### Source References
- METADATA FIELD VERIFICATION CHECKLIST (AI_GOVERNANCE_FRAMEWORK.md lines 493-507)
- Enabler Configuration Rules (lines 508-513)
- Requirement Configuration Rules (lines 743-748)
- Metadata sections in templates (lines 1085-1096, 1186-1196)

---

## 12. File Naming & ID Generation Standards

### Policy Statement
AI must enforce absolute naming and ID uniqueness with zero tolerance.

### Implementation Rules

```
AI must enforce absolute naming and ID uniqueness with zero tolerance.
- ABSOLUTE REQUIREMENT: All IDs must be globally unique
- EXHAUSTIVE SCAN: Scan ALL markdown files before ID generation
- COLLISION PREVENTION: Guaranteed collision avoidance algorithm
- NAMING ENFORCEMENT: Strict numeric filename format required
- PREFIX REMOVAL: Always remove CAP-/ENB- prefix from filenames
- PLACEMENT VALIDATION: Verify correct directory structure
- IMMEDIATE STOP: Block creation with naming violations
- SEQUENTIAL FALLBACK: Use sequential numbering if collisions persist
- AUDIT: All ID generation logged with collision check results
- FAILURE MESSAGE: "NAMING VIOLATION - ID COLLISION DETECTED"
```

### Behavioral Guidelines
- **ABSOLUTE REQUIREMENT**: Global ID uniqueness mandatory
- **EXHAUSTIVE SCAN**: Scan all files before generation
- **COLLISION PREVENTION**: Guaranteed avoidance
- **NAMING STRICT**: Numeric format required
- **PREFIX REMOVAL**: Always remove prefixes
- **PLACEMENT**: Correct directory verification
- **IMMEDIATE STOP**: Block on violations
- **FALLBACK**: Sequential numbering available

### Enforcement Mechanisms
- Pre-generation exhaustive scanning
- Collision avoidance algorithm
- Naming format enforcement
- Prefix removal verification
- Directory placement validation
- Creation blocking on violations
- Sequential fallback mechanism
- Complete audit logging

### Critical Messages
- "NAMING VIOLATION - ID COLLISION DETECTED"
- "IMMEDIATE STOP - Invalid ID format"
- "PLACEMENT VIOLATION - Incorrect directory"

### Source References
- File Naming and ID Generation Schema (AI_GOVERNANCE_FRAMEWORK.md lines 863-930)
- Unique ID Format (lines 865-869)
- ID Generation Algorithm (lines 872-910)
- File Naming Convention (lines 912-916)
- File Placement Strategy (lines 918-930)
- Critical Rules for Discovery (lines 353-359)

---

## Summary

**Preset 4 (Strict Enforcement - Mandatory)** provides absolute enforcement with zero tolerance for violations. This level is ideal for:

- Mission-critical systems
- Regulated industries and compliance environments
- Safety-critical applications
- Financial systems and healthcare
- Production systems requiring absolute reliability
- Enterprise applications with strict governance
- Systems requiring complete audit trails

AI agents operating under Preset 4 will:
- ✓ Enforce absolute compliance with zero tolerance
- ✓ Immediately stop on any violation
- ✓ Block all non-compliant operations
- ✓ Maintain complete audit trails
- ✓ Provide detailed violation explanations
- ✓ No exceptions or overrides for violations
- ✓ Guarantee governance integrity

This preset creates a strictly controlled environment suitable for mission-critical systems where failure is not an option.

---

**End of Document**
