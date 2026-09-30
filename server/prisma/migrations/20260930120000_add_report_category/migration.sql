-- Category was previously written into "status"; move it to its own column
ALTER TABLE "Report" ADD COLUMN "category" TEXT;

UPDATE "Report" SET "category" = "status", "status" = 'pending' WHERE "status" <> 'pending';
