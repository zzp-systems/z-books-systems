-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Change Trail Migration v4
-- Field-level audit trail for all CRUD operations
--
-- Run:
--   npx wrangler d1 execute jjb-arap-db --remote --file=migration-v4-change-trail.sql
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS change_trail (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ct_entity ON change_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ct_changed_at ON change_trail(changed_at DESC);
