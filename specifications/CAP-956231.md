# Configurable Page Layout System

## Metadata
- **Name**: Configurable Page Layout System
- **Type**: Capability
- **System**: Intentr
- **Component**: Web UI
- **ID**: CAP-956231
- **Owner**: Development Team
- **Status**: Ready for Implementation
- **Approval**: Approved
- **Priority**: High
- **Analysis Review**: Not Required

## Business Context

### Problem Statement
The Intentr web application has 35 pages with inconsistent header structures. Some pages have wizard navigation, some don't. Some show AI preset indicators, some don't. Some display workspace information, some don't. This creates a fragmented user experience and makes maintenance difficult. Additionally, there is no mechanism to prevent future inconsistencies as new pages are added or existing pages are modified.

### Value Proposition
A unified PageLayout system provides:
1. **Consistent User Experience**: Every page follows the same header structure
2. **Developer Efficiency**: New pages automatically inherit correct layout
3. **Architectural Enforcement**: Impossible to create inconsistent pages
4. **User Customization**: Workspaces can configure their own page layout preferences
5. **Future-Proof**: New header elements added once, appear everywhere

### Success Metrics
- 100% of non-exempt pages use PageLayout component
- Zero UI inconsistency bugs related to page headers
- New page creation time reduced by 50%
- User satisfaction with workspace customization

## User Perspective

### Primary Persona
1. **Developers**: Need consistent, easy-to-use page templates
2. **End Users**: Want predictable navigation across all pages
3. **Workspace Admins**: Want to customize their workspace's appearance

### User Journey (Before/After)
**Before**: Each page manually implements header components, leading to inconsistencies. Developers must remember which 5 components to import and in what order. Users see different layouts on different pages.

**After**: Developers use a single `<PageLayout>` component with props. Users see consistent headers everywhere. Workspace admins can customize layout from UI Framework page.

### User Scenarios
1. **Developer creates new page**: Uses `<PageLayout title="..." quickDescription="...">` and header is automatically correct
2. **User navigates between pages**: Sees consistent wizard bar, indicators, and workspace info on every page
3. **Workspace admin customizes layout**: Opens UI Framework page, selects "Page Layout" tab, chooses "Minimal" template, saves - all pages in workspace update

## Boundaries

### In Scope
- PageLayout wrapper component for all application pages
- Migration of 27 existing pages to use PageLayout
- Page Layout configuration tab on UI Framework page
- Default layout templates (Standard, Minimal, Development, Presentation)
- Per-workspace layout configuration storage
- Live preview of layout changes

### Out of Scope
- Custom CSS injection via PageLayout (handled by UI Styles)
- Page-specific content layout (only header structure)
- Cross-workspace layout sharing
- Layout versioning/history

### Assumptions
- All pages can accept a wrapper component
- WorkspaceContext is available for storing layout preferences
- Existing header components (WizardPageNavigation, AIPresetIndicator, PageHeader) remain unchanged

### Constraints
- Must maintain backward compatibility during migration
- Must not break existing page functionality
- Must work with current React Router setup

## Enablers
| ID | Name | Purpose | Status |
|----|------|---------|--------|
| ENB-956232 | PageLayout Component | Core wrapper component that enforces consistent page structure | Ready for Implementation |
| ENB-956233 | Page Migration | Migrate all 27 non-exempt pages to use PageLayout | Ready for Implementation |
| ENB-956234 | Page Layout Configuration UI | Tab on UI Framework page for layout customization | Ready for Implementation |
| ENB-956235 | Layout Template System | Default templates and custom layout storage | Ready for Implementation |

## Dependencies

### Internal Upstream Dependency
| Capability ID | Description |
|---------------|-------------|
| CAP-759314 | UI Framework system (for tab integration) |

### Internal Downstream Impact
| Capability ID | Description |
|---------------|-------------|
| N/A | This is a foundational UI capability |

## Acceptance Criteria
- [ ] PageLayout component created with required props (title, quickDescription)
- [ ] PageLayout renders: WizardPageNavigation, AIPresetIndicator, Workspace bar, Title, Description with (i) button
- [ ] All 27 non-exempt pages migrated to use PageLayout
- [ ] "Page Layout" tab added to UI Framework page
- [ ] 4 default templates available (Standard, Minimal, Development, Presentation)
- [ ] User can create custom layout configurations
- [ ] Layout selection persists to workspace
- [ ] Live preview shows layout changes before saving
- [ ] Exempt pages (Login, Welcome, etc.) continue to work without PageLayout

