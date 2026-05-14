import { prisma } from '@kidai/db'
import type { PointsReason } from '@kidai/db'

// ── Point values ──────────────────────────────────────────────────────────────

export const POINTS = {
  LESSON_COMPLETE:    10,
  LESSON_REVIEW:       3,
  DAILY_BONUS:        25,
  QUIZ_CORRECT:       10,
  QUIZ_PERFECT:       30,
  WELCOME_BONUS:      15,
  CHALLENGE_COMPLETE: 50,
} as const satisfies Record<PointsReason, number>

export const XP_PER_LEVEL = 100

// ── Level metadata ────────────────────────────────────────────────────────────

export interface LevelInfo {
  level: number
  title: string
  emoji: string
  minXp: number
  maxXp: number       // XP needed to reach NEXT level
  xpIntoLevel: number // progress within current level
  progressPct: number // 0-100
}

const LEVEL_TITLES = [
  { emoji: '🌱', title: 'Seedling'    },  // 1
  { emoji: '🌿', title: 'Sprout'      },  // 2
  { emoji: '🔍', title: 'Explorer'    },  // 3
  { emoji: '⚡', title: 'Spark'       },  // 4
  { emoji: '🔧', title: 'Builder'     },  // 5
  { emoji: '🚀', title: 'Launcher'    },  // 6
  { emoji: '💡', title: 'Inventor'    },  // 7
  { emoji: '🌟', title: 'Star Coder'  },  // 8
  { emoji: '🏆', title: 'Champion'    },  // 9
  { emoji: '🦄', title: 'Wizard'      },  // 10+
]

export function getLevelInfo(totalXp: number): LevelInfo {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1
  const minXp = (level - 1) * XP_PER_LEVEL
  const maxXp = level * XP_PER_LEVEL
  const xpIntoLevel = totalXp - minXp
  const progressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100)
  const meta = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]!

  return { level, title: meta.title, emoji: meta.emoji, minXp, maxXp, xpIntoLevel, progressPct }
}

// ── Award points ──────────────────────────────────────────────────────────────

export async function awardPoints(params: {
  childId: string
  reason: PointsReason
  description: string
    metadata?: Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ awarded: number; totalXp: number; levelInfo: LevelInfo; leveledUp: boolean }> {
  const points = POINTS[params.reason]

  // Get current total before
  const before = await getTotalXp(params.childId)
  const levelBefore = getLevelInfo(before)

  await prisma.pointsLedger.create({
    data: {
      childId: params.childId,
      points,
      reason: params.reason,
      description: params.description,
      metadata: (params.metadata ?? {}) as object,
    },
  })

  const after = before + points
  const levelAfter = getLevelInfo(after)
  const leveledUp = levelAfter.level > levelBefore.level

  return { awarded: points, totalXp: after, levelInfo: levelAfter, leveledUp }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export async function getTotalXp(childId: string): Promise<number> {
  const result = await prisma.pointsLedger.aggregate({
    where: { childId },
    _sum: { points: true },
  })
  return result._sum.points ?? 0
}

export async function getPointsHistory(childId: string, limit = 20) {
  return prisma.pointsLedger.findMany({
    where: { childId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      points: true,
      reason: true,
      description: true,
      createdAt: true,
    },
  })
}

export async function getChildStats(childId: string) {
  const [totalXp, history, lessonCount, dailySessions] = await Promise.all([
    getTotalXp(childId),
    getPointsHistory(childId, 5),
    prisma.codeLessonProgress.count({ where: { childId } }),
    prisma.dailyCodeSession.count({ where: { childId, quizCompleted: true } }),
  ])

  return {
    totalXp,
    levelInfo: getLevelInfo(totalXp),
    recentHistory: history,
    lessonsCompleted: lessonCount,
    quizzesCompleted: dailySessions,
  }
}
