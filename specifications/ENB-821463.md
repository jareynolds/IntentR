# WizardLayout Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | WizardLayout |
| **Type** | Enabler |
| **ID** | ENB-821463 |
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

WizardLayout is a layout wrapper component that replaces the standard sidebar layout when wizard mode is active. It provides:
- Full-width content area (no sidebar)
- WizardStepper at the top
- Previous/Next navigation at the bottom
- Exit Wizard button in header

### Architecture Fit

A layout component that conditionally renders based on WizardContext.isWizardMode. Wraps existing page components to provide the wizard chrome.

### Existing Patterns to Follow

- Pattern: Existing layout in `App.tsx` with sidebar
- Pattern: `web-ui/src/components/Button.tsx` for navigation buttons
- Pattern: Tailwind CSS layout utilities

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821301 | No Sidebar | Wizard layout hides the sidebar | Ready for Design | High | Approved |
| FR-821302 | Stepper Header | WizardStepper appears at top of page | Ready for Design | High | Approved |
| FR-821303 | Bottom Navigation | Previous/Next buttons at bottom | Ready for Design | High | Approved |
| FR-821304 | Exit Button | Button to exit wizard and return to sidebar nav | Ready for Design | Medium | Approved |
| FR-821305 | Content Area | Children render in scrollable content area | Ready for Design | High | Approved |
| FR-821306 | Flow Title | Display current flow type (New App, Refactor, etc.) | Ready for Design | Low | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821301 | Full Height | Layout fills viewport height | UX | Ready for Design | High | Approved |
| NFR-821302 | Sticky Header | Stepper stays visible while scrolling | UX | Ready for Design | Medium | Approved |
| NFR-821303 | Sticky Footer | Navigation buttons stay at bottom | UX | Ready for Design | Medium | Approved |

---

## Technical Specifications (Template)

### Component Props

```typescript
interface WizardLayoutProps {
  children: React.ReactNode;
  showPrevious?: boolean;
  showNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  previousLabel?: string;
}
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Exit Wizard]                    WIZARD MODE: New Application          │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────┐  →  ┌────────┐  →  ┌────────┐  →  ┌────────┐  →  ┌────────┐ │
│  │   1    │     │   2    │     │   3    │     │   4    │     │   5    │ │
│  │ Work   │     │ Concep │     │  Def   │     │ Design │     │  Test  │ │
│  │   ✓    │     │   ●    │     │        │     │        │     │        │ │
│  └────────┘     └────────┘     └────────┘     └────────┘     └────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                                                                         │
│                         [Page Content Area]                             │
│                                                                         │
│                                                                         │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [← Previous]                                            [Next →]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### CSS Structure

```css
.wizard-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.wizard-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  border-bottom: 1px solid var(--color-separator);
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.wizard-footer {
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid var(--color-separator);
  padding: 1rem;
}
```

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| First step | Hide Previous button | `test_first_step_no_previous()` |
| Last step | Change Next to "Complete" | `test_last_step_complete_button()` |
| Exit wizard clicked | Show confirmation dialog | `test_exit_confirmation()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821463 - WizardLayout Tests

```gherkin
@TST-821463
Feature: WizardLayout Component
  As a user in wizard mode
  I want a focused layout without sidebar distractions
  So that I can concentrate on each wizard step

  @TS-821361 @FR-821301 @critical
  Scenario: No sidebar in wizard mode
    Given wizard mode is enabled
    When WizardLayout renders
    Then sidebar should not be visible
    And content should be full width

  @TS-821362 @FR-821303
  Scenario: Bottom navigation buttons
    Given user is on step 2 of 5
    When WizardLayout renders
    Then Previous button should be visible
    And Next button should be visible

  @TS-821363 @FR-821304
  Scenario: Exit wizard
    Given user is in wizard mode
    When user clicks Exit Wizard button
    Then confirmation dialog should appear
    And user can return to sidebar navigation
```

---

## Implementation Hints

### Suggested Approach

1. Create component at `web-ui/src/components/wizard/WizardLayout.tsx`
2. Use flex column layout for header/content/footer
3. Conditionally render based on currentStepIndex for Previous/Next
4. Add to route structure in App.tsx

### Reference Implementations

- Existing App.tsx layout structure
- `web-ui/src/components/ConfirmDialog.tsx` for exit confirmation

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
