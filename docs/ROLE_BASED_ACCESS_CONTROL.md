# Role-Based Access Control (RBAC)

## Overview

IntentR implements a comprehensive Role-Based Access Control system that allows administrators to define and manage user permissions across all pages and features in the application.

## Features

### Role Types

The system supports five predefined role types:

| Role | Description |
|------|-------------|
| **Product Owner** | Manages product vision, requirements, and priorities |
| **Designer** | Designs user interfaces and user experiences |
| **Engineer** | Implements features and maintains code quality |
| **DevOps** | Manages infrastructure, deployments, and operations |
| **Administrator** | Full system access and user management |

### Access Levels

Each page and subpage can be configured with one of three access levels:

- **Edit** - Full access to view and modify content
- **View** - Read-only access (can see but not modify)
- **Hidden** - No access (page is not visible in navigation)

## Architecture

### Components

1. **RoleAccessContext** (`/src/context/RoleAccessContext.tsx`)
   - Provides role-based permissions throughout the application
   - Functions: `canAccess()`, `getAccessLevel()`, `isPageVisible()`, `isPageEditable()`
   - Maps user roles from auth system to RoleTypes

2. **RoleManagement** (`/src/components/RoleManagement.tsx`)
   - Admin UI for configuring role permissions
   - Allows setting access levels for all pages and subpages
   - Saves configurations to localStorage

3. **ProtectedPage** (`/src/components/ProtectedPage.tsx`)
   - Wrapper component that enforces page-level access control
   - Shows "Access Denied" for hidden pages
   - Shows "Read-Only Access" warning for view-only pages

4. **Sidebar** (`/src/components/Sidebar.tsx`)
   - Filters navigation items based on user's role permissions
   - Only shows pages the user has access to

### User Role Mapping

The system maps authentication roles to RoleTypes:

```typescript
const roleMap: Record<string, RoleType> = {
  'admin': 'Administrator',
  'product_owner': 'Product Owner',
  'designer': 'Designer',
  'engineer': 'Engineer',
  'devops': 'DevOps',
};
```

## Pages and Subpages

The following pages can have permissions configured:

### Main Pages
- Dashboard (`/`)
- Integrations (`/integrations`)
- Settings (`/settings`)
- Admin Panel (`/admin`)

### Workspaces Subpages
- Workspace Settings (`/workspaces`)
- Designs (`/designs`)
- Ideation (`/ideation`)
- Storyboard (`/storyboard`)
- System (`/system`)
- Capabilities (`/capabilities`)
- AI Principles (`/ai-principles`)
- UI Framework (`/ui-framework`)
- AI Assistant (`/ai-chat`)

## Usage

### Accessing Role Management

1. Log in as an Administrator
2. Navigate to Admin Panel
3. Click on "Role Management" tab
4. Select a role to configure
5. Set access levels for each page
6. Click "Save Changes"

### Default Permissions

- **Administrator** - Full edit access to all pages
- **Product Owner** - Edit access to all pages except Admin Panel
- **Designer** - Edit access to most pages, Admin Panel hidden
- **Engineer** - View access to most pages, Edit for Capabilities and System
- **DevOps** - Edit for Integrations and Settings, View for others

## Storage

Role configurations are stored in localStorage under the key `roleDefinitions`. This allows:
- Immediate updates without server roundtrips
- Per-browser customization
- Easy reset to defaults

## Security Considerations

1. **Client-side only** - Current implementation is client-side. For production, implement server-side validation.
2. **Admin-only access** - Only users with admin role can access Role Management
3. **Default deny** - If role definitions are missing, access is restricted by default

## API Integration

To persist role configurations server-side, implement:

```go
// Save role definitions
POST /api/roles
Content-Type: application/json
{
  "roleDefinitions": [...]
}

// Get role definitions
GET /api/roles
```

## Future Enhancements

1. Server-side persistence of role configurations
2. Custom role creation
3. Permission inheritance
4. Audit logging for permission changes
5. Role-based API endpoint protection

---

**Document Version**: 1.0
**Last Updated**: November 19, 2025
**Status**: Implemented
