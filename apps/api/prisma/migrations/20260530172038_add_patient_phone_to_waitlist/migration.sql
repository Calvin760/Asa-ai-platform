/*
  Warnings:

  - Added the required column `expiresAt` to the `WaitlistEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientName` to the `WaitlistEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredTime` to the `WaitlistEntry` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `appointmentType` on the `WaitlistEntry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "patientName" TEXT NOT NULL,
ADD COLUMN     "patientPhone" TEXT,
ADD COLUMN     "preferredDays" TEXT[],
ADD COLUMN     "preferredTime" TEXT NOT NULL,
ADD COLUMN     "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
ALTER COLUMN "patientId" DROP NOT NULL,
DROP COLUMN "appointmentType",
ADD COLUMN     "appointmentType" TEXT NOT NULL;
