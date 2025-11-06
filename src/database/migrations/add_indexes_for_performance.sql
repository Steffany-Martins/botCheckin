/**
 * Performance Optimization Indexes
 * Add indexes to speed up common queries
 *
 * Run this migration to improve query performance
 */

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index on phone for fast user lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Index on name for search functionality (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users(LOWER(name));

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index on active status
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- ============================================
-- CHECKINS TABLE INDEXES
-- ============================================

-- Composite index on user_id and timestamp for fast user history queries
CREATE INDEX IF NOT EXISTS idx_checkins_user_timestamp ON checkins(user_id, timestamp DESC);

-- Index on timestamp for date range queries
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp DESC);

-- Index on type for filtering by checkin type
CREATE INDEX IF NOT EXISTS idx_checkins_type ON checkins(type);

-- Index on edited_by for tracking who made edits
CREATE INDEX IF NOT EXISTS idx_checkins_edited_by ON checkins(edited_by) WHERE edited_by IS NOT NULL;

-- Index on location_verified for GPS-based filtering
CREATE INDEX IF NOT EXISTS idx_checkins_location_verified ON checkins(location_verified);

-- ============================================
-- SESSIONS TABLE INDEXES
-- ============================================

-- Composite index on phone and expires_at for fast session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_phone_expires ON sessions(phone, expires_at);

-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Index on user_id for user-based session management
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- ANALYZE TABLES
-- ============================================
-- Update statistics for query planner

ANALYZE users;
ANALYZE checkins;
ANALYZE sessions;

-- ============================================
-- VERIFY INDEXES
-- ============================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
