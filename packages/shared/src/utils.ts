import type { AgeTier } from './types'

/**
 * Calculate age tier from date of birth
 */
export function getAgeTierFromDOB(dateOfBirth: Date): AgeTier {
  const today = new Date()
  const age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  const adjustedAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
      ? age - 1
      : age

  if (adjustedAge <= 7) return 'EXPLORER'
  if (adjustedAge <= 11) return 'BUILDER'
  return 'CREATOR'
}

/**
 * Format minutes into h:mm display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Check if current time is within a blackout window
 */
export function isInBlackoutWindow(
  blackoutStart: string | null,
  blackoutEnd: string | null
): boolean {
  if (!blackoutStart || !blackoutEnd) return false

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = blackoutStart.split(':').map(Number)
  const [endH, endM] = blackoutEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  // Handle overnight windows (e.g. 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Generate a random 6-character child PIN (alphanumeric, easy to type)
 */
export function generateChildPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
