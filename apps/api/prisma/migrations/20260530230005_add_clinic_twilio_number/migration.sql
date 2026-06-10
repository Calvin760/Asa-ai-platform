/*
  Warnings:

  - A unique constraint covering the columns `[twilioWhatsAppNumber]` on the table `clinics` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "twilioWhatsAppNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clinics_twilioWhatsAppNumber_key" ON "clinics"("twilioWhatsAppNumber");
