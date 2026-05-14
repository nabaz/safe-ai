'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { Lightbulb, Timer } from 'lucide-react'
import type { GuessingGame } from './types'

interface Props {
  game: GuessingGame
  accentColor: string
}

export function GuessingGameWidget({ game, accentColor }: Props) {
  const [guess, setGuess] = useState('')
  const [hintsShown, setHintsShown] = useState(0)
  const [timeLeft, setTimeLeft] = useState(game.countdownSeconds)
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [attempts, setAttempts] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Countdown timer
  useEffect(() => {
    if (status !== 'playing') return
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!)
          setStatus('lost')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [status])

  const timerPct = (timeLeft / game.countdownSeconds) * 100
  const timerColor = timerPct > 50 ? 'bg-green-500' : timerPct > 25 ? 'bg-yellow-500' : 'bg-red-500'

  const checkGuess = () => {
    const trimmed = guess.trim()
    if (!trimmed || status !== 'playing') return

    const correct = String(game.answer).toLowerCase() === trimmed.toLowerCase()
    setAttempts((prev) => [...prev, trimmed])
    setGuess('')

    if (correct) {
      clearInterval(intervalRef.current!)
      setStatus('won')
      setFeedback(null)
    } else {
      // Give directional hint for number guessing
      if (typeof game.answer === 'number') {
        const num = Number(trimmed)
        if (!isNaN(num)) {
          setFeedback(num < game.answer ? '📈 Too low! Try higher.' : '📉 Too high! Try lower.')
        } else {
          setFeedback('Try a number!')
        }
      } else {
        setFeedback('Not quite — try again!')
      }
    }
  }

  const showHint = () => {
    if (hintsShown < game.hints.length) {
      setHintsShown((h) => h + 1)
    }
  }

  const restart = () => {
    setGuess('')
    setHintsShown(0)
    setTimeLeft(game.countdownSeconds)
    setStatus('playing')
    setAttempts([])
    setFeedback(null)
  }

  return (
    <div className="mt-3 rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${accentColor} px-4 py-3`}>
        <p className="text-white font-bold text-sm">{game.title}</p>
        <p className="text-white/80 text-xs mt-0.5">Guess: {game.subject}</p>
      </div>

      {/* Timer bar */}
      {status === 'playing' && (
        <div className="h-2 bg-gray-100">
          <div
            className={`h-full ${timerColor} transition-all duration-1000`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      )}

      <div className="px-4 py-4">
        {status === 'won' && (
          <div className="text-center py-2">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-bold text-gray-900 mb-1">{game.successMessage}</p>
            <p className="text-sm text-gray-500 mb-3">
              Got it in {attempts.length} {attempts.length === 1 ? 'guess' : 'guesses'}!
            </p>
            <button onClick={restart} className={`${accentColor} text-white text-sm font-semibold px-4 py-2 rounded-xl`}>
              Play again
            </button>
          </div>
        )}

        {status === 'lost' && (
          <div className="text-center py-2">
            <p className="text-3xl mb-2">⏰</p>
            <p className="font-bold text-gray-900 mb-1">{game.failMessage}</p>
            <p className="text-sm text-gray-500 mb-3">
              The answer was <strong>{game.answer}</strong>
            </p>
            <button onClick={restart} className={`${accentColor} text-white text-sm font-semibold px-4 py-2 rounded-xl`}>
              Try again
            </button>
          </div>
        )}

        {status === 'playing' && (
          <>
            {/* Timer display */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Timer className="h-4 w-4" />
                <span className={cn('font-bold', timeLeft <= 10 && 'text-red-500')}>
                  {timeLeft}s
                </span>
              </div>
              <span className="text-xs text-gray-400">{attempts.length} guess{attempts.length !== 1 ? 'es' : ''}</span>
            </div>

            {/* Hints */}
            {game.hints.length > 0 && (
              <div className="mb-3">
                {hintsShown > 0 && (
                  <div className="flex flex-col gap-1 mb-2">
                    {game.hints.slice(0, hintsShown).map((hint, i) => (
                      <div key={i} className="flex items-start gap-2 bg-yellow-50 rounded-xl px-3 py-2 text-xs text-yellow-800">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" />
                        <span>Hint {i + 1}: {hint}</span>
                      </div>
                    ))}
                  </div>
                )}
                {hintsShown < game.hints.length && (
                  <button
                    onClick={showHint}
                    className="flex items-center gap-1.5 text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    Get a hint ({game.hints.length - hintsShown} left)
                  </button>
                )}
              </div>
            )}

            {/* Previous attempts */}
            {attempts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {attempts.map((a, i) => (
                  <span key={i} className="bg-gray-100 text-gray-500 text-xs rounded-full px-2.5 py-0.5 line-through">
                    {a}
                  </span>
                ))}
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2 mb-3">{feedback}</p>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkGuess()}
                placeholder="Your guess..."
                className="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{ '--tw-ring-color': 'currentColor' } as React.CSSProperties}
                autoFocus
              />
              <button
                onClick={checkGuess}
                disabled={!guess.trim()}
                className={cn(`${accentColor} text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40`)}
              >
                Guess!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
