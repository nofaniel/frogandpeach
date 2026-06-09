-- Add per-item metadata support for type-specific fields (quantity, category,
-- dueDate, targetDate, progress, notes, etc.).

ALTER TABLE list_items ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';
