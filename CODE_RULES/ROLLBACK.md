# ROLLBACK PROCEDURES
**Version**: 1.0.0
**Last Updated**: December 24, 2025
**Framework**: INTENT (Scaled Agile With AI)

---

## Overview

This document defines procedures for rolling back AI-generated changes when they fail validation, are rejected by humans, or cause system issues. Effective rollback is essential for maintaining system stability while enabling aggressive AI-assisted development.

**Core Principle**: Every AI action must be reversible. The ability to undo enables the confidence to experiment.

---

## Rollback Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| **Test Failure** | Existing tests fail after AI changes | Immediate rollback, notify human |
| **Build Failure** | Code doesn't compile/build | Immediate rollback, log error |
| **Lint Failure** | Critical lint errors introduced | Prompt for rollback decision |
| **Type Error** | TypeScript/static type errors | Immediate rollback |
| **Runtime Crash** | Application crashes on startup | Immediate rollback, alert |
| **Performance Degradation** | Response time exceeds threshold by 50%+ | Alert, prompt for rollback |
| **Security Scan Failure** | New vulnerabilities introduced | Immediate rollback, security alert |

### Manual Triggers

| Trigger | Initiator | Process |
|---------|-----------|---------|
| **Human Rejection** | Reviewer | Execute rollback procedure |
| **Design Deviation** | Architect | Evaluate scope, selective rollback |
| **Requirement Mismatch** | Product Owner | Rollback to last approved state |
| **Integration Conflict** | Developer | Rollback conflicting changes |
| **Quality Concern** | QA | Rollback pending investigation |

---

## Rollback Levels

### Level 1: Action-Level Rollback

**Scope**: Single file change or atomic operation
**Time to Execute**: Seconds
**Risk**: Low

**When to Use**:
- Single file modification needs reverting
- Specific function/component change was wrong
- Quick correction during active development

**Procedure**:
```bash
# Git-based rollback of specific file
git checkout HEAD~1 -- path/to/file.go

# Or restore from audit log before_state
intentr rollback --action ACT-123456
```

### Level 2: Session-Level Rollback

**Scope**: All changes from a single AI session
**Time to Execute**: Minutes
**Risk**: Medium

**When to Use**:
- Entire AI conversation produced flawed output
- Session went in wrong direction
- Need to restart from session beginning

**Procedure**:
```bash
# Rollback all actions from a session
intentr rollback --session sess_abc123

# Or using git with session commit marker
git reset --hard SESSION_START_sess_abc123
```

### Level 3: Feature-Level Rollback

**Scope**: All changes related to a capability/enabler
**Time to Execute**: Minutes to hours
**Risk**: Medium-High

**When to Use**:
- Entire feature implementation rejected
- Design approach was fundamentally wrong
- Need to try different approach

**Procedure**:
```bash
# Rollback all changes for an enabler
intentr rollback --enabler ENB-654321

# Reset capability to previous stage
intentr workflow --capability CAP-123456 --reset-to Design
```

### Level 4: System-Level Rollback

**Scope**: Multiple capabilities, major system changes
**Time to Execute**: Hours
**Risk**: High

**When to Use**:
- Multiple related features need reverting
- Architecture decision was wrong
- Deployment caused production issues

**Procedure**:
```bash
# Rollback to specific release/tag
git reset --hard v1.2.3

# Restore database to point-in-time
pg_restore --target-time="2025-12-24 10:00:00" ...

# Redeploy previous version
kubectl rollout undo deployment/app
```

---

## Rollback Decision Matrix

### Decision Flowchart

```
AI Change Detected
        │
        ▼
┌───────────────────┐
│ Tests Pass?       │
└───────────────────┘
        │
    No  │  Yes
        │   │
        ▼   ▼
┌──────────┐ ┌───────────────────┐
│ ROLLBACK │ │ Build Succeeds?   │
│ Level 1  │ └───────────────────┘
└──────────┘         │
                 No  │  Yes
                     │   │
                     ▼   ▼
             ┌──────────┐ ┌───────────────────┐
             │ ROLLBACK │ │ Human Review      │
             │ Level 1  │ └───────────────────┘
             └──────────┘         │
                          Rejected│  Approved
                                  │   │
                                  ▼   ▼
                          ┌──────────┐ ┌──────────┐
                          │ ROLLBACK │ │ PROCEED  │
                          │ Level 1-3│ │          │
                          └──────────┘ └──────────┘
```

