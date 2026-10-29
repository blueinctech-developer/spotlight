-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "footerVariant" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "headerVariant" TEXT NOT NULL DEFAULT 'light';
