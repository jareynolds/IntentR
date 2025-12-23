# UI Navigation Changes - November 2025

## Overview

This document describes the UI and navigation changes implemented in IntentR v1.1.0.

## Navigation Restructuring

### AI Assistant Location

The AI Assistant has been moved from a top-level navigation item to a subpage under Workspaces:

**Before:**
```
- Dashboard
- Workspaces
  - Workspace Settings
  - Designs
  - Ideation
  - Storyboard
  - System
  - Capabilities
  - AI Principles
  - UI Framework
- Integrations
- AI Assistant  <-- Top level
- Settings
```

**After:**
```
- Dashboard
- Workspaces
  - Workspace Settings
  - Designs
  - Ideation
  - Storyboard
  - System
  - Capabilities
  - AI Principles
  - UI Framework
  - AI Assistant  <-- Now under Workspaces
- Integrations
- Settings
```

### Rationale

1. AI Assistant is workspace-specific functionality
2. Groups all workspace-related features together
3. Cleaner top-level navigation
4. Better alignment with the workspace-centric architecture

## Workspace Headers

All workspace subpages now display a prominent workspace name header:

### Styling

```css
background-color: var(--color-primary);
padding: 12px 16px;
border-radius: 8px;
margin-bottom: 16px;
color: white;
font: text-title3 (H4 equivalent)
```

### Pages Updated

1. **Designs** (`/designs`)
2. **Ideation** (`/ideation`)
3. **Storyboard** (`/storyboard`)
4. **System** (`/system`)
5. **Capabilities** (`/capabilities`)
6. **AI Principles** (`/ai-principles`)
7. **UI Framework** (`/ui-framework`)

### Purpose

- Quick orientation for users
- Clear indication of active workspace
- Consistent branding across pages
- Improved user experience

## Settings Page Changes

### Removed: Design Systems Section

The Design Systems section has been removed from the Settings page. This included:
- Theme selection UI
- Color previews
- "About Design Systems" information box

### Remaining Sections

- API Keys
- Developer Tools

## Role Management Updates

The Role Management component has been updated to reflect the new navigation structure:

- AI Assistant is now listed under Workspaces subpages
- Permissions can be set for AI Assistant as a workspace subpage

## Files Modified

### Navigation Structure
- `src/App.tsx` - Sidebar items array updated

### Workspace Headers
- `src/pages/Designs.tsx`
- `src/pages/Ideation.tsx`
- `src/pages/Storyboard.tsx`
- `src/pages/System.tsx`
- `src/pages/Capabilities.tsx`
- `src/pages/AIPrinciples.tsx`
- `src/pages/UIFramework.tsx`

### Role Management
- `src/components/RoleManagement.tsx` - DEFAULT_PAGES updated

### Settings
- `src/pages/Settings.tsx` - Design Systems section removed

## Impact

### User Experience
- More intuitive navigation grouping
- Better workspace context awareness
- Consistent visual language

### Development
- Clearer page organization
- Easier to add new workspace subpages
- Simplified permission management

---

**Document Version**: 1.0
**Last Updated**: November 19, 2025
