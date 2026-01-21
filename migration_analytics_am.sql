-- SQL Migration for Analytics AM Dashboard
-- Run this on your production PostgreSQL database
-- 1. Add proDeliveryDate and clientJiraId fields to Ticket table
ALTER TABLE "Ticket"
ADD COLUMN IF NOT EXISTS "proDeliveryDate" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Ticket"
ADD COLUMN IF NOT EXISTS "clientJiraId" TEXT;
CREATE INDEX IF NOT EXISTS "Ticket_proDeliveryDate_idx" ON "Ticket"("proDeliveryDate");
CREATE INDEX IF NOT EXISTS "Ticket_clientJiraId_idx" ON "Ticket"("clientJiraId");
-- 2. Create TicketStatusHistory table
CREATE TABLE IF NOT EXISTS "TicketStatusHistory" (
    "id" SERIAL PRIMARY KEY,
    "issueKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    -- 'TICKET' or 'PROPOSAL'
    "status" TEXT NOT NULL,
    "transitionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "author" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TicketStatusHistory_issueKey_type_idx" ON "TicketStatusHistory"("issueKey", "type");
CREATE INDEX IF NOT EXISTS "TicketStatusHistory_transitionDate_idx" ON "TicketStatusHistory"("transitionDate");
-- 3. Add date fields to EvolutivoProposal table
ALTER TABLE "EvolutivoProposal"
ADD COLUMN IF NOT EXISTS "sentToGerenteDate" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "EvolutivoProposal"
ADD COLUMN IF NOT EXISTS "sentToClientDate" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "EvolutivoProposal"
ADD COLUMN IF NOT EXISTS "approvedDate" TIMESTAMP WITH TIME ZONE;
-- 5. Migrate permissions for existing roles (GERENTE, DIRECTOR, etc.)
-- Grant view_analytics_contracts and view_analytics_wp_consumption to roles that had view_analytics
UPDATE "Role"
SET "permissions" = CASE
        WHEN "permissions"::jsonb ? 'view_analytics' THEN (
            "permissions"::jsonb || '{"view_analytics_contracts": true, "view_analytics_wp_consumption": true, "view_analytics_am_dashboard": true}'::jsonb
        )::text
        ELSE "permissions"
    END
WHERE "permissions" LIKE '%view_analytics%';
-- 6. Note for production deployment
-- A full sync will be required to populate the history data from Jira changelogs.
-- 4. Verify existing Ticket table for constraints (Prisma specific)
-- Note: The proDeliveryDate field is nullable, so no data migration of existing rows is needed.
-- A full sync will be required to populate this data from Jira changelogs.