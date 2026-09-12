-- DropIndex
DROP INDEX "Activity_workspaceId_idx";

-- DropIndex
DROP INDEX "Content_projectId_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- AlterTable
ALTER TABLE "ContentVersion" ADD COLUMN "height" INTEGER;
ALTER TABLE "ContentVersion" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "ContentVersion" ADD COLUMN "width" INTEGER;

-- CreateTable
CREATE TABLE "MediaSlide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'image',
    "width" INTEGER,
    "height" INTEGER,
    "posterUrl" TEXT,
    CONSTRAINT "MediaSlide_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContentVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "uploaderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "width" INTEGER,
    "height" INTEGER,
    "aspectRatio" TEXT,
    "durationSec" REAL,
    "posterUrl" TEXT,
    "sha256" TEXT,
    CONSTRAINT "Asset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("clientId", "createdAt", "id", "mimeType", "name", "projectId", "size", "uploaderId", "url", "workspaceId") SELECT "clientId", "createdAt", "id", "mimeType", "name", "projectId", "size", "uploaderId", "url", "workspaceId" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE INDEX "Asset_workspaceId_idx" ON "Asset"("workspaceId");
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");
CREATE INDEX "Asset_sha256_idx" ON "Asset"("sha256");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MediaSlide_versionId_idx" ON "MediaSlide"("versionId");

-- CreateIndex
CREATE INDEX "Activity_workspaceId_createdAt_idx" ON "Activity"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Content_projectId_status_idx" ON "Content"("projectId", "status");

-- CreateIndex
CREATE INDEX "Content_updatedAt_idx" ON "Content"("updatedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
