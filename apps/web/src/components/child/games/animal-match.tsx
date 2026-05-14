'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CheckCircle, Trophy, RefreshCw } from 'lucide-react'
import type { AnimalMatchGame } from './types'

interface Props {
  game: AnimalMatchGame
  accentColor: string
}

export function AnimalMatchWidget({ game, accentColor }: Props) {
  const pairs = game.pairs
  const animals = pairs.map((p, i) => ({ id: i, label: p.animal }))
  const matches = [...pairs.map((p, i) => ({ id: i, label: p.match }))]
    .sort(() => Math.random() - 0.5) // shuffle matches column

  const [shuffledMatches] = useState(matches)
  const [selectedAnimal, setSelectedAnimal] = useState<number | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [correct, setCorrect] = useState<number[]>([])   // animal ids matched correctly
  const [wrong, setWrong] = useState<number[]>([])       // animal ids just wrong (flash)
  const [attempts, setAttempts] = useState(0)
  const done = correct.length === pairs.length

  const handleAnimal = (id: number) => {
    if (correct.includes(id)) return
    setSelectedAnimal(id)
    setSelectedMatch(null)
  }

  const handleMatch = (id: number) => {
    if (selectedAnimal === null) return
    if (correct.includes(id)) return

    setAttempts((a) => a + 1)

    if (selectedAnimal === id) {
      // Correct!
      setCorrect((prev) => [...prev, id])
      setSelectedAnimal(null)
      setSelectedMatch(null)
      setWrong([])
    } else {
      // Wrong — flash red briefly
      setWrong([selectedAnimal, id])
      setSelectedMatch(id)
      setTimeout(() => {
        setSelectedAnimal(null)
        setSelectedMatch(null)
        setWrong([])
      }, 800)
    }
  }

  const restart = () => {
    setSelectedAnimal(null)
    setSelectedMatch(null)
    setCorrect([])
    setWrong([])
    setAttempts(0)
  }

  const getAnimalStyle = (id: number) => {
    if (correct.includes(id)) return 'border-green-400 bg-green-50 text-green-700 opacity-70'
    if (wrong.includes(id)) return 'border-red-400 bg-red-50 text-red-700'
    if (selectedAnimal === id) return 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300'
    return 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 cursor-pointer'
  }

  const getMatchStyle = (id: number) => {
    if (correct.includes(id)) return 'border-green-400 bg-green-50 text-green-700 opacity-70'
    if (wrong.includes(id)) return 'border-red-400 bg-red-50 text-red-700'
    if (selectedMatch === id) return 'border-indigo-400 bg-indigo-50 text-indigo-700'
    if (selectedAnimal !== null && !correct.includes(id)) {
      return 'border-indigo-200 bg-indigo-50/50 text-gray-700 hover:border-indigo-400 cursor-pointer'
    }
    return 'border-gray-200 bg-gray-50 text-gray-500'
  }

  return (
    <div className="mt-3 rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`${accentColor} px-4 py-3`}>
        <p className="text-white font-bold text-sm">{game.title}</p>
        <p className="text-white/80 text-xs mt-0.5">{game.instruction}</p>
      </div>

      <div className="px-4 py-4">
        {done ? (
          <div className="text-center py-3">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
            <p className="font-bold text-gray-900 text-lg mb-1">All matched! 🎉</p>
            <p className="text-sm text-gray-500 mb-4">
              You got it in {attempts} {attempts === pairs.length ? '— perfect!' : `attempts`}
            </p>
            <button onClick={restart} className={`${accentColor} text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 mx-auto`}>
              <RefreshCw className="h-3.5 w-3.5" />
              Play again
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {selectedAnimal !== null
                ? `Now tap the matching habitat on the right!`
                : `Tap an animal on the left to start`}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Animals column */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Animals</p>
                {animals.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleAnimal(id)}
                    disabled={correct.includes(id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all',
                      getAnimalStyle(id)
                    )}
                  >
                    {correct.includes(id) && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Matches column (shuffled) */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Where they live</p>
                {shuffledMatches.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => handleMatch(id)}
                    disabled={correct.includes(id) || selectedAnimal === null}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all',
                      getMatchStyle(id)
                    )}
                  >
                    {correct.includes(id) && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">{correct.length}/{pairs.length} matched</p>
              <p className="text-xs text-gray-400">{attempts} attempts</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
