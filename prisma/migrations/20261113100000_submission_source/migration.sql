-- AlterTable: where a submission came from. Existing rows are website submissions.
ALTER TABLE "FormSubmission" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'website';
