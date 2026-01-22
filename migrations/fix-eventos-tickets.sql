-- Migration to fix all EVENTOS tickets with incorrect month/year values
-- This ensures tickets are grouped by creation date, not resolution date
-- Fix all EVENTOS tickets
UPDATE "Ticket" t
SET year = EXTRACT(
        YEAR
        FROM t."createdDate"
    )::INTEGER,
    month = EXTRACT(
        MONTH
        FROM t."createdDate"
    )::INTEGER
WHERE t."workPackageId" IN (
        SELECT wp.id
        FROM "WorkPackage" wp
        WHERE wp."contractType" = 'EVENTOS'
    )
    AND (
        t.year != EXTRACT(
            YEAR
            FROM t."createdDate"
        )::INTEGER
        OR t.month != EXTRACT(
            MONTH
            FROM t."createdDate"
        )::INTEGER
    );