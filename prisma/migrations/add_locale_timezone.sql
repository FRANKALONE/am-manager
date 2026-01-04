-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_locale_idx" ON "User"("locale");

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'es';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';
