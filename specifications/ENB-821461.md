# WizardContext Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | WizardContext |
| **Type** | Enabler |
| **ID** | ENB-821461 |
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

WizardContext is a React context provider that manages the wizard navigation state, including:
- Whether wizard mode is enabled
- The current flow type (New/Refactor/Reverse Engineer)
- The current step index
- Navigation functions (next, previous, goToStep)
- Step completion status

### Architecture Fit

Follows the existing context pattern used by WorkspaceContext, AuthContext, and ThemeContext. Will be added to the provider hierarchy in App.tsx.

### Existing Patterns to Follow

- Pattern: `web-ui/src/context/WorkspaceContext.tsx` - Context structure and hooks
- Pattern: `web-ui/src/context/ThemeContext.tsx` - localStorage persistence
- Pattern: React Context with useReducer for complex state

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821101 | Wizard Mode State | Context tracks if wizard mode is enabled/disabled | Ready for Design | High | Approved |
| FR-821102 | Flow Type State | Context tracks selected flow type (new/refactor/reverse) | Ready for Design | High | Approved |
| FR-821103 | Current Step State | Context tracks current step index in the flow | Ready for Design | High | Approved |
| FR-821104 | Navigation Functions | Context provides next(), previous(), goToStep() functions | Ready for Design | High | Approved |
| FR-821105 | Step Completion | Context tracks which steps are marked as completed | Ready for Design | Medium | Approved |
| FR-821106 | Persistence | Wizard mode preference persists in localStorage | Ready for Design | Medium | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821101 | Type Safety | Full TypeScript types for all state and functions | Quality | Ready for Design | High | Approved |
| NFR-821102 | Performance | Context updates should not cause unnecessary re-renders | Performance | Ready for Design | Medium | Approved |

---

## Technical Specifications (Template)

### Context Interface

```typescript
type WizardFlowType = 'new' | 'refactor' | 'reverse-engineer';

interface WizardStep {
  id: string;
  name: string;
  path: string;
  status: 'completed' | 'active' | 'upcoming';
}

interface WizardContextType {
  // State
  isWizardMode: boolean;
  flowType: WizardFlowType | null;
  currentStepIndex: number;
  steps: WizardStep[];

  // Actions
  setWizardMode: (enabled: boolean) => void;
  setFlowType: (type: WizardFlowType) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (index: number) => void;
  completeCurrentStep: () => void;
  exitWizard: () => void;
}
```

### Flow Definitions

```typescript
const WIZARD_FLOWS: Record<WizardFlowType, WizardStep[]> = {
  'new': [
    { id: 'workspace', name: 'Workspace', path: '/wizard/workspace' },
    { id: 'conception', name: 'Conception', path: '/wizard/conception' },
    { id: 'definition', name: 'Definition', path: '/wizard/definition' },
    { id: 'design', name: 'Design', path: '/wizard/design' },
    { id: 'testing', name: 'Testing', path: '/wizard/testing' },
    { id: 'implementation', name: 'Implementation', path: '/wizard/implementation' },
  ],
  'refactor': [
    { id: 'workspace', name: 'Workspace', path: '/wizard/workspace' },
    { id: 'definition', name: 'Definition', path: '/wizard/definition' },
    { id: 'testing', name: 'Testing', path: '/wizard/testing' },
    { id: 'implementation', name: 'Implementation', path: '/wizard/implementation' },
  ],
  'reverse-engineer': [
    { id: 'workspace', name: 'Workspace', path: '/wizard/workspace' },
    { id: 'discovery', name: 'Discovery', path: '/wizard/discovery' },
    { id: 'definition', name: 'Definition', path: '/wizard/definition' },
    { id: 'design', name: 'Design', path: '/wizard/design' },
    { id: 'testing', name: 'Testing', path: '/wizard/testing' },
    { id: 'implementation', name: 'Implementation', path: '/wizard/implementation' },
  ],
};
```

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| nextStep at last step | No navigation, optional callback | `test_next_at_end()` |
| previousStep at first step | No navigation | `test_previous_at_start()` |
| goToStep with invalid index | Clamp to valid range | `test_invalid_step_index()` |
| No flow type selected | Return empty steps array | `test_no_flow_type()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821461 - WizardContext Tests

```gherkin
@TST-821461
Feature: WizardContext State Management
  As a developer
  I want the wizard context to manage navigation state
  So that wizard components have consistent state access

  @TS-821161 @FR-821101 @critical
  Scenario: Toggle wizard mode
    Given wizard mode is disabled
    When user enables wizard mode
    Then isWizardMode should be true
    And the preference should be saved to localStorage

  @TS-821162 @FR-821102
  Scenario: Set flow type changes available steps
    Given wizard mode is enabled
    When user selects "new" flow type
    Then steps should contain 6 items
    And first step should be "Workspace"
    And last step should be "Implementation"

  @TS-821163 @FR-821104
  Scenario: Navigate to next step
    Given user is on step 0
    When user calls nextStep()
    Then currentStepIndex should be 1
    And previous step status should be "completed"
```

---

## Implementation Hints

### Suggested Approach

1. Create context file at `web-ui/src/context/WizardContext.tsx`
2. Use useReducer for complex state management
3. Persist `isWizardMode` to localStorage
4. Add WizardProvider to App.tsx provider hierarchy

### Reference Implementations

- `web-ui/src/context/WorkspaceContext.tsx` - Similar context pattern
- `web-ui/src/context/ThemeContext.tsx` - localStorage persistence

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
