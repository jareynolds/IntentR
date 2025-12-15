# UbeCode Manual Approval Workflow Analysis

**Project**: UbeCode - GoLang Microservices for SAWai-driven Development  
**Analysis Date**: 2025-12-01  
**Scope**: Manual approval workflow implementation for capabilities/enablers

---

## Executive Summary

UbeCode currently has a well-structured microservices architecture with:
- Working capability/enabler system (database-backed)
- Role-based access control (RBAC) framework
- Authentication system (JWT + OAuth2)
- React-based UI with Context API for state management

**Current Status**: No approval workflow exists. Capabilities can be created and updated freely with no approval gates.

**Implementation Effort**: Medium (6-8 hours for basic workflow, 12-16 for advanced features)

---

## 1. EXISTING INFRASTRUCTURE

### 1.1 Backend Structure

#### Capability Service (`cmd/capability-service/main.go`)
- **Port**: 8082 (default)
- **Current Endpoints**:
  - `GET /health` - Health check
  - `GET /capabilities` - List all capabilities
  - `POST /capabilities` - Create capability
  - `GET /capabilities/{id}` - Get single capability
  - `PUT /capabilities/{id}` - Update capability
  - `DELETE /capabilities/{id}` - Delete capability

#### Database Schema (`scripts/init-db.sql`)

**Current Tables**:
```
✓ users (id, email, password_hash, name, role, created_at, updated_at, last_login, is_active)
✓ capabilities (id, capability_id, name, status, description, purpose, storyboard_reference, created_at, updated_at, created_by, is_active)
✓ capability_dependencies (id, capability_id, depends_on_id, dependency_type, created_at)
✓ capability_assets (id, capability_id, asset_type, asset_name, asset_url, description, file_size, mime_type, created_at, created_by)
```

**Status Values Currently**: planned, in_progress, implemented, deprecated

#### Models (`pkg/models/capability.go`)

```go
type Capability struct {
  ID                  int       // Database ID
  CapabilityID        string    // e.g., CAP-123456
  Name                string
  Status              string    // Workflow state
  Description         string
  Purpose             string
  StoryboardReference string
  CreatedAt           time.Time
  UpdatedAt           time.Time
  CreatedBy           *int
  IsActive            bool
}
```

**Key Point**: Models DO NOT currently include approval-related fields.

#### Repository Pattern (`pkg/repository/capability_repository.go`)

- **Pattern Used**: Repository pattern with database/sql
- **Methods Available**:
  - `Create(req, userID)` - Insert new capability with dependencies and assets
  - `GetAll()` - Fetch all active capabilities
  - `GetByID(id)` - Fetch capability with full details (dependencies, assets)
  - `Update(id, req)` - Update capability (partial fields supported)
  - `Delete(id)` - Soft delete (sets is_active = false)
- **Transaction Support**: Uses tx for multi-table operations
- **Notes**: Uses dynamic query building for updates

### 1.2 Frontend Structure

#### Pages (`web-ui/src/pages/Capabilities.tsx`)
- **Size**: 1,339 lines (large, comprehensive page)
- **Features**:
  - Create/Edit/Delete capabilities
  - File-based capabilities (from specifications/)
  - AI analysis using Claude
  - Search and filtering
  - Status grouping (Not Specified, Planned, In Progress, Implemented, Deprecated)
  - Dependency visualization
  - Asset management
- **State Management**: Uses React hooks + API calls
- **Two Data Sources**:
  1. Database-backed capabilities (via capabilityService)
  2. File-based specifications (from workspace folder)

#### Components (`web-ui/src/components/CapabilityForm.tsx`)
- **Features**:
  - Capability ID, name, status, description, purpose
  - Dependency selection (upstream/downstream)
  - Asset management (add/remove)
  - Form validation
- **Limitations**: No approval fields in form

#### Context Providers

