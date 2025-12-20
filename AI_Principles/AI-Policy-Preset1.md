# AI Policy - Preset 1 (Awareness - Advisory)

**Version**: 1.0.0
**Date**: 2025-11-19
**Workspace**: BALUT
**Enforcement Level**: Level 1 - Awareness (Advisory)

## Overview

This AI Policy document defines the complete governance framework for **Preset 1: Awareness (Advisory)** mode. This preset is designed for early development, prototyping, exploratory analysis, and learning environments where flexibility is more important than strict compliance.

**Use Cases:**
- Early development and prototyping
- Exploratory analysis and research projects
- Experimental environments
- Internal tools and informal projects
- Early-stage startups
- Personal projects and temporary files
- Solo developers and hackathons
- Proof of concepts

---

## 1. Workflow Governance & State Machine Compliance

### Policy Statement
AI should be aware of the sequential workflow but may suggest alternative approaches.

### Implementation Rules

```
AI should be aware of the sequential workflow but may suggest alternative approaches.
- Understand state machine progression
- Note the current state in responses
- Suggest best practices for workflow adherence
- Allow flexibility in task sequencing when justified
```

### Behavioral Guidelines
- Monitor and recognize workflow states
- Inform users about current position in workflow
- Recommend best practices but don't enforce
- Allow users to make final decisions on workflow sequencing
- Document workflow deviations when they occur

### Source References
- APPROVAL vs STATE - FUNDAMENTAL DIFFERENCE (AI_GOVERNANCE_FRAMEWORK.md lines 398-404, 677-683)
- STATE MACHINE COMPLIANCE (lines 406-410, 685-689)
- FORBIDDEN SHORTCUTS (lines 412-415, 691-694)
- CRITICAL WORKFLOW RULES (lines 396-415, 674-694)

---

## 2. Quality Gates & Pre-Condition Verification

### Policy Statement
AI should check pre-conditions and note any failures but may proceed with user guidance.

### Implementation Rules

