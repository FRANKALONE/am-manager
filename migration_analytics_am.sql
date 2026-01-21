-- SQL Migration for Analytics AM Dashboard
-- Run this on your production PostgreSQL database
-- 1. Add proDeliveryDate field to Ticket table
ALTER TABLE "Ticket"
ADD COLUMN IF NOT EXISTS "proDeliveryDate" TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS "Ticket_proDeliveryDate_idx" ON "Ticket"("proDeliveryDate");
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
-- 3. Verify existing Ticket table for constraints (Prisma specific)
-- Note: The proDeliveryDate field is nullable, so no data migration of existing rows is needed.
-- A full sync will be required to populate this data from Jira changelogs.