import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { getChildSession } from '@/lib/session'
import { selectDailyLessons, getTodayDate, getTodayKey } from '@/components/child/code-lab/daily-engine'
import type { LessonTier } from '@/components/child/code-lab/curriculum'

/**
 * GET /api/code-lab
 * Returns the child's full code lab state:
 * - All completed lesson IDs (ever)
 * - Today's 5 assigned lessons
 * - Today's completed count
 * - Whether today's quiz is available + completed
 */
export async function GET() {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // Recompute which of today's lessons are now completed
  const todayCompletedIds = dailySession.lessonIds.filter(id => completedIds.includes(id))
  if (todayCompletedIds.length !== dailySession.completedIds.length) {
    await prisma.dailyCodeSession.update({
      where: { id: dailySession.id },
      data: { completedIds: todayCompletedIds },
    })
    dailySession.completedIds = todayCompletedIds
  }

  const dailyComplete = dailySession.lessonIds.every(id => completedIds.includes(id))

  return NextResponse.json({
    completedIds,
    today: {
      lessonIds: dailySession.lessonIds,
      completedIds: dailySession.completedIds,
      dailyComplete,
      quizAvailable: dailyComplete,
      quizCompleted: dailySession.quizCompleted,
      quizScore: dailySession.quizScore,
    },
  })
}

/**
 * POST /api/code-lab
 * Mark a lesson as complete
 */
export async function POST(req: NextRequest) {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId } = session
  const { lessonId } = await req.json()
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  // Upsert progress record
  await prisma.codeLessonProgress.upsert({
    where: { childId_lessonId: { childId, lessonId } },
    create: { childId, lessonId },
    update: {},
  })

  // Update today's session
  const today = getTodayDate()
  const dailySession = await prisma.dailyCodeSession.findUnique({
    where: { childId_date: { childId, date: today } },
  })

  if (dailySession && !dailySession.completedIds.includes(lessonId)) {
    const updatedCompleted = [...dailySession.completedIds, lessonId]
    await prisma.dailyCodeSession.update({
      where: { id: dailySession.id },
      data: { completedIds: updatedCompleted },
    })
  }

  return NextResponse.json({ success: true })
}
