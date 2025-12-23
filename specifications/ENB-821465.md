# Section Start Pages Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | Section Start Pages |
| **Type** | Enabler |
| **ID** | ENB-821465 |
| **Capability ID** | CAP-821456 |
| **Owner** | Development Team |
| **Status** | Ready for Design |
| **Approval** | Approved |
| **Priority** | Medium |
| **Analysis Review** | Not Required |
| **Code Review** | Required |

---

## Technical Context

### Purpose

Each major section in the wizard (Conception, Definition, Design, Testing, Implementation) has a Start page that:
- Explains the purpose of the section
- Describes what the user will accomplish
- Shows illustrative graphics/icons
- Provides a "Begin" button to enter the section

These Start pages help users understand the INTENT methodology and set expectations before they dive into each phase.

### Architecture Fit

A set of components in `web-ui/src/components/wizard/StartPages/` that render educational content before each section's main pages.

### Existing Patterns to Follow

- Pattern: Landing page style with hero section
- Pattern: `web-ui/src/components/Card.tsx` for content cards
- Pattern: Tailwind typography for readable content

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821501 | Start Page Per Section | Each section has a dedicated Start page | Ready for Design | High | Approved |
| FR-821502 | Purpose Text | Each Start page explains the section's purpose | Ready for Design | High | Approved |
| FR-821503 | Illustration | Each Start page has an illustrative graphic | Ready for Design | Medium | Approved |
| FR-821504 | Begin Button | Start page has button to proceed to section content | Ready for Design | High | Approved |
| FR-821505 | Skip Option | User can skip Start page if already familiar | Ready for Design | Low | Approved |
| FR-821506 | Consistent Layout | All Start pages follow same layout structure | Ready for Design | Medium | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821501 | Concise Content | Start page text should be readable in < 30 seconds | UX | Ready for Design | High | Approved |
| NFR-821502 | Visual Appeal | Illustrations enhance understanding | UX | Ready for Design | Medium | Approved |

---

## Technical Specifications

### Component Structure

```
web-ui/src/components/wizard/StartPages/
├── StartPageLayout.tsx      # Shared layout component
├── ConceptionStart.tsx      # Conception section start
├── DefinitionStart.tsx      # Definition section start
├── DesignStart.tsx          # Design section start
├── TestingStart.tsx         # Testing section start
├── ImplementationStart.tsx  # Implementation section start
└── DiscoveryStart.tsx       # Discovery section start (for reverse engineer flow)
```

### StartPageLayout Props

```typescript
interface StartPageLayoutProps {
  title: string;
  subtitle: string;
  description: string[];
  highlights: { icon: string; text: string }[];
  illustration?: React.ReactNode;
  onBegin: () => void;
  beginLabel?: string;
}
```

---

## Start Page Content

### 1. Conception Start Page

**Title**: Conception Phase

**Subtitle**: Where ideas take shape

**Description**:
The Conception phase is where your application begins its journey from idea to reality. This is the creative foundation of your project where you'll capture the vision, identify user needs, and establish the core purpose of what you're building.

During this phase, you will:
- Create Story Cards that describe user journeys and scenarios
- Define the problem you're solving and for whom
- Establish the high-level vision and goals
- Capture initial ideas through storyboarding and ideation

Think of Conception as planting the seed. The clearer your vision here, the stronger your application's foundation will be.

**Key Activities**:
- Story Cards: Capture user stories and scenarios
- Ideation: Brainstorm features and solutions
- Storyboarding: Visualize user flows and journeys
- Problem Definition: Clearly articulate what you're solving

---

### 2. Definition Start Page

**Title**: Definition Phase

**Subtitle**: Translating vision into structure

**Description**:
The Definition phase transforms your conceptual ideas into a structured framework. Here you'll define the Capabilities (what your application can do) and Enablers (how it will do them) that make up your system.

During this phase, you will:
- Create Capability documents that describe business functions
- Break capabilities into technical Enablers
- Define Requirements for each enabler
- Establish dependencies and relationships

Definition is the blueprint stage. Well-defined capabilities lead to clear implementation paths and reduce ambiguity for both humans and AI assistants.

**Key Activities**:
- Capabilities: Define high-level business functions
- Enablers: Break down into technical implementations
- Requirements: Specify functional and non-functional needs
- Dependencies: Map relationships between components

---

### 3. Design Start Page

**Title**: Design Phase

**Subtitle**: Architecting the solution

**Description**:
The Design phase is where technical architecture takes form. You'll create the detailed specifications that guide implementation, including API designs, data models, and system interactions.

During this phase, you will:
- Design API endpoints with request/response schemas
- Create data models and database schemas
- Define component interactions and flows
- Document sequence diagrams and state machines

