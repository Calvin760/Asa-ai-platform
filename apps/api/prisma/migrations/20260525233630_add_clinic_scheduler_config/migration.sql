-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderHoursAhead" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "reminderSchedule" TEXT NOT NULL DEFAULT '0 8 * * *';
