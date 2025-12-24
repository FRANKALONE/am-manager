-- AlterTable
ALTER TABLE "Regularization" ADD COLUMN "ticketId" TEXT;
ALTER TABLE "Regularization" ADD COLUMN "note" TEXT;
ALTER TABLE "Regularization" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
