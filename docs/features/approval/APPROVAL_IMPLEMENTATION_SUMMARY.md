# IntentR Manual Approval Workflow - Implementation Summary

## Quick Reference

### Current State
- **Capabilities Service**: Running on port 8082, fully functional
- **Database**: PostgreSQL with users, capabilities, dependencies, assets tables
- **Auth**: JWT-based with 5 roles (admin, product_owner, designer, engineer, devops)
- **Frontend**: React with RoleAccessContext for RBAC
- **Approval System**: DOES NOT EXIST

### What Needs Adding

```
DATABASE:
├── capability_approvals (new table)
├── approval_workflow_rules (new table)
└── capability_approvals_audit (optional, recommended)

BACKEND (Go):
├── pkg/models/approval.go (NEW)
├── pkg/repository/approval_repository.go (NEW)
├── internal/capability/approval_handler.go (NEW)
└── cmd/capability-service/main.go (MODIFY - add endpoints)

FRONTEND (React):
├── web-ui/src/context/ApprovalContext.tsx (NEW)
├── web-ui/src/api/services/approvalService.ts (NEW)
├── web-ui/src/components/ApprovalStatusBadge.tsx (NEW)
├── web-ui/src/components/ApprovalSection.tsx (NEW)
├── web-ui/src/components/ApprovalHistoryModal.tsx (NEW)
├── web-ui/src/pages/ApprovalQueue.tsx (NEW)
├── web-ui/src/components/CapabilityForm.tsx (MODIFY)
└── web-ui/src/pages/Capabilities.tsx (MODIFY)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  Capabilities    │  │     ApprovalQueue Page           │ │
│  │  (existing)      │  │     (NEW - for approvers)        │ │
│  └────────┬─────────┘  └────────────┬─────────────────────┘ │
│           │                         │                        │
│           └────────────┬────────────┘                        │
│                        │                                     │
│           ┌────────────▼────────────┐                        │
│           │  ApprovalContext (NEW)  │◄──────────┐            │
│           │  - pendingApprovals     │           │            │
│           │  - canApprove flag      │           │            │
│           └────────────┬────────────┘    User Role           │
│                        │                  from Auth           │
│           ┌────────────▼────────────┐           │            │
│           │  approvalService (NEW)  │◄──────────┘            │
│           │  - requestApproval()    │                        │
│           │  - approve()            │                        │
│           │  - reject()             │                        │
│           └────────────┬────────────┘                        │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP/JSON
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Capability Service (Go)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  HTTP Routes:                                                │
│  ├─ POST /approval/request                                   │
│  ├─ GET /approval/pending                                    │
│  ├─ POST /approval/{id}/approve                              │
│  ├─ POST /approval/{id}/reject                               │
│  ├─ GET /approval/history/{capabilityId}                     │
│  └─ GET /approval/rules                                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ApprovalRepository                                   │   │
│  │ ├─ RequestApproval()                                 │   │
│  │ ├─ ApproveRequest()                                  │   │
│  │ ├─ RejectRequest()                                   │   │
│  │ ├─ GetPendingApprovals()                             │   │
│  │ ├─ GetApprovalHistory()                              │   │
│  │ └─ GetWorkflowRules()                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │ SQL Queries
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ users                                                     │
│  ✓ capabilities                                              │
│  ┌─ capability_approvals (NEW)                               │
│  │  ├─ id (PK)                                               │
│  │  ├─ capability_id (FK)                                    │
│  │  ├─ status (pending|approved|rejected|withdrawn)          │
│  │  ├─ requested_by (FK → users)                             │
│  │  ├─ approved_by (FK → users)                              │
│  │  ├─ rejection_reason                                      │
│  │  └─ timestamps                                            │
│  │                                                            │
│  └─ approval_workflow_rules (NEW)                            │
│     ├─ id (PK)                                               │
│     ├─ role (admin|product_owner|etc)                        │
│     ├─ can_request_approval                                  │
│     ├─ can_approve                                           │
│     └─ can_reject                                            │
│                                                               │
│  ✓ capability_dependencies                                   │
│  ✓ capability_assets                                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Approval Workflow State Machine

```
Creation State
    │
    ├─ Initial: CREATED (no approval status)
    │
    └─ User creates capability with approval_status = null