### Severity Assessment

| Severity | Indicators | Rollback Level | Urgency |
|----------|------------|----------------|---------|
| **Critical** | Production down, data loss risk, security breach | Level 4 | Immediate |
| **High** | Feature broken, tests failing, build broken | Level 2-3 | Within 1 hour |
| **Medium** | Quality concerns, performance issues | Level 1-2 | Within 1 day |
| **Low** | Style issues, minor improvements needed | Level 1 | At convenience |

---

## Pre-Rollback Checklist

Before initiating any rollback:

### Information Gathering

- [ ] **Identify scope**: What exactly needs to be rolled back?
- [ ] **Identify cause**: Why is rollback needed?
- [ ] **Check dependencies**: What other changes depend on this?
- [ ] **Assess impact**: What will break if we rollback?
- [ ] **Verify backup**: Do we have the before-state captured?

### Stakeholder Notification

- [ ] **Notify team**: Alert relevant team members
- [ ] **Document decision**: Log in AI_AUDIT as REJECTION or LEARNING
- [ ] **Update status**: Change capability/enabler status appropriately

### Technical Preparation

- [ ] **Create safety backup**: Snapshot current state before rollback
- [ ] **Prepare rollback commands**: Know exactly what to execute
- [ ] **Plan verification**: How will we confirm rollback success?

---

## Rollback Procedures by Artifact Type

### Source Code Rollback

**Single File**:
```bash
# Using git
git checkout HEAD~1 -- path/to/file.go
git commit -m "Rollback: Revert AI changes to file.go

Reason: [Describe why]
Session: sess_abc123
Action: ACT-123456"
```

**Multiple Files (Same Session)**:
```bash
# Find session start commit
git log --oneline --grep="SESSION_START_sess_abc123"

# Reset to that commit
git reset --hard <commit_hash>

# Or interactive rebase to remove specific commits
git rebase -i HEAD~5  # Careful: interactive mode
```

**Feature Branch**:
```bash
# Abandon feature branch
git checkout main
git branch -D feature/broken-feature

# Or reset feature branch to main
git checkout feature/broken-feature
git reset --hard main
```

### Database Rollback

**Schema Changes**:
```bash
# Run down migration
migrate -path ./migrations -database $DATABASE_URL down 1

# Or specific version
migrate -path ./migrations -database $DATABASE_URL goto <version>
```

**Data Changes**:
```sql
-- Restore from backup table (if created)
INSERT INTO users SELECT * FROM users_backup_20251224;
DROP TABLE users_backup_20251224;

-- Or point-in-time recovery
-- (Requires continuous archiving enabled)
```

### Configuration Rollback

**Environment Variables**:
```bash
# Restore from backup
cp .env.backup.20251224 .env

# Restart services
./stop.sh && ./start.sh
```

**Infrastructure Config**:
```bash
# Terraform state rollback
terraform plan -target=module.affected
terraform apply -auto-approve

# Kubernetes config rollback
kubectl rollout undo deployment/app
```

### Dependency Rollback

**Go Modules**:
```bash
# Restore go.mod and go.sum
git checkout HEAD~1 -- go.mod go.sum

# Tidy and verify
go mod tidy
go mod verify
```

**NPM Packages**:
```bash
# Restore package files
git checkout HEAD~1 -- package.json package-lock.json

# Reinstall
rm -rf node_modules
npm install
```

---

## Post-Rollback Actions

### Immediate Actions

1. **Verify System Health**
   ```bash
   # Run health checks
   ./status.sh

   # Run test suite
   make test

   # Check logs for errors
   tail -f logs/*.log
   ```

2. **Update Audit Log**
   - Create ROLLBACK action entry
   - Link to original action being rolled back
   - Document reason and outcome

3. **Update Workflow Status**
   - Reset capability/enabler to appropriate stage
   - Clear any "In Progress" states

### Investigation Actions

1. **Root Cause Analysis**
   - Why did the AI produce incorrect output?
   - Was the prompt unclear?
   - Was context missing?
   - Was this an AI capability limitation?

