# AI AUDIT AND DECISION LOG
**Version**: 1.0.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)

---

## Overview

This document defines the audit and logging requirements for AI agent activities within the INTENT framework. Comprehensive logging enables accountability, learning from failures, compliance verification, and continuous improvement of AI-human collaboration.

**Core Principle**: Every AI decision that affects system state must be traceable, explainable, and reversible.

---

## Audit Categories

### Category 1: Decision Audit

Tracks decisions made by AI agents during development activities.

| Field | Description | Required |
|-------|-------------|----------|
| `decision_id` | Unique identifier (AUD-XXXXXX) | Yes |
| `timestamp` | ISO 8601 datetime | Yes |
| `agent_type` | AI agent/model identifier | Yes |
| `session_id` | Conversation/session reference | Yes |
| `decision_type` | Category of decision | Yes |
| `context_summary` | Brief context provided | Yes |
| `options_considered` | Alternatives evaluated | Recommended |
| `decision_made` | Final choice | Yes |
| `rationale` | Why this decision | Yes |
| `confidence_level` | AI's confidence (high/medium/low) | Recommended |
| `human_approval` | Approval status | Yes |
| `outcome` | Result after implementation | Post-facto |

### Decision Types

| Type | Description | Examples |
|------|-------------|----------|
| `ARCHITECTURE` | System design decisions | Technology choice, pattern selection |
| `IMPLEMENTATION` | Code-level decisions | Algorithm choice, library selection |
| `INTERPRETATION` | Requirement interpretation | Ambiguity resolution |
| `PRIORITIZATION` | Order of execution | Task sequencing |
| `SCOPE` | Boundary decisions | What to include/exclude |
| `RISK` | Risk-related decisions | Trade-off resolutions |
| `CORRECTION` | Error correction | Bug fix approach |
| `REJECTION` | Declined to proceed | Why AI stopped |

---

### Category 2: Action Audit

Tracks actions taken by AI agents on the codebase.

| Field | Description | Required |
|-------|-------------|----------|
| `action_id` | Unique identifier (ACT-XXXXXX) | Yes |
| `timestamp` | ISO 8601 datetime | Yes |
| `decision_id` | Related decision (AUD-XXXXXX) | If applicable |
| `action_type` | Type of action | Yes |
| `target` | File/resource affected | Yes |
| `before_state` | State before action (hash/snapshot) | Yes |
| `after_state` | State after action (hash/snapshot) | Yes |
| `reversible` | Can be undone | Yes |
| `rollback_procedure` | How to reverse | If reversible |

### Action Types

| Type | Description | Reversibility |
|------|-------------|---------------|
| `FILE_CREATE` | New file created | Delete file |
| `FILE_MODIFY` | Existing file changed | Restore from before_state |
| `FILE_DELETE` | File removed | Restore from before_state |
| `FILE_RENAME` | File renamed/moved | Rename back |
| `CONFIG_CHANGE` | Configuration modified | Restore config |
| `DEPENDENCY_ADD` | Package added | Remove package |
| `DEPENDENCY_REMOVE` | Package removed | Re-add package |
| `SCHEMA_CHANGE` | Database schema modified | Run down migration |
| `COMMAND_EXECUTE` | Shell command run | Varies |

---

### Category 3: Rejection Audit

Tracks when AI refuses or cannot proceed with a request.

| Field | Description | Required |
|-------|-------------|----------|
| `rejection_id` | Unique identifier (REJ-XXXXXX) | Yes |
| `timestamp` | ISO 8601 datetime | Yes |
| `request_summary` | What was requested | Yes |
| `rejection_reason` | Why AI declined | Yes |
| `rejection_category` | Type of rejection | Yes |
| `guidance_provided` | What AI suggested instead | Recommended |
| `escalation_path` | How to proceed | Recommended |

### Rejection Categories

| Category | Description | Example |
|----------|-------------|---------|
| `APPROVAL_MISSING` | Required approval not present | "Capability not approved" |
| `PRECONDITION_FAILED` | Prerequisites not met | "Design phase not complete" |
| `SCOPE_VIOLATION` | Request outside allowed scope | "Cannot modify parent directory" |
| `POLICY_VIOLATION` | Conflicts with governance policy | "Cannot auto-approve" |
| `AMBIGUITY` | Insufficient clarity to proceed | "Multiple interpretations possible" |
| `CAPABILITY_LIMIT` | Beyond AI's capabilities | "Requires human judgment" |
| `SAFETY_CONCERN` | Potential harmful action | "Would delete production data" |
| `DEPENDENCY_CONFLICT` | Technical conflict detected | "Incompatible library versions" |

---

### Category 4: Learning Audit

Tracks feedback that should inform future AI behavior.

| Field | Description | Required |
|-------|-------------|----------|
| `learning_id` | Unique identifier (LRN-XXXXXX) | Yes |
| `timestamp` | ISO 8601 datetime | Yes |
| `source_action_id` | Original action reference | Yes |
| `feedback_type` | Type of feedback | Yes |
| `feedback_content` | Details of feedback | Yes |
| `correction_applied` | How AI adjusted | If applicable |
| `pattern_identified` | Generalizable lesson | Recommended |
| `apply_to` | Where this applies | Recommended |

