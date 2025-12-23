# IntentR Codebase Exploration Summary

## Overview

IntentR is a GoLang microservices application for design-driven development using the INTENT methodology. The codebase includes a React TypeScript web UI with comprehensive settings, workspace management, and AI principle governance features.

---

## 1. Settings Management Architecture

### Current Settings Page Structure (`/web-ui/src/pages/Settings.tsx`)

The Settings page demonstrates a **card-based layout pattern** with multiple management sections:

#### Key Features:
1. **API Keys Management**
   - Anthropic API key storage (localStorage)
   - Input field with visibility toggle
   - Validation (must start with "sk-ant-")
   - Security notice warning

2. **Developer Tools Section**
   - Clear Old Workspace Data
   - Clear Integration Data
   - Delete All Workspace Data (admin only)
   - Workspace Ownership Diagnostics

3. **State Management**
   - Uses React `useState` hooks locally
   - localStorage for persistence (via `localStorage.getItem/setItem`)
   - Confirmation dialog pattern for destructive actions

4. **UI Patterns**
   - Alert components for success/error messages
   - Card components for grouping related settings
   - Color-coded sections (red for danger, yellow for warnings, blue for info)
   - Toggle buttons for show/hide functionality

### Related Settings Pages:

**AIPrinciples.tsx** (`/web-ui/src/pages/AIPrinciples.tsx`)
- Manages AI governance presets (Level 1-5)
- Multi-step activation workflow with confirmation
- Preset descriptions and use cases
- Active preset indicator and deactivation

**UIFramework/UIStyles.tsx**
- UI framework selection and customization
- Theme selection (via ThemeContext)

---

## 2. Page Components & Navigation Patterns

### Page Structure (`/web-ui/src/pages/`)

**Core Pages:**
- Dashboard.tsx - Main overview
- Workspaces.tsx - Workspace management
- WorkspaceOverview.tsx - Selected workspace view
- Capabilities.tsx - Capability definition and management
- Enablers.tsx - Enabler specifications
- Settings.tsx - User settings
- AIPrinciples.tsx - AI governance configuration

**Design & Workflow Pages:**
- Vision.tsx - Vision definition
- Storyboard.tsx - Storyboard creation
- Ideation.tsx - Ideation board
- Designs.tsx - Design management
- System.tsx - System diagram

**Approval Workflow Pages:**
- ConceptionApproval.tsx
- DefinitionApproval.tsx
- DesignApproval.tsx
- ImplementationApproval.tsx
- Testing/TestingApproval.tsx

**Other Pages:**
- AIChat.tsx - AI integration chat
- Code.tsx - Code generation
- Run.tsx - Execution management
- Admin.tsx - Admin panel
- Integrations.tsx - Integration configuration
- Analyze.tsx - Analysis tools
- DataCollection.tsx - Data collection

### Navigation Pattern (App.tsx)

```typescript
// Routes are organized in a main App component
<Routes>
  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/capabilities" element={<ProtectedRoute><Capabilities /></ProtectedRoute>} />
  // ... etc
</Routes>
```

**Navigation Components:**
- Header.tsx - Top navigation
- Sidebar.tsx - Side navigation
- Navigation.tsx - Generic nav component
- WorkspaceSelector.tsx - Workspace switching

---

## 3. State Management & Context

### Context Structure (`/web-ui/src/context/`)

**Available Contexts:**

1. **AuthContext.tsx**
   - User authentication state
   - Login/logout functionality
   - JWT token management

2. **WorkspaceContext.tsx**
   - Current workspace state
   - Workspace switching
   - Workspace configuration (UI frameworks, AI presets, etc.)
   - Storyboard/Ideation/System data management

3. **AppContext.tsx**
   - Global app state (loading, error, user)
   - Basic state management pattern

4. **ThemeContext.tsx**
   - Theme selection and switching
   - Available themes list

5. **ApprovalContext.tsx**
   - Approval workflows
   - Request/approve/reject functionality
   - Approval history tracking

6. **RoleAccessContext.tsx**
   - Role-based access control
   - Permission checking

7. **CollaborationContext.tsx**
   - Real-time collaboration features
   - WebSocket connections
   - Remote cursor tracking

8. **EnablerContext.tsx**
   - Enabler-specific state management

### Workspace Interface:
```typescript
export interface Workspace {
  id: string;
  name: string;
  projectFolder?: string;           // Path to workspace folder
  activeAIPreset?: number;          // 1-5 for governance levels
  selectedUIFramework?: string;     // UI framework ID
  selectedUILayout?: string;        // UI layout ID
  customUIFrameworks?: any[];       // User-defined frameworks
  storyboard?: StoryboardData;      // Storyboard content
  ideation?: IdeationData;          // Ideation board content
  systemDiagram?: SystemData;       // System diagram content
  // ... other fields
}
```

---

## 4. Styling & Design System

### CSS Architecture

**Tailwind Configuration** (`/web-ui/tailwind.config.js`)
- Extended color palette (grey, blue, indigo, purple, orange, green, red)
- Custom design system colors defined
- Supports responsive design out of box

