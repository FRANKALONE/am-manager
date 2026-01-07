-- CreateTable
CREATE TABLE "JiraOrganization" (
    "id" TEXT NOT NULL,
    "jiraOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JiraCustomerUser" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "emailAddress" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "accountType" TEXT,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JiraCustomerUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JiraOrganization_jiraOrgId_key" ON "JiraOrganization"("jiraOrgId");

-- CreateIndex
CREATE INDEX "JiraOrganization_clientId_idx" ON "JiraOrganization"("clientId");

-- CreateIndex
CREATE INDEX "JiraOrganization_jiraOrgId_idx" ON "JiraOrganization"("jiraOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "JiraCustomerUser_accountId_key" ON "JiraCustomerUser"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "JiraCustomerUser_linkedUserId_key" ON "JiraCustomerUser"("linkedUserId");

-- CreateIndex
CREATE INDEX "JiraCustomerUser_clientId_idx" ON "JiraCustomerUser"("clientId");

-- CreateIndex
CREATE INDEX "JiraCustomerUser_organizationId_idx" ON "JiraCustomerUser"("organizationId");

-- CreateIndex
CREATE INDEX "JiraCustomerUser_emailAddress_idx" ON "JiraCustomerUser"("emailAddress");

-- CreateIndex
CREATE INDEX "JiraCustomerUser_accountId_idx" ON "JiraCustomerUser"("accountId");

-- AddForeignKey
ALTER TABLE "JiraOrganization" ADD CONSTRAINT "JiraOrganization_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "JiraOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
