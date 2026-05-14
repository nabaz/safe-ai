import { prisma } from '@kidai/db'
import { isInBlackoutWindow } from '@kidai/shared'

/**
 * Get today's usage in minutes for a child
 */
export async function getTodayUsageMinutes(childId: string): Promise<number> {
  const today = getDateOnly(new Date())

  const log = await prisma.dailyUsageLog.findUnique({
    where: { childId_date: { childId, date: today } },
  })

  return log?.minutesUsed ?? 0
}

/**
 * Increment usage by the given minutes (upsert today's log)
 */
export async function incrementUsage(childId: string, minutes: number): Promise<void> {
  const today = getDateOnly(new Date())

  await prisma.dailyUsageLog.upsert({
    where: { childId_date: { childId, date: today } },
    create: { childId, date: today, minutesUsed: minutes },
    update: { minutesUsed: { increment: minutes } },
  })
}

/**
 * Check if a child is allowed to use the app right now
 * Returns an object with allowed status and reason if blocked
 */
export async function checkAccessAllowed(childId: string): Promise<{
  allowed: boolean
  reason?: 'paused' | 'daily_limit' | 'blackout'
}> {
  const child = await prisma.childProfile.findUnique({
    where: { id: childId },
    select: {
      isPaused: true,
      dailyLimitMinutes: true,
      blackoutStart: true,
      blackoutEnd: true,
    },
  })

  if (!child) return { allowed: false, reason: 'paused' }

  if (child.isPaused) {
    return { allowed: false, reason: 'paused' }
  }

  if (isInBlackoutWindow(child.blackoutStart, child.blackoutEnd)) {
    return { allowed: false, reason: 'blackout' }
  }

  const minutesUsed = await getTodayUsageMinutes(childId)
  if (minutesUsed >= child.dailyLimitMinutes) {
    return { allowed: false, reason: 'daily_limit' }
  }

  return { allowed: true }
}

/**
 * Normalize a Date to midnight UTC for daily log grouping
 */
function getDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}
