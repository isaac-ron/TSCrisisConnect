-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "crisisType" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
