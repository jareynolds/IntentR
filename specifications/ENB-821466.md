# Wizard Flow Router Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | Wizard Flow Router |
| **Type** | Enabler |
| **ID** | ENB-821466 |
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

The Wizard Flow Router manages the conditional routing logic based on the selected workspace type. It determines which steps are available, handles navigation between steps, and integrates with React Router for URL-based navigation.

### Architecture Fit

A routing component that sits between WizardContext and the actual page components, managing the flow logic and route transitions.

### Existing Patterns to Follow

- Pattern: React Router v6 routing patterns in `App.tsx`
- Pattern: Conditional rendering based on context state
- Pattern: Protected routes pattern for step validation

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821601 | Flow-Based Routes | Routes change based on selected flow type | Ready for Design | High | Approved |
| FR-821602 | Step Validation | Cannot access future steps without completing current | Ready for Design | Medium | Approved |
| FR-821603 | Direct URL Access | Users can bookmark and return to wizard steps | Ready for Design | Low | Approved |
| FR-821604 | Flow Redirect | Invalid flow/step combinations redirect appropriately | Ready for Design | Medium | Approved |
| FR-821605 | Start Page Routing | Each section routes through Start page first | Ready for Design | High | Approved |
| FR-821606 | Back Navigation | Browser back button works correctly | Ready for Design | Medium | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821601 | Fast Transitions | Route changes complete in < 100ms | Performance | Ready for Design | Medium | Approved |
| NFR-821602 | URL Clarity | URLs clearly indicate current wizard step | UX | Ready for Design | Low | Approved |

---

## Technical Specifications (Template)

### Route Structure

```typescript
// Wizard routes structure
const wizardRoutes = {
  // Base wizard route
  '/wizard': WizardHome,

  // Workspace type selection (always first)
  '/wizard/workspace': WorkspaceTypeStep,

  // Section routes with start pages
  '/wizard/conception/start': ConceptionStart,
  '/wizard/conception': ConceptionPage,

  '/wizard/definition/start': DefinitionStart,
  '/wizard/definition': DefinitionPage,

  '/wizard/design/start': DesignStart,
  '/wizard/design': DesignPage,

  '/wizard/testing/start': TestingStart,
  '/wizard/testing': TestingPage,

  '/wizard/implementation/start': ImplementationStart,
  '/wizard/implementation': ImplementationPage,

  // Discovery (reverse engineer flow only)
  '/wizard/discovery/start': DiscoveryStart,
  '/wizard/discovery': DiscoveryPage,
};
```

### Flow Routing Logic

```typescript
interface FlowRoute {
  stepId: string;
  startPath: string;
  contentPath: string;
  component: React.ComponentType;
  startComponent: React.ComponentType;
}

const getFlowRoutes = (flowType: WizardFlowType): FlowRoute[] => {
  switch (flowType) {
    case 'new':
      return [
        { stepId: 'workspace', ... },
        { stepId: 'conception', ... },
        { stepId: 'definition', ... },
        { stepId: 'design', ... },
        { stepId: 'testing', ... },
        { stepId: 'implementation', ... },
      ];
    case 'refactor':
      return [
        { stepId: 'workspace', ... },
        { stepId: 'definition', ... },
        { stepId: 'testing', ... },
        { stepId: 'implementation', ... },
      ];
    case 'reverse-engineer':
      return [
        { stepId: 'workspace', ... },
        { stepId: 'discovery', ... },
        { stepId: 'definition', ... },
        { stepId: 'design', ... },
        { stepId: 'testing', ... },
        { stepId: 'implementation', ... },
      ];
  }
};
```

### Navigation Guard

```typescript
const WizardGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isWizardMode, flowType, currentStepIndex, steps } = useWizard();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isWizardMode) {
      // Redirect to settings if wizard mode not enabled
      navigate('/settings');
      return;
    }

    if (!flowType && location.pathname !== '/wizard/workspace') {
      // Must select flow type first
      navigate('/wizard/workspace');
      return;
    }

    // Validate current step is accessible
    const requestedStep = getStepFromPath(location.pathname);
    const stepIndex = steps.findIndex(s => s.id === requestedStep);

    if (stepIndex > currentStepIndex + 1) {
      // Cannot skip ahead more than one step
      navigate(steps[currentStepIndex].path);
    }
  }, [isWizardMode, flowType, location.pathname]);

  return <>{children}</>;
};
```

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| Direct URL to future step | Redirect to current step | `test_future_step_redirect()` |
| Invalid flow type in URL | Redirect to workspace selection | `test_invalid_flow()` |
| Browser back from first step | Exit wizard or show confirmation | `test_back_from_start()` |
| Wizard mode disabled mid-flow | Redirect to settings | `test_wizard_disabled()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821466 - Wizard Flow Router Tests

```gherkin
@TST-821466
Feature: Wizard Flow Router
  As a wizard user
  I want proper routing between steps
  So that I follow the correct workflow

  @TS-821661 @FR-821601 @critical
  Scenario: New application flow routes
    Given user selects "new" flow type
    When user completes workspace step
    Then next step should be "/wizard/conception/start"

  @TS-821662 @FR-821602
  Scenario: Cannot skip steps
    Given user is on step 2
    When user navigates directly to step 5 URL
    Then user should be redirected to step 2
    And warning message should display

  @TS-821663 @FR-821605
  Scenario: Start page routing
    Given user completes Conception
    When user proceeds to Definition
    Then first route should be "/wizard/definition/start"
    And then "/wizard/definition" after clicking Begin
```

---

## Implementation Hints

### Suggested Approach

1. Create WizardFlowRouter component
2. Use React Router v6 nested routes
3. Implement navigation guards with useEffect
4. Store current step in URL for bookmarking

### Reference Implementations

- `App.tsx` - Existing route configuration
- Protected route patterns in auth systems

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
