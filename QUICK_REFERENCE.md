# IntentR Codebase Quick Reference Guide

## Key File Locations

### Settings & Configuration Pages
- **Main Settings**: `/web-ui/src/pages/Settings.tsx` (650+ lines)
- **AI Principles**: `/web-ui/src/pages/AIPrinciples.tsx` (400+ lines)
- **UI Styles**: `/web-ui/src/pages/UIStyles.tsx`

### Context Providers
- **WorkspaceContext**: `/web-ui/src/context/WorkspaceContext.tsx` (150+ lines)
  - Core for workspace state management
  - Contains Workspace interface definition
  - Handles activeAIPreset, selectedUIFramework, etc.
- **AuthContext**: `/web-ui/src/context/AuthContext.tsx`
- **ThemeContext**: `/web-ui/src/context/ThemeContext.tsx`
- **ApprovalContext**: `/web-ui/src/context/ApprovalContext.tsx`

### Reusable Components
- **Button**: `/web-ui/src/components/Button.tsx` - 5 variants (primary, secondary, outline, ghost, danger)
- **Card**: `/web-ui/src/components/Card.tsx` - Grouped content container
- **Alert**: `/web-ui/src/components/Alert.tsx` - Notifications
- **ConfirmDialog**: `/web-ui/src/components/ConfirmDialog.tsx` - Confirmation prompts
- **ApprovalSection**: `/web-ui/src/components/ApprovalSection.tsx` - Workflow approval UI
- **ApprovalStatusBadge**: `/web-ui/src/components/ApprovalStatusBadge.tsx` - Status indicators
- **CapabilityForm**: `/web-ui/src/components/CapabilityForm.tsx` - Multi-section form example

### Styling
- **Tailwind Config**: `/web-ui/tailwind.config.js`
- **App Styles**: `/web-ui/src/App.css`
- **App Component**: `/web-ui/src/App.tsx` (Router setup)

### Specifications
- **Root Specs**: `/specifications/` (CAP-*.md, ENB-*.md files)
- **Example Capability**: `/specifications/CAP-759314.md`
- **Example Enabler**: `/specifications/ENB-147825.md`

---

## Common Patterns to Follow

### Settings Page Pattern
```typescript
const [value, setValue] = useState('');
const [saved, setSaved] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSave = () => {
  if (!value.trim()) {
    setError('Value cannot be empty');
    return;
  }
  localStorage.setItem('key', value);
  setSaved(true);
  setTimeout(() => setSaved(false), 5000);
};

return (
  <Card>
    <h3>Section Title</h3>
    {error && <Alert variant="error">{error}</Alert>}
    {saved && <Alert variant="success">Saved!</Alert>}
    <input value={value} onChange={e => setValue(e.target.value)} />
    <Button onClick={handleSave}>Save</Button>
  </Card>
);
```

### Workspace-Dependent Feature
```typescript
const { currentWorkspace } = useWorkspace();

useEffect(() => {
  if (!currentWorkspace?.projectFolder) {
    return; // Show warning UI
  }
  // Load data from workspace
}, [currentWorkspace?.projectFolder]);
```

