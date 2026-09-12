-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'GEMINI',
    "model" TEXT,
    "geminiKeyEnc" TEXT,
    "openrouterKeyEnc" TEXT,
    "featCaption" BOOLEAN NOT NULL DEFAULT true,
    "featChecklist" BOOLEAN NOT NULL DEFAULT true,
    "featAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSettings_workspaceId_key" ON "AiSettings"("workspaceId");
