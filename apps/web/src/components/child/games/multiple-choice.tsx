'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CheckCircle, XCircle, ChevronRight, Trophy } from 'lucide-react'
import type { MultipleChoiceGame } from './types'

interface Props {
  game: MultipleChoiceGame
  accentColor: string // matches tier theme
}

export function MultipleChoiceWidget({ game, accentColor }: Props) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])

  const q = game.questions[current]
  const total = game.questions.length
  const answered = selected !== null

  const handleSelect = (idx: number) => {
    if (answered) return
    setSelected(idx)
    const correct = idx === q.correct
    if (correct) setScore((s) => s + 1)
    setAnswers((prev) => [...prev, correct])
  }

  const handleNext = () => {
    if (current + 1 >= total) {
      setDone(true)
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
    }
  }

  const handleRestart = () => {
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setDone(false)
    setAnswers([])
  }

  if (done) {
    const pct = Math.round((score / total) * 100)
    return (
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className={`${accentColor} px-4 py-3`}>
          <p className="text-white font-bold text-sm">{game.title}</p>
        </div>
        <div className="px-4 py-6 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
          <p className="text-2xl font-bold text-gray-900 mb-1">{score}/{total}</p>
          <p className="text-sm text-gray-500 mb-1">{pct}% correct</p>
          <p className="text-sm font-medium text-gray-700 mb-4">
            {pct === 100 ? '🎉 Perfect score! Amazing!' :
             pct >= 70 ? '⭐ Great job!' :
             '💪 Keep practising — you\'re getting there!'}
          </p>
          {/* Answer summary */}
          <div className="flex justify-center gap-1.5 mb-4">
            {answers.map((correct, i) => (
              correct
                ? <CheckCircle key={i} className="h-5 w-5 text-green-500" />
                : <XCircle key={i} className="h-5 w-5 text-red-400" />
            ))}
          </div>
          <button
            onClick={handleRestart}
            className={`${accentColor} text-white text-sm font-semibold px-5 py-2 rounded-xl`}
          >
            Play again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${accentColor} px-4 py-3 flex items-center justify-between`}>
        <p className="text-white font-bold text-sm">{game.title}</p>
        <p className="text-white/80 text-xs">{current + 1} / {total}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full ${accentColor} transition-all`}
          style={{ width: `${((current + (answered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <div className="px-4 py-4">
        {/* Question */}
        <p className="text-sm font-semibold text-gray-900 mb-4 leading-relaxed">{q.question}</p>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx
            const isCorrect = idx === q.correct
            let style = 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'

            if (answered) {
              if (isCorrect) style = 'border-green-400 bg-green-50 text-green-800'
              else if (isSelected && !isCorrect) style = 'border-red-400 bg-red-50 text-red-700'
              else style = 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all',
                  style
                )}
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

        {/* Explanation */}
        {answered && (
          <div className={cn(
            'rounded-xl px-3 py-2.5 text-xs mb-3',
            selected === q.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          )}>
            {selected === q.correct ? '✓ Correct! ' : '✗ Not quite. '}
            {q.explanation}
          </div>
        )}

        {/* Next button */}
        {answered && (
          <button
            onClick={handleNext}
            className={`${accentColor} text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 ml-auto`}
          >
            {current + 1 >= total ? 'See results' : 'Next question'}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