**AuthContext** (`web-ui/src/context/AuthContext.tsx`):
```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: string;  // Stored in JWT claims
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}
```
- Handles JWT tokens via sessionStorage
- Supports Google OAuth2
- Available roles: admin, product_owner, designer, engineer, devops

**RoleAccessContext** (`web-ui/src/context/RoleAccessContext.tsx`):
```typescript
type RoleType = 'Product Owner' | 'Designer' | 'Engineer' | 'DevOps' | 'Administrator';

interface PageAccess {
  pageName: string;
  path: string;
  accessLevel: 'edit' | 'view' | 'hidden';
  subPages?: PageAccess[];
}
```
- Role-based page access control
- Default: Admin and Product Owner have full access
- Can restrict other roles by path
- Uses localStorage for role definitions

### 1.3 Authentication & Authorization

#### Auth Service (`internal/auth/service.go`)
- **JWT Claims**:
  ```go
  type Claims struct {
    UserID int
    Email  string
    Role   string  // e.g., "admin", "product_owner"
    jwt.RegisteredClaims
  }
  ```
- **Methods**:
  - `Authenticate(email, password)` - Verify credentials, return JWT
  - `GenerateToken(user)` - Create JWT (24hr expiry)
  - `VerifyToken(tokenString)` - Validate JWT
  - `CreateUser()`, `UpdateUser()`, `GetUserByID()` - User management
  - `CreateOAuthUser()` - OAuth user creation

#### Default User
- Email: `admin@ubecode.local`
- Password: `admin123` (bcrypt hash in init-db.sql)
- Role: `admin`

#### Available Roles
- `admin` - Full system access
- `product_owner` - Business decision makers
- `designer` - Design-focused
- `engineer` - Development-focused
- `devops` - Infrastructure-focused

---

## 2. WHAT NEEDS TO BE CREATED

### 2.1 Database Schema Extensions

#### New Table: `capability_approvals`
```sql
CREATE TABLE IF NOT EXISTS capability_approvals (
  id SERIAL PRIMARY KEY,
  capability_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, withdrawn
  requested_by INTEGER NOT NULL REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  approval_notes TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_capability_approvals_capability_id ON capability_approvals(capability_id);
CREATE INDEX idx_capability_approvals_status ON capability_approvals(status);
CREATE INDEX idx_capability_approvals_requested_by ON capability_approvals(requested_by);
```

#### Alternative: Add approval fields to `capabilities` table
```sql
ALTER TABLE capabilities ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE capabilities ADD COLUMN approval_requested_by INTEGER REFERENCES users(id);
ALTER TABLE capabilities ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE capabilities ADD COLUMN approval_requested_at TIMESTAMP;
ALTER TABLE capabilities ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE capabilities ADD COLUMN rejection_reason TEXT;
```

**Recommendation**: Separate table is cleaner, allows approval history.

#### New Table: `approval_workflow_rules`
```sql
CREATE TABLE IF NOT EXISTS approval_workflow_rules (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,  -- admin, product_owner, etc.
  can_request_approval BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  can_reject BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Default Rules**:
- Admin: can_request_approval, can_approve, can_reject = true
- Product Owner: can_request_approval = true, can_approve = true
- Engineer: can_request_approval = true, can_approve/reject = false
- Designer: can_request_approval = true, can_approve/reject = false

### 2.2 Go Data Models

#### New Models (`pkg/models/approval.go`)
```go
package models

import "time"

// ApprovalStatus represents the approval state
type ApprovalStatus string

const (
  ApprovalStatusPending   ApprovalStatus = "pending"
  ApprovalStatusApproved  ApprovalStatus = "approved"
  ApprovalStatusRejected  ApprovalStatus = "rejected"
  ApprovalStatusWithdrawn ApprovalStatus = "withdrawn"
)

