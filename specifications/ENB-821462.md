# WizardStepper Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | WizardStepper |
| **Type** | Enabler |
| **ID** | ENB-821462 |
| **Capability ID** | CAP-821456 |
| **Owner** | Development Team |
| **Status** | Ready for Design |
| **Approval** | Approved |
| **Priority** | High |
| **Analysis Review** | Not Required |
| **Code Review** | Required |

---

## Technical Context

### Purpose

WizardStepper is a card-based step indicator component that displays the wizard progress at the top of the page. Each step is rendered as a clickable card showing:
- Step number
- Step name
- Status (Done/Active/Upcoming)

Users can click any step to navigate forward or backward in the wizard flow.

### Architecture Fit

A reusable UI component in `web-ui/src/components/wizard/` that consumes WizardContext and renders the step indicator bar.

### Existing Patterns to Follow

- Pattern: `web-ui/src/components/Card.tsx` - Card styling
- Pattern: `web-ui/src/components/ApprovalStatusBadge.tsx` - Status indicators
- Pattern: Tailwind CSS utility classes for layout

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821201 | Render Steps | Display all steps in current flow as cards | Ready for Design | High | Approved |
| FR-821202 | Status Styling | Done=green checkmark, Active=blue highlight, Upcoming=grey | Ready for Design | High | Approved |
| FR-821203 | Clickable Navigation | Clicking a step navigates to that step | Ready for Design | High | Approved |
| FR-821204 | Step Connectors | Arrow or line connectors between step cards | Ready for Design | Medium | Approved |
| FR-821205 | Responsive Layout | Steps wrap or scroll on narrow screens | Ready for Design | Medium | Approved |
| FR-821206 | Current Step Indicator | Active step has distinct visual treatment | Ready for Design | High | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821201 | Accessibility | Keyboard navigation between steps | Accessibility | Ready for Design | Medium | Approved |
| NFR-821202 | Animation | Smooth transitions when step status changes | UX | Ready for Design | Low | Approved |

---

## Technical Specifications (Template)

### Component Props

```typescript
interface WizardStepperProps {
  className?: string;
  onStepClick?: (stepIndex: number) => void;
  showConnectors?: boolean;
}
```

### Visual Design (Style B - Card-Based)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│    1     │  →  │    2     │  →  │    3     │  →  │    4     │
│Workspace │     │Conception│     │Definition│     │ Design   │
│   ✓      │     │    ●     │     │          │     │          │
│  Done    │     │  Active  │     │ Upcoming │     │ Upcoming │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
   green            blue            grey             grey
   border           border          border           border
```

### Step Card States

| State | Background | Border | Icon | Text Color |
|-------|------------|--------|------|------------|
| Done | bg-green-50 | border-green-500 | Checkmark ✓ | text-green-700 |
| Active | bg-blue-50 | border-blue-500 | Bullet ● | text-blue-700 |
| Upcoming | bg-grey-50 | border-grey-300 | None | text-grey-500 |

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| Empty steps array | Render nothing or placeholder | `test_empty_steps()` |
| Single step | Render one card, no connectors | `test_single_step()` |
| Many steps (>6) | Horizontal scroll or compact mode | `test_many_steps()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821462 - WizardStepper Tests

```gherkin
@TST-821462
Feature: WizardStepper Component
  As a user
  I want to see my progress through the wizard
  So that I know where I am and can navigate between steps

  @TS-821261 @FR-821201 @critical
  Scenario: Render all steps
    Given wizard flow has 6 steps
    When WizardStepper renders
    Then 6 step cards should be visible
    And each card should show step number and name

  @TS-821262 @FR-821203
  Scenario: Click step to navigate
    Given user is on step 2
    When user clicks step 4 card
    Then goToStep(4) should be called
    And step 4 should become active

  @TS-821263 @FR-821202
  Scenario: Status styling
    Given step 1 is done, step 2 is active, step 3 is upcoming
    When WizardStepper renders
    Then step 1 should have green styling and checkmark
    And step 2 should have blue styling and bullet
    And step 3 should have grey styling
```

---

## Implementation Hints

### Suggested Approach

1. Create component at `web-ui/src/components/wizard/WizardStepper.tsx`
2. Use WizardContext for steps and navigation
3. Map steps to card elements with flex layout
4. Add onClick handler calling goToStep()

### Reference Implementations

- `web-ui/src/components/Card.tsx` - Card styling base
- Tailwind flex utilities for horizontal layout

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
