/*
  Warnings:

  - You are about to drop the column `channelId` on the `Campaign` table. All the data in the column will be lost.
  - Added the required column `textChannelId` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voiceChannelId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "textChannelId" TEXT NOT NULL,
    "voiceChannelId" TEXT NOT NULL,
    "gmId" TEXT NOT NULL,
    "adventureId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Campaign" ("adventureId", "createdAt", "gmId", "id", "isActive", "metadata", "name", "system", "updatedAt") SELECT "adventureId", "createdAt", "gmId", "id", "isActive", "metadata", "name", "system", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
