-- Fix December 2025 AIE regularizations
-- Set them as Revenue Recognized but NOT Billed
-- First, let's see what we have
SELECT r.id,
    r.date,
    r.type,
    r.quantity,
    r.isRevenueRecognized,
    r.isBilled,
    r.description,
    wp.name as wpName,
    c.name as clientName
FROM "Regularization" r
    JOIN "WorkPackage" wp ON r."workPackageId" = wp.id
    JOIN "Client" c ON wp."clientId" = c.id
WHERE r.type = 'EXCESS'
    AND EXTRACT(
        MONTH
        FROM r.date
    ) = 12
    AND EXTRACT(
        YEAR
        FROM r.date
    ) = 2025
ORDER BY r.date DESC;
-- Update: Set isRevenueRecognized = true and isBilled = false
-- for December 2025 EXCESS regularizations
UPDATE "Regularization"
SET "isRevenueRecognized" = true,
    "isBilled" = false
WHERE type = 'EXCESS'
    AND EXTRACT(
        MONTH
        FROM date
    ) = 12
    AND EXTRACT(
        YEAR
        FROM date
    ) = 2025;
-- Verify the changes
SELECT r.id,
    r.date,
    r.type,
    r.quantity,
    r.isRevenueRecognized,
    r.isBilled,
    r.description,
    wp.name as wpName,
    c.name as clientName
FROM "Regularization" r
    JOIN "WorkPackage" wp ON r."workPackageId" = wp.id
    JOIN "Client" c ON wp."clientId" = c.id
WHERE r.type = 'EXCESS'
    AND EXTRACT(
        MONTH
        FROM r.date
    ) = 12
    AND EXTRACT(
        YEAR
        FROM r.date
    ) = 2025
ORDER BY r.date DESC;