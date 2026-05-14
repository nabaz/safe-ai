'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { CheckCircle, XCircle, ChevronRight, Trophy, ArrowLeft, Loader2 } from 'lucide-react'
import type { LessonTier } from './curriculum'

interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
}

interface Props {
  tier: LessonTier
  alreadyCompleted: boolean
  savedScore: number | null
  onComplete: (score: number) => void
  onBack: () => void
}

const TIER_THEME = {
  EXPLORER: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  BUILDER:  { bg: 'bg-blue-500',  light: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200'  },
  CREATOR:  { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
}

export function DailyQuiz({ tier, alreadyCompleted, savedScore, onComplete, onBack }: Props) {
  const theme = TIER_THEME[tier] ?? TIER_THEME.BUILDER
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(alreadyCompleted)
  const [finalScore, setFinalScore] = useState<number | null>(savedScore)
  const [answers, setAnswers] = useState<boolean[]>([])

  const loadQuiz = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/code-lab/quiz')
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      setQuestions(data.questions)
    } catch {
      setError('Could not load quiz. Try again!')
    }
    setLoading(false)
  }

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    if (idx === questions![current]!.correct) setScore(s => s + 1)
    setAnswers(prev => [...prev, idx === questions![current]!.correct])
  }

  const handleNext = async () => {
    if (current + 1 >= questions!.length) {
      const finalS = score + (selected === questions![current]!.correct ? 0 : 0) // already counted
      const total = score
      setFinalScore(total)
      setDone(true)
      // Submit score
      await fetch('/api/code-lab/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: total }),
      })
      onComplete(total)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
    }
  }

  if (done) {
    const pct = Math.round(((finalScore ?? 0) / 5) * 100)
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <Trophy className="h-14 w-14 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz complete!</h2>
          <p className="text-4xl font-bold mb-1">{finalScore}/5</p>
          <p className="text-gray-500 mb-2">{pct}% correct</p>
          <p className="text-sm font-medium text-gray-700 mb-6">
            {pct === 100 ? '🎉 Perfect! You nailed it!' :
             pct >= 60  ? '⭐ Great job! Keep it up!' :
             '💪 Good effort! Review the lessons and try again tomorrow.'}
          </p>
          <div className="flex justify-center gap-1.5 mb-6">
            {answers.map((correct, i) => (
              correct
                ? <CheckCircle key={i} className="h-6 w-6 text-green-500" />
                : <XCircle key={i} className="h-6 w-6 text-red-400" />
            ))}
          </div>
          <button onClick={onBack} className={`${theme.bg} text-white font-semibold px-6 py-3 rounded-2xl text-sm`}>
            Back to lessons
          </button>
        </div>
      </div>
    )
  }

  if (!questions) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Daily Quiz</h2>
          <p className="text-gray-500 text-sm mb-2">5 questions based on your completed lessons.</p>
          <p className="text-gray-400 text-xs mb-6">Optional · Takes about 3 minutes · New quiz every day</p>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={loadQuiz}
              disabled={loading}
              className={cn(`${theme.bg} text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all`, loading && 'opacity-70')}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</> : 'Start quiz!'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]!
  const answered = selected !== null
  const total = questions.length

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className={`${theme.bg} px-5 py-4 flex items-center justify-between sticky top-0`}>
        <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">Daily Quiz</p>
          <p className="text-white/70 text-xs">{current + 1} of {total}</p>
        </div>
        <p className="text-white font-bold text-sm">{score} pts</p>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-gray-100">
        <div
          className={`h-full ${theme.bg} transition-all`}
          style={{ width: `${((current + (answered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        <p className="text-sm font-semibold text-gray-900 mb-5 leading-relaxed">{q.question}</p>

        <div className="flex flex-col gap-2.5 mb-4">
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx
            const isCorrect = idx === q.correct
            let style = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            if (answered) {
              if (isCorrect) style = 'border-green-400 bg-green-50 text-green-800'
              else if (isSelected) style = 'border-red-400 bg-red-50 text-red-700'
              else style = 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all', style)}
              >
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && isCorrect && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {answered && (
          <>
            <div className={cn('rounded-xl px-4 py-3 text-sm mb-4', selected === q.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
              {selected === q.correct ? '✓ Correct! ' : '✗ Not quite. '}{q.explanation}
            </div>
            <button
              onClick={handleNext}
              className={`${theme.bg} text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 ml-auto`}
            >
              {current + 1 >= total ? 'See results' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
