-- CreateTable JiraUserRequest
CREATE TABLE IF NOT EXISTS "JiraUserRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "jiraAccountId" TEXT,
    "reason" TEXT,
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraUserRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "JiraUserRequest_clientId_idx" ON "JiraUserRequest"("clientId");
CREATE INDEX IF NOT EXISTS "JiraUserRequest_status_idx" ON "JiraUserRequest"("status");

-- AddForeignKeys
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
