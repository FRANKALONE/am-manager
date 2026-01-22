-- Migration: Add Special Regularizations and Team Member Levels
-- Execute this directly in Neon SQL Editor
-- 1. Create SpecialRegularization table
CREATE TABLE IF NOT EXISTS "SpecialRegularization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
-- 2. Add level column to TeamMember
ALTER TABLE "TeamMember"
ADD COLUMN IF NOT EXISTS "level" TEXT;
-- 3. Add specialRegularizationId to ValidityPeriod
ALTER TABLE "ValidityPeriod"
ADD COLUMN IF NOT EXISTS "specialRegularizationId" TEXT;
-- 4. Add foreign key constraint
ALTER TABLE "ValidityPeriod"
ADD CONSTRAINT "ValidityPeriod_specialRegularizationId_fkey" FOREIGN KEY ("specialRegularizationId") REFERENCES "SpecialRegularization"("id") ON DELETE
SET NULL ON UPDATE CASCADE;
-- 5. Add Team table if it doesn't exist (in case it was removed)
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jiraId" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
-- Verify the changes
SELECT 'SpecialRegularization' as table_name,
    COUNT(*) as record_count
FROM "SpecialRegularization"
UNION ALL
SELECT 'TeamMember with level',
    COUNT(*)
FROM "TeamMember"
WHERE "level" IS NOT NULL;