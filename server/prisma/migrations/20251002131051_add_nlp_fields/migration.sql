/*
  Warnings:

  - A unique constraint covering the columns `[badgeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "extractedLocation" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "severity" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'direct_report',
ALTER COLUMN "location" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "badgeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_badgeId_key" ON "public"."User"("badgeId");