**CSS Patterns:**
- Tailwind utility classes for most styling
- Custom CSS classes for components (`.btn`, `.card`, `.btn-primary`, etc.)
- CSS variables for theming: `--color-primary`, `--color-separator`, `--color-systemBackground`, etc.
- Apple-inspired color variables: `--color-systemRed`, `--color-systemGreen`, etc.

### Component Styling Examples

**Button Component** (using class-based approach):
```typescript
const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};
```

**Card Component** (mix of CSS vars and inline styles):
```typescript
style={{
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
}}
```

**Settings Page Pattern** (inline styles + Tailwind):
```typescript
// Mix of:
className="max-w-7xl mx-auto"           // Tailwind
style={{
  backgroundColor: 'var(--color-primary)',
  padding: '12px 16px',
}}                                      // CSS vars
```

### Color Scale Used in Settings:
- `--color-grey-*` for neutral text
- `--color-systemRed` for danger zones
- `--color-systemYellow` for warnings
- `--color-systemGreen` for success
- `--color-blue-*` for primary actions
- `--color-separator` for borders

---

## 5. Definitions/Specifications Folder Structure

### Directory Layout

```
root/specifications/
├── CAP-XXXXXX.md           # Capability files
├── ENB-XXXXXX.md           # Enabler files
└── [other documentation]

workspace/specifications/
├── CAP-XXXXXX.md           # Workspace-specific capabilities
├── ENB-XXXXXX.md           # Workspace-specific enablers
├── [other files]
```

### File Naming Convention

- **Capabilities**: `{numeric-id}-capability.md` (e.g., `CAP-318652.md`)
- **Enablers**: `{numeric-id}-enabler.md` (e.g., `ENB-147825.md`)
- **ID Format**: `CAP-XXXXXX` or `ENB-XXXXXX` (6-digit numeric)

### File Content Structure (Capability Example)

```markdown
# [Capability Name]

## Metadata
- **Name**: [Name]
- **Type**: Capability
- **ID**: CAP-XXXXXX
- **Status**: [Status]
- **Approval**: [Approved/Pending/Rejected]

## Business Context
- Problem Statement
- Value Proposition
- Success Metrics

## User Perspective
- Primary Persona
- User Journey
- User Scenarios

## Boundaries
- In Scope
- Out of Scope
- Assumptions
- Constraints

## Enablers
[Table of related enablers]

## Dependencies
- Internal Upstream
- Internal Downstream

## Acceptance Criteria

## Technical Specifications
[Design details, diagrams, etc.]
```

### Real Example from Codebase

From `/specifications/CAP-759314.md` (LLM Request Interception):
- Uses metadata table format
- Contains Technical Overview with Purpose
- Business Context with Problem Statement
- Structured sections with clear hierarchy
- Links to implementation locations

### How Files Are Created

**CapabilityForm.tsx** demonstrates the file creation flow:
1. Auto-generates ID: `generateCapabilityId()` creates `CAP-XXXXXX`
2. Creates markdown content with metadata
3. Saves via API endpoint: `/save-specifications`
4. Saves to subfolder: `definition` (configurable)

---

## 6. Wizard & Step-by-Step Patterns

### Existing Multi-Step Patterns

**1. AIPrinciples Page (Preset Activation Workflow)**
```
Select Preset → Confirm → Activate → Success
- Step 1: Click preset card to select
- Step 2: Confirmation dialog appears
- Step 3: API call to activate
- Step 4: Success indicator shown
```

**2. CapabilityForm (Multi-Section Form)**
```
Form with Multiple Sections:
- Metadata (ID, Name, Status)
- Description & Purpose
- Storyboard Reference
- Dependencies (Upstream/Downstream)
- Assets (Add/Remove multiple)
```

**3. Approval Workflow Pages**
```
Status indicators:
- Pending → In Review → Approved/Rejected
- Shows approval history
- Displays stage badges
```

### Existing UI Components for Multi-Step Flows

**ApprovalSection.tsx**
- Displays current stage/status
- Shows approval history
- Request/cancel approval actions
- Error handling

**ApprovalStatusBadge.tsx**
- Visual stage indicators
- Status badges (pending, approved, rejected)
- Integration with workflow display

**Alert.tsx**
- Success/error/warning messages
- Used for feedback between steps

**ConfirmDialog.tsx**
- Confirmation dialogs for destructive actions
- Customizable title/message/buttons
- Shows in Settings page

---

## 7. Component Patterns & Best Practices

### Common Component Patterns

**1. Card-Based Layout**
```typescript
<Card>
  <h3>Section Title</h3>
  <p>Description</p>
  {/* Content */}
</Card>
```

**2. Form Pattern (CapabilityForm)**
```typescript
const [formData, setFormData] = useState({...});
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Handle submit with validation
const handleSubmit = async (e) => { ... }
```

