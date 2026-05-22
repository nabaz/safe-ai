'use client'

import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Play, Lightbulb, CheckCircle, XCircle, ChevronRight, RotateCcw, BookOpen, Zap } from 'lucide-react'
import type { Lesson } from './curriculum'
import { runPython, preloadPyodide } from './python-runner'
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

const SUBJECT_BADGE = {
  coding: { label: 'Python', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  math:   { label: 'Math',   color: 'bg-pink-100 text-pink-700 border border-pink-200' },
}

type Status = 'idle' | 'running' | 'passed' | 'failed' | 'error'

/**
 * Build a Python snippet that exercises any function(s) the user defined.
 * Tries, in order:
 *   1. Lift the test calls verbatim from the lesson's solutionCode (best match
 *      — uses the exact inputs the lesson author expected).
 *   2. Synthesize a `print(fn(...))` call by reading the lesson's expectedHint:
 *      if it's a list literal, pass those items doubled-up as the first arg
 *      (so duplicate-finder lessons see duplicates); otherwise fall back to a
 *      sensible default based on the parameter's name.
 *
 * Returns '' if the user's code has no `def` (nothing to call).
 */
function buildTestRunner(userCode: string, lesson: Lesson): string {
  const defs = [...userCode.matchAll(/^def\s+(\w+)\s*\(([^)]*)\)/gm)]
    .map(m => ({ name: m[1]!, params: m[2]! }))
  if (defs.length === 0) return ''

  // 1) Try lifting top-level calls from solutionCode — those use the exact
  // inputs the lesson author intended.
  const nameRegex = new RegExp(`\\b(${defs.map(d => d.name).join('|')})\\s*\\(`)
  const lifted: string[] = []
  for (const line of lesson.solutionCode.split('\n')) {
    if (/^\s/.test(line)) continue
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('def ')) continue
    if (nameRegex.test(line)) lifted.push(line)
  }
  if (lifted.length > 0) return lifted.join('\n')

  // 2) Synthesize a call from the first function's signature.
  const fn = defs[0]!
  const paramNames = fn.params.split(',').map(p => p.trim().replace(/[=:].*$/, '')).filter(Boolean)

  // Detect whether the function returns something useful. If it doesn't use
  // `return`, it's a void/print-only function — calling it directly avoids the
  // extra "None" line that `print(fn(...))` would tack on.
  const fnBodyRegex = new RegExp(`def\\s+${fn.name}\\b[\\s\\S]*?(?=^def\\b|\\Z)`, 'm')
  const fnBody = userCode.match(fnBodyRegex)?.[0] ?? ''
  const hasReturn = /\breturn\b\s+\S/.test(fnBody)
  const wrap = (call: string) => hasReturn ? `print(${call})` : call

  if (paramNames.length === 0) return wrap(`${fn.name}()`)

  // If the expected output is a list literal, double its items as a single-arg
  // input so duplicate-finder-style challenges have something to find.
  const listMatch = lesson.expectedHint.match(/^\s*\[([\s\S]+)\]\s*$/)
  if (listMatch && paramNames.length === 1) {
    const items = listMatch[1]!.trim()
    return wrap(`${fn.name}([${items}, ${items}])`)
  }

  // Fall back to a sensible default per parameter name. Discriminate singular
  // vs plural so `pet` gets a string and `pets` gets a list.
  const args = paramNames.map(p => {
    const plural = /s$/i.test(p) || /list|items|arr|array|nums|numbers|scores|prices/i.test(p)
    if (/password|passwd|pwd/i.test(p)) return "'longpassword123'"
    if (/email/i.test(p)) return "'kid@example.com'"
    if (/list|items|arr|array|nums|numbers|scores|prices/i.test(p)) return '[1, 2, 3, 2, 4, 3, 5]'
    if (/pet|animal/i.test(p)) return plural ? "['cat','dog','cat']" : "'dog'"
    if (/count|num|^n$|index|^i$|size|age|score|weight|height/i.test(p)) return '8'
    if (/text|string|^str$|message|msg|word|sentence/i.test(p)) return "'hello world'"
    if (/name|label/i.test(p)) return "'bob'"
    return "'test'"
  })
  return wrap(`${fn.name}(${args.join(', ')})`)
}

