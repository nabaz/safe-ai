'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

interface XpAward {
  points: number
  reason: string
  id: string
}

interface XpToastProps {
  awards: XpAward[]
  leveledUp?: boolean
  newLevel?: number
  newLevelEmoji?: string
  newLevelTitle?: string
}

export function XpToast({ awards, leveledUp, newLevel, newLevelEmoji, newLevelTitle }: XpToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!visible || awards.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {/* Level up banner */}
      {leveledUp && (
        <div className="bg-yellow-400 text-yellow-900 font-bold px-5 py-3 rounded-2xl shadow-xl text-sm flex items-center gap-2 animate-bounce">
          <span className="text-xl">{newLevelEmoji}</span>
          Level up! Level {newLevel} — {newLevelTitle}
        </div>
      )}

      {/* XP awards */}
      {awards.map((award, i) => (
        <div
          key={award.id}
          className={cn(
            'bg-white border border-gray-100 shadow-lg rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2',
            'animate-in slide-in-from-right-4 fade-in duration-300'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span className="text-green-500 font-bold">+{award.points} XP</span>
          <span className="text-gray-500">{award.reason}</span>
        </div>
      ))}
    </div>
  )
}

// Hook to show XP toasts from any component
let toastCallback: ((awards: XpAward[], leveledUp?: boolean, level?: number, emoji?: string, title?: string) => void) | null = null

export function useXpToast() {
  const show = (
    awards: Array<{ points: number; reason: string }>,
    leveledUp = false,
    newLevel?: number,
    newLevelEmoji?: string,
    newLevelTitle?: string
  ) => {
    if (toastCallback) {
      toastCallback(
        awards.map((a, i) => ({ ...a, id: `${Date.now()}-${i}` })),
        leveledUp,
        newLevel,
        newLevelEmoji,
        newLevelTitle
      )
    }
  }
  return { show }
}
