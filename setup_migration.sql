-- Migration to add setup wizard fields to Company table
-- Run this script manually if migrations don't work automatically

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "setupProgress" JSONB,
ADD COLUMN IF NOT EXISTS "setupData" JSONB,
ADD COLUMN IF NOT EXISTS "teamSize" TEXT,
ADD COLUMN IF NOT EXISTS "selectedTheme" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies."setupCompleted" IS 'Whether the setup wizard has been completed';
COMMENT ON COLUMN companies."setupProgress" IS 'Track which steps are completed: {businessInfo: true, branches: false, ...}';
COMMENT ON COLUMN companies."setupData" IS 'Store setup configuration data temporarily';
COMMENT ON COLUMN companies."teamSize" IS 'Team size selection from setup wizard';
COMMENT ON COLUMN companies."selectedTheme" IS 'Theme selection from setup wizard';
EOF < /dev/null