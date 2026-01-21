/*
  Warnings:

  - Added the required column `billingType` to the `WorkPackage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EvolutivoProposal" ALTER COLUMN "sentToGerenteDate" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "sentToClientDate" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "approvedDate" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "proDeliveryDate" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "TicketStatusHistory" ALTER COLUMN "transitionDate" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "createdAt" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "WorkPackage" ADD COLUMN     "billingType" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Ticket_clientJiraId_idx" ON "Ticket"("clientJiraId");