// CapabilityApproval represents an approval request for a capability
type CapabilityApproval struct {
  ID               int            `json:"id"`
  CapabilityID     int            `json:"capability_id"`
  Status           ApprovalStatus `json:"status"`
  RequestedBy      int            `json:"requested_by"`
  ApprovedBy       *int           `json:"approved_by,omitempty"`
  RejectionReason  string         `json:"rejection_reason,omitempty"`
  ApprovalNotes    string         `json:"approval_notes,omitempty"`
  RequestedAt      time.Time      `json:"requested_at"`
  ApprovedAt       *time.Time     `json:"approved_at,omitempty"`
  CreatedAt        time.Time      `json:"created_at"`
  UpdatedAt        time.Time      `json:"updated_at"`
}

// RequestApprovalInput represents a request to approve a capability
type RequestApprovalInput struct {
  CapabilityID string `json:"capability_id"`
  Notes        string `json:"notes"`
}

// ApprovalDecisionInput represents an approval decision
type ApprovalDecisionInput struct {
  ApprovalID      int    `json:"approval_id"`
  Approved        bool   `json:"approved"`
  RejectionReason string `json:"rejection_reason,omitempty"`
  Notes           string `json:"notes,omitempty"`
}

// ApprovalWorkflowRule defines who can approve
type ApprovalWorkflowRule struct {
  ID              int    `json:"id"`
  Role            string `json:"role"`
  CanRequestApproval bool `json:"can_request_approval"`
  CanApprove      bool   `json:"can_approve"`
  CanReject       bool   `json:"can_reject"`
  CreatedAt       time.Time `json:"created_at"`
}
```

#### Update Capability Model
```go
type Capability struct {
  // ... existing fields ...
  ApprovalStatus ApprovalStatus `json:"approval_status"` // NEW
  ApprovedBy     *int           `json:"approved_by,omitempty"` // NEW
  ApprovedAt     *time.Time     `json:"approved_at,omitempty"` // NEW
}
```

### 2.3 Repository Extensions

#### New Repository (`pkg/repository/approval_repository.go`)
```go
type ApprovalRepository struct {
  db *sql.DB
}

