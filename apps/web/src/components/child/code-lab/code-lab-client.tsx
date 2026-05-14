'use client'

import { useState, useCallback } from 'react'
import { AGE_TIER_CONFIGS } from '@kidai/shared'
import type { ChildSessionPayload } from '@kidai/shared'
import { getLessonsForTier } from './curriculum'
import type { Lesson, LessonTier } from './curriculum'
import { DAILY_LESSON_COUNT } from './daily-engine'
import { LessonView } from './lesson-view'
import { DailyQuiz } from './daily-quiz'
import { MessageSquare, Menu, X, CheckCircle, Lock, Star, Trophy, Zap } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useRouter } from 'next/navigation'

interface Props {
  session: ChildSessionPayload
  completedIds: string[]
  todayLessonIds: string[]
  todayCompletedIds: string[]
  dailyComplete: boolean
  quizCompleted: boolean
  quizScore: number | null
}

const TIER_THEME = {
  EXPLORER: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
  BUILDER:  { bg: 'bg-blue-500',  light: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700'  },
  CREATOR:  { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
}

export function CodeLabClient({
  session,
  completedIds: initialCompletedIds,
  todayLessonIds,
  todayCompletedIds: initialTodayCompleted,
  dailyComplete: initialDailyComplete,
  quizCompleted: initialQuizCompleted,
  quizScore: initialQuizScore,
}: Props) {
  const router = useRouter()
  const tier = session.tier as LessonTier
  const theme = TIER_THEME[tier] ?? TIER_THEME.BUILDER
  const allLessons = getLessonsForTier(tier)

  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds)
  const [todayCompleted, setTodayCompleted] = useState<string[]>(initialTodayCompleted)
  const [dailyComplete, setDailyComplete] = useState(initialDailyComplete)
  const [quizCompleted, setQuizCompleted] = useState(initialQuizCompleted)
  const [quizScore, setQuizScore] = useState<number | null>(initialQuizScore)

  // Today's lessons in order, with the full Lesson objects
  const todayLessons = todayLessonIds
    .map(id => allLessons.find(l => l.id === id))
    .filter(Boolean) as Lesson[]

  const [view, setView] = useState<'today' | 'all' | 'quiz'>('today')
  const [currentLesson, setCurrentLesson] = useState<Lesson>(
    // Start on first incomplete today's lesson, or first lesson
    todayLessons.find(l => !initialTodayCompleted.includes(l.id)) ?? todayLessons[0] ?? allLessons[0]!
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const todayDoneCount = todayCompleted.length
  const totalDone = completedIds.length

  // Mark a lesson complete — calls API and updates local state
  const handleLessonComplete = useCallback(async (lessonId: string) => {
    if (completedIds.includes(lessonId)) return

    await fetch('/api/code-lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })

    const newCompleted = [...completedIds, lessonId]
    const newTodayCompleted = [...todayCompleted, ...(todayLessonIds.includes(lessonId) ? [lessonId] : [])]
    setCompletedIds(newCompleted)
    setTodayCompleted(newTodayCompleted)

    const allTodayDone = todayLessonIds.every(id => newCompleted.includes(id))
    if (allTodayDone) setDailyComplete(true)
  }, [completedIds, todayCompleted, todayLessonIds])

  // Move to next lesson in today's list
  const handleNext = useCallback(async () => {
    await handleLessonComplete(currentLesson.id)
    const currentIdx = todayLessons.findIndex(l => l.id === currentLesson.id)
    const nextIncomplete = todayLessons.find((l, i) => i > currentIdx && !completedIds.includes(l.id) && l.id !== currentLesson.id)
    if (nextIncomplete) {
      setCurrentLesson(nextIncomplete)
    } else if (dailyComplete || todayLessonIds.every(id => [...completedIds, currentLesson.id].includes(id))) {
      setView('today') // Show completion screen
    }
  }, [currentLesson, todayLessons, completedIds, handleLessonComplete, dailyComplete, todayLessonIds])

  const handleQuizComplete = (score: number) => {
    setQuizCompleted(true)
    setQuizScore(score)
    setView('today')
  }

  // Determine if a lesson is accessible:
  // - Today's lessons: accessible in order (complete prev to unlock next)
  // - All lessons: accessible if previous in same unit completed
  const isLessonAccessible = (lesson: Lesson, inToday: boolean): boolean => {
    if (completedIds.includes(lesson.id)) return true // already done = always accessible for review
    if (inToday) {
      const idx = todayLessons.findIndex(l => l.id === lesson.id)
      if (idx === 0) return true
      return todayCompleted.includes(todayLessons[idx - 1]!.id)
    }
    // In "all lessons" view — check sequential within unit
    const unitLessons = allLessons
      .filter(l => l.unit === lesson.unit)
      .sort((a, b) => a.unitIndex - b.unitIndex)
    const lessonIdx = unitLessons.findIndex(l => l.id === lesson.id)
    return lessonIdx === 0 || completedIds.includes(unitLessons[lessonIdx - 1]!.id)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className={`bg-white border-b ${theme.border} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(v => !v)} className="lg:hidden text-gray-400 hover:text-gray-700 mr-1">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-xl">💻</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">Code Lab</p>
            <p className="text-xs text-gray-400">{totalDone} lessons completed</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily progress pills */}
          <div className="hidden sm:flex items-center gap-1">
            {todayLessons.map((l, i) => (
              <div
                key={l.id}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  todayCompleted.includes(l.id) ? theme.bg : 'bg-gray-200'
                )}
                title={l.title}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">{todayDoneCount}/{DAILY_LESSON_COUNT}</span>
          </div>

          {/* Quiz badge — only when daily is done */}
          {dailyComplete && !quizCompleted && (
            <button
              onClick={() => setView('quiz')}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-xl transition-all animate-pulse"
            >
              <Star className="h-3.5 w-3.5" />
              Quiz time!
            </button>
          )}
          {quizCompleted && quizScore !== null && (
            <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1.5 rounded-xl">
              <Trophy className="h-3.5 w-3.5" />
              Quiz: {quizScore}/5
            </div>
          )}

          <Link href="/child" className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          'bg-white border-r border-gray-100 w-64 flex-shrink-0 flex flex-col',
          sidebarOpen ? 'flex absolute inset-y-0 left-0 z-20 shadow-xl mt-[57px]' : 'hidden lg:flex'
        )}>
          {/* View tabs */}
          <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
            {(['today', 'all'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setSidebarOpen(false) }}
                className={cn(
                  'flex-1 text-xs font-semibold py-2 rounded-lg transition-colors capitalize',
                  view === v ? `${theme.light} ${theme.text}` : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {v === 'today' ? "Today's 5" : 'All lessons'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-3">
            {view === 'today' || view === 'quiz' ? (
              /* Today's lesson list */
              <div>
                <p className="text-xs text-gray-400 px-4 mb-2 font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                {todayLessons.map((lesson, idx) => {
                  const done = todayCompleted.includes(lesson.id)
                  const accessible = isLessonAccessible(lesson, true)
                  const isActive = currentLesson.id === lesson.id && view !== 'quiz'
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        if (!accessible) return
                        setCurrentLesson(lesson)
                        setView('today')
                        setSidebarOpen(false)
                      }}
                      disabled={!accessible}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-all',
                        isActive ? `${theme.bg} text-white` : accessible ? 'hover:bg-gray-50 text-gray-700' : 'text-gray-300 cursor-not-allowed'
                      )}
                    >
                      <span className="text-base flex-shrink-0">{lesson.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-medium truncate', isActive ? 'text-white' : '')}>{lesson.title}</p>
                        <p className={cn('text-xs truncate', isActive ? 'text-white/70' : 'text-gray-400')}>{lesson.unit}</p>
                      </div>
                      {done
                        ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        : !accessible
                          ? <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                          : <div className={cn('w-2 h-2 rounded-full flex-shrink-0', theme.bg)} />
                      }
                    </button>
                  )
                })}

                {/* Quiz entry in sidebar */}
                {dailyComplete && (
                  <button
                    onClick={() => { setView('quiz'); setSidebarOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left text-sm mt-2 border-t border-gray-100 transition-all',
                      view === 'quiz' ? 'bg-yellow-400 text-yellow-900' : 'hover:bg-yellow-50 text-yellow-700'
                    )}
                  >
                    <span className="text-base">⭐</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold">Daily Quiz</p>
                      <p className="text-xs opacity-70">{quizCompleted ? `Score: ${quizScore}/5` : 'Optional · 5 questions'}</p>
                    </div>
                    {quizCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </button>
                )}
              </div>
            ) : (
              /* All lessons list */
              <AllLessonsNav
                lessons={allLessons}
                completedIds={completedIds}
                currentId={currentLesson.id}
                isAccessible={(l) => isLessonAccessible(l, false)}
                theme={theme}
                onSelect={(l) => { setCurrentLesson(l); setView('all'); setSidebarOpen(false) }}
              />
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 bg-black/20 z-10" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main area */}
        <main className="flex-1 overflow-hidden">
          {view === 'quiz' ? (
            <DailyQuiz
              tier={tier}
              alreadyCompleted={quizCompleted}
              savedScore={quizScore}
              onComplete={handleQuizComplete}
              onBack={() => setView('today')}
            />
          ) : dailyComplete && todayLessons.every(l => todayCompleted.includes(l.id)) && view === 'today'
              && currentLesson && todayCompleted.includes(currentLesson.id)
              && !todayLessons.find(l => !todayCompleted.includes(l.id)) ? (
            /* All today's lessons done — show completion screen */
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Today's done!</h2>
                <p className="text-gray-500 mb-6">You completed all 5 lessons for today. Come back tomorrow for 5 new ones!</p>
                <div className="flex flex-col gap-3">
                  {!quizCompleted && (
                    <button
                      onClick={() => setView('quiz')}
                      className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-2xl transition-all text-sm"
                    >
                      <Zap className="h-4 w-4" />
                      Take today's optional quiz!
                    </button>
                  )}
                  {quizCompleted && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800 font-medium">
                      Quiz done! Score: {quizScore}/5 ⭐
                    </div>
                  )}
                  <Link href="/child" className={`flex items-center justify-center gap-2 ${theme.bg} text-white font-semibold px-6 py-3 rounded-2xl text-sm`}>
                    <MessageSquare className="h-4 w-4" />
                    Back to chat
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <LessonView
              key={currentLesson.id}
              lesson={currentLesson}
              tier={tier}
              onNext={handleNext}
              isLast={todayLessons[todayLessons.length - 1]?.id === currentLesson.id}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ── All Lessons Nav ───────────────────────────────────────────────────────────
function AllLessonsNav({ lessons, completedIds, currentId, isAccessible, theme, onSelect }: {
  lessons: Lesson[]
  completedIds: string[]
  currentId: string
  isAccessible: (l: Lesson) => boolean
  theme: typeof TIER_THEME.BUILDER
  onSelect: (l: Lesson) => void
}) {
  const units = [...new Set(lessons.map(l => l.unit))]

  return (
    <div>
      {units.map(unit => {
        const unitLessons = lessons.filter(l => l.unit === unit).sort((a,b) => a.unitIndex - b.unitIndex)
        return (
          <div key={unit} className="mb-4">
            <p className={`text-xs font-bold px-4 mb-1 ${theme.text}`}>{unit}</p>
            {unitLessons.map(lesson => {
              const done = completedIds.includes(lesson.id)
              const accessible = isAccessible(lesson)
              const isActive = lesson.id === currentId
              return (
                <button
                  key={lesson.id}
                  onClick={() => accessible && onSelect(lesson)}
                  disabled={!accessible}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all',
                    isActive ? `${theme.bg} text-white` : accessible ? 'hover:bg-gray-50 text-gray-700' : 'text-gray-300 cursor-not-allowed'
                  )}
                >
                  <span className="text-sm flex-shrink-0">{lesson.emoji}</span>
                  <span className={cn('flex-1 text-xs truncate', isActive ? 'font-semibold' : '')}>{lesson.title}</span>
                  {done ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        : !accessible ? <Lock className="h-3 w-3 flex-shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
