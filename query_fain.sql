-- Query FAIN Work Packages
SELECT id, name, "contractType", "billingType", "jiraProjectKeys", "includedTicketTypes", 
       "includeEvoEstimates", "includeEvoTM", "lastSyncedAt"
FROM "WorkPackage"
WHERE name LIKE '%FAIN%';

-- Query WorklogDetails for FAIN (assuming we find the WP ID)
-- We'll need to replace the WP ID after finding it
SELECT 
    year, 
    month, 
    "issueKey", 
    "issueType", 
    "issueSummary",
    "timeSpentHours",
    "billingMode",
    author,
    "tipoImputacion",
    "issueCreatedDate"
FROM "WorklogDetail"
WHERE "workPackageId" IN (
    SELECT id FROM "WorkPackage" WHERE name LIKE '%FAIN%'
)
AND year = 2024
AND month = 12
AND "issueType" = 'Evolutivo'
ORDER BY "issueKey", year, month;

-- Query MonthlyMetric for FAIN
SELECT 
    year,
    month,
    "consumedHours"
FROM "MonthlyMetric"
WHERE "workPackageId" IN (
    SELECT id FROM "WorkPackage" WHERE name LIKE '%FAIN%'
)
AND year = 2024
ORDER BY year, month;
