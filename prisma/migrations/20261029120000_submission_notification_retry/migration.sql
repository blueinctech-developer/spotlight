
-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "notifyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notifyLastAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_dedupeKey_key" ON "FormSubmission"("dedupeKey");

-- CreateIndex
CREATE INDEX "FormSubmission_notifiedAt_notifyAttempts_idx" ON "FormSubmission"("notifiedAt", "notifyAttempts");
