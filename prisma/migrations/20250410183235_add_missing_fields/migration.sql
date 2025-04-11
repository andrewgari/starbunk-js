/*
  Warnings:

  - Added the required column `system` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `StoredFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `StoredFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "adventureId" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "system" TEXT NOT NULL,
ADD COLUMN     "voiceChannelId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "messageId" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Message_messageId_idx" ON "Message"("messageId");
