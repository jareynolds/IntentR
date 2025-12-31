# Capability: User Interface Components

## Metadata
- **ID**: CAP-100005
- **Name**: User Interface Components
- **Type**: Capability
- **Component**: IntentR Web UI
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: Medium
- **Last Updated**: 2025-12-30

## Business Context

### Purpose
Provide reusable, consistent UI components that implement the IntentR design system. These components ensure visual consistency across all pages while providing accessible, responsive interfaces.

### Business Value
- Consistent user experience across application
- Reduced development time through reuse
- Improved accessibility and usability
- Maintainable styling through centralized components

### Users
- End users interacting with the application
- Frontend developers building pages
- UX designers maintaining consistency

## Functional Description

### Core Components

#### PageHeader
A standardized page header component with expandable detailed description panel.

**Features**:
- Title and quick description
- Optional action buttons
- Expandable "About this page" panel
- Click-outside and Escape key to close
- Responsive design

#### PageLayout
Layout wrapper that combines PageHeader with content area.

#### Card, Button, Alert
Standard UI primitives from the design system.

## Scope

### In Scope
- PageHeader component
- PageLayout component
- Responsive design support
- Accessibility (keyboard, ARIA)

### Out of Scope
- Complex form components
- Data visualization components
- Navigation components

## Dependencies

### Upstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| React | Library | Component framework |
| CSS Variables | Styling | Design system tokens |

### Downstream Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| All pages | Import | Use PageLayout |

## Enablers

| Enabler ID | Name | Description | Status |
|------------|------|-------------|--------|
| ENB-100040 | Render Page Header | Display page title and expandable info | Implemented |
| ENB-100041 | Handle Header Interactions | Expand/collapse, click outside | Implemented |

## Acceptance Criteria

### AC-1: Page Header Display
**Given** a page using PageLayout
**When** the page renders
**Then** the title and quick description are visible
**And** an info button appears if detailed description exists

### AC-2: Expand Panel
**Given** a PageHeader with detailed description
**When** the user clicks the info button
**Then** the "About this page" panel expands
**And** the panel shows the detailed description

### AC-3: Close Panel - Click Outside
**Given** an expanded info panel
**When** the user clicks outside the panel
**Then** the panel closes

### AC-4: Close Panel - Escape Key
**Given** an expanded info panel
**When** the user presses Escape
**Then** the panel closes

### AC-5: Responsive Layout
**Given** a page with actions in the header
**When** the viewport is narrow
**Then** the actions wrap below the title
**And** the layout remains usable

## Technical Specifications

### PageHeader Props

```typescript
interface PageHeaderProps {
  title: string;
  quickDescription: string;
  detailedDescription?: string;
  actions?: React.ReactNode;
}
```

### Click Outside Handler

```typescript
useEffect(() => {
  if (!isExpanded) return;

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;

    // Don't close if clicking the info button
    if (infoButtonRef.current?.contains(target)) {
      return;
    }

    // Close if clicking outside expanded section
    if (expandedRef.current && !expandedRef.current.contains(target)) {
      setIsExpanded(false);
    }
  };

  // Small delay to prevent immediate close
  const timeoutId = setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside);
  }, 10);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isExpanded]);
```

### Escape Key Handler

```typescript
useEffect(() => {
  if (!isExpanded) return;

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isExpanded]);
```

### Responsive CSS

```css
/* Medium screens: force actions to wrap below title */
@media (max-width: 1024px) {
  .page-header__title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header__actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 4px;
  }
}

/* Small screens: ensure buttons wrap */
@media (max-width: 480px) {
  .page-header__actions {
    gap: 6px;
  }
}
```

### Animation

```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header__expanded {
  animation: slideDown 0.2s ease-out;
}
```

## Implementation Files

| File | Purpose |
|------|---------|
| `web-ui/src/components/PageHeader.tsx` | Page header component |
| `web-ui/src/components/PageLayout.tsx` | Layout wrapper |
| `web-ui/src/components/index.ts` | Component exports |
