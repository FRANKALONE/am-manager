-- Check if FAIN Work Package exists and get its ID
SELECT id, name, "includeEvoEstimates", "includeEvoTM" 
FROM "WorkPackage" 
WHERE name LIKE '%FAIN%';

-- Check WorklogDetail for December 2024 Evolutivos
SELECT 
    "issueKey",
    "issueType",
    "billingMode",
    "author",
    "tipoImputacion",
    "timeSpentHours",
    year,
    month,
    "issueSummary"
FROM "WorklogDetail"
WHERE "workPackageId" = (SELECT id FROM "WorkPackage" WHERE name LIKE '%FAIN%' LIMIT 1)
  AND year = 2024
  AND month = 12
  AND "issueType" = 'Evolutivo'
ORDER BY "issueKey";

-- Check for FAI-517 specifically
SELECT 
    "issueKey",
    "issueType",
    "billingMode",
    "author",
    "tipoImputacion",
    "timeSpentHours",
    year,
    month,
    "issueSummary"
FROM "WorklogDetail"
WHERE "workPackageId" = (SELECT id FROM "WorkPackage" WHERE name LIKE '%FAIN%' LIMIT 1)
  AND "issueKey" = 'FAI-517'
ORDER BY year, month;

-- Check December 2025 as well (user said created Dec 4, 2025)
SELECT 
    "issueKey",
    "issueType",
    "billingMode",
    "author",
    "tipoImputacion",
    "timeSpentHours",
    year,
    month,
    "issueSummary"
FROM "WorklogDetail"
WHERE "workPackageId" = (SELECT id FROM "WorkPackage" WHERE name LIKE '%FAIN%' LIMIT 1)
  AND year = 2025
  AND month = 12
  AND "issueType" = 'Evolutivo'
ORDER BY "issueKey";
