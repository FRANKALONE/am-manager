-- Migration: Add clientJiraId to Ticket table
-- Description: Adds a new column to store the ticket ID from client's own JIRA
--              (for clients FAIN, MOLECOR, and UAX who work in their own JIRA instances)

-- Add the clientJiraId column to the Ticket table
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "clientJiraId" TEXT;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Ticket' AND column_name = 'clientJiraId';

-- Optional: Add a comment to document the column's purpose
COMMENT ON COLUMN "Ticket"."clientJiraId" IS 'ID of the ticket in the client''s own JIRA instance (for FAIN, MOLECOR, UAX)';
