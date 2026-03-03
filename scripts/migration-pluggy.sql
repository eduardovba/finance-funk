-- Migration: Add Pluggy Integration Tables and Columns

-- 1. Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY, -- UUID
    pluggy_item_id TEXT UNIQUE NOT NULL,
    institution_name TEXT NOT NULL,
    last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL -- 'UPDATED', 'OUTDATED', 'LOGIN_ERROR', etc.
);

-- 2. Add pluggy_asset_id to assets table
-- Note: SQLite doesn't support ADD COLUMN UNIQUE directly in ALTER TABLE for older versions, 
-- but we can add the column and then create a unique index.
ALTER TABLE assets ADD COLUMN pluggy_asset_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_pluggy_id ON assets(pluggy_asset_id);

-- Optional: Add last_updated to assets for sync tracking
ALTER TABLE assets ADD COLUMN last_updated DATETIME;
