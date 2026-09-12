-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "archivePath" TEXT;
ALTER TABLE "Asset" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Asset" ADD COLUMN "lastAccessedAt" DATETIME;
