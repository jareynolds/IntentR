# Enabler: Render Page Header

## Metadata
- **ID**: ENB-100040
- **Name**: Render Page Header
- **Type**: Enabler
- **Parent Capability**: CAP-100005 (User Interface Components)
- **Status**: Implemented
- **Approval**: Approved
- **Priority**: Medium
- **Last Updated**: 2025-12-30

## Purpose

Render a consistent page header with title, description, optional actions, and an expandable detailed description panel. This enabler provides the visual structure for page headers across the application.

## Technical Context

### Implementation Location
- **File**: `web-ui/src/components/PageHeader.tsx`
- **Export**: Named export `PageHeader` and default export

### Dependencies
- React hooks (useState, useEffect, useRef)
- CSS-in-JS via style tag

## Requirements

### Functional Requirements

#### FR-1: Display Title and Description
**Description**: Render the page title and quick description.

**Input**:
```typescript
title: string;
quickDescription: string;
```

**Output**:
- H1 element with title
- Paragraph with quick description
- Info button if detailed description provided

#### FR-2: Display Action Buttons
**Description**: Render optional action buttons in the header row.

**Input**:
```typescript
actions?: React.ReactNode;
```

**Output**:
- Actions rendered right-aligned on desktop
- Actions wrap below title on mobile

#### FR-3: Expandable Detail Panel
**Description**: Show expandable panel with detailed page information.

**Input**:
```typescript
detailedDescription?: string;
```

**Output**:
- Info button (ⓘ) when description provided
- Expandable "About this page" panel
- Multi-paragraph support via newline splitting

### Non-Functional Requirements

#### NFR-1: Accessibility
- `aria-expanded` on info button
- `aria-label` for buttons
- Keyboard navigation support

#### NFR-2: Responsive Design
- Full width on mobile
- Actions wrap on smaller screens
- Text truncation on very narrow screens

## Technical Specifications

### Component Structure

```tsx
<div className="page-header">
  {/* Title and actions row */}
  <div className="page-header__title-row">
    <h1>{title}</h1>
    {actions && <div className="page-header__actions">{actions}</div>}
  </div>

  {/* Quick description with info button */}
  <div className="page-header__quick-desc">
    <p>
      {quickDescription}
      {detailedDescription && (
        <button className="page-header__info-btn">
          <span className="info-icon">ⓘ</span>
        </button>
      )}
    </p>
  </div>

  {/* Expanded panel */}
  {detailedDescription && isExpanded && (
    <div className="page-header__expanded">
      <div className="page-header__expanded-content">
        <div className="page-header__expanded-header">
          <span>About this page</span>
          <button onClick={() => setIsExpanded(false)}>×</button>
        </div>
        <div className="page-header__expanded-body">
          {detailedDescription.split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </div>
  )}
</div>
```

### State Management

```typescript
const [isExpanded, setIsExpanded] = useState(false);
const expandedRef = useRef<HTMLDivElement>(null);
const infoButtonRef = useRef<HTMLButtonElement>(null);
```

### Style Configuration

```css
.page-header {
  margin-bottom: 24px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.page-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header__info-btn {
  background: none;
  border: none;
  color: var(--color-blue-500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-header__info-btn:hover {
  transform: scale(1.1);
}

.page-header__expanded-content {
  background: var(--color-blue-50);
  border: 1px solid var(--color-blue-200);
  border-radius: 8px;
}
```

## Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TS-100050 | Render with title only | Title displayed, no info button |
| TS-100051 | Render with detailed description | Info button visible |
| TS-100052 | Click info button | Panel expands with animation |
| TS-100053 | Click outside panel | Panel closes |
| TS-100054 | Press Escape | Panel closes |
| TS-100055 | Render with actions | Actions in header row |
| TS-100056 | Narrow viewport | Actions wrap below title |
