-- CreateTable
CREATE TABLE "BotFrequency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "botName" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BotFrequency_botName_key" ON "BotFrequency"("botName");
