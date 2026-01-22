-- Cleanup script: Remove Mass Email and Landing Pages tables
-- ⚠️ ONLY execute this in "Control AMA Evolutivos" database
-- ⚠️ DO NOT execute in AM Manager database!

-- Drop foreign key constraints first
ALTER TABLE "MassEmailRecipient" DROP CONSTRAINT IF EXISTS "MassEmailRecipient_massEmailId_fkey";
ALTER TABLE "MassEmailRecipient" DROP CONSTRAINT IF EXISTS "MassEmailRecipient_userId_fkey";
ALTER TABLE "MassEmail" DROP CONSTRAINT IF EXISTS "MassEmail_createdBy_fkey";
ALTER TABLE "LandingView" DROP CONSTRAINT IF EXISTS "LandingView_landingId_fkey";
ALTER TABLE "LandingView" DROP CONSTRAINT IF EXISTS "LandingView_userId_fkey";
ALTER TABLE "TemporaryLanding" DROP CONSTRAINT IF EXISTS "TemporaryLanding_createdBy_fkey";

-- Drop tables in correct order (child tables first)
DROP TABLE IF EXISTS "LandingView";
DROP TABLE IF EXISTS "MassEmailRecipient";
DROP TABLE IF EXISTS "TemporaryLanding";
DROP TABLE IF EXISTS "MassEmail";

-- Verification: This should return 0 for all tables
SELECT 'MassEmail' as table_name, COUNT(*) as still_exists 
FROM information_schema.tables 
WHERE table_name = 'MassEmail'
UNION ALL
SELECT 'MassEmailRecipient', COUNT(*) 
FROM information_schema.tables 
WHERE table_name = 'MassEmailRecipient'
UNION ALL
SELECT 'TemporaryLanding', COUNT(*) 
FROM information_schema.tables 
WHERE table_name = 'TemporaryLanding'
UNION ALL
SELECT 'LandingView', COUNT(*) 
FROM information_schema.tables 
WHERE table_name = 'LandingView';

-- If all show 0, cleanup was successful!
