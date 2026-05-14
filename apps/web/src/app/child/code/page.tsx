import { getChildSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { prisma } from '@kidai/db'
import { CodeLabClient } from '@/components/child/code-lab/code-lab-client'
import { selectDailyLessons, getTodayDate, getTodayKey } from '@/components/child/code-lab/daily-engine'
import type { LessonTier } from '@/components/child/code-lab/curriculum'

export default async function CodeLabPage() {
  const session = await getChildSession()
  if (!session) redirect('/child')

  const { childId, tier } = session
  const today = getTodayDate()
  const dateKey = getTodayKey()

  // Load all completed lessons ever
  const allProgress = await prisma.codeLessonProgress.findMany({
    where: { childId },
    select: { lessonId: true },
  })
  const completedIds = allProgress.map(p => p.lessonId)

  // Get or create today's session
  let dailySession = await prisma.dailyCodeSession.findUnique({
    where: { childId_date: { childId, date: today } },
  })

  if (!dailySession) {
    const { lessons } = selectDailyLessons(childId, tier as LessonTier, completedIds, dateKey)
    dailySession = await prisma.dailyCodeSession.create({
      data: {
        childId,
        date: today,
        lessonIds: lessons.map(l => l.id),
        completedIds: [],
      },
    })
  }

  const todayCompletedIds = dailySession.lessonIds.filter(id => completedIds.includes(id))
  const dailyComplete = dailySession.lessonIds.every(id => completedIds.includes(id))

  return (
    <CodeLabClient
      session={session}
      completedIds={completedIds}
      todayLessonIds={dailySession.lessonIds}
      todayCompletedIds={todayCompletedIds}
      dailyComplete={dailyComplete}
      quizCompleted={dailySession.quizCompleted}
      quizScore={dailySession.quizScore ?? null}
    />
  )
}
