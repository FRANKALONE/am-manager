-- Verification script for AM Manager database
-- Execute this in the SQL Editor of your AM Manager database

-- Check if the new tables exist
SELECT 'MassEmail' as table_name, COUNT(*) as exists_count 
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

-- If all show 1, the tables exist correctly!
