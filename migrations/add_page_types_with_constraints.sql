-- Migration: Add Page Types with Constraints
-- Description: Update pages table to support new page types with constraints
-- Date: 2025-06-03

-- Drop existing check constraint if it exists
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_type_check;

-- Add new check constraint for page types
ALTER TABLE pages ADD CONSTRAINT pages_type_check 
  CHECK (type IN ('Introduction', 'Booster', 'Comparation', 'Review', 'Custom', 'text'));

-- Update default value for type column
ALTER TABLE pages ALTER COLUMN type SET DEFAULT 'Introduction';

-- Update existing 'text' type pages to 'Introduction' (optional, uncomment if needed)
-- UPDATE pages SET type = 'Introduction' WHERE type = 'text';

-- Create index on type column for better performance
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);

-- Add comment to document the change
COMMENT ON COLUMN pages.type IS 'Page type: Introduction/Booster/Comparation/Review (15 grains auto-created), Custom (manual grain selection), or text (legacy)';