### API Call Pattern
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const makeRequest = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch(`${INTEGRATION_URL}/endpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    // Handle data
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
};
```

### Multi-Step Form
```typescript
const [formData, setFormData] = useState({
  section1: '',
  section2: '',
  items: []
});

const handleAddItem = () => {
  setFormData({
    ...formData,
    items: [...formData.items, { /* new item */ }]
  });
};

const handleRemoveItem = (index: number) => {
  setFormData({
    ...formData,
    items: formData.items.filter((_, i) => i !== index)
  });
};

return (
  <form onSubmit={handleSubmit}>
    {/* Section 1 */}
    {/* Section 2 */}
    {/* Items List */}
    <Button type="submit">Submit</Button>
  </form>
);
```

---

## CSS/Styling Quick Reference

### Color Variables (CSS)
```css
--color-primary
--color-separator
--color-systemBackground
--color-systemRed
--color-systemGreen
--color-systemYellow
--color-grey-900 (darkest)
--color-grey-600 (medium)
--color-grey-50 (lightest)
```

### Tailwind Classes (Common)
```
Text: text-2xl font-semibold, text-sm text-grey-600, text-grey-900
Spacing: gap-4, space-y-6, mx-auto, px-4, py-2
Layout: flex, flex-col, justify-between, items-center
Colors: bg-blue-600, text-white, border-2 border-red-400
Sizing: max-w-7xl, w-full, h-screen
Responsive: md:grid-cols-2, lg:flex-row
```

### Common Patterns
```css
/* Settings Card */
style={{
  padding: '12px 16px',
  borderRadius: '8px',
  backgroundColor: 'var(--color-systemBackground)',
  border: '1px solid var(--color-separator)',
}}

/* Alert Background */
className="bg-red-50 border border-red-200 rounded-lg"

/* Flex Layout */
style={{ display: 'flex', gap: '12px', alignItems: 'center' }}

/* Text Overflow */
style={{ maxHeight: '200px', overflowY: 'auto' }}
```

---

## Component Import Pattern
```typescript
// All components exported from index
import { 
  Button, 
  Card, 
  Alert, 
  ConfirmDialog, 
  CapabilityForm,
  ApprovalSection 
} from '../components';
```

---

## localStorage Keys Reference

### Workspace-Related
- `workspaces_${userEmail}` - Owned workspaces (JSON array)
- `joinedWorkspaces_${userEmail}` - Shared workspaces (JSON array)
- `currentWorkspaceId_${userEmail}` - Currently active workspace ID
- `global_shared_workspaces` - All shared workspaces

### Integrations
- `workspace_integrations` - Integration configurations
- `workspace_figma_files_${workspaceId}` - Figma files list

### Settings
- `anthropic_api_key` - API key (string)
- `theme` - Selected theme name

### Approval Workflow
- `${phase}-item-approvals-${workspaceId}` - Phase approvals (object)
- `${phase}-approved-${workspaceId}` - Phase approval status
- `phaseApprovals_${workspaceId}_testing` - Testing phase (array)

---

## API Endpoints Used

### Integration Service (INTEGRATION_URL = port 9080)
```
POST /save-specifications
  - workspacePath: string
  - files: Array<{ fileName, content }>
  - subfolder?: 'definition' | other

POST /story-files
  - workspacePath: string
  → Returns: { stories: Array<{ filename, title }> }

POST /activate-ai-preset
  - workspacePath: string
  - presetNumber: 1-5
```

### Other Services
- `WORKSPACE_URL` = Shared workspace API (port 4002)
- `SPECIFICATION_API` = Markdown management (port 4001)

---

## File Naming Conventions

### Capabilities & Enablers
- File: `CAP-123456.md` or `ENB-123456.md`
- ID in file: `**ID**: CAP-123456` (metadata)
- Generator: `generateCapabilityId()` - auto-creates 6-digit ID

### Storyboard/Conception
- Pattern: `STORY-*.md` (e.g., `STORY-user-login.md`)
- Loaded from: `conception/` folder in workspace

### System Diagrams
- Location: Stored in WorkspaceContext `systemDiagram` property
- Format: SystemData interface (capabilities, enablers, connections)

---

## State Management Hierarchy

```
WorkspaceContext (top level)
├── currentWorkspace (selected workspace)
├── activeAIPreset (1-5)
├── selectedUIFramework (ID)
├── storyboard (StoryboardData)
├── ideation (IdeationData)
└── systemDiagram (SystemData)

AuthContext
├── user (auth info)
├── token (JWT)
└── login/logout methods

ThemeContext
├── currentTheme
└── availableThemes

ApprovalContext
├── requestApproval()
├── getHistory()
└── canRequest()
```

---

## Common TypeScript Interfaces

### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  projectFolder?: string;
  activeAIPreset?: number;
  selectedUIFramework?: string;
  customUIFrameworks?: any[];
  storyboard?: StoryboardData;
}
```

### Capability (for forms)
```typescript
interface CreateCapabilityRequest {
  capability_id: string;
  name: string;
  status: string;
  description: string;
  purpose: string;
  storyboard_reference: string;
  upstream_dependencies: number[];
  downstream_dependencies: number[];
  assets: CapabilityAsset[];
}
```

### Button Props
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';
```

---

## Testing/Approval Workflow Statuses

### Capability States
- `planned`
- `in_progress`
- `implemented`
- `deprecated`

### Approval States
- `Not Approved` (default)
- `Pending` (awaiting review)
- `Approved` (approved)
- `Rejected` (with feedback)

### Workflow Stages
- Specification → Definition → Design → Execution

---

## Development Commands

```bash
# From project root
npm install          # Install dependencies (web-ui/)
npm run dev         # Start Vite dev server (http://localhost:6173)
npm run build       # Production build
npm run lint        # ESLint check

# Make commands (from root)
make docker-up      # Start all services
make docker-logs    # View service logs
```

---

## Debugging Tips

### Check localStorage
```javascript
// In browser console
localStorage.getItem('anthropic_api_key')
JSON.parse(localStorage.getItem('workspaces_user@example.com'))
```

### API Testing
- Use browser DevTools Network tab
- Check INTEGRATION_URL in `/web-ui/src/api/client.ts`
- Look for POST requests to `/save-specifications`, `/story-files`, etc.

### Component State
- Use React DevTools to inspect context values
- Check WorkspaceContext for currentWorkspace
- Verify AuthContext has user data

### Common Issues
- "Workspace folder not configured" → Need to set projectFolder in Workspaces page
- localStorage quota exceeded → Clear old workspace data from Settings
- API 404 errors → Verify INTEGRATION_URL and endpoint paths

