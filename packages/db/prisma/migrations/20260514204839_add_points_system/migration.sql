-- CreateEnum
CREATE TYPE "PointsReason" AS ENUM ('LESSON_COMPLETE', 'LESSON_REVIEW', 'DAILY_BONUS', 'QUIZ_CORRECT', 'QUIZ_PERFECT', 'WELCOME_BONUS', 'CHALLENGE_COMPLETE');

-- CreateTable
CREATE TABLE "points_ledger" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" "PointsReason" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