export function LessonView({ lesson, tier, onNext, isLast }: LessonViewProps) {
  const theme = TIER_THEME[tier as keyof typeof TIER_THEME] ?? TIER_THEME.BUILDER
  const subjectBadge = lesson.subject ? SUBJECT_BADGE[lesson.subject] : SUBJECT_BADGE.coding

  // Keep the visual placeholder '___' in the starter code so users see exactly
  // where to fill in their answers. Stripping it would leave invalid code like
  // `x = ` with nothing on the right of `=`.
  const sanitizeStarter = (s: string) => s

  const [code, setCode] = useState(() => sanitizeStarter(lesson.starterCode))
  const [output, setOutput] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [hintIndex, setHintIndex] = useState(-1)
  const [showConcept, setShowConcept] = useState(true)

  const handleRun = useCallback(async () => {
    setStatus('running')
    setError(null)

    const result = await runPython(code)
    setOutput(result.output)

    if (result.error) {
      setError(result.error)
      setStatus('error')
      return
    }

    const outputStr = result.output.join('\n')
    if (lesson.checkOutput(outputStr)) {
      setStatus('passed')
      return
    }

    // Fallback: if the user defined functions but produced no output, run their
    // code with the lesson's own test calls (extracted from solutionCode) so we
    // exercise the user's function against the exact inputs the lesson expects.
    if (result.output.length === 0) {
      const testCalls = buildTestRunner(code, lesson)
      if (testCalls) {
        const augmented = code + '\n\n' + testCalls
        const r2 = await runPython(augmented)
        setOutput(r2.output)
        if (!r2.error && lesson.checkOutput(r2.output.join('\n'))) {
          setStatus('passed')
          return
        }
        if (r2.error) {
          setError(r2.error)
          setStatus('error')
          return
        }
      }
    }

    setStatus('failed')
  }, [code, lesson])

  const handleReset = () => {
    setCode(sanitizeStarter(lesson.starterCode))
    setOutput([])
    setStatus('idle')
    setError(null)
    setHintIndex(-1)
  }

  // If the parent hands us a new lesson, reset the editor to the new starter code
  // so switching lessons doesn't show stale output.
  useEffect(() => {
    setCode(sanitizeStarter(lesson.starterCode))
    setOutput([])
    setStatus('idle')
    setError(null)
    setHintIndex(-1)
  }, [lesson.id])

  // Warm up Pyodide as soon as the lesson opens so the first Run is fast.
  useEffect(() => { preloadPyodide() }, [])

  const showNextHint = () => {
    setHintIndex((i) => Math.min(i + 1, lesson.hints.length - 1))
  }

  const passed = status === 'passed'

  return (
    <div className="flex flex-col h-full">
      {/* Lesson header */}
      <div className={`${theme.bg} px-5 py-4 flex-shrink-0`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{lesson.emoji}</span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-white font-bold">{lesson.title}</p>
                {passed && (
                  <div className="flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Done
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-white/70 text-xs">{lesson.unit}</p>
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${subjectBadge.color}`}>
                  {subjectBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-world use */}
        {lesson.realWorldUse && (
          <div className="mt-3 flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Zap className="h-3 w-3 text-white/60 flex-shrink-0" />
            <p className="text-white/80 text-xs font-mono">{lesson.realWorldUse}</p>
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
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Example</p>
                <span className="text-xs font-mono text-gray-400">Python</span>
              </div>
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
          <div className="relative rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            {/* Editor chrome */}
            <div className="bg-gray-800 flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-gray-400 text-xs font-mono">main.py</span>
              <span className="text-gray-600 text-xs font-mono">Python 3</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
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
          {(status === 'failed' || status === 'error') && hintIndex < lesson.hints.length - 1 ? (
            <button
              onClick={showNextHint}
              className="flex items-center gap-1.5 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              <Lightbulb className="h-4 w-4" />
              Get a hint
            </button>
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
            <div className="bg-gray-900 rounded-xl p-3 font-mono text-sm border border-gray-700">
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
            <p className="font-bold text-green-800 mb-1">Challenge passed!</p>
            <p className="text-sm text-green-700 mb-1">Your code works perfectly.</p>
            {lesson.realWorldUse && (
              <p className="text-xs text-green-600 font-mono mb-4 bg-green-100 rounded-lg px-3 py-2">
                {lesson.realWorldUse}
              </p>
            )}
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
