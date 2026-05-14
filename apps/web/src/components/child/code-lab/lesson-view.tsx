'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/cn'
import { Play, Lightbulb, CheckCircle, XCircle, ChevronRight, RotateCcw, BookOpen } from 'lucide-react'
import type { Lesson } from './curriculum'
import { runPython } from './python-runner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface LessonViewProps {
  lesson: Lesson
  tier: string
  onNext?: () => void
  isLast?: boolean
}

const TIER_THEME = {
  EXPLORER: { bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  BUILDER:  { bg: 'bg-blue-500',  light: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700'  },
  CREATOR:  { bg: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
}

type Status = 'idle' | 'running' | 'passed' | 'failed' | 'error'

export function LessonView({ lesson, tier, onNext, isLast }: LessonViewProps) {
  const theme = TIER_THEME[tier as keyof typeof TIER_THEME] ?? TIER_THEME.BUILDER
  const [code, setCode] = useState(lesson.starterCode)
  const [output, setOutput] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [showConcept, setShowConcept] = useState(true)

  const handleRun = useCallback(() => {
    setStatus('running')
    setError(null)

    // Small delay so "running" state is visible
    setTimeout(() => {
      const result = runPython(code)
      setOutput(result.output)

      if (result.error) {
        setError(result.error)
        setStatus('error')
        return
      }

      const outputStr = result.output.join('\n')
      if (lesson.checkOutput(outputStr)) {
        setStatus('passed')
      } else {
        setStatus('failed')
      }
    }, 100)
  }, [code, lesson])

  const handleReset = () => {
    setCode(lesson.starterCode)
    setOutput([])
    setStatus('idle')
    setError(null)
    setHintIndex(-1)
  }

  const showNextHint = () => {
    setHintIndex((i) => Math.min(i + 1, lesson.hints.length - 1))
  }

  const passed = status === 'passed'

  return (
    <div className="flex flex-col h-full">
      {/* Lesson header */}
      <div className={`${theme.bg} px-5 py-4 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{lesson.emoji}</span>
          <div>
            <p className="text-white font-bold">{lesson.title}</p>
            <p className="text-white/70 text-xs">{lesson.unit}</p>
          </div>
        </div>
        {passed && (
          <div className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <CheckCircle className="h-3.5 w-3.5" />
            Complete!
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Concept toggle */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => setShowConcept((v) => !v)}
            className={cn(
              'flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border transition-all w-full text-left',
              showConcept ? `${theme.light} ${theme.border} ${theme.text}` : 'bg-gray-50 border-gray-200 text-gray-600'
            )}
          >
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            <span>{showConcept ? 'Hide' : 'Show'} concept</span>
          </button>
        </div>

        {/* Concept explanation */}
        {showConcept && (
          <div className={`mx-4 mb-4 rounded-xl ${theme.light} ${theme.border} border p-4`}>
            <div className="prose-sm text-sm text-gray-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  code: ({ children }) => (
                    <code className="bg-black/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-900 text-green-300 rounded-xl p-3 text-xs font-mono overflow-x-auto my-2">{children}</pre>
                  ),
                }}
              >
                {lesson.concept}
              </ReactMarkdown>
            </div>

            {/* Example */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Example</p>
              <pre className="bg-gray-900 text-green-300 rounded-xl p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {lesson.example}
              </pre>
            </div>
          </div>
        )}

        {/* Challenge */}
        <div className="mx-4 mb-4 bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your challenge</p>
          <div className="text-sm text-gray-800 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                code: ({ children }) => (
                  <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>
                ),
              }}
            >
              {lesson.challenge}
            </ReactMarkdown>
          </div>
        </div>

        {/* Code editor */}
        <div className="mx-4 mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your code</p>
            <button onClick={handleReset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-3 gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-gray-500 text-xs ml-2 font-mono">main.py</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 font-mono text-sm p-4 pt-10 resize-none focus:outline-none leading-relaxed"
              rows={Math.max(6, code.split('\n').length + 2)}
              style={{ minHeight: '140px' }}
            />
          </div>
        </div>

        {/* Run button */}
        <div className="mx-4 mb-4 flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={status === 'running' || passed}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all',
              theme.bg,
              (status === 'running' || passed) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Play className="h-4 w-4" />
            {status === 'running' ? 'Running...' : 'Run code'}
          </button>

          {/* Hint button */}
          {status === 'failed' || status === 'error' ? (
            hintIndex < lesson.hints.length - 1 ? (
              <button
                onClick={showNextHint}
                className="flex items-center gap-1.5 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                <Lightbulb className="h-4 w-4" />
                Get a hint
              </button>
            ) : null
          ) : null}
        </div>

        {/* Hints */}
        {hintIndex >= 0 && (
          <div className="mx-4 mb-4 flex flex-col gap-2">
            {lesson.hints.slice(0, hintIndex + 1).map((hint, i) => (
              <div key={i} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 text-sm text-yellow-800">
                <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-500" />
                <span><strong>Hint {i + 1}:</strong> {hint}</span>
              </div>
            ))}
          </div>
        )}

        {/* Output */}
        {(output.length > 0 || error) && (
          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Output</p>
              {status !== 'idle' && status !== 'running' && (
                <span className={cn(
                  'flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5',
                  passed ? 'bg-green-100 text-green-700' :
                  status === 'failed' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {passed ? <><CheckCircle className="h-3 w-3" />Correct!</> :
                   status === 'failed' ? <><XCircle className="h-3 w-3" />Not quite</> :
                   <><XCircle className="h-3 w-3" />Error</>}
                </span>
              )}
            </div>
            <div className="bg-gray-900 rounded-xl p-3 font-mono text-sm">
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : (
                output.map((line, i) => (
                  <p key={i} className="text-green-300 leading-relaxed">{line || '\u00A0'}</p>
                ))
              )}
            </div>

            {/* Expected output hint on fail */}
            {status === 'failed' && (
              <p className="text-xs text-gray-400 mt-2">
                Expected: <span className="font-mono text-gray-600">{lesson.expectedHint}</span>
              </p>
            )}
          </div>
        )}

        {/* Success panel */}
        {passed && (
          <div className="mx-4 mb-6 bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <p className="font-bold text-green-800 mb-1">You got it!</p>
            <p className="text-sm text-green-700 mb-4">Your code works perfectly!</p>
            {onNext && (
              <button
                onClick={onNext}
                className={`${theme.bg} text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto text-sm`}
              >
                {isLast ? 'Back to lessons' : 'Next lesson'}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
