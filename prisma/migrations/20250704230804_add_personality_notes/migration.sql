-- CreateTable
CREATE TABLE "PersonalityNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokens" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalityNote_category_idx" ON "PersonalityNote"("category");

-- CreateIndex
CREATE INDEX "PersonalityNote_priority_idx" ON "PersonalityNote"("priority");

-- CreateIndex
CREATE INDEX "PersonalityNote_isActive_idx" ON "PersonalityNote"("isActive");
