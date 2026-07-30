-- ============================================================
-- Full-Text Search GIN Indexes (PostgreSQL)
-- Run ONCE after TypeORM synchronize has created the tables.
-- These are NOT expressible as TypeORM @Index decorators.
-- ============================================================

-- ── Workspaces: search by name + description ─────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_fts
  ON workspaces
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- ── Teams: search by name within a workspace ─────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_fts
  ON teams
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- ── Events: search by name + description ─────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_fts
  ON events
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- ── Competitions: search by name ──────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitions_fts
  ON competitions
  USING GIN (
    to_tsvector('english', coalesce(name, ''))
  );

-- ── Venues: search by name + location ─────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_fts
  ON venues
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(location, ''))
  );

-- ── Users: search by username ──────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_fts
  ON users
  USING GIN (
    to_tsvector('simple', coalesce(username, ''))
  );

-- ============================================================
-- EXAMPLE QUERY using FTS (replace :query with user input):
-- ============================================================
-- SELECT * FROM teams
-- WHERE workspace_id = :workspaceId
--   AND to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
--       @@ plainto_tsquery('english', :query)
-- ORDER BY name ASC;
-- ============================================================
