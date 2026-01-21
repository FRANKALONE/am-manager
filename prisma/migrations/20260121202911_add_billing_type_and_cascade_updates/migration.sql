-- CreateTable
CREATE TABLE "Parameter" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manager" TEXT,
    "amOnboardingDate" TIMESTAMP(3),
    "customAttributes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "portalUrl" TEXT,
    "clientLogo" TEXT,
    "clientPortalUrl" TEXT,
    "jiraProjectKey" TEXT,
    "reportEmails" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "WorkPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "billingType" TEXT NOT NULL,
    "renewalType" TEXT NOT NULL,
    "renewalNotes" TEXT,
    "accumulatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "accumulatedHoursDate" TIMESTAMP(3),
    "jiraProjectKeys" TEXT,
    "tempoAccountId" TEXT,
    "oldWpId" TEXT,
    "hasIaasService" BOOLEAN NOT NULL DEFAULT false,
    "includedTicketTypes" TEXT,
    "includeEvoEstimates" BOOLEAN NOT NULL DEFAULT true,
    "includeEvoTM" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "customAttributes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isMainWP" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regularization" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "ticketId" TEXT,
    "note" TEXT,
    "ticketType" TEXT,
    "reviewedForDuplicates" BOOLEAN NOT NULL DEFAULT false,
    "isRevenueRecognized" BOOLEAN NOT NULL DEFAULT false,
    "isBilled" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clientId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workPackageIds" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidityPeriod" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumPrice" DOUBLE PRECISION,
    "regularizationRate" DOUBLE PRECISION,
    "scopeUnit" TEXT NOT NULL DEFAULT 'HORAS',
    "regularizationType" TEXT,
    "surplusStrategy" TEXT,
    "rateEvolutivo" DOUBLE PRECISION,
    "billingType" TEXT,

    CONSTRAINT "ValidityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionModel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectionModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WPCorrection" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "correctionModelId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WPCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyMetric" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "consumedHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reportSentAt" TIMESTAMP(3),
    "reportSentBy" TEXT,

    CONSTRAINT "MonthlyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorklogDetail" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "issueKey" TEXT,
    "issueType" TEXT NOT NULL,
    "issueSummary" TEXT NOT NULL,
    "timeSpentHours" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "author" TEXT NOT NULL,
    "tipoImputacion" TEXT,
    "originWpId" TEXT,
    "issueCreatedDate" TIMESTAMP(3),
    "billingMode" TEXT,

    CONSTRAINT "WorklogDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "issueSummary" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reporter" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "billingMode" TEXT,
    "priority" TEXT,
    "slaResponse" TEXT,
    "slaResolution" TEXT,
    "slaResponseTime" TEXT,
    "slaResolutionTime" TEXT,
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "parentKey" TEXT,
    "originalEstimate" DOUBLE PRECISION,
    "component" TEXT,
    "clientJiraId" TEXT,
    "proDeliveryDate" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketStatusHistory" (
    "id" SERIAL NOT NULL,
    "issueKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "transitionDate" TIMESTAMP(3) NOT NULL,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "worklogIds" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "approvedIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT NOT NULL DEFAULT 'ADMIN,GERENTE',
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "appMessage" TEXT,
    "emailSubject" TEXT,
    "emailMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filename" TEXT,
    "totalRows" INTEGER,
    "processedCount" INTEGER,
    "errors" TEXT,
    "delimiter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutivoProposal" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "issueSummary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "assignee" TEXT,
    "reporter" TEXT,
    "components" TEXT,
    "priority" TEXT,
    "resolution" TEXT,
    "relatedTickets" TEXT,
    "issueCreatedDate" TIMESTAMP(3),
    "sentToGerenteDate" TIMESTAMP(3),
    "sentToClientDate" TIMESTAMP(3),
    "approvedDate" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutivoProposal_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "JiraUserRequest" (
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

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MassEmail" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "targetRoles" TEXT,
    "targetClients" TEXT,
    "targetWpTypes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "attachments" TEXT,

    CONSTRAINT "MassEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MassEmailRecipient" (
    "id" TEXT NOT NULL,
    "massEmailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "MassEmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryLanding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "allowedRoles" TEXT NOT NULL,
    "allowedClients" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemporaryLanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingView" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "jiraId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeklyCapacity" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT,
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityAssignment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "description" TEXT,
    "ticketKey" TEXT,
    "hours" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapacityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EVOLDailyMetric" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EVOLDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EVOLEvolutivoUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "jiraGestorName" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkedUserId" TEXT,

    CONSTRAINT "EVOLEvolutivoUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parameter_category_idx" ON "Parameter"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_key" ON "Client"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_locale_idx" ON "User"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectionModel_code_key" ON "CorrectionModel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyMetric_workPackageId_year_month_key" ON "MonthlyMetric"("workPackageId", "year", "month");

-- CreateIndex
CREATE INDEX "WorklogDetail_workPackageId_year_month_idx" ON "WorklogDetail"("workPackageId", "year", "month");

-- CreateIndex
CREATE INDEX "Ticket_workPackageId_year_month_idx" ON "Ticket"("workPackageId", "year", "month");

-- CreateIndex
CREATE INDEX "Ticket_proDeliveryDate_idx" ON "Ticket"("proDeliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_workPackageId_issueKey_key" ON "Ticket"("workPackageId", "issueKey");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_issueKey_type_idx" ON "TicketStatusHistory"("issueKey", "type");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_transitionDate_idx" ON "TicketStatusHistory"("transitionDate");

-- CreateIndex
CREATE INDEX "ReviewRequest_workPackageId_status_idx" ON "ReviewRequest"("workPackageId", "status");

-- CreateIndex
CREATE INDEX "ReviewRequest_requestedBy_idx" ON "ReviewRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ReviewRequest_status_createdAt_idx" ON "ReviewRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_type_key" ON "NotificationSetting"("type");

-- CreateIndex
CREATE UNIQUE INDEX "EvolutivoProposal_issueKey_key" ON "EvolutivoProposal"("issueKey");

-- CreateIndex
CREATE INDEX "EvolutivoProposal_clientId_idx" ON "EvolutivoProposal"("clientId");

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

-- CreateIndex
CREATE INDEX "JiraUserRequest_clientId_idx" ON "JiraUserRequest"("clientId");

-- CreateIndex
CREATE INDEX "JiraUserRequest_status_idx" ON "JiraUserRequest"("status");

-- CreateIndex
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemSetting_group_idx" ON "SystemSetting"("group");

-- CreateIndex
CREATE INDEX "MassEmailRecipient_massEmailId_idx" ON "MassEmailRecipient"("massEmailId");

-- CreateIndex
CREATE INDEX "MassEmailRecipient_userId_idx" ON "MassEmailRecipient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MassEmailRecipient_massEmailId_userId_key" ON "MassEmailRecipient"("massEmailId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryLanding_slug_key" ON "TemporaryLanding"("slug");

-- CreateIndex
CREATE INDEX "LandingView_landingId_idx" ON "LandingView"("landingId");

-- CreateIndex
CREATE INDEX "LandingView_userId_idx" ON "LandingView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_jiraId_key" ON "Team"("jiraId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_name_key" ON "TeamMember"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_linkedUserId_key" ON "TeamMember"("linkedUserId");

-- CreateIndex
CREATE INDEX "CapacityAssignment_memberId_idx" ON "CapacityAssignment"("memberId");

-- CreateIndex
CREATE INDEX "CapacityAssignment_startDate_endDate_idx" ON "CapacityAssignment"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "EVOLDailyMetric_date_key" ON "EVOLDailyMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EVOLEvolutivoUser_email_key" ON "EVOLEvolutivoUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EVOLEvolutivoUser_linkedUserId_key" ON "EVOLEvolutivoUser"("linkedUserId");

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regularization" ADD CONSTRAINT "Regularization_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidityPeriod" ADD CONSTRAINT "ValidityPeriod_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WPCorrection" ADD CONSTRAINT "WPCorrection_correctionModelId_fkey" FOREIGN KEY ("correctionModelId") REFERENCES "CorrectionModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WPCorrection" ADD CONSTRAINT "WPCorrection_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyMetric" ADD CONSTRAINT "MonthlyMetric_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorklogDetail" ADD CONSTRAINT "WorklogDetail_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutivoProposal" ADD CONSTRAINT "EvolutivoProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraOrganization" ADD CONSTRAINT "JiraOrganization_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "JiraOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraCustomerUser" ADD CONSTRAINT "JiraCustomerUser_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JiraUserRequest" ADD CONSTRAINT "JiraUserRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassEmail" ADD CONSTRAINT "MassEmail_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassEmailRecipient" ADD CONSTRAINT "MassEmailRecipient_massEmailId_fkey" FOREIGN KEY ("massEmailId") REFERENCES "MassEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MassEmailRecipient" ADD CONSTRAINT "MassEmailRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryLanding" ADD CONSTRAINT "TemporaryLanding_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingView" ADD CONSTRAINT "LandingView_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "TemporaryLanding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingView" ADD CONSTRAINT "LandingView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapacityAssignment" ADD CONSTRAINT "CapacityAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVOLEvolutivoUser" ADD CONSTRAINT "EVOLEvolutivoUser_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
