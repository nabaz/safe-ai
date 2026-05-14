'use client'

import { cn } from '@/lib/cn'
import { CheckCircle, Lock } from 'lucide-react'
import type { Lesson, LessonTier } from './curriculum'
import { getLessonsForTier, getUnitsForTier } from './curriculum'

interface LessonSidebarProps {
  tier: LessonTier
  currentLessonId: string
  completedIds: string[]
  onSelect: (lesson: Lesson) => void
}

const TIER_THEME = {
  EXPLORER: { active: 'bg-green-500 text-white', dot: 'bg-green-500', unit: 'text-green-700' },
  BUILDER:  { active: 'bg-blue-500 text-white',  dot: 'bg-blue-500',  unit: 'text-blue-700'  },
  CREATOR:  { active: 'bg-purple-600 text-white', dot: 'bg-purple-600', unit: 'text-purple-700' },
}

export function LessonSidebar({ tier, currentLessonId, completedIds, onSelect }: LessonSidebarProps) {
  const theme = TIER_THEME[tier] ?? TIER_THEME.BUILDER
  const units = getUnitsForTier(tier)
  const lessons = getLessonsForTier(tier)

  return (
    <div className="flex flex-col h-full overflow-y-auto py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-3">
        Lessons
      </p>

      {units.map((unit) => {
        const unitLessons = lessons.filter((l) => l.unit === unit)
        return (
          <div key={unit} className="mb-4">
            <p className={`text-xs font-bold px-4 mb-1.5 ${theme.unit}`}>{unit}</p>
            {unitLessons.map((lesson, idx) => {
              const isActive = lesson.id === currentLessonId
              const isDone = completedIds.includes(lesson.id)
              // A lesson is locked if it's not the first in a unit and the previous isn't done
              const prevLesson = unitLessons[idx - 1]
              const isLocked = idx > 0 && prevLesson && !completedIds.includes(prevLesson.id)

              return (
                <button
                  key={lesson.id}
                  onClick={() => !isLocked && onSelect(lesson)}
                  disabled={!!isLocked}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all',
                    isActive ? theme.active : 'hover:bg-gray-50',
                    isLocked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className="text-base flex-shrink-0">{lesson.emoji}</span>
                  <span className={cn('flex-1 leading-tight', isActive ? 'font-semibold' : 'text-gray-700')}>
                    {lesson.title}
                  </span>
                  {isDone && !isActive && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                  {isLocked && <Lock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
