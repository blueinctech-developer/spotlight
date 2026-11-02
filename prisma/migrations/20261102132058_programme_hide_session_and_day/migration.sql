-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "hiddenDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "EventSession" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;
