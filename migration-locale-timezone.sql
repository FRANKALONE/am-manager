-- Migration: Add locale and timezone to User table
-- Date: 2026-01-04
-- Purpose: Enable multi-language and timezone support

-- Add locale column (default: Spanish)
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'es';

-- Add timezone column (default: Europe/Madrid)
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';

-- Create index for faster locale queries
CREATE INDEX IF NOT EXISTS "User_locale_idx" ON "User"("locale");

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'User' 
AND column_name IN ('locale', 'timezone');
