-- CreateTable
CREATE TABLE "public"."SocialAlert" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "extractedLocation" TEXT,
    "severity" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "SocialAlert_pkey" PRIMARY KEY ("id")
);
