# WorkspaceTypeStep Enabler

## Metadata

| Field | Value |
|-------|-------|
| **Name** | WorkspaceTypeStep |
| **Type** | Enabler |
| **ID** | ENB-821464 |
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

WorkspaceTypeStep is the first step in the wizard flow where users select their project type. This selection determines which subsequent steps are shown:

1. **New Application**: Full workflow (Conception → Definition → Design → Testing → Implementation)
2. **Refactor IntentR Application**: Abbreviated workflow (Definition → Testing → Implementation)
3. **Reverse Engineer Non-IntentR Application**: Discovery-first workflow (Discovery → Definition → Design → Testing → Implementation)

### Architecture Fit

A step component in `web-ui/src/components/wizard/` that renders three option cards and updates WizardContext with the selected flow type.

### Existing Patterns to Follow

- Pattern: `web-ui/src/pages/AIPrinciples.tsx` - Card selection pattern
- Pattern: `web-ui/src/components/Card.tsx` - Card styling
- Pattern: Radio-style selection with visual feedback

---

## Functional Requirements

| ID | Name | Requirement | Status | Priority | Approval |
|----|------|-------------|--------|----------|----------|
| FR-821401 | Three Options | Display New/Refactor/Reverse Engineer as selectable cards | Ready for Design | High | Approved |
| FR-821402 | Option Descriptions | Each option shows title, description, and workflow preview | Ready for Design | High | Approved |
| FR-821403 | Selection State | Selected option has distinct visual highlight | Ready for Design | High | Approved |
| FR-821404 | Flow Type Update | Selecting option updates WizardContext flowType | Ready for Design | High | Approved |
| FR-821405 | Workspace Selection | Allow selecting existing workspace or creating new | Ready for Design | Medium | Approved |
| FR-821406 | Validation | Must select both workspace and type before proceeding | Ready for Design | Medium | Approved |

---

## Non-Functional Requirements

| ID | Name | Requirement | Type | Status | Priority | Approval |
|----|------|-------------|------|--------|----------|----------|
| NFR-821401 | Clear Descriptions | Each option clearly explains what it does | UX | Ready for Design | High | Approved |
| NFR-821402 | Visual Preview | Show workflow steps for each option | UX | Ready for Design | Medium | Approved |

---

## Technical Specifications (Template)

### Component Props

```typescript
interface WorkspaceTypeStepProps {
  onComplete?: () => void;
}
```

### Option Cards Content

```typescript
const WORKSPACE_TYPE_OPTIONS = [
  {
    id: 'new',
    title: 'Create New Application',
    description: 'Start from scratch with the full INTENT development workflow',
    icon: 'PlusCircle',
    workflow: ['Conception', 'Definition', 'Design', 'Testing', 'Implementation'],
    color: 'blue',
  },
  {
    id: 'refactor',
    title: 'Refactor IntentR Application',
    description: 'Improve an existing IntentR workspace with established capabilities',
    icon: 'RefreshCw',
    workflow: ['Definition', 'Testing', 'Implementation'],
    color: 'purple',
  },
  {
    id: 'reverse-engineer',
    title: 'Reverse Engineer Application',
    description: 'Document and integrate an existing non-IntentR application',
    icon: 'Search',
    workflow: ['Discovery', 'Definition', 'Design', 'Testing', 'Implementation'],
    color: 'orange',
  },
];
```

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    What would you like to do?                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ● Create New Application                                       │    │
│  │                                                                  │    │
│  │    Start from scratch with the full INTENT development workflow  │    │
│  │                                                                  │    │
│  │    Workflow: Conception → Definition → Design → Testing → Impl  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ○ Refactor IntentR Application                                 │    │
│  │                                                                  │    │
│  │    Improve an existing IntentR workspace with capabilities      │    │
│  │                                                                  │    │
│  │    Workflow: Definition → Testing → Implementation              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ○ Reverse Engineer Application                                 │    │
│  │                                                                  │    │
│  │    Document and integrate an existing non-IntentR application   │    │
│  │                                                                  │    │
│  │    Workflow: Discovery → Definition → Design → Testing → Impl   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases and Error Handling

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| No workspace selected | Show workspace dropdown/creation | `test_no_workspace()` |
| Refactor with empty workspace | Show warning about no capabilities | `test_empty_workspace_refactor()` |
| Reverse engineer path | Trigger discovery mode prompt | `test_reverse_engineer_discovery()` |

---

## Acceptance Scenarios (Gherkin)

### Test Suite: TST-821464 - WorkspaceTypeStep Tests

```gherkin
@TST-821464
Feature: WorkspaceTypeStep Component
  As a user starting the wizard
  I want to select my project type
  So that the wizard shows the appropriate workflow

  @TS-821461 @FR-821401 @critical
  Scenario: Display three options
    Given user is on WorkspaceTypeStep
    When the step renders
    Then three option cards should be visible
    And each should show title and description

  @TS-821462 @FR-821404
  Scenario: Select flow type
    Given no flow type is selected
    When user clicks "Create New Application" card
    Then that card should be highlighted
    And WizardContext flowType should be "new"

  @TS-821463 @FR-821405
  Scenario: Workspace selection
    Given user has multiple workspaces
    When user opens workspace selector
    Then list of available workspaces should appear
    And user can select one or create new
```

---

## Implementation Hints

### Suggested Approach

1. Create component at `web-ui/src/components/wizard/WorkspaceTypeStep.tsx`
2. Use Card components with onClick for selection
3. Show workflow preview as badge/chip list
4. Integrate with WorkspaceContext for workspace selection

### Reference Implementations

- `web-ui/src/pages/AIPrinciples.tsx` - Card selection pattern
- `web-ui/src/components/Card.tsx` - Card styling

---

## Approval History

| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-21 | Specification | Approved | Development Team | Initial enabler specification |
