-- CreateTable
CREATE TABLE "ChannelBridge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceChannelId" TEXT NOT NULL,
    "targetChannelId" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Blacklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Blacklist_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Blacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Blacklist" ("createdAt", "guildId", "id", "userId") SELECT "createdAt", "guildId", "id", "userId" FROM "Blacklist";
DROP TABLE "Blacklist";
ALTER TABLE "new_Blacklist" RENAME TO "Blacklist";
CREATE UNIQUE INDEX "Blacklist_guildId_userId_key" ON "Blacklist"("guildId", "userId");
CREATE TABLE "new_UserOnGuild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    CONSTRAINT "UserOnGuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserOnGuild_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserOnGuild" ("guildId", "id", "userId") SELECT "guildId", "id", "userId" FROM "UserOnGuild";
DROP TABLE "UserOnGuild";
ALTER TABLE "new_UserOnGuild" RENAME TO "UserOnGuild";
CREATE UNIQUE INDEX "UserOnGuild_userId_guildId_key" ON "UserOnGuild"("userId", "guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ChannelBridge_sourceChannelId_targetChannelId_key" ON "ChannelBridge"("sourceChannelId", "targetChannelId");

-- Seed initial channel bridges from snowbunkClient.ts
-- Testing channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '757866614787014660', '856617421942030364', 'testing', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '757866614787014660', '798613445301633137', 'testing', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '856617421942030364', '757866614787014660', 'testing', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '856617421942030364', '798613445301633137', 'testing', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '798613445301633137', '757866614787014660', 'testing', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '798613445301633137', '856617421942030364', 'testing', true, CURRENT_TIMESTAMP);

-- Starbunk channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '755579237934694420', '755585038388691127', 'starbunk', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '755585038388691127', '755579237934694420', 'starbunk', true, CURRENT_TIMESTAMP);

-- Memes channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '753251583084724371', '697341904873979925', 'memes', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '697341904873979925', '753251583084724371', 'memes', true, CURRENT_TIMESTAMP);

-- FF14 General channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '754485972774944778', '696906700627640352', 'ff14-general', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '696906700627640352', '754485972774944778', 'ff14-general', true, CURRENT_TIMESTAMP);

-- FF14 MSQ channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '697342576730177658', '753251583084724372', 'ff14-msq', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '753251583084724372', '697342576730177658', 'ff14-msq', true, CURRENT_TIMESTAMP);

-- Screenshots channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '753251583286050926', '755575759753576498', 'screenshots', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '755575759753576498', '753251583286050926', 'screenshots', true, CURRENT_TIMESTAMP);

-- Raiding channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '753251583286050928', '699048771308224642', 'raiding', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '699048771308224642', '753251583286050928', 'raiding', true, CURRENT_TIMESTAMP);

-- Food channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '696948268579553360', '755578695011270707', 'food', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '755578695011270707', '696948268579553360', 'food', true, CURRENT_TIMESTAMP);

-- Pets channels
INSERT INTO "ChannelBridge" ("id", "sourceChannelId", "targetChannelId", "name", "isActive", "updatedAt") VALUES
(lower(hex(randomblob(16))), '696948305586028544', '755578835122126898', 'pets', true, CURRENT_TIMESTAMP),
(lower(hex(randomblob(16))), '755578835122126898', '696948305586028544', 'pets', true, CURRENT_TIMESTAMP);
