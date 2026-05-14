'use client'

import { cn } from '@/lib/cn'
import type { LevelInfo } from '@/lib/points'

interface XpBarProps {
  levelInfo: LevelInfo
  totalXp: number
  theme: { bg: string; light: string; text: string; border: string }
  compact?: boolean
}

export function XpBar({ levelInfo, totalXp, theme, compact = false }: XpBarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base">{levelInfo.emoji}</span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${theme.text}`}>Lv.{levelInfo.level}</span>
            <span className="text-xs text-gray-400 truncate">{totalXp} XP</span>
          </div>
          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${theme.bg} rounded-full transition-all duration-500`}
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme.light} ${theme.border} border rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{levelInfo.emoji}</span>
          <div>
            <p className={`font-bold text-sm ${theme.text}`}>Level {levelInfo.level} — {levelInfo.title}</p>
            <p className="text-xs text-gray-500">{totalXp} XP total</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{levelInfo.xpIntoLevel} / {100} XP</p>
          <p className="text-xs text-gray-400">to next level</p>
        </div>
      </div>

      <div className="h-3 bg-white rounded-full overflow-hidden border border-gray-100">
        <div
          className={`h-full ${theme.bg} rounded-full transition-all duration-700`}
          style={{ width: `${levelInfo.progressPct}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">Lv.{levelInfo.level}</span>
        <span className={`text-xs font-semibold ${theme.text}`}>{levelInfo.progressPct}%</span>
        <span className="text-xs text-gray-400">Lv.{levelInfo.level + 1}</span>
      </div>
    </div>
  )
}