## Technical Specifications

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      PageLayout Component                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ WizardPageNavigation (configurable: show/hide)      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AIPresetIndicator (configurable: show/hide)         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PageHeader (workspace, title, description, actions) │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {children} - Page Content                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interface

```typescript
interface PageLayoutProps {
  // Required
  title: string;
  quickDescription: string;
  children: React.ReactNode;

  // Optional
  detailedDescription?: string;
  actions?: React.ReactNode;

  // Override workspace config (for special pages)
  hideWizard?: boolean;
  hidePreset?: boolean;
  hideWorkspace?: boolean;
  fullWidth?: boolean;
}

interface PageLayoutConfig {
  id: string;
  name: string;
  showWizard: boolean;
  showAIPreset: boolean;
  showUIFramework: boolean;
  showWorkspace: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showInfoButton: boolean;
}
```

### Default Templates

| Template | Wizard | AI Preset | UI Framework | Workspace | Title | Description | Info |
|----------|:------:|:---------:|:------------:|:---------:|:-----:|:-----------:|:----:|
| Standard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Minimal | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Development | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Presentation | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |

### Data Storage

Layout configuration stored in WorkspaceContext:

```typescript
interface Workspace {
  // ... existing fields
  pageLayoutConfig?: PageLayoutConfig;
  customPageLayouts?: PageLayoutConfig[];
}
```

### Pages to Migrate (27 total)

**Needs PageHeader conversion (7):**
- Ideation.tsx, Storyboard.tsx, System.tsx, UIDesigner.tsx, UIFramework.tsx, UIStyles.tsx, Run.tsx

**Needs AIPreset + full migration (4):**
- Enablers.tsx, Testing.tsx, StoryMap.tsx, TestingApproval.tsx

**Needs Wizard + full migration (9):**
- ConceptionApproval.tsx, DefinitionApproval.tsx, DesignApproval.tsx, ImplementationApproval.tsx, Features.tsx, Integrations.tsx, Settings.tsx, AIChat.tsx, Analyze.tsx

**Needs workspace via PageHeader (4):**
- AIPrinciples.tsx, Capabilities.tsx, Designs.tsx, Vision.tsx

**Needs ALL components (3):**
- Workspaces.tsx, DataCollection.tsx, Admin.tsx

### Exempt Pages (7)
- Login.tsx, GoogleCallback.tsx, Welcome.tsx, Dashboard.tsx, WorkspaceOverview.tsx, LearnINTENT.tsx, DesignsOld.tsx

## Design Artifacts
- UI mockup: See "UI Concept" section below

### UI Concept - Page Layout Tab

```
┌────────────────────────────────────────────────────────────────────┐
│ UI Framework                                                        │
├────────────────────────────────────────────────────────────────────┤
│ [Frameworks] [Styles] [Page Layout]                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Page Layout Configuration                                          │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Select a template or create custom:                                │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ ○ Standard      │ │ ○ Minimal       │ │ ○ Development   │       │
│  │   (Default)     │ │   Clean view    │ │   Full debug    │       │
│  │   All elements  │ │   Title only    │ │   All + extras  │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  ┌─────────────────┐ ┌─────────────────┐                           │
│  │ ○ Presentation  │ │ + Custom        │                           │
│  │   Demo mode     │ │   Create new    │                           │
│  └─────────────────┘ └─────────────────┘                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Preview                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ < Previous │ Vision (2/8) │ Skip │ Next >                   │   │
│  │ [AI: Level 3] [UI: Dark Blue]                               │   │
│  │ ┌─────────────────────────────────────┐                     │   │
│  │ │ Workspace: FloWeb                   │                     │   │
│  │ └─────────────────────────────────────┘                     │   │
│  │ Page Title                                                  │   │
│  │ Quick description with expandable info (i)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Element Visibility:                                                │
│  ☑ Wizard Navigation  ☑ AI Preset  ☑ UI Framework                  │
│  ☑ Workspace Bar      ☑ Title      ☑ Description  ☑ Info Button    │
│                                                                     │
│                                    [Cancel] [Save & Apply]          │
└────────────────────────────────────────────────────────────────────┘
```

## Approval History
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| 2025-12-23 | Specification | Approved | User | Proceed with implementation |
