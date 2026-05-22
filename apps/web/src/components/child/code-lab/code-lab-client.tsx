'use client'

import { useState, useCallback, useEffect } from 'react'
import { AGE_TIER_CONFIGS } from '@kidai/shared'
import type { ChildSessionPayload } from '@kidai/shared'
import { getLessonsForTier } from './curriculum'
import type { Lesson, LessonTier } from './curriculum'
import { DAILY_LESSON_COUNT } from './daily-engine'
import { LessonView } from './lesson-view'
import { DailyQuiz } from './daily-quiz'
import { XpBar } from './xp-bar'
import { MessageSquare, Menu, X, CheckCircle, Lock, Star, Trophy, Zap, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import toast from 'react-hot-toast'
import type { LevelInfo } from '@/lib/points'

// Unified challenge type — works for both static lessons and AI-generated challenges
interface DailyChallenge {
  id: string
  subject: 'coding' | 'math'
  title: string
  emoji: string
  realWorldUse: string
  concept: string
  example: string
  challenge: string
  starterCode: string
  solutionCode: string
  expectedOutput: string
  hints: string[]
  unit?: string
  unitIndex?: number
  tier?: LessonTier
}

interface Props {
  session: ChildSessionPayload
  completedIds: string[]
  todayLessonIds: string[]
  todayCompletedIds: string[]
  dailyComplete: boolean
  quizCompleted: boolean
  quizScore: number | null
  totalXp: number
  levelInfo: LevelInfo
}

const TIER_THEME = {
  EXPLORER: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', badge: 'bg-green-100 text-green-700' },
  BUILDER:  { bg: 'bg-blue-500',  light: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700'  },
  CREATOR:  { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
}

// Convert a DailyChallenge to a Lesson-compatible shape
function challengeToLesson(c: DailyChallenge): Lesson {
  return {
    id: c.id,
    tier: c.tier || 'BUILDER',
    subject: c.subject,
    unit: c.unit || 'Daily Challenge',
    unitIndex: c.unitIndex ?? 0,
    title: c.title,
    emoji: c.emoji,
    realWorldUse: c.realWorldUse,
    concept: c.concept,
    example: c.example,
    challenge: c.challenge,
    starterCode: c.starterCode,
    solutionCode: c.solutionCode,
    checkOutput: (output: string) => {
      // Tokenize both sides into the "meaningful" pieces (words and numbers) and
      // require an exact sequence + count match. This catches wrong answers that
      // happen to mention the right words — e.g. returning ['apple','banana',
      // 'apple','banana'] when the expected answer is just ['apple','banana'].
      const tokenize = (s: string) =>
        (s.toLowerCase().match(/-?\d+\.?\d*|[a-z_]+/g) || [])
      const expected = tokenize(c.expectedOutput)
      const actual = tokenize(output)
      if (expected.length === 0) return output.trim().length > 0
      if (expected.length !== actual.length) return false
      return expected.every((t, i) => t === actual[i])
    },
    expectedHint: c.expectedOutput,
    hints: c.hints,
  }
}

export function CodeLabClient({
  session,
  completedIds: initialCompletedIds,
  todayLessonIds: _staticLessonIds,
  todayCompletedIds: initialTodayCompleted,
  dailyComplete: initialDailyComplete,
  quizCompleted: initialQuizCompleted,
  quizScore: initialQuizScore,
  totalXp: initialTotalXp,
  levelInfo: initialLevelInfo,
}: Props) {
  const tier = session.tier as LessonTier
  const theme = TIER_THEME[tier] ?? TIER_THEME.BUILDER
  const allLessons = getLessonsForTier(tier)

  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds)
  const [todayCompleted, setTodayCompleted] = useState<string[]>(initialTodayCompleted)
  const [dailyComplete, setDailyComplete] = useState(initialDailyComplete)
  const [quizCompleted, setQuizCompleted] = useState(initialQuizCompleted)
  const [quizScore, setQuizScore] = useState<number | null>(initialQuizScore)
  const [totalXp, setTotalXp] = useState(initialTotalXp)
  const [levelInfo, setLevelInfo] = useState(initialLevelInfo)

  // AI-generated daily challenges
  const [aiChallenges, setAiChallenges] = useState<DailyChallenge[]>([])
  const [aiChallengesLoading, setAiChallengesLoading] = useState(true)

  // Today's lessons — either AI-generated or static fallback
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([])

  // Fetch AI-generated daily challenges on mount
  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await fetch('/api/daily-challenges')
        if (res.ok) {
          const data = await res.json()
          const challenges = data.challenges as DailyChallenge[]
          setAiChallenges(challenges)
          setTodayCompleted(data.completedIds || [])
          if ((data.completedIds || []).length === 5) {
            setDailyComplete(true)
          }

          // Convert to Lesson format
          const lessons = challenges.map(c => challengeToLesson({
            ...c,
            tier,
          }))
          setTodayLessons(lessons)
        } else {
          // Fallback to static curriculum
          const lessons = _staticLessonIds
            .map(id => allLessons.find(l => l.id === id))
            .filter(Boolean) as Lesson[]
          setTodayLessons(lessons)
        }
      } catch {
        // Fallback to static curriculum
        const lessons = _staticLessonIds
          .map(id => allLessons.find(l => l.id === id))
          .filter(Boolean) as Lesson[]
        setTodayLessons(lessons)
      } finally {
        setAiChallengesLoading(false)
      }
    }

    fetchChallenges()
  }, [])

  const [view, setView] = useState<'today' | 'all' | 'quiz'>('today')
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Set current lesson once todayLessons is loaded
  useEffect(() => {
    if (todayLessons.length > 0 && !currentLesson) {
      const firstIncomplete = todayLessons.find(l => !todayCompleted.includes(l.id))
      setCurrentLesson(firstIncomplete ?? todayLessons[0])
    }
  }, [todayLessons, todayCompleted, currentLesson])

  const todayDoneCount = todayCompleted.length
  const totalDone = completedIds.length

  // Mark a static lesson complete (from "All lessons" view)
  const handleLessonComplete = useCallback(async (lessonId: string) => {
    if (completedIds.includes(lessonId)) return

    let data: any = {}
    try {
      const res = await fetch('/api/code-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      })

      // If the request was redirected to a sign-in page or returned non-OK,
      // surface a friendly message instead of throwing an unhandled rejection.
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        toast.error('Could not mark lesson complete. Please sign in and try again.')
        console.error('handleLessonComplete failed:', res.status, body)
        return
      }

      data = await res.json()
    } catch (err) {
      console.error('Network error marking lesson complete', err)
      toast.error('Network error — could not contact server. Try again.')
      return
    }

    const newCompleted = [...completedIds, lessonId]
    setCompletedIds(newCompleted)

    if (data.totalXp !== undefined) {
      setTotalXp(data.totalXp)
      setLevelInfo(data.levelInfo)
      if (data.awards?.length) {
        data.awards.forEach((a: { points: number; reason: string }) => {
          toast.success(`+${a.points} XP — ${a.reason}`, { icon: '⚡', duration: 3000 })
        })
      }
      if (data.levelInfo?.level > levelInfo.level) {
        toast.success(
          `${data.levelInfo.emoji} Level up! You're now Level ${data.levelInfo.level} — ${data.levelInfo.title}!`,
          { duration: 5000, icon: '🎉' }
        )
      }
    }
  }, [completedIds, levelInfo])

  // Complete a daily challenge (AI-generated)
  const handleDailyChallengeComplete = useCallback(async (challengeId: string) => {
    if (todayCompleted.includes(challengeId)) return

    // Mark as completed in DB
    try {
      const res = await fetch('/api/daily-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })
      if (!res.ok) {
        toast.error('Could not mark daily challenge complete. Please sign in and try again.')
        return
      }
    } catch (err) {
      console.error('Network error marking daily challenge', err)
      toast.error('Network error — could not contact server. Try again.')
      return
    }

    // Also mark in static curriculum if it maps to one
    const isStaticLesson = allLessons.some(l => l.id === challengeId)
    if (isStaticLesson) {
      await handleLessonComplete(challengeId)
    }

    const newTodayCompleted = [...todayCompleted, challengeId]
    setTodayCompleted(newTodayCompleted)

    // Award XP for daily challenge
    try {
      const res2 = await fetch('/api/code-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: challengeId }),
      })
      if (!res2.ok) {
        toast.error('Could not award XP. Please sign in and try again.')
        return
      }
      const data = await res2.json()

      if (data.totalXp !== undefined) {
        setTotalXp(data.totalXp)
        setLevelInfo(data.levelInfo)
        if (data.awards?.length) {
          data.awards.forEach((a: { points: number; reason: string }) => {
            toast.success(`+${a.points} XP — ${a.reason}`, { icon: '⚡', duration: 3000 })
          })
        }
      }
    } catch (err) {
      console.error('Network error awarding XP', err)
      toast.error('Network error — could not contact server. Try again.')
      return
    }

    if (newTodayCompleted.length === 5) {
      setDailyComplete(true)
    }
  }, [todayCompleted, allLessons, handleLessonComplete])

  // Move to next lesson — handles both "Today's 5" and "All lessons" views
  const handleNext = useCallback(async () => {
    if (!currentLesson) return
    const lessonId = currentLesson.id

    // Complete the lesson/challenge
    if (view === 'today') {
      await handleDailyChallengeComplete(lessonId)
    } else {
      await handleLessonComplete(lessonId)
    }

    // Find next lesson based on current view
    if (view === 'today') {
      // Today's view: find next in todayLessons array
      const currentIdx = todayLessons.findIndex(l => l.id === lessonId)
      const newCompleted = [...todayCompleted, lessonId]
      const nextIncomplete = todayLessons.find((l, i) => i > currentIdx && !newCompleted.includes(l.id))
      if (nextIncomplete) {
        setCurrentLesson(nextIncomplete)
      } else if (newCompleted.length === 5) {
        setView('today')
      }
    } else {
      // All lessons view: find next lesson in the SAME UNIT
      const unitLessons = allLessons
        .filter(l => l.unit === currentLesson.unit)
        .sort((a, b) => a.unitIndex - b.unitIndex)
      const currentUnitIdx = unitLessons.findIndex(l => l.id === lessonId)
      const nextInUnit = unitLessons.find((l, i) => i > currentUnitIdx && !completedIds.includes(l.id))
      if (nextInUnit) {
        setCurrentLesson(nextInUnit)
      }
      // If no more in this unit, stay on current lesson (show completion screen)
    }
  }, [currentLesson, view, todayLessons, todayCompleted, allLessons, completedIds, handleDailyChallengeComplete, handleLessonComplete])

  const handleQuizComplete = (score: number, awards?: Array<{ points: number; reason: string }>, newLevelInfo?: LevelInfo, newTotalXp?: number) => {
    setQuizCompleted(true)
    setQuizScore(score)
    setView('today')

    if (newTotalXp !== undefined) {
      const prevLevel = levelInfo.level
      setTotalXp(newTotalXp)
      if (newLevelInfo) setLevelInfo(newLevelInfo)

      if (awards?.length) {
        awards.forEach(a => {
          toast.success(`+${a.points} XP — ${a.reason}`, { icon: '⭐', duration: 3000 })
        })
      }
      if (newLevelInfo && newLevelInfo.level > prevLevel) {
        toast.success(
          `${newLevelInfo.emoji} Level up! Level ${newLevelInfo.level} — ${newLevelInfo.title}!`,
          { duration: 5000, icon: '🎉' }
        )
      }
    }
  }

  // Determine if a lesson is accessible
  const isLessonAccessible = (lesson: Lesson, inToday: boolean): boolean => {
    if (completedIds.includes(lesson.id)) return true
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

  if (aiChallengesLoading || !currentLesson) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <p className="text-sm">Generating today's challenges...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className={`bg-white border-b ${theme.border} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(v => !v)} className="lg:hidden text-gray-400 hover:text-gray-700 mr-1">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center font-mono text-xs font-black text-green-400 flex-shrink-0">
            &gt;_
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">CodeMind Lab</p>
            <p className="text-xs text-gray-400">
              {aiChallenges.length > 0 ? 'AI-generated daily challenges' : `${totalDone} lessons completed`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <XpBar levelInfo={levelInfo} totalXp={totalXp} theme={theme} compact />
          </div>

          {/* Dev-only: nuke today's cached challenges and force regeneration */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={async () => {
                if (!confirm("Regenerate today's challenges with the current prompt? This wipes today's progress on them.")) return
                const res = await fetch('/api/daily-challenges', { method: 'DELETE' })
                if (!res.ok) {
                  alert('Failed to regenerate: ' + res.status)
                  return
                }
                window.location.reload()
              }}
              title="Dev: regenerate today's daily challenges"
              className="text-[10px] font-mono px-2 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            >
              regen
            </button>
          )}

          {/* Daily dots */}
          <div className="flex items-center gap-1">
            {todayLessons.map((l) => (
              <div
                key={l.id}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  todayCompleted.includes(l.id) ? theme.bg : 'bg-gray-200'
                )}
                title={l.title}
              />
            ))}
            <span className="text-xs text-gray-400 ml-1">{todayDoneCount}/{DAILY_LESSON_COUNT}</span>
          </div>

          {/* Quiz badge */}
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
                {v === 'today' ? (
                  <span className="flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Today's 5
                  </span>
                ) : 'All lessons'}
              </button>
            ))}
          </div>

          {/* XP bar in sidebar */}
          <div className="px-3 py-3 border-b border-gray-50">
            <XpBar levelInfo={levelInfo} totalXp={totalXp} theme={theme} compact />
          </div>

          <div className="flex-1 overflow-y-auto py-3">
            {view === 'today' || view === 'quiz' ? (
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
                        <p className={cn('text-xs truncate', isActive ? 'text-white/70' : 'text-gray-400')}>
                          {lesson.subject === 'coding' ? 'Python' : 'Math'}
                        </p>
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

                {/* Quiz entry */}
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
              onComplete={(score, awards, newLevelInfo, newTotalXp) => handleQuizComplete(score, awards, newLevelInfo, newTotalXp)}
              onBack={() => setView('today')}
            />
          ) : dailyComplete && todayLessons.every(l => todayCompleted.includes(l.id)) && view === 'today'
              && currentLesson && todayCompleted.includes(currentLesson.id)
              && !todayLessons.find(l => !todayCompleted.includes(l.id)) ? (
            <div className="h-full overflow-y-auto flex items-start justify-center p-6">
              <div className="text-center max-w-sm w-full pt-4">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily session complete!</h2>
                <p className="text-gray-500 mb-1">You completed all 5 challenges.</p>
                <p className="text-xs text-gray-400 font-mono mb-5">Come back tomorrow for 5 new AI-generated challenges.</p>

                <div className="mb-5">
                  <XpBar levelInfo={levelInfo} totalXp={totalXp} theme={theme} />
                </div>

                <div className="flex flex-col gap-3">
                  {!quizCompleted && (
                    <button
                      onClick={() => setView('quiz')}
                      className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-3 rounded-2xl transition-all text-sm"
                    >
                      <Zap className="h-4 w-4" />
                      Take today's optional quiz! (+up to 80 XP)
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
              isLast={view === 'today'
                ? todayLessons[todayLessons.length - 1]?.id === currentLesson.id
                : allLessons
                    .filter(l => l.unit === currentLesson.unit)
                    .sort((a, b) => a.unitIndex - b.unitIndex)
                    .pop()?.id === currentLesson.id
              }
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
