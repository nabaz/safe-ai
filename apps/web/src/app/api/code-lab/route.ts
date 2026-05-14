import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { getChildSession } from '@/lib/session'
import { selectDailyLessons, getTodayDate, getTodayKey, DAILY_LESSON_COUNT } from '@/components/child/code-lab/daily-engine'
import type { LessonTier } from '@/components/child/code-lab/curriculum'
import { getLessonById } from '@/components/child/code-lab/curriculum'
import { awardPoints, getTotalXp, getLevelInfo, POINTS } from '@/lib/points'

export async function GET() {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, tier } = session
  const today = getTodayDate()
  const dateKey = getTodayKey()

  const allProgress = await prisma.codeLessonProgress.findMany({
    where: { childId },
    select: { lessonId: true },
  })
  const completedIds = allProgress.map(p => p.lessonId)

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
  if (todayCompletedIds.length !== dailySession.completedIds.length) {
    await prisma.dailyCodeSession.update({
      where: { id: dailySession.id },
      data: { completedIds: todayCompletedIds },
    })
    dailySession.completedIds = todayCompletedIds
  }

  const dailyComplete = dailySession.lessonIds.every(id => completedIds.includes(id))
  const totalXp = await getTotalXp(childId)

  return NextResponse.json({
    completedIds,
    totalXp,
    levelInfo: getLevelInfo(totalXp),
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

export async function POST(req: NextRequest) {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId } = session
  const { lessonId } = await req.json()
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  // Check if already completed (review vs first time)
  const existing = await prisma.codeLessonProgress.findUnique({
    where: { childId_lessonId: { childId, lessonId } },
  })
  const isFirstTime = !existing

  // Upsert lesson progress
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

  let dailyBonusAwarded = false

  if (dailySession && !dailySession.completedIds.includes(lessonId)) {
    const updatedCompleted = [...dailySession.completedIds, lessonId]
    await prisma.dailyCodeSession.update({
      where: { id: dailySession.id },
      data: { completedIds: updatedCompleted },
    })

    // Check if this completes today's daily set
    if (updatedCompleted.length === DAILY_LESSON_COUNT &&
        dailySession.lessonIds.every(id => updatedCompleted.includes(id))) {
      dailyBonusAwarded = true
    }
  }

  const lesson = getLessonById(lessonId)

  // Check if this is the very first lesson ever (welcome bonus)
  const totalPrevious = await prisma.codeLessonProgress.count({ where: { childId } })
  const isWelcome = totalPrevious === 1 // just created above

  const awards: Array<{ points: number; reason: string }> = []

  if (isWelcome) {
    const r = await awardPoints({ childId, reason: 'WELCOME_BONUS', description: 'Welcome to Code Lab! 🎉' })
    awards.push({ points: r.awarded, reason: 'Welcome bonus!' })
  }

  if (isFirstTime) {
    const r = await awardPoints({
      childId,
      reason: 'LESSON_COMPLETE',
      description: `Completed lesson: ${lesson?.title ?? lessonId}`,
      metadata: { lessonId },
    })
    awards.push({ points: r.awarded, reason: `Lesson complete +${POINTS.LESSON_COMPLETE} XP` })
  } else {
    const r = await awardPoints({
      childId,
      reason: 'LESSON_REVIEW',
      description: `Reviewed lesson: ${lesson?.title ?? lessonId}`,
      metadata: { lessonId },
    })
    awards.push({ points: r.awarded, reason: `Review +${POINTS.LESSON_REVIEW} XP` })
  }

  if (dailyBonusAwarded) {
    const r = await awardPoints({
      childId,
      reason: 'DAILY_BONUS',
      description: 'Completed all 5 daily lessons! 🔥',
    })
    awards.push({ points: r.awarded, reason: `Daily bonus +${POINTS.DAILY_BONUS} XP` })
  }

  const totalXp = await getTotalXp(childId)
  const levelInfo = getLevelInfo(totalXp)

  return NextResponse.json({ success: true, awards, totalXp, levelInfo })
}
