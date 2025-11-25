-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "assignedResponderId" INTEGER,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "crisisType" TEXT,
ADD COLUMN     "entities" TEXT,
ADD COLUMN     "isCrisis" BOOLEAN DEFAULT false,
ADD COLUMN     "severity" TEXT;

-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "assignedResponderId" INTEGER;

-- CreateTable
CREATE TABLE "public"."FirstResponder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirstResponder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FirstResponder_badgeNumber_key" ON "public"."FirstResponder"("badgeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FirstResponder_email_key" ON "public"."FirstResponder"("email");

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "public"."FirstResponder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "public"."FirstResponder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
