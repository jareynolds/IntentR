-- IntentR Approval Workflow Database Migration
-- This script adds approval workflow tables for capabilities and enablers

-- Create approval_status enum type for clarity
-- Note: Using VARCHAR for flexibility, but these are the valid values:
-- 'pending_approval', 'approved', 'rejected', 'withdrawn'

-- Create capability_approvals table
CREATE TABLE IF NOT EXISTS capability_approvals (
    id SERIAL PRIMARY KEY,
    capability_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,

    -- Workflow stage: specification, definition, design, execution
    stage VARCHAR(50) NOT NULL,

    -- Status: pending_approval, approved, rejected, withdrawn
    status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',

    -- Request details
    requested_by INTEGER NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Decision details (null until decision made)
    decided_by INTEGER REFERENCES users(id),
    decided_at TIMESTAMP,

    -- Feedback (required for rejection, optional for approval)
    feedback TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure only one pending approval per capability per stage
    CONSTRAINT unique_pending_approval UNIQUE (capability_id, stage, status)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_capability_approvals_capability_id
    ON capability_approvals(capability_id);
CREATE INDEX IF NOT EXISTS idx_capability_approvals_status
    ON capability_approvals(status);
CREATE INDEX IF NOT EXISTS idx_capability_approvals_stage
    ON capability_approvals(stage);
CREATE INDEX IF NOT EXISTS idx_capability_approvals_requested_by
    ON capability_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_capability_approvals_decided_by
    ON capability_approvals(decided_by);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_capability_approvals_updated_at ON capability_approvals;
CREATE TRIGGER update_capability_approvals_updated_at
    BEFORE UPDATE ON capability_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create approval_workflow_rules table for role-based permissions
CREATE TABLE IF NOT EXISTS approval_workflow_rules (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    stage VARCHAR(50) NOT NULL,  -- specification, definition, design, execution, or 'all'
    can_request_approval BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    can_reject BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, stage)
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_approval_workflow_rules_updated_at ON approval_workflow_rules;
CREATE TRIGGER update_approval_workflow_rules_updated_at
    BEFORE UPDATE ON approval_workflow_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default workflow rules
-- Admin can do everything
INSERT INTO approval_workflow_rules (role, stage, can_request_approval, can_approve, can_reject)
VALUES
    ('admin', 'all', true, true, true)
ON CONFLICT (role, stage) DO NOTHING;

-- Product Owner can request and approve/reject
INSERT INTO approval_workflow_rules (role, stage, can_request_approval, can_approve, can_reject)
VALUES
    ('product_owner', 'all', true, true, true)
ON CONFLICT (role, stage) DO NOTHING;

-- Designer can request but not approve for specification and design stages
INSERT INTO approval_workflow_rules (role, stage, can_request_approval, can_approve, can_reject)
VALUES
    ('designer', 'specification', true, false, false),
    ('designer', 'definition', true, false, false),
    ('designer', 'design', true, true, true),  -- Designers can approve design stage
    ('designer', 'execution', true, false, false)
ON CONFLICT (role, stage) DO NOTHING;

-- Engineer can request but only approve execution stage
INSERT INTO approval_workflow_rules (role, stage, can_request_approval, can_approve, can_reject)
VALUES
    ('engineer', 'specification', true, false, false),
    ('engineer', 'definition', true, false, false),
    ('engineer', 'design', true, false, false),
    ('engineer', 'execution', true, true, true)  -- Engineers can approve execution stage
ON CONFLICT (role, stage) DO NOTHING;

-- DevOps can request but only approve execution stage
INSERT INTO approval_workflow_rules (role, stage, can_request_approval, can_approve, can_reject)
VALUES
    ('devops', 'specification', true, false, false),
    ('devops', 'definition', true, false, false),
    ('devops', 'design', true, false, false),
    ('devops', 'execution', true, true, true)  -- DevOps can approve execution stage
ON CONFLICT (role, stage) DO NOTHING;

-- Add approval-related columns to capabilities table
ALTER TABLE capabilities
    ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'specification',
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_capabilities_current_stage ON capabilities(current_stage);
CREATE INDEX IF NOT EXISTS idx_capabilities_approval_status ON capabilities(approval_status);

-- Create approval_audit_log for tracking all approval activities
CREATE TABLE IF NOT EXISTS approval_audit_log (
    id SERIAL PRIMARY KEY,
    approval_id INTEGER REFERENCES capability_approvals(id),
    capability_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,  -- 'requested', 'approved', 'rejected', 'withdrawn'
    stage VARCHAR(50) NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB  -- Additional details about the action
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_log_capability_id
    ON approval_audit_log(capability_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_approval_id
    ON approval_audit_log(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_performed_by
    ON approval_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_audit_log_action
    ON approval_audit_log(action);