Request Approval
    │
    ├─ User clicks "Request Approval"
    │
    └─ Creates CapabilityApproval record:
       status = PENDING
       requested_by = current_user_id
       requested_at = now

Approval Decision
    │
    ├── Approver clicks "Approve"
    │   └─ Update status = APPROVED
    │       approved_by = approver_id
    │       approved_at = now
    │
    └── Approver clicks "Reject"
        └─ Update status = REJECTED
            approved_by = approver_id
            rejection_reason = ...
            approved_at = now

User can Withdraw
    │
    ├─ While PENDING: User clicks "Withdraw"
    └─ Update status = WITHDRAWN
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Day 1: Database schema (capability_approvals, approval_workflow_rules)
- [ ] Day 2: Go models and repository
- [ ] Day 3: Backend endpoints (approval, reject, get history)
- [ ] Day 4: Auth middleware and permission checks
- [ ] Day 5: Basic testing and debugging

### Week 2: Frontend
- [ ] Day 1: ApprovalContext and approvalService
- [ ] Day 2: ApprovalStatusBadge and ApprovalSection components
- [ ] Day 3: ApprovalQueue page (for approvers)
- [ ] Day 4: Update CapabilityForm and Capabilities pages
- [ ] Day 5: Testing, polish, error handling

### Week 3: Enhancement (Optional)
- [ ] Notification system
- [ ] Approval audit trail
- [ ] Workflow rules UI (admin page)
- [ ] Real-time updates via WebSocket
- [ ] Email notifications

---

## Key Implementation Details

### Approval Decision Logic

```
When user requests approval:
✓ Check if user has can_request_approval permission
✓ Create capability_approvals record
✓ Set capability.approval_status = PENDING
✗ Disable editing until approved

When approver approves:
✓ Check if user has can_approve permission
✓ Update capability_approvals.status = APPROVED
✓ Update capability.approval_status = APPROVED
✓ Update capability.approved_by = approver_id
✓ Update capability.approved_at = now
✓ Create audit log entry
✓ (Optional) Send notification to requester

When approver rejects:
✓ Check if user has can_reject permission
✓ Update capability_approvals.status = REJECTED
✓ Update capability.rejection_reason
✓ Set capability back to editable
✓ Create audit log entry
✓ (Optional) Send notification to requester
```

### Permission Model

```
Role Matrix:
┌──────────────┬─────────────┬──────────┬──────────┐
│ Role         │ Can Request │ Can      │ Can      │
│              │ Approval    │ Approve  │ Reject   │
├──────────────┼─────────────┼──────────┼──────────┤
│ admin        │ YES         │ YES      │ YES      │
│ product_owner│ YES         │ YES      │ YES      │
│ designer     │ YES         │ NO       │ NO       │
│ engineer     │ YES         │ NO       │ NO       │
│ devops       │ YES         │ NO       │ NO       │
└──────────────┴─────────────┴──────────┴──────────┘
```

---

## File-by-File Implementation Guide

### 1. Database Migration (`scripts/migration_approval.sql`)
**Lines of Code**: ~50
**Complexity**: Easy
**Creates**: capability_approvals, approval_workflow_rules tables

### 2. Approval Models (`pkg/models/approval.go`)
**Lines of Code**: ~100
**Complexity**: Easy
**Defines**: CapabilityApproval, ApprovalStatus, ApprovalWorkflowRule structs

### 3. Approval Repository (`pkg/repository/approval_repository.go`)
**Lines of Code**: ~400
**Complexity**: Medium
**Implements**: CRUD operations for approvals

### 4. Capability Service Updates (`cmd/capability-service/main.go`)
**Lines of Code**: ~200 additions
**Complexity**: Medium
**Adds**: New HTTP routes for approval endpoints

### 5. ApprovalContext (`web-ui/src/context/ApprovalContext.tsx`)
**Lines of Code**: ~150
**Complexity**: Easy
**Manages**: Global approval state and permissions

### 6. Approval Service (`web-ui/src/api/services/approvalService.ts`)
**Lines of Code**: ~80
**Complexity**: Easy
**Handles**: API calls to approval endpoints

### 7. UI Components (4 files)
**Total Lines of Code**: ~600
**Complexity**: Easy to Medium
**Components**: 
- ApprovalStatusBadge (50 lines)
- ApprovalSection (150 lines)
- ApprovalHistoryModal (200 lines)
- ApprovalQueue page (200 lines)

