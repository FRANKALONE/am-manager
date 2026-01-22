-- Add reviewedForDuplicates field to Regularization table
-- This field tracks which manual consumptions have been reviewed by the user
-- to avoid showing them repeatedly as duplicates

ALTER TABLE "Regularization" 
ADD COLUMN "reviewedForDuplicates" BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX "Regularization_reviewedForDuplicates_idx" 
ON "Regularization"("reviewedForDuplicates");