// Methods needed:
- RequestApproval(capabilityID, userID, notes) -> *CapabilityApproval
- GetApprovalByID(approvalID) -> *CapabilityApproval
- GetApprovalsByCapability(capabilityID) -> []CapabilityApproval
- GetPendingApprovals() -> []CapabilityApproval
- GetApprovalsByRequester(userID) -> []CapabilityApproval
- ApproveRequest(approvalID, approverID, notes) -> error
- RejectRequest(approvalID, approverID, reason) -> error
- WithdrawRequest(approvalID) -> error
- GetWorkflowRules() -> []ApprovalWorkflowRule
- CanUserApprove(userRole) -> bool
- CanUserRequest(userRole) -> bool
```

### 2.4 API Endpoints (Capability Service)

#### New Routes
```
POST /approval/request              # Request approval for a capability
GET /approval/pending               # Get all pending approvals
GET /approval/{id}                  # Get specific approval
POST /approval/{id}/approve         # Approve (requires approval_id in body)
POST /approval/{id}/reject          # Reject (requires approval_id in body)
POST /approval/{id}/withdraw        # Withdraw request
GET /approval/history/{capabilityId} # Get approval history
GET /approval/rules                 # Get workflow rules
```

#### Middleware Needed
- Auth middleware (JWT verification)
- Role-based authorization middleware
- Capability ownership verification (can requester modify capability?)

### 2.5 Frontend Components & Pages

#### New Components

**ApprovalStatusBadge** (`web-ui/src/components/ApprovalStatusBadge.tsx`)
```tsx
// Display approval status with visual indicator
// pending -> yellow
// approved -> green
// rejected -> red
// withdrawn -> gray
```

**ApprovalSection** (`web-ui/src/components/ApprovalSection.tsx`)
```tsx
// Shows:
// - Current approval status
// - Requested by / Approved by info
// - Request approval button (if eligible)
// - Approve/Reject buttons (if user can approve)
// - Approval history
// - Rejection reason (if applicable)
```

**ApprovalHistoryModal** (`web-ui/src/components/ApprovalHistoryModal.tsx`)
```tsx
// Timeline view of all approval actions
// Shows requester, date, decision, notes
```

**WorkflowRulesManagement** (`web-ui/src/components/WorkflowRulesManagement.tsx`)
```tsx
// Admin-only component to configure approval rules
// Table with Role -> Can Request / Can Approve / Can Reject
```

#### Updated Components

**CapabilityForm.tsx**
- Add approval request button
- Show approval status
- Disable editing if pending approval

**Capabilities.tsx**
- Add approval status column to list
- Filter by approval status
- Add approval history modal
- Show "Pending Approval" badge

#### New Page

**ApprovalQueue** (`web-ui/src/pages/ApprovalQueue.tsx`)
```tsx
// For users with approval authority
// Shows:
// - Pending approvals (filterable)
// - Capability details
// - Approval/Rejection interface
// - History of decisions made
```

#### Context Provider

**ApprovalContext** (`web-ui/src/context/ApprovalContext.tsx`)
```tsx
interface ApprovalContextType {
  pendingApprovals: CapabilityApproval[];
  approvalHistory: CapabilityApproval[];
  canApprove: boolean;
  requestApproval: (capabilityId: string, notes: string) => Promise<void>;
  approve: (approvalId: number, notes: string) => Promise<void>;
  reject: (approvalId: number, reason: string) => Promise<void>;
  withdrawRequest: (approvalId: number) => Promise<void>;
  refetch: () => Promise<void>;
}
```

### 2.6 API Client Updates

#### New Service (`web-ui/src/api/services/approvalService.ts`)
```typescript
export const approvalService = {
  // Request approval
  requestApproval(capabilityId: string, notes: string),
  
  // Get approvals
  getPendingApprovals(),
  getApprovalHistory(capabilityId: string),
  getApprovalById(approvalId: number),
  
  // Decision operations
  approve(approvalId: number, notes: string),
  reject(approvalId: number, reason: string),
  withdraw(approvalId: number),
  
  // Rules
  getWorkflowRules(),
  updateWorkflowRules(rules: ApprovalWorkflowRule[]),
};
```

---

## 3. IMPLEMENTATION PLAN

### Phase 1: Database & Models (2-3 hours)
1. Create database migration (separate table approach)
2. Create Go models (approval.go)
3. Create approval repository
4. Update capability model with approval fields
5. Test database operations

### Phase 2: Backend API (2-3 hours)
1. Implement approval endpoints in capability service
2. Add auth middleware
3. Add approval authorization logic
4. Implement approval business logic
5. Unit tests

### Phase 3: Frontend Infrastructure (1-2 hours)
1. Create ApprovalContext
2. Create approvalService
3. Create data models/types (TypeScript)
4. Add context provider to app root

### Phase 4: Frontend UI (2-3 hours)
1. Create ApprovalStatusBadge component
2. Create ApprovalSection component
3. Create ApprovalHistoryModal component
4. Update CapabilityForm with approval state
5. Update Capabilities page to show approval status
6. Create ApprovalQueue page

### Phase 5: Testing & Polish (1-2 hours)
1. Integration testing
2. UI polish
3. Error handling
4. Loading states

---

## 4. KEY DESIGN DECISIONS

### 4.1 Approval Model Options

#### Option A: Simple Binary (RECOMMENDED)
- Status: pending, approved, rejected
- Single approval record per capability
- Latest approval is the "current" approval

#### Option B: Multi-Level Approval
- Multiple approval steps (e.g., technical review -> product owner review)
- More complex logic
- Suitable for enterprise workflows

#### Option C: Change-Based Approval
- Each change (name, description, etc.) requires separate approval
- Complex implementation
- Finest-grained control

**Recommendation**: Use Option A for initial implementation. It's simpler, matches SAWai methodology, and can be extended later.

### 4.2 Role vs. User-Specific Approval

#### Role-Based (RECOMMENDED)
- Define which roles can approve (e.g., only product_owner, admin)
- Simple configuration
- Scales better

#### User-Specific
- Define specific users who can approve
- Complex to maintain
- Better for specialized workflows

**Recommendation**: Role-based with optional per-capability overrides later.

### 4.3 Approval Workflow States

```
┌─────────┐
│ Created │ (initial state)
└────┬────┘
     │ request_approval()
     ▼