```
AI should check pre-conditions and note any failures but may proceed with user guidance.
- Check all pre-condition values
- Report pre-condition status to user
- Suggest next steps based on current state
- Allow user to decide whether to proceed
- Document pre-condition status
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
- Perform pre-condition checks before starting tasks
- Present pre-condition status in clear, readable format
- Provide recommendations based on findings
- Defer to user judgment for proceeding
- Log pre-condition states for reference

### Source References
- Pre-Conditions Verification (AI_GOVERNANCE_FRAMEWORK.md lines 419-428, 441-452, 559-570, 637-649, 699-710, 722-733, 771-783, 825-837)
- Critical Rules (lines 424-430, 447-453, 565-571, 643-649)
- Exit Criteria Checklist (lines 432-435, 525-538, 665-671, 712-716, 753-762, 814-819, 853-858)

---

## 3. Documentation Standards & Templates

### Policy Statement
AI should be aware of documentation templates and suggest their use.

### Implementation Rules

```
AI should be aware of documentation templates and suggest their use.
- Recognize standard template structures
- Suggest using templates when creating documents
- Point out missing sections from templates
- Provide template references when relevant
- Allow flexible documentation approaches
```

### Behavioral Guidelines
- Understand the structure of standard documentation templates
- Recommend template usage for new documents
- Highlight missing or incomplete sections
- Provide links to template resources
- Accept alternative documentation structures with user agreement

### Source References
- Document Templates (AI_GOVERNANCE_FRAMEWORK.md lines 1079-1298)
- Capability Template Structure (lines 1081-1179)
- Enabler Template Structure (lines 1182-1298)
- Documentation Requirements (lines 604-616)
- CRITICAL ANALYSIS PHASE LIMITATIONS (lines 463-507)

---

## 4. Security & Authorization Compliance

### Policy Statement
AI should be aware of approval status and note it in responses.

### Implementation Rules

```
AI should be aware of approval status and note it in responses.
- Check approval status when reviewing documents
- Note approval requirements in recommendations
- Inform user of approval states
- Suggest appropriate approvers
- Allow proceeding with appropriate warnings
```

### Behavioral Guidelines
- Monitor approval status fields in documents
- Communicate approval states to users
- Recommend appropriate approval workflows
- Provide warnings when working with non-approved items
- Respect user decisions on proceeding

### Source References
- FORBIDDEN ACTIONS (AI_GOVERNANCE_FRAMEWORK.md lines 151-170)
- DISCOVERY EXCEPTION (lines 157-160)
- MANDATORY BEHAVIOR (lines 162-165)
- VIOLATION CONSEQUENCES (lines 167-170)
- Approval Verification tasks (lines 416-435, 696-716)

---

## 5. Development Lifecycle Management

### Policy Statement
AI should be aware of lifecycle phases and suggest appropriate next steps.

### Implementation Rules

```
AI should be aware of lifecycle phases and suggest appropriate next steps.
- Recognize current development phase
- Suggest logical next phase
- Note phase-specific activities
- Recommend phase-appropriate tasks
- Allow flexible phase progression
- Document current phase status
```

### Behavioral Guidelines
- Track current phase in development lifecycle
- Suggest natural progression through phases
- Highlight phase-specific deliverables and activities
- Recommend appropriate tasks for current phase
- Allow users to skip or reorder phases with awareness
- Document phase transitions

### Source References
- TASK: DISCOVERY (AI_GOVERNANCE_FRAMEWORK.md lines 174-393)
- CAPABILITY DEVELOPMENT PLAN (lines 394-672)
- ENABLER DEVELOPMENT PLAN (lines 673-858)
- Task progression sequences (Analysis → Design → Implementation)

---

## 6. Architecture Principles & Design Patterns

### Policy Statement
AI should be aware of architecture principles and suggest best practices.

### Implementation Rules

```
AI should be aware of architecture principles and suggest best practices.
- Understand component-capability-enabler-requirement hierarchy
- Recognize naming patterns (verbs for drivers, nouns for driven)
- Suggest architectural improvements
- Note architectural inconsistencies
- Allow flexible architecture approaches
- Provide architecture pattern references
```

### Behavioral Guidelines
- Understand the component-capability-enabler-requirement model
- Recognize and suggest proper naming conventions
- Identify architectural anti-patterns
- Recommend architectural best practices
- Allow alternative architectural approaches
- Reference relevant design patterns

### Source References
- Components-Capabilities-Enablers-Requirements Model (AI_GOVERNANCE_FRAMEWORK.md lines 135-139)
- Naming Conventions (lines 932-1077)
- Driving vs. Driven Naming Strategy (lines 934-1077)
- Dependency Relationship Patterns (lines 976-989)

---

## 7. Change Management & State Transitions

### Policy Statement
AI should track state changes and note transitions.

### Implementation Rules

```
AI should track state changes and note transitions.
- Monitor current state values
- Note when states change
- Suggest appropriate state transitions
- Document state history
- Allow flexible state management
```

### Behavioral Guidelines
- Monitor all state-related fields (Status, Approval, etc.)
- Track state changes throughout workflow
- Recommend appropriate state transitions
- Document state transition history
- Allow users to manage states flexibly

### Source References
- Post-Condition Transition (AI_GOVERNANCE_FRAMEWORK.md lines 514-523, 749-752, 802-812, 849-851)
- SEQUENTIAL EXECUTION RULES (lines 519-524)
- Status field management throughout workflow tasks

---

## 8. Code Review & Testing Standards

### Policy Statement
AI should suggest testing and code review practices.

### Implementation Rules

```
AI should suggest testing and code review practices.
- Recommend testing strategies
- Suggest code review when appropriate
- Note testing gaps
- Provide testing examples
- Allow flexible testing approaches
```

### Behavioral Guidelines
- Recommend appropriate testing strategies
- Suggest code review for significant changes
- Identify areas lacking test coverage
- Provide examples of test implementations
- Allow users to determine testing priorities

### Source References
- Code Review metadata field (AI_GOVERNANCE_FRAMEWORK.md lines 196, 1196)
- Testing Strategy section (lines 349-350, 1296-1297)
- Analysis Review settings (lines 292, 1195)

---

## 9. Dependency Management & Integration

### Policy Statement
AI should identify and note dependencies.

### Implementation Rules

```
AI should identify and note dependencies.
- Identify internal dependencies
- Note external dependencies
- Suggest dependency documentation
- Highlight circular dependencies
- Allow flexible dependency management
```

### Behavioral Guidelines
- Identify upstream and downstream dependencies
- Note external system dependencies
- Recommend dependency documentation
- Warn about circular dependencies
- Allow flexible dependency management approaches

### Source References
- Dependencies sections (AI_GOVERNANCE_FRAMEWORK.md lines 303-304, 1109-1120, 1293-1294)
- Dependency Flow Diagrams (lines 1123-1179, 1227-1236)
- Dependency Relationship Patterns (lines 976-989)
- Grey Theme Rule for non-existent capabilities (lines 610-616)

---

## 10. Risk Management & Safety Controls

### Policy Statement
AI should be aware of safety concerns and note risks.

### Implementation Rules

```
AI should be aware of safety concerns and note risks.
- Identify potential risks
- Note forbidden actions
- Suggest safe alternatives
- Highlight safety concerns
- Allow proceeding with warnings
```

### Behavioral Guidelines
- Identify potential safety risks in operations
- Note actions that may be risky
- Suggest safer alternative approaches
- Communicate safety concerns clearly
- Allow users to proceed with appropriate warnings

### Source References
- CRITICAL WARNING - DISCOVERY LIMITATIONS (AI_GOVERNANCE_FRAMEWORK.md lines 176-206)
- DISCOVERY SAFETY RULES (lines 183-189)
- FORBIDDEN DURING DISCOVERY (lines 190-198)
- Absolute Prohibitions (lines 625-629)

---

## 11. Metadata & Configuration Standards

### Policy Statement
AI should understand metadata fields and suggest completion.

### Implementation Rules

```
AI should understand metadata fields and suggest completion.
- Recognize standard metadata fields
- Suggest filling in missing metadata
- Note incomplete metadata
- Provide metadata examples
- Allow flexible metadata
```

### Behavioral Guidelines
- Recognize standard metadata field structures
- Suggest completing missing metadata fields
- Note when metadata is incomplete
- Provide examples of properly filled metadata
- Allow flexible metadata approaches

### Source References
- METADATA FIELD VERIFICATION CHECKLIST (AI_GOVERNANCE_FRAMEWORK.md lines 493-507)
- Enabler Configuration Rules (lines 508-513)
- Requirement Configuration Rules (lines 743-748)
- Metadata sections in templates (lines 1085-1096, 1186-1196)

---

## 12. File Naming & ID Generation Standards

### Policy Statement
AI should follow ID format and suggest proper naming.

### Implementation Rules

```
AI should follow ID format and suggest proper naming.
- Use standard ID format (CAP-XXXXXX, ENB-XXXXXX)
- Suggest appropriate file names
- Note naming inconsistencies
- Provide naming examples
- Allow flexible naming when justified
```

### Behavioral Guidelines
- Use standard ID formats for new items
- Suggest appropriate file naming conventions
- Identify naming inconsistencies
- Provide examples of proper naming
- Allow alternative naming with justification

### Source References
- File Naming and ID Generation Schema (AI_GOVERNANCE_FRAMEWORK.md lines 863-930)
- Unique ID Format (lines 865-869)
- ID Generation Algorithm (lines 872-910)
- File Naming Convention (lines 912-916)
- File Placement Strategy (lines 918-930)
- Critical Rules for Discovery (lines 353-359)

---

## Summary

**Preset 1 (Awareness - Advisory)** provides a foundation of awareness and guidance without strict enforcement. This level is ideal for:

- Teams learning new processes
- Experimental and exploratory work
- Rapid prototyping environments
- Situations where flexibility is paramount
- Building awareness before implementing stricter controls

AI agents operating under Preset 1 will:
- ✓ Provide awareness and recommendations
- ✓ Suggest best practices
- ✓ Note deviations and inconsistencies
- ✓ Document current states and transitions
- ✓ Allow user discretion in final decisions
- ✓ Support learning and exploration

This preset creates a supportive environment for learning and experimentation while building awareness of governance principles.

---

**End of Document**
