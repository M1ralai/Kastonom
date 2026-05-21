-- ===========================================
-- KASTONOM - Refresh Tokens Migration
-- Adds refresh token storage for JWT token refresh mechanism
-- ===========================================

-- Refresh tokens table for token rotation and revocation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family VARCHAR(64) NOT NULL,  -- Token family for rotation detection
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,  -- For logout/revocation
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for refresh token queries
CREATE INDEX idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_family ON refresh_tokens(family);
CREATE INDEX idx_refresh_token_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- Active sessions view for user session management
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    rt.id,
    rt.user_id,
    rt.family,
    rt.created_at,
    rt.expires_at,
    rt.ip_address,
    rt.user_agent
FROM refresh_tokens rt
WHERE rt.revoked_at IS NULL 
  AND rt.expires_at > CURRENT_TIMESTAMP;