┌─────────┐      ┌────────┐
│ Pending │─────▶│Withdrawn│ (requester can withdraw)
└────┬────┘      └────────┘
     │
     ├─ approve() ──▶ ┌──────────┐
     │                │ Approved │
     │                └──────────┘
     │
     └─ reject()  ──▶ ┌──────────┐
                       │ Rejected │
                       └──────────┘
```

### 4.4 Capability Editability During Approval

Options:
1. **Locked**: Cannot edit pending capability (safest)
2. **Editable**: Can edit, restarts approval process (flexible)
3. **Form Disabled**: Show form but disable submit (UX-friendly)

**Recommendation**: Option 3 - show capability details but disable editing/status changes until approval resolved.

---

## 5. INTEGRATION POINTS

### 5.1 With Existing Features

**Capability Status vs Approval Status**:
- `capabilities.status` = workflow state (planned, in_progress, implemented, deprecated)
- `capability_approvals.status` = approval gate (pending, approved, rejected)
- Capability can only change status if approval is approved

**RoleAccessContext**:
- Can be extended to check `canApprove` permission
- Approval Queue page should check `isPageEditable("/approvals")`

**AuthContext**:
- User role from JWT is used to determine approval permissions
- No changes needed, just leverage existing role

### 5.2 With File-Based Capabilities

Current system supports file-based capabilities in `specifications/` folder.

**Considerations**:
- Should file-based capabilities also require approval?
- Probably YES for consistency
- Would need to track file metadata (hash, version) for approval purposes

---

## 6. TECHNICAL CONSIDERATIONS

### 6.1 Database Transaction Handling

When approving a capability:
```go
tx.Begin()
  - Update capability_approvals status
  - Update capabilities approval fields
  - Create audit log entry