Good design documentation serves as the contract between specification and implementation. It enables AI to generate accurate code and helps teams stay aligned.

**Key Activities**:
- API Design: Define endpoints, payloads, and responses
- Data Modeling: Create entity schemas and relationships
- Flow Design: Document sequence and interaction diagrams
- UI/UX Design: Link to design artifacts and wireframes

---

### 4. Testing Start Page

**Title**: Testing Phase

**Subtitle**: Ensuring quality through verification

**Description**:
The Testing phase establishes how you'll verify that your implementation meets its requirements. Using Behavior-Driven Development (BDD) with Gherkin syntax, you'll create test scenarios that serve as both documentation and automated tests.

During this phase, you will:
- Write Gherkin scenarios for each requirement
- Define acceptance criteria with Given/When/Then
- Create test suites that group related scenarios
- Establish coverage requirements

Testing in INTENT happens before implementation. By defining tests first, you create a clear target for what "done" looks like and enable AI to validate its own outputs.

**Key Activities**:
- Test Scenarios: Write Gherkin Given/When/Then scenarios
- Test Suites: Group related tests by feature
- Coverage Goals: Define testing completeness targets
- Edge Cases: Document boundary conditions to test

---

### 5. Implementation Start Page

**Title**: Implementation Phase

**Subtitle**: Bringing specifications to life

**Description**:
The Implementation phase is where code is written. With well-defined specifications from previous phases, implementation becomes a matter of translating designs into working software.

During this phase, you will:
- Implement code following design specifications
- Use AI assistance with full context injection
- Run tests to verify implementation
- Iterate based on test results

Implementation in INTENT is accelerated by AI. Because your specifications are detailed and unambiguous, AI can generate high-quality code that matches your requirements.

**Key Activities**:
- Code Generation: Implement features per specifications
- AI Collaboration: Leverage UbeCLI for assisted development
- Test Execution: Run BDD scenarios against code
- Integration: Connect components into working system

---

### 6. Discovery Start Page (Reverse Engineer Flow Only)

**Title**: Discovery Phase

**Subtitle**: Understanding what already exists

**Description**:
The Discovery phase is for analyzing existing applications that weren't built with IntentR. You'll examine the codebase, document its structure, and create capability/enabler specifications that capture what already exists.

During this phase, you will:
- Analyze existing code structure and patterns
- Identify implicit capabilities in the system
- Document current functionality as capabilities
- Create enabler specifications from existing code

Discovery is documentation-only. You will NOT modify code during this phase. The goal is to create a specification layer that enables future enhancements using INTENT methodology.

**Key Activities**:
- Code Analysis: Examine existing application structure
- Capability Identification: Find implicit business functions
- Documentation: Create capability and enabler documents
- Dependency Mapping: Understand component relationships

**Important**: Discovery mode does not modify any application code. It creates documentation only.

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          [Illustration Icon]                            │
│                                                                         │
│                          CONCEPTION PHASE                               │
│                        Where ideas take shape                           │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────    │
│                                                                         │
│    The Conception phase is where your application begins its journey    │
│    from idea to reality. This is the creative foundation of your        │
│    project where you'll capture the vision, identify user needs, and    │
│    establish the core purpose of what you're building.                  │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Story Cards │  │  Ideation   │  │ Storyboard  │  │  Problem    │     │
│  │     📝      │  │     💡      │  │     🎬      │  │    🎯       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                         │
│                        [Begin Conception →]                             │
│                                                                         │
│                    [Skip and go directly to section]                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| User skips Start page | Navigate directly to section content | `test_skip_start()` |
| Remember preference | Option to not show Start pages | `test_remember_skip()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821465 - Section Start Pages Tests

```gherkin
@TST-821465
Feature: Section Start Pages
  As a user new to INTENT
  I want introductory pages for each section
  So that I understand what I'll be doing

  @TS-821561 @FR-821501 @critical
  Scenario: Conception Start page displays
    Given user navigates to Conception in wizard
    When Start page renders
    Then title "Conception Phase" should be visible
    And description text should be readable
    And "Begin" button should be clickable

  @TS-821562 @FR-821505
  Scenario: Skip Start page
    Given user is on Definition Start page
    When user clicks "Skip" link
    Then user should navigate to Definition content
    And Start page should be bypassed
```

---

## Implementation Hints

### Suggested Approach

1. Create shared StartPageLayout component
2. Create individual Start pages using shared layout
3. Store Start page content as constants or markdown
4. Add route handling for /wizard/{section}/start

### Reference Implementations

- Landing page patterns with hero sections
- Marketing page layouts for inspiration

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
