-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" TEXT NOT NULL DEFAULT 'FREELANCER',
    "planStatus" TEXT NOT NULL DEFAULT 'active',
    "dodoCustomerId" TEXT,
    "dodoSubscriptionId" TEXT,
    "currentPeriodEnd" DATETIME
);
INSERT INTO "new_Workspace" ("createdAt", "id", "name", "slug") SELECT "createdAt", "id", "name", "slug" FROM "Workspace";
DROP TABLE "Workspace";
ALTER TABLE "new_Workspace" RENAME TO "Workspace";
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
