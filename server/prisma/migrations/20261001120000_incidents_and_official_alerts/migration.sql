-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('pending', 'verified', 'dismissed', 'resolved');

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_assignedResponderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_assignedResponderId_fkey";

-- AlterTable
ALTER TABLE "public"."Report" DROP COLUMN "assignedResponderId",
DROP COLUMN "isVerified",
DROP COLUMN "source",
DROP COLUMN "status",
ADD COLUMN     "imageVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "incidentId" INTEGER,
ADD COLUMN     "isCrisis" BOOLEAN;

-- DropTable
DROP TABLE "public"."FirstResponder";

-- DropTable
DROP TABLE "public"."Message";

-- DropTable
DROP TABLE "public"."SocialAlert";

-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" SERIAL NOT NULL,
    "crisisType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Low',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationName" TEXT,
    "firstReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" "public"."ReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "officialAlertId" INTEGER,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalAlert" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "crisisType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_crisisType_lastReportedAt_idx" ON "public"."Incident"("crisisType", "lastReportedAt");

-- CreateIndex
CREATE INDEX "ExternalAlert_eventTime_idx" ON "public"."ExternalAlert"("eventTime");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAlert_source_externalId_key" ON "public"."ExternalAlert"("source", "externalId");

-- CreateIndex
CREATE INDEX "Report_incidentId_idx" ON "public"."Report"("incidentId");

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_officialAlertId_fkey" FOREIGN KEY ("officialAlertId") REFERENCES "public"."ExternalAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

