-- IntentR INTENT State Model Migration
-- This script adds unified state management across all entity types
-- Supporting: capabilities, enablers, storyboards (and future entity types)
--
-- INTENT State Model - 4 Dimensions:
-- 1. lifecycle_state: draft, active, implemented, maintained, retired
-- 2. workflow_stage: intent, specification, ui_design, implementation, control_loop
-- 3. stage_status: in_progress, ready_for_approval, approved, blocked
-- 4. approval_status: pending, approved, rejected

-- ============================================================================
-- PHASE 1: Update capabilities table with INTENT State Model
-- ============================================================================

-- Add INTENT State Model columns to capabilities (if not exist)
ALTER TABLE capabilities
    ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(50) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'specification',
    ADD COLUMN IF NOT EXISTS stage_status VARCHAR(50) DEFAULT 'in_progress',
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Update approval_status default if column exists (from migration_approval.sql)
-- Note: approval_status was added in migration_approval.sql

-- Add workspace support
ALTER TABLE capabilities
    ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_path TEXT;  -- Path to markdown file for sync

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_capabilities_lifecycle_state ON capabilities(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_capabilities_workflow_stage ON capabilities(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_capabilities_stage_status ON capabilities(stage_status);
CREATE INDEX IF NOT EXISTS idx_capabilities_workspace_id ON capabilities(workspace_id);

-- ============================================================================
-- PHASE 2: Create enablers table with INTENT State Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS enablers (
    id SERIAL PRIMARY KEY,
    enabler_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., ENB-582341
    capability_id INTEGER REFERENCES capabilities(id) ON DELETE SET NULL,

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    purpose TEXT,
    owner VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'medium',  -- high, medium, low

    -- INTENT State Model - 4 dimensions
    lifecycle_state VARCHAR(50) DEFAULT 'draft',
    workflow_stage VARCHAR(50) DEFAULT 'specification',
    stage_status VARCHAR(50) DEFAULT 'in_progress',
    approval_status VARCHAR(50) DEFAULT 'pending',

    -- Concurrency control
    version INTEGER DEFAULT 1,

    -- Workspace and file tracking
    workspace_id VARCHAR(255),
    file_path TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- Soft delete
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for enablers
CREATE INDEX IF NOT EXISTS idx_enablers_enabler_id ON enablers(enabler_id);
CREATE INDEX IF NOT EXISTS idx_enablers_capability_id ON enablers(capability_id);
CREATE INDEX IF NOT EXISTS idx_enablers_lifecycle_state ON enablers(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_enablers_workflow_stage ON enablers(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_enablers_stage_status ON enablers(stage_status);
CREATE INDEX IF NOT EXISTS idx_enablers_approval_status ON enablers(approval_status);
CREATE INDEX IF NOT EXISTS idx_enablers_workspace_id ON enablers(workspace_id);

-- Create trigger for enablers updated_at
DROP TRIGGER IF EXISTS update_enablers_updated_at ON enablers;
CREATE TRIGGER update_enablers_updated_at
    BEFORE UPDATE ON enablers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 3: Create story_cards table with INTENT State Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_cards (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(100) UNIQUE NOT NULL,  -- Client-generated UUID

    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    card_type VARCHAR(50),  -- persona, goal, constraint, etc.
    image_url TEXT,

    -- Grid position for storyboard canvas
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,

    -- INTENT State Model - 4 dimensions
    lifecycle_state VARCHAR(50) DEFAULT 'active',
    workflow_stage VARCHAR(50) DEFAULT 'intent',
    stage_status VARCHAR(50) DEFAULT 'in_progress',
    approval_status VARCHAR(50) DEFAULT 'pending',

    -- Concurrency control
    version INTEGER DEFAULT 1,

    -- Workspace and file tracking
    workspace_id VARCHAR(255) NOT NULL,
    file_path TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- Soft delete
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for story_cards
CREATE INDEX IF NOT EXISTS idx_story_cards_card_id ON story_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_story_cards_workspace_id ON story_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_story_cards_lifecycle_state ON story_cards(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_story_cards_workflow_stage ON story_cards(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_story_cards_stage_status ON story_cards(stage_status);
CREATE INDEX IF NOT EXISTS idx_story_cards_approval_status ON story_cards(approval_status);

-- Create trigger for story_cards updated_at
DROP TRIGGER IF EXISTS update_story_cards_updated_at ON story_cards;
CREATE TRIGGER update_story_cards_updated_at
    BEFORE UPDATE ON story_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 4: Create story_card_connections table for dependencies
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_card_connections (
    id SERIAL PRIMARY KEY,
    from_card_id INTEGER NOT NULL REFERENCES story_cards(id) ON DELETE CASCADE,
    to_card_id INTEGER NOT NULL REFERENCES story_cards(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'flow',  -- flow, dependency, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_card_id, to_card_id)
);

CREATE INDEX IF NOT EXISTS idx_story_card_connections_from ON story_card_connections(from_card_id);
CREATE INDEX IF NOT EXISTS idx_story_card_connections_to ON story_card_connections(to_card_id);

-- ============================================================================
-- PHASE 5: Create unified state change audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_state_changes (
    id SERIAL PRIMARY KEY,

    -- Entity reference (polymorphic)
    entity_type VARCHAR(50) NOT NULL,  -- 'capability', 'enabler', 'story_card'
    entity_id VARCHAR(100) NOT NULL,   -- The entity's unique ID (CAP-xxx, ENB-xxx, card UUID)

    -- State change details
    field_changed VARCHAR(50) NOT NULL,  -- lifecycle_state, workflow_stage, stage_status, approval_status
    old_value VARCHAR(100),
    new_value VARCHAR(100),

    -- Change context
    change_reason TEXT,

    -- Audit
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Workspace context
    workspace_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_entity_state_changes_entity ON entity_state_changes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_state_changes_workspace ON entity_state_changes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_entity_state_changes_changed_at ON entity_state_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_entity_state_changes_field ON entity_state_changes(field_changed);

-- ============================================================================
-- PHASE 6: Create function for optimistic concurrency
-- ============================================================================

-- Function to increment version on update (for optimistic locking)
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version increment to all entity tables
DROP TRIGGER IF EXISTS increment_capabilities_version ON capabilities;
CREATE TRIGGER increment_capabilities_version
    BEFORE UPDATE ON capabilities
    FOR EACH ROW
    WHEN (OLD.version IS NOT NULL)
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_enablers_version ON enablers;
CREATE TRIGGER increment_enablers_version
    BEFORE UPDATE ON enablers
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_story_cards_version ON story_cards;
CREATE TRIGGER increment_story_cards_version
    BEFORE UPDATE ON story_cards
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- ============================================================================
-- PHASE 7: Create workspace_sync table for tracking file sync status
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_sync (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,

    -- Sync status
    last_export_at TIMESTAMP,
    last_import_at TIMESTAMP,

    -- File hashes for conflict detection
    file_hashes JSONB DEFAULT '{}',

    -- Sync metadata
    sync_status VARCHAR(50) DEFAULT 'synced',  -- synced, pending_export, pending_import, conflict

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_sync_workspace_id ON workspace_sync(workspace_id);

-- Create trigger for workspace_sync updated_at
DROP TRIGGER IF EXISTS update_workspace_sync_updated_at ON workspace_sync;
CREATE TRIGGER update_workspace_sync_updated_at
    BEFORE UPDATE ON workspace_sync
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 8: Migrate existing data (if any)
-- ============================================================================

-- Update existing capabilities to have default INTENT state values
UPDATE capabilities
SET
    lifecycle_state = COALESCE(lifecycle_state,
        CASE
            WHEN status = 'implemented' THEN 'implemented'
            WHEN status = 'deprecated' THEN 'retired'
            ELSE 'active'
        END),
    workflow_stage = COALESCE(workflow_stage, current_stage, 'specification'),
    stage_status = COALESCE(stage_status,
        CASE
            WHEN approval_status = 'approved' THEN 'approved'
            WHEN approval_status = 'rejected' THEN 'blocked'
            ELSE 'in_progress'
        END),
    version = COALESCE(version, 1)
WHERE lifecycle_state IS NULL OR version IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE enablers IS 'Technical implementations that realize capabilities - INTENT Framework';
COMMENT ON TABLE story_cards IS 'Storyboard cards for intent phase visualization';
COMMENT ON TABLE story_card_connections IS 'Connections between story cards (flow, dependencies)';
COMMENT ON TABLE entity_state_changes IS 'Audit log for all entity state changes (INTENT State Model)';
COMMENT ON TABLE workspace_sync IS 'Tracks sync status between database and markdown files';

COMMENT ON COLUMN capabilities.lifecycle_state IS 'INTENT: draft, active, implemented, maintained, retired';
COMMENT ON COLUMN capabilities.workflow_stage IS 'INTENT: intent, specification, ui_design, implementation, control_loop';
COMMENT ON COLUMN capabilities.stage_status IS 'INTENT: in_progress, ready_for_approval, approved, blocked';
COMMENT ON COLUMN capabilities.version IS 'Optimistic concurrency control - incremented on each update';