### 8. Component Updates (2 files)
**Lines of Code**: ~100 modifications
**Complexity**: Easy
**Changes**:
- CapabilityForm: Show approval status, disable editing
- Capabilities: Display approval status, add filter

---

## Testing Checklist

### Unit Tests
- [ ] ApprovalRepository.RequestApproval()
- [ ] ApprovalRepository.ApproveRequest()
- [ ] ApprovalRepository.RejectRequest()
- [ ] Permission checks (canApprove, canRequest)
- [ ] Status transition validation

### Integration Tests
- [ ] Create capability → Request approval → Approve flow
- [ ] Create capability → Request approval → Reject flow
- [ ] Verify capability is locked during approval
- [ ] Verify capability is unlocked after rejection
- [ ] Check audit trail entries created

### E2E Tests
- [ ] User A creates capability
- [ ] User A requests approval (sends notification to User B)
- [ ] User B (approver) sees pending approval
- [ ] User B approves/rejects capability
- [ ] User A sees decision and can/cannot edit

### Permission Tests
- [ ] Admin can approve
- [ ] Product Owner can approve
- [ ] Designer cannot approve (but can request)
- [ ] Engineer cannot approve (but can request)

---

## Performance Considerations

### Database Indexes Needed
```sql
CREATE INDEX idx_capability_approvals_capability_id 
  ON capability_approvals(capability_id);
  
CREATE INDEX idx_capability_approvals_status 
  ON capability_approvals(status);
  
CREATE INDEX idx_capability_approvals_requested_by 
  ON capability_approvals(requested_by);
  
CREATE INDEX idx_capability_approvals_approved_by 
  ON capability_approvals(approved_by);
```

### Query Optimization
- Use indexed fields in WHERE clauses
- Limit approval history to last 50 records by default
- Cache pending approval count in context

### Caching Strategy
- Cache workflow rules (rarely change)
- Cache user permissions (can invalidate on login)
- Don't cache pending approvals (must be fresh)

---

## Common Pitfalls & Solutions

| Pitfall | Solution |
|---------|----------|
| Race condition: Two approvers approve simultaneously | Use database transaction + pessimistic lock |
| Approval stuck in pending forever | Add timeout mechanism + admin override |
| User doesn't know approval was rejected | Send notification (email/WebSocket) |
| Performance on 1000+ capabilities | Add database indexes, pagination, caching |
| Form state confusion during approval | Clear UI states, show full approval status |
| Role permissions incorrect | Use approval_workflow_rules table, not hardcoded |

---

## Success Criteria

Project is complete when:
- [ ] Capability approval workflow functions end-to-end
- [ ] Users can request, approve, and reject capabilities
- [ ] Approval status visible on all relevant UI pages
- [ ] Permissions enforced (only approved users can approve)
- [ ] Capabilities locked during pending approval
- [ ] Approval history visible to all users
- [ ] Rejection includes reason shown to requester
- [ ] All tests passing (unit, integration, e2e)
- [ ] Error handling comprehensive
- [ ] UI accessible and intuitive
- [ ] No SQL injection vulnerabilities
- [ ] Performance acceptable (< 1s response times)

---

## Resources

**Within IntentR Project**:
- `/Users/jamesreynolds/Documents/Development/intentr/APPROVAL_WORKFLOW_ANALYSIS.md` - Detailed analysis
- `/Users/jamesreynolds/Documents/Development/intentr/CLAUDE.md` - Project overview
- `/Users/jamesreynolds/Documents/Development/intentr/CODE_COMPLETE/SOFTWARE_DEVELOPMENT_PLAN.md` - Development guidelines

**Code References**:
- Existing repository pattern: `pkg/repository/capability_repository.go`
- HTTP handler pattern: `cmd/capability-service/main.go`
- React context pattern: `web-ui/src/context/AuthContext.tsx`
- RBAC implementation: `web-ui/src/context/RoleAccessContext.tsx`

---

## Contact & Questions

For questions about:
- **Architecture**: Review APPROVAL_WORKFLOW_ANALYSIS.md section 1
- **Implementation**: Check section 2 and 3 of this document
- **Design decisions**: See section 4 of APPROVAL_WORKFLOW_ANALYSIS.md
- **Code patterns**: Reference existing code in capability and auth modules

