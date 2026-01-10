-- Migration: Add Mass Emails and Landing Pages tables
-- Execute this SQL in Neon SQL Editor

-- Create MassEmail table
CREATE TABLE IF NOT EXISTS "MassEmail" (
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

    CONSTRAINT "MassEmail_pkey" PRIMARY KEY ("id")
);

-- Create MassEmailRecipient table
CREATE TABLE IF NOT EXISTS "MassEmailRecipient" (
    "id" TEXT NOT NULL,
    "massEmailId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "MassEmailRecipient_pkey" PRIMARY KEY ("id")
);

-- Create TemporaryLanding table
CREATE TABLE IF NOT EXISTS "TemporaryLanding" (
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

-- Create LandingView table
CREATE TABLE IF NOT EXISTS "LandingView" (
    "id" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingView_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "MassEmail" ADD CONSTRAINT "MassEmail_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MassEmailRecipient" ADD CONSTRAINT "MassEmailRecipient_massEmailId_fkey" 
    FOREIGN KEY ("massEmailId") REFERENCES "MassEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MassEmailRecipient" ADD CONSTRAINT "MassEmailRecipient_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemporaryLanding" ADD CONSTRAINT "TemporaryLanding_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LandingView" ADD CONSTRAINT "LandingView_landingId_fkey" 
    FOREIGN KEY ("landingId") REFERENCES "TemporaryLanding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LandingView" ADD CONSTRAINT "LandingView_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraints
ALTER TABLE "MassEmailRecipient" ADD CONSTRAINT "MassEmailRecipient_massEmailId_userId_key" 
    UNIQUE ("massEmailId", "userId");

ALTER TABLE "TemporaryLanding" ADD CONSTRAINT "TemporaryLanding_slug_key" 
    UNIQUE ("slug");

-- Create indexes
CREATE INDEX IF NOT EXISTS "MassEmailRecipient_massEmailId_idx" ON "MassEmailRecipient"("massEmailId");
CREATE INDEX IF NOT EXISTS "MassEmailRecipient_userId_idx" ON "MassEmailRecipient"("userId");
CREATE INDEX IF NOT EXISTS "LandingView_landingId_idx" ON "LandingView"("landingId");
CREATE INDEX IF NOT EXISTS "LandingView_userId_idx" ON "LandingView"("userId");

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as mass_emails FROM "MassEmail";
SELECT COUNT(*) as mass_email_recipients FROM "MassEmailRecipient";
SELECT COUNT(*) as temporary_landings FROM "TemporaryLanding";
SELECT COUNT(*) as landing_views FROM "LandingView";