tx.Commit()
```

### 6.2 Audit Trail

Should track all approval decisions in a separate table:
```sql
CREATE TABLE approval_audit_log (
  id SERIAL PRIMARY KEY,
  approval_id INTEGER REFERENCES capability_approvals(id),
  action VARCHAR(50),  -- requested, approved, rejected, withdrawn
  performed_by INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

### 6.3 Real-Time Updates

Consider using WebSocket (already available via Collaboration Server on port 9084) to notify when:
- New approval request submitted
- Approval decision made
- Capability approval status changed

### 6.4 Notification System

Could add emails/notifications for:
- Approval requested: notify approvers
- Approval decided: notify requester
- Approval withdrawal: notify approvers

---

## 7. TESTING STRATEGY

### Unit Tests
- Approval repository operations
- Approval state transitions
- Permission checks

### Integration Tests
- Request approval → Approve workflow
- Request approval → Reject workflow
- Multiple approvals on same capability
- Authorization checks

### E2E Tests
- Create capability → Request approval → Approve → Verify status
- Create capability → Request → Reject → Re-request workflow
- Role-based approval permissions

---

## 8. CURRENT GAPS & LIMITATIONS

### What Exists
- ✓ User authentication (JWT + OAuth2)
- ✓ Role-based access control (RoleAccessContext)
- ✓ Capability CRUD operations
- ✓ Capability dependencies
- ✓ Asset management
- ✓ Dynamic UI rendering based on roles

### What's Missing
- ✗ Approval workflow
- ✗ Approval state machine
- ✗ Request/approval audit trail
- ✗ Workflow rule configuration UI
- ✗ Real-time approval notifications
- ✗ Approval queue/inbox for approvers

---

## 9. QUICK START CHECKLIST

For implementing approval workflow:

- [ ] Create database migration (`migration_capability_approvals.sql`)
- [ ] Add ApprovalStatus and CapabilityApproval models
- [ ] Create ApprovalRepository with CRUD operations
- [ ] Update Capability model with approval fields
- [ ] Create approval endpoints (POST /approval/request, etc.)
- [ ] Add auth middleware and permission checks
- [ ] Create ApprovalContext (React)
- [ ] Create approvalService (API client)
- [ ] Create ApprovalStatusBadge component
- [ ] Create ApprovalSection component
- [ ] Create ApprovalQueue page
- [ ] Update CapabilityForm to show approval state
- [ ] Update Capabilities.tsx to display approval status
- [ ] Test workflows end-to-end
- [ ] Add error handling and loading states
- [ ] Polish UI and accessibility

---

## 10. FILES TO MODIFY/CREATE

### Backend (Go)

**Create**:
- `pkg/models/approval.go` - Approval data models
- `pkg/repository/approval_repository.go` - Approval database operations
- `internal/capability/approval_service.go` - Business logic
- `scripts/migration_approval.sql` - Database schema

**Modify**:
- `cmd/capability-service/main.go` - Add approval endpoints
- `pkg/models/capability.go` - Add approval fields to Capability struct
- `pkg/repository/capability_repository.go` - Update GetByID to include approval info

### Frontend (React/TypeScript)

**Create**:
- `web-ui/src/context/ApprovalContext.tsx`
- `web-ui/src/api/services/approvalService.ts`
- `web-ui/src/components/ApprovalStatusBadge.tsx`
- `web-ui/src/components/ApprovalSection.tsx`
- `web-ui/src/components/ApprovalHistoryModal.tsx`
- `web-ui/src/pages/ApprovalQueue.tsx`

**Modify**:
- `web-ui/src/components/CapabilityForm.tsx` - Disable on pending approval
- `web-ui/src/pages/Capabilities.tsx` - Show approval status
- `web-ui/src/App.tsx` - Add ApprovalContext provider
- `web-ui/src/api/client.ts` - Add approval endpoints

---

## 11. ESTIMATED EFFORT

| Task | Hours | Difficulty |
|------|-------|------------|
| Database Schema | 1 | Easy |
| Go Models & Repository | 2 | Medium |
| Approval Endpoints | 2 | Medium |
| Auth Middleware | 1 | Medium |
| React Context & Service | 1.5 | Easy |
| ApprovalStatusBadge | 0.5 | Easy |
| ApprovalSection | 1 | Easy |
| ApprovalQueue Page | 2 | Medium |
| UI Updates (Form, List) | 1.5 | Easy |
| Testing & Polish | 2 | Medium |
| **TOTAL** | **14.5** | |

---

## 12. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Race conditions in approval | High | Use database transactions, pessimistic locking |
| Approval stuck in pending | Medium | Add timeout mechanism, admin override |
| Confused UI state | Medium | Clear status indicators, comprehensive error messages |
| Performance on large capability count | Medium | Database indexes on approval_status, approval_id |
| Users not notified of decisions | Medium | Add notification system (email/WebSocket) |

---

## Conclusion

The UbeCode codebase is well-structured and ready for approval workflow integration. The existing authentication, authorization, and data models provide a solid foundation. A straightforward approval workflow can be implemented in 2-3 weeks of development with the phased approach outlined above.

The recommended approach is:
1. Start with a simple binary approval model (pending → approved/rejected)
2. Use role-based permissions (admin, product_owner can approve)
3. Implement separate approval_approvals table for history
4. Leverage existing RoleAccessContext for permission checking
5. Build ApprovalQueue page for approvers

This provides immediate value while maintaining extensibility for more complex workflows in the future.