2. **Document Learning**
   - Create LEARNING audit entry
   - Update KNOWLEDGE_BASE if pattern identified
   - Improve PROMPT_STANDARDS if applicable

3. **Preventive Measures**
   - Add validation checks if missing
   - Improve test coverage
   - Clarify specifications

### Recovery Actions

1. **Plan Retry** (if appropriate)
   - Address root cause first
   - Improve prompt/specification
   - Consider smaller increments

2. **Alternative Approach**
   - Should this be human-implemented?
   - Different AI strategy needed?
   - Break into smaller tasks?

---

## Rollback Automation

### Git Hooks

**Pre-commit hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
# Capture before-state hash for rollback
echo "$(git rev-parse HEAD)" > .intentr/last_stable_commit

# Run validation
make test || exit 1
make lint || exit 1
```

**Post-commit hook** (`.git/hooks/post-commit`):
```bash
#!/bin/bash
# Verify commit didn't break anything
make test-quick
if [ $? -ne 0 ]; then
    echo "WARNING: Tests failing after commit"
    echo "Consider: git reset --hard $(cat .intentr/last_stable_commit)"
fi
```

### CI/CD Integration

```yaml
# .github/workflows/ai-validation.yml
name: AI Change Validation

on: [push]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for rollback

      - name: Run Tests
        run: make test

      - name: Run Security Scan
        run: make security-scan

      - name: Auto-Rollback on Failure
        if: failure()
        run: |
          git reset --hard HEAD~1
          git push --force-with-lease
          echo "::error::Auto-rollback triggered due to validation failure"
```

### IntentR CLI Commands

```bash
# Rollback specific action
intentr rollback --action ACT-123456

# Rollback entire session
intentr rollback --session sess_abc123

# Rollback to capability stage
intentr rollback --capability CAP-123456 --to-stage Design

# Rollback with dry-run (preview only)
intentr rollback --action ACT-123456 --dry-run

# List rollback candidates
intentr rollback --list-actions --since "2 hours ago"
```

---

## Rollback Prevention

### Best Practices to Reduce Rollbacks

1. **Incremental Changes**
   - Small, focused AI tasks
   - Commit after each successful step
   - Review before proceeding

2. **Comprehensive Testing**
   - Run tests before and after AI changes
   - Add tests for new functionality first
   - Use TDD where possible

3. **Clear Specifications**
   - Follow PROMPT_STANDARDS
   - Include examples and restrictions
   - Verify AI understanding before implementation

4. **Staged Rollout**
   - Feature flags for new functionality
   - Canary deployments
   - Blue-green deployments

5. **Human Checkpoints**
   - Review at each workflow stage
   - Don't skip approval gates
   - Verify before marking complete

---

## Emergency Procedures

### Production Incident Response

**Immediate Actions** (within 5 minutes):
1. Assess severity (user impact, data risk)
2. Decide: rollback vs. hotfix
3. If rollback: execute Level 4 procedure
4. Notify stakeholders

**Short-term Actions** (within 1 hour):
1. Verify system stability
2. Collect logs and evidence
3. Begin root cause analysis
4. Update incident channel

**Post-incident Actions** (within 24 hours):
1. Complete root cause analysis
2. Document in incident report
3. Create preventive measures
4. Update rollback procedures if needed

### Emergency Contact Chain

| Severity | First Contact | Escalation |
|----------|---------------|------------|
| Critical | On-call Engineer | Engineering Lead → CTO |
| High | Team Lead | Engineering Lead |
| Medium | Any Team Member | Team Lead |
| Low | Self-service rollback | Team Lead if issues |

---

## Rollback Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rollback Rate | <10% of AI sessions | Rollbacks / Total Sessions |
| Time to Rollback | <5 min (Level 1), <30 min (Level 2) | Time from trigger to completion |
| Rollback Success Rate | >99% | Successful rollbacks / Attempted |
| Repeat Rollbacks | <5% | Same cause rolled back twice |
| Production Incidents from AI | 0 | AI changes causing prod issues |

### Monthly Review

- Count of rollbacks by level
- Root causes categorized
- Prevention measures implemented
- Trend analysis (improving/degrading)

---

**Document Version**: 1.0.0
**Framework**: INTENT (Scaled Agile With AI)
**Last Updated**: December 24, 2025
**Maintained By**: Development Team
