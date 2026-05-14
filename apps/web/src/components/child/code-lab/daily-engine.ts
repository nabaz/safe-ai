import { getLessonsForTier } from './curriculum'
import type { Lesson, LessonTier } from './curriculum'

export const DAILY_LESSON_COUNT = 5

/**
 * Get today's date key as YYYY-MM-DD (UTC)
 */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Get midnight UTC Date for today (for DB storage)
 */
export function getTodayDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Deterministic seeded shuffle — same childId + date always gives same order.
 * Uses a simple LCG (linear congruential generator).
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr]
  let s = seed
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * Generate a numeric seed from a string (childId + date)
 */
function strToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Pick today's 5 lessons for a child.
 *
 * Rules:
 * 1. Only lessons the child has not yet completed are eligible.
 * 2. Lessons must be in sequential order — a lesson is only eligible
 *    if all previous lessons in the same unit are completed.
 * 3. From the eligible pool, pick 5 deterministically by date+childId.
 * 4. If fewer than 5 eligible lessons remain, include already-completed
 *    ones as review (marked differently).
 */
export function selectDailyLessons(
  childId: string,
  tier: LessonTier,
  completedLessonIds: string[],
  dateKey: string = getTodayKey()
): { lessons: Lesson[]; isReview: boolean[] } {
  const allLessons = getLessonsForTier(tier)
  const completedSet = new Set(completedLessonIds)

  // Build sequential eligibility — group by unit, unlock one at a time
  const unitMap = new Map<string, Lesson[]>()
  for (const lesson of allLessons) {
    if (!unitMap.has(lesson.unit)) unitMap.set(lesson.unit, [])
    unitMap.get(lesson.unit)!.push(lesson)
  }

  const eligible: Lesson[] = []

  for (const [, unitLessons] of unitMap) {
    // Sort by unitIndex
    const sorted = [...unitLessons].sort((a, b) => a.unitIndex - b.unitIndex)
    for (let i = 0; i < sorted.length; i++) {
      const lesson = sorted[i]!
      if (completedSet.has(lesson.id)) continue // already done
      // Check all previous in this unit are complete
      const allPrevDone = sorted.slice(0, i).every(prev => completedSet.has(prev.id))
      if (allPrevDone) {
        eligible.push(lesson)
        // Only surface the NEXT unlocked lesson per unit — not all at once
        break
      }
    }
  }

  const seed = strToSeed(childId + dateKey)
  const shuffled = seededShuffle(eligible, seed)
  const picked = shuffled.slice(0, DAILY_LESSON_COUNT)
  const isReview = picked.map(() => false)

  // If fewer than 5, pad with review lessons (already completed, shuffled)
  if (picked.length < DAILY_LESSON_COUNT) {
    const completed = allLessons.filter(l => completedSet.has(l.id))
    const shuffledCompleted = seededShuffle(completed, seed + 1)
    const needed = DAILY_LESSON_COUNT - picked.length
    const reviewLessons = shuffledCompleted.slice(0, needed)
    picked.push(...reviewLessons)
    isReview.push(...reviewLessons.map(() => true))
  }

  return { lessons: picked, isReview }
}

/**
 * Check if today's 5 lessons are all done
 */
export function isDailyComplete(
  todayLessonIds: string[],
  completedIds: string[]
): boolean {
  const completedSet = new Set(completedIds)
  return todayLessonIds.every(id => completedSet.has(id))
}