**3. Data Loading Pattern**
```typescript
useEffect(() => {
  if (workspace?.projectFolder) {
    loadData();
  }
}, [workspace?.projectFolder]);
```

**4. API Call Pattern**
```typescript
const response = await fetch(`${INTEGRATION_URL}/endpoint`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

### Typography Classes Used
- `text-2xl font-semibold` - Headings
- `text-sm text-grey-600` - Descriptions
- `text-grey-900` - Primary text
- `text-subheadline` - Form labels
- `text-footnote` - Helper text
- `text-body` - Body text

---

## 8. API Integration Points

### Integration Service Endpoints

Based on codebase usage:

**File Operations:**
- `POST /save-specifications` - Save capability/enabler files
- `POST /story-files` - Load storyboard files
- `POST /activate-ai-preset` - Activate AI governance preset

**Other Services:**
- `INTEGRATION_URL` - Main Go backend (port 9080)
- `WORKSPACE_URL` - Shared workspace API (port 4002)
- `SPECIFICATION_API` - Markdown file management

### localStorage Keys Used

**Workspace Data:**
- `workspaces_${userEmail}` - Owned workspaces
- `joinedWorkspaces_${userEmail}` - Shared workspaces
- `currentWorkspaceId_${userEmail}` - Current workspace
- `global_shared_workspaces` - All shared workspaces

**Integration Data:**
- `workspace_integrations` - Integration configs
- `workspace_figma_files_${workspaceId}` - Figma files

**Settings:**
- `anthropic_api_key` - API key storage
- `theme` - Selected theme

---

## 9. Key Implementation Insights

### Form Validation Pattern
- Use `if (!value.trim()) { setError(...) }` for basic validation
- API format validation (e.g., API key format checks)
- Pre-submission validation before API calls

### State Initialization with ID Generation
```typescript
// Auto-generate on first render
const [formData, setFormData] = useState({
  capability_id: capability ? '' : generateCapabilityId(),
  // ...
});
```

### Async Data Loading
- Uses `setLoading(true)` before fetch
- Try/catch for error handling
- Finally block for cleanup
- `setLoading(false)` in finally

### Confirmation Dialogs
Pattern used in Settings for destructive actions:
```typescript
const [confirmDialog, setConfirmDialog] = useState({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
});
```

### Workspace Folder Requirements
- Many features require `currentWorkspace?.projectFolder` to be set
- UI shows warning if folder not configured
- Falls back to disabled state gracefully

---

## 10. Styling Best Practices Observed

### Border & Spacing
- `border-2 border-red-400` - Strong borders for danger zones
- `gap: '20px'` - Consistent spacing
- `padding: '12px 16px'` - Consistent padding
- `rounded-lg` - Consistent border radius (8px)

### Color Usage Patterns
- Primary actions: `bg-blue-600`, `text-white`
- Outlines: `border-* color-*` matching
- Backgrounds: `bg-*-50` for light backgrounds
- Alerts: Color-coded (`bg-red-50`, `bg-yellow-50`, etc.)

### Responsive Layout
- `max-w-7xl mx-auto` - Max content width
- `space-y-6` - Vertical spacing between sections
- `grid grid-cols-1 md:grid-cols-2` - Responsive grids
- `flex items-center justify-between` - Common flex patterns

### Icons
- Inline SVG for common actions
- Icon sizing: `w-5 h-5` or `w-6 h-6`
- Color matching: Icons inherit color from context

---

## Summary Table

| Aspect | Implementation |
|--------|-----------------|
| **Settings Storage** | localStorage (browser) + API calls |
| **Page Organization** | Separate .tsx files per page, Router-based navigation |
| **State Management** | React Context API (8 different contexts) |
| **Styling** | Tailwind + CSS variables + inline styles |
| **Components** | Card, Button, Alert, ConfirmDialog, Form patterns |
| **Specifications** | Markdown files in specifications/ folder, CAP-*/ENB-* naming |
| **Multi-Step UI** | Card sections, approval workflows, form sections |
| **API Pattern** | fetch() with JSON, INTEGRATION_URL base |
| **Workspace Binding** | Via WorkspaceContext, projectFolder required |
| **Type Safety** | TypeScript interfaces for all major structures |

---

## Recommendations for AI Principles Settings

### Based on Existing Patterns:

1. **Use Card-Based Sections**
   - Group related settings in Cards
   - Each governance category in separate Card
   - Consistent with Settings.tsx pattern

2. **Add Toggle/Select Controls**
   - Similar to AIPrinciples preset selector
   - But for individual category settings
   - Show enable/disable for each rule

3. **Confirmation for Changes**
   - Use ConfirmDialog pattern
   - Show what will change
   - Warn about impacts

4. **Status Indicators**
   - Show active/inactive status
   - Use ApprovalStatusBadge pattern
   - Color-coded for clarity

5. **Store in WorkspaceContext**
   - Follow existing pattern
   - Persist to localStorage
   - Sync with backend via API

6. **Documentation Links**
   - Similar to AIPrinciples
   - Link to relevant policy documents
   - Explain each governance category

