-- CreateTable
CREATE TABLE "code_lesson_progress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_code_sessions" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lessonIds" TEXT[],
    "completedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quizCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizScore" INTEGER,

    CONSTRAINT "daily_code_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "code_lesson_progress_childId_lessonId_key" ON "code_lesson_progress"("childId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_code_sessions_childId_date_key" ON "daily_code_sessions"("childId", "date");

-- AddForeignKey
ALTER TABLE "code_lesson_progress" ADD CONSTRAINT "code_lesson_progress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_code_sessions" ADD CONSTRAINT "daily_code_sessions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "child_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