### Feedback Types

| Type | Description |
|------|-------------|
| `APPROVAL_GRANTED` | Human approved AI output |
| `APPROVAL_REJECTED` | Human rejected AI output |
| `MODIFICATION_REQUIRED` | Human modified AI output |
| `APPROACH_CHANGED` | Different approach taken |
| `PATTERN_CORRECTION` | AI followed wrong pattern |
| `CONTEXT_MISSING` | AI lacked needed context |
| `INTERPRETATION_ERROR` | AI misunderstood requirement |

---

## Audit Log Format

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "audit_type": {
      "type": "string",
      "enum": ["DECISION", "ACTION", "REJECTION", "LEARNING"]
    },
    "id": {
      "type": "string",
      "pattern": "^(AUD|ACT|REJ|LRN)-[0-9]{6}$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "workspace": {
      "type": "string"
    },
    "session_id": {
      "type": "string"
    },
    "agent": {
      "type": "object",
      "properties": {
        "model": {"type": "string"},
        "version": {"type": "string"}
      }
    },
    "context": {
      "type": "object",
      "properties": {
        "capability_id": {"type": "string"},
        "enabler_id": {"type": "string"},
        "requirement_id": {"type": "string"},
        "workflow_stage": {"type": "string"}
      }
    },
    "details": {
      "type": "object"
    },
    "human_interaction": {
      "type": "object",
      "properties": {
        "approval_status": {"type": "string"},
        "approver": {"type": "string"},
        "approval_timestamp": {"type": "string"},
        "feedback": {"type": "string"}
      }
    }
  },
  "required": ["audit_type", "id", "timestamp", "workspace", "details"]
}
```

### Example: Decision Audit Entry

```json
{
  "audit_type": "DECISION",
  "id": "AUD-847291",
  "timestamp": "2025-12-24T14:32:15Z",
  "workspace": "trainsystem",
  "session_id": "sess_abc123def456",
  "agent": {
    "model": "claude-opus-4-5-20251101",
    "version": "opus-4-5"
  },
  "context": {
    "capability_id": "CAP-123456",
    "enabler_id": "ENB-654321",
    "requirement_id": "FR-789012",
    "workflow_stage": "Implementation"
  },
  "details": {
    "decision_type": "IMPLEMENTATION",
    "options_considered": [
      "Use existing validation library (go-validator)",
      "Write custom validation functions",
      "Use struct tags with reflection"
    ],
    "decision_made": "Use existing validation library (go-validator)",
    "rationale": "go-validator is already a project dependency, used in 3 other services, provides all needed validation rules, and follows established pattern in internal/validation/",
    "confidence_level": "high"
  },
  "human_interaction": {
    "approval_status": "APPROVED",
    "approver": "jreynolds",
    "approval_timestamp": "2025-12-24T14:35:22Z",
    "feedback": null
  }
}
```

### Example: Rejection Audit Entry

```json
{
  "audit_type": "REJECTION",
  "id": "REJ-293847",
  "timestamp": "2025-12-24T15:10:45Z",
  "workspace": "Default-Workspace",
  "session_id": "sess_xyz789ghi012",
  "agent": {
    "model": "claude-opus-4-5-20251101",
    "version": "opus-4-5"
  },
  "context": {
    "capability_id": "CAP-234567",
    "workflow_stage": "Implementation"
  },
  "details": {
    "request_summary": "Implement user registration endpoint",
    "rejection_reason": "Capability approval status is 'Pending', not 'Approved'. Per SW_OPERATIONS.md, implementation cannot proceed without approval.",
    "rejection_category": "APPROVAL_MISSING",
    "guidance_provided": "Request capability approval through the Approval Workflow before proceeding with implementation.",
    "escalation_path": "Use POST /approvals/request to submit for approval"
  }
}
```

---

## Audit Storage

### File-Based Storage (Default)

Audit logs are stored in the workspace under `.intentr/audit/`:

```
workspace/
├── .intentr/
│   └── audit/
│       ├── decisions/
│       │   ├── 2025-12-24.jsonl
│       │   └── 2025-12-23.jsonl
│       ├── actions/
│       │   ├── 2025-12-24.jsonl
│       │   └── 2025-12-23.jsonl
│       ├── rejections/
│       │   └── 2025-12-24.jsonl
│       └── learning/
│           └── 2025-12-24.jsonl
```

### Database Storage (Optional)

For production deployments, audit logs can be stored in PostgreSQL:

```sql
CREATE TABLE ai_audit_log (
    id VARCHAR(12) PRIMARY KEY,
    audit_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    workspace VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    agent_model VARCHAR(100),
    agent_version VARCHAR(50),
    context JSONB,
    details JSONB NOT NULL,
    human_interaction JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_timestamp ON ai_audit_log(timestamp);
CREATE INDEX idx_audit_workspace ON ai_audit_log(workspace);
CREATE INDEX idx_audit_type ON ai_audit_log(audit_type);
CREATE INDEX idx_audit_session ON ai_audit_log(session_id);
```

---

## Audit Retention

### Retention Periods

| Audit Type | Development | Production | Compliance Mode |
|------------|-------------|------------|-----------------|
| Decision | 30 days | 1 year | 7 years |
| Action | 30 days | 1 year | 7 years |
| Rejection | 30 days | 1 year | 7 years |
| Learning | Indefinite | Indefinite | Indefinite |

### Archival Process

1. Daily: Compress logs older than 7 days
2. Monthly: Archive to cold storage logs older than retention period
3. Yearly: Compliance review of retained logs

---

## Audit Queries

### Common Query Patterns

**Find all decisions for a capability:**
```sql
SELECT * FROM ai_audit_log
WHERE audit_type = 'DECISION'
AND context->>'capability_id' = 'CAP-123456'
ORDER BY timestamp DESC;
```

**Find all rejections in a session:**
```sql
SELECT * FROM ai_audit_log
WHERE audit_type = 'REJECTION'
AND session_id = 'sess_abc123'
ORDER BY timestamp;
```

**Find all human-rejected AI decisions:**
```sql
SELECT * FROM ai_audit_log
WHERE audit_type = 'DECISION'
AND human_interaction->>'approval_status' = 'REJECTED'
ORDER BY timestamp DESC;
```

**Find learning opportunities (rejected or modified):**
```sql
SELECT * FROM ai_audit_log
WHERE audit_type = 'LEARNING'
AND details->>'feedback_type' IN ('APPROVAL_REJECTED', 'MODIFICATION_REQUIRED')
ORDER BY timestamp DESC;
```

---

## Audit Reports

### Report 1: AI Decision Summary

Generated: Daily, Weekly, Monthly

| Metric | Description |
|--------|-------------|
| Total Decisions | Count of all AI decisions |
| Approval Rate | % approved on first attempt |
| Rejection Rate | % rejected by humans |
| Modification Rate | % requiring human modification |
| Average Confidence | Mean confidence level of decisions |
| Decision Types | Breakdown by decision category |

### Report 2: Action Summary

Generated: Daily

| Metric | Description |
|--------|-------------|
| Total Actions | Count of all AI actions |
| Files Created | New files created |
| Files Modified | Existing files changed |
| Files Deleted | Files removed |
| Rollback Rate | % of actions that were rolled back |
| Action Scope | Lines of code changed |

### Report 3: Rejection Analysis

Generated: Weekly

| Metric | Description |
|--------|-------------|
| Total Rejections | Count of AI rejections |
| Top Rejection Reasons | Most common rejection causes |
| Approval Gaps | Features blocked by missing approvals |
| Ambiguity Hot Spots | Areas with repeated interpretation issues |
| Policy Violations | Governance rule breaches |

### Report 4: Learning Insights

Generated: Monthly

| Metric | Description |
|--------|-------------|
| Pattern Corrections | Common mistakes identified |
| Context Gaps | Missing information patterns |
| Interpretation Errors | Misunderstanding categories |
| Improvement Trends | Changes in quality over time |
| Training Recommendations | Suggested prompt improvements |

---

## Compliance Integration

### SOC 2 Mapping

| SOC 2 Criteria | Audit Support |
|----------------|---------------|
| CC6.1 - Logical Access | Action audit tracks all system modifications |
| CC7.2 - Change Management | Decision audit captures change rationale |
| CC7.3 - Change Approval | Human approval captured in audit |
| CC8.1 - Incident Response | Rejection audit identifies blocked actions |

### GDPR Considerations

- Audit logs may contain personal data (approver names)
- Implement data minimization (avoid logging user content)
- Support right to erasure for non-compliance-critical logs
- Document lawful basis for retention

---

## Implementation Guidelines

### For AI Agents

1. **Before any decision**: Log the decision with options considered
2. **Before any action**: Log the action with before_state
3. **After any action**: Update with after_state and outcome
4. **On rejection**: Log rejection with guidance
5. **On human feedback**: Create learning entry

### For Human Reviewers

1. **When approving**: Confirm approval in audit trail
2. **When rejecting**: Provide rejection reason
3. **When modifying**: Document what was changed and why
4. **When escalating**: Note escalation path taken

### For System Administrators

1. **Daily**: Review rejection summary for process issues
2. **Weekly**: Analyze learning insights for training needs
3. **Monthly**: Generate compliance reports
4. **Quarterly**: Audit retention compliance

---

## Audit Integrity

### Immutability Requirements

- Audit entries cannot be modified after creation
- Deletions only via retention policy (automated)
- All access to audit logs is itself logged
- Cryptographic hashing for tamper detection (optional)

### Hash Chain (Optional)

```json
{
  "id": "AUD-847292",
  "previous_hash": "sha256:a1b2c3d4...",
  "content_hash": "sha256:e5f6g7h8...",
  "chain_valid": true
}
```

---

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
