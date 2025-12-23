-- IntentR User Authentication Database Schema
-- This script initializes the database with user table and admin user

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create sessions table for tracking active sessions (optional, for future enhancement)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt, cost 10)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@intentra.local',
    '$2a$10$3ool914vjg3JAynM0TuLe.fmNwiLC9qysfpH8Klxzg8qyG1ZhHoQK',
    'System Administrator',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create capabilities table
CREATE TABLE IF NOT EXISTS capabilities (
    id SERIAL PRIMARY KEY,
    capability_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., CAP-582341
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'planned',  -- planned, in_progress, implemented, deprecated
    description TEXT,
    purpose TEXT,  -- Multiline purpose field
    storyboard_reference TEXT,  -- Reference to storyboard card
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_capabilities_capability_id ON capabilities(capability_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_status ON capabilities(status);

-- Create trigger for capabilities table
DROP TRIGGER IF EXISTS update_capabilities_updated_at ON capabilities;
CREATE TRIGGER update_capabilities_updated_at
    BEFORE UPDATE ON capabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create capability_dependencies table (for both upstream and downstream)
CREATE TABLE IF NOT EXISTS capability_dependencies (
    id SERIAL PRIMARY KEY,
    capability_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    depends_on_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL,  -- 'upstream' or 'downstream'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(capability_id, depends_on_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_capability_dependencies_capability_id ON capability_dependencies(capability_id);
CREATE INDEX IF NOT EXISTS idx_capability_dependencies_depends_on_id ON capability_dependencies(depends_on_id);

-- Create capability_assets table
CREATE TABLE IF NOT EXISTS capability_assets (
    id SERIAL PRIMARY KEY,
    capability_id INTEGER NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL,  -- 'file' or 'url'
    asset_name VARCHAR(255) NOT NULL,
    asset_url TEXT,  -- URL or file path
    description TEXT,  -- How the asset should be used
    file_size BIGINT,  -- For uploaded files
    mime_type VARCHAR(100),  -- For uploaded files
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_capability_assets_capability_id ON capability_assets(capability_id);
