/*
  Warnings:

  - You are about to drop the column `channelId` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `dmId` on the `Campaign` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[textChannelId,guildId]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gmId` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `textChannelId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Campaign_channelId_guildId_key";

-- DropIndex
DROP INDEX "Campaign_dmId_idx";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "channelId",
DROP COLUMN "dmId",
ADD COLUMN     "gmId" TEXT NOT NULL,
ADD COLUMN     "textChannelId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Campaign_gmId_idx" ON "Campaign"("gmId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_textChannelId_guildId_key" ON "Campaign"("textChannelId", "guildId");
