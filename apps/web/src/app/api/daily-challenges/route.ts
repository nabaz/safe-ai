import { NextRequest, NextResponse } from 'next/server'
import { getChildSession } from '@/lib/session'
import { prisma } from '@kidai/db'
import { getLevelInfo, getTotalXp } from '@/lib/points'
import { getLessonsForTier } from '@/components/child/code-lab/curriculum'
import { getAiClient } from '@kidai/ai'

const PYTHON_RUNNER_LIMITS = `
The runtime is full CPython 3.12 (Pyodide / WebAssembly). Every standard Python
language feature works — lists, dicts, sets, tuples, comprehensions, lambdas,
classes, exceptions, f-strings, slicing, while loops, all the usual built-ins,
plus the Python standard library (math, random, statistics, json, re, etc).

DO NOT USE:
- input()  — there's no interactive stdin
- File I/O  — no real filesystem
- Network calls  — no socket / requests
- External pip packages outside the stdlib
`

function generateChallengeId(tier: string, index: number, dateKey: string): string {
  return `ai-${tier}-${dateKey}-${index}`
}

/**
 * Validate that solutionCode produces output when run.
 * Returns true if the code likely produces output, false otherwise.
 * This is a heuristic check to catch obviously broken solutions.
 */
function validateChallengeSolution(solutionCode: string): boolean {
  const trimmed = solutionCode.trim()
  
  // Check 1: Must contain at least one print() call
  if (!/print\s*\(/i.test(trimmed)) {
    console.warn('Solution has no print() calls')
    return false
  }
  
  // Check 2: Should not be ONLY a function definition with no test code after it
  // (i.e., if it defines a function, it must call that function somewhere)
  const functionDef = trimmed.match(/^def\s+\w+\s*\([^)]*\)\s*:/m)
  if (functionDef) {
    // If there's a function definition, there should be more code after it
    // (the test call). A simple heuristic: the code should have at least
    // 3 lines or a function call with the function name.
    const lines = trimmed.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    if (lines.length < 2) {
      console.warn('Solution defines function but has no test code')
      return false
    }
    
    // Extract function name and check if it's called
    const nameMatch = functionDef[0].match(/def\s+(\w+)/)
    if (nameMatch) {
      const fnName = nameMatch[1]
      const callPattern = new RegExp(`\\b${fnName}\\s*\\(`, 'i')
      if (!callPattern.test(trimmed)) {
        console.warn(`Solution defines ${fnName} but never calls it`)
        return false
      }
    }
  }
  
  return true
}


async function generateDailyChallenges(
  childId: string,
  tier: string,
  xpLevel: number,
  completedCount: number,
  completedLessonIds: string[]
) {
  const ai = getAiClient()
  const allLessons = getLessonsForTier(tier as any)

  // Determine what concepts the child has covered
  const completedLessons = allLessons.filter(l => completedLessonIds.includes(l.id))
  const coveredUnits = [...new Set(completedLessons.map(l => l.unit))]
  const nextUnits = allLessons
    .filter(l => !coveredUnits.includes(l.unit))
    .map(l => l.unit)
    .filter((v, i, a) => a.indexOf(v) === i)

  // Determine difficulty based on XP level
  const getDifficultyLevel = (xp: number): 'easy' | 'medium' | 'hard' => {
    if (xp < 50) return 'easy'
    if (xp < 150) return 'medium'
    return 'hard'
  }

  const difficulty = getDifficultyLevel(xpLevel)

  const prompt = `You are generating 5 DAILY CODING CHALLENGES for a child learning Python. These are real-world brain teasers and logic puzzles, NOT math lessons.

CHILD PROFILE:
- Age tier: ${tier}
- XP Level: ${xpLevel} (Difficulty: ${difficulty.toUpperCase()})
- Lessons completed: ${completedCount}
- Units covered: ${coveredUnits.join(', ') || 'none yet'}

TIER IS THE PRIMARY CONSTRAINT. The child's age tier sets a HARD CEILING on
the Python features and conceptual difficulty you may use. XP level only
varies the *flavor* of challenges within the tier — it never raises the
ceiling. Do not generate challenges above this tier's level, even if XP is high.

${tier === 'EXPLORER' ? `
EXPLORER tier (ages 4–7):
  ONLY these Python features are allowed:
    - print() with a single string or number
    - Variables holding a number or string (e.g.  pet = "cat")
    - if / else with a single comparison (==, <, >)
    - for i in range(N): with a tiny N (≤ 10)
    - Basic math: +, -, *
  DO NOT USE: functions (no def), lists, dictionaries, .count(), in/not in,
  loops over lists, elif, while, comprehensions, f-strings, imports, len().

  Challenges should be SHORT (3–6 lines) and feel like a puzzle a small child
  can solve in under a minute. The user fills in ONE blank — a number, a word,
  or a single operator.

  Good challenge ideas:
    - "Print hello three times" (fill in the range number)
    - "Print 'big' if the number is more than 5, else print 'small'"
    - "Add two prices and print the total"
    - "Say which animal is bigger" (compare two numbers)
    - "Count to 5 using a loop"

  Bad challenge ideas (TOO HARD — never generate these for EXPLORER):
    - find_duplicates, password validator, sort, filter, search, FizzBuzz,
      anything with a function definition, anything with a list method.
` : tier === 'BUILDER' ? `
BUILDER tier (ages 8–11):
  Allowed Python features:
    - All of EXPLORER's features, plus:
    - def functions with 1–2 parameters and return
    - Lists with append, indexing, simple iteration (for x in items)
    - if / elif / else
    - len(), range(start, stop), sum(), max(), min()
    - f-strings, string concatenation
  Avoid: dictionaries, classes, list comprehensions, exception handling,
  recursion, nested data structures.

  Challenges should be 5–12 lines. Define a small function (one job) and call
  it with a clear example. User fills in 1–3 blanks.

  Good ideas: largest of three numbers, count vowels in a word, sum of a
  short list, simple password length check, find biggest score, FizzBuzz.
` : `
CREATOR tier (ages 12–15):
  Full Python is fair game: functions with multiple params, lists, dicts,
  sets, comprehensions, lambdas, classes (light), exceptions, the stdlib
  (math, random, json, re, statistics, collections, itertools), recursion,
  nested logic. Challenges can be 10–25 lines and require multi-step reasoning.

  Good ideas: find_duplicates, binary search, simple sort, anagram detector,
  word frequency counter, palindrome check, GCD, prime sieve.
`}

WITHIN this tier, vary flavor by XP level (currently ${difficulty.toUpperCase()}):
  - easy: the most literal/concrete version of a concept, minimal blanks
  - medium: one or two reasoning steps, more blanks
  - hard: combines two ideas the child has already seen, more blanks

PYTHON RUNNER LIMITS (MUST FOLLOW):
${PYTHON_RUNNER_LIMITS}

REQUIREMENTS:
- Generate EXACTLY 5 challenges.
- ALL must be "subject": "coding" (NO math challenges).
- ALL must be real-world, playful scenarios — pets, snacks, games, weather,
  friends, school, sports — phrased in language the child can read.
- The 5 challenges form a progression: #1 is the simplest, #5 is the hardest
  the child can still handle WITHIN this tier's ceiling.
- Every challenge must respect the tier's allowed-feature list above. If a
  scenario can only be solved with features outside the tier, pick a
  different scenario — do not stretch the features.

OUTPUT FORMAT:
Return ONLY valid JSON — no markdown, no explanation, no code blocks.

{
  "id": "unique-id-string",
  "subject": "coding",
  "title": "Short fun title (under 40 chars)",
  "emoji": "single relevant emoji",
  "realWorldUse": "Used in: [real application]",
  "concept": "Brief explanation (markdown allowed)",
  "example": "Working example code (no ___)",
  "challenge": "What the child must solve (markdown allowed)",
  "starterCode": "Complete working starter code",
  "solutionCode": "Complete working solution",
  "expectedOutput": "What the output looks like",
  "hints": ["hint 1", "hint 2", "hint 3"]
}

IMPORTANT RULES — INTERNAL CONSISTENCY IS CRITICAL.
Before returning, mentally trace each challenge from top to bottom and check
that example, starter, solution, and expected output all agree.

1. The "example" field must be a SHORT but RUNNABLE program that actually
   demonstrates the concept the challenge tests. Do NOT make it a single
   throwaway print() with a literal string — show the real pattern.
     BAD example for a find-duplicates challenge:
       print('Found a duplicate')
     GOOD example:
       nums = [1, 2, 3, 2, 4, 3]
       seen = []
       for n in nums:
         if n in seen and n not in []:  # demonstrates the technique
           ...
       print(seen)

2. starterCode AND solutionCode must both be COMPLETE, RUNNABLE programs that
   end with a print(...) of the result. The user should NEVER have to add
   their own test call.

3. solutionCode, when run, MUST produce output EXACTLY equal to expectedOutput
   (character-for-character after stripping leading/trailing whitespace). This
   is non-negotiable — if you cannot guarantee the match, redesign the
   challenge until you can.

4. starterCode is the user's editable starting point. Fill-in-the-blank
   placeholders (___) are allowed, but every ___ must correspond to a single
   short answer. After replacing each ___ with the right value, starterCode
   becomes equivalent to solutionCode and produces the same expectedOutput.

5. expectedOutput must be a SINGLE, SPECIFIC value (e.g., "['apple', 'banana']"
   or "True" or "42"), not a description. It is compared against the user's
   stdout via exact-token matching.

6. Imports from the Python stdlib are allowed (math, random, json, re,
   statistics, collections, itertools). No third-party packages.

7. Keep titles under 40 characters. Make them FUN and engaging — real-world
   scenarios only. Each challenge solvable in 2-5 minutes. Difficulty matches
   the ${difficulty.toUpperCase()} level above.

CODE FORMATTING:
- 2-space indentation, no tabs.
- No trailing whitespace.
- One statement per line.
- If defining a function, include the test call + print at module level.
`

  try {
    const response = await ai.chat.completions.create({
      model: process.env.AI_PROVIDER === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Empty AI response')

    // Parse JSON — handle potential markdown code block wrapping
    let jsonStr = content
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    }

    const challenges = JSON.parse(jsonStr)
    if (!Array.isArray(challenges) || challenges.length !== 5) {
      throw new Error(`Expected 5 challenges, got ${challenges.length}`)
    }

    // Validate each challenge's solutionCode
    const dateKey = new Date().toISOString().slice(0, 10)
    const validated = challenges.map((c: any, i: number) => {
      const isValid = validateChallengeSolution(c.solutionCode)
      if (!isValid) {
        console.error(`Challenge ${i} failed validation. SolutionCode: ${c.solutionCode.substring(0, 100)}...`)
      }
      return {
        ...c,
        id: generateChallengeId(tier, i, dateKey),
        _validationPassed: isValid,
      }
    })

    // If any challenge failed validation, log it but still return (client-side
    // fallback will help). Alternatively, we could reject the batch and regenerate.
    const failedCount = validated.filter(c => !c._validationPassed).length
    if (failedCount > 0) {
      console.warn(`${failedCount}/${validated.length} challenges failed validation. Using client-side fallback.`)
    }

    // Strip validation marker before returning (it's only for logging)
    return validated.map(({ _validationPassed, ...c }: any) => c)
  } catch (error) {
    console.error('Failed to generate daily challenges:', error)
    // Fallback to static curriculum if AI fails
    return getFallbackChallenges(tier, completedLessonIds)
  }
}

function getFallbackChallenges(tier: string, completedLessonIds: string[]): any[] {
  const allLessons = getLessonsForTier(tier as any)
  const completedSet = new Set(completedLessonIds)
  const incomplete = allLessons.filter(l => !completedSet.has(l.id))

  // Pick up to 5 incomplete lessons, or repeat completed ones
  const picked = incomplete.slice(0, 5)
  if (picked.length < 5) {
    const completed = allLessons.filter(l => completedSet.has(l.id))
    while (picked.length < 5 && completed.length > 0) {
      picked.push(completed[picked.length % completed.length]!)
    }
  }

  const dateKey = new Date().toISOString().slice(0, 10)
  return picked.map((l, i) => ({
    id: generateChallengeId(tier, i, dateKey),
    subject: l.subject,
    title: l.title,
    emoji: l.emoji,
    realWorldUse: l.realWorldUse,
    concept: l.concept,
    example: l.example,
    challenge: l.challenge,
    starterCode: l.starterCode,
    solutionCode: l.solutionCode,
    expectedOutput: l.expectedHint,
    hints: l.hints,
  }))
}

export async function GET(req: NextRequest) {
  const session = await getChildSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const dateKey = today.toISOString().slice(0, 10)
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  // Check if challenges already exist for today
  const existing = await prisma.dailyChallenge.findUnique({
    where: { childId_date: { childId: session.childId, date: todayDate } },
  })

  if (existing) {
    return NextResponse.json({
      challenges: existing.challenges,
      completedIds: existing.completedIds,
      isGenerated: true,
    })
  }

  // Generate new challenges
  const totalXp = await getTotalXp(session.childId)
  const levelInfo = getLevelInfo(totalXp)
  const completedCount = await prisma.codeLessonProgress.count({
    where: { childId: session.childId },
  })
  const completedLessons = await prisma.codeLessonProgress.findMany({
    where: { childId: session.childId },
    select: { lessonId: true },
  })
  const completedLessonIds = completedLessons.map(c => c.lessonId)

  const challenges = await generateDailyChallenges(
    session.childId,
    session.tier,
    levelInfo.level,
    completedCount,
    completedLessonIds
  )

  // Save to DB
  await prisma.dailyChallenge.create({
    data: {
      childId: session.childId,
      date: todayDate,
      challenges: challenges,
      completedIds: [],
    },
  })

  return NextResponse.json({
    challenges,
    completedIds: [],
    isGenerated: true,
  })
}

/**
 * Dev-only: wipe today's cached daily challenges so the next GET regenerates
 * a fresh batch using the current prompt. Useful after iterating on prompt
 * wording — blocked in production to avoid accidental loss of progress.
 */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const session = await getChildSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  await prisma.dailyChallenge.deleteMany({
    where: { childId: session.childId, date: todayDate },
  })

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await getChildSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { challengeId } = await req.json()
  if (!challengeId) {
    return NextResponse.json({ error: 'Missing challengeId' }, { status: 400 })
  }

  const today = new Date()
  const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  const daily = await prisma.dailyChallenge.findUnique({
    where: { childId_date: { childId: session.childId, date: todayDate } },
  })

  if (!daily) {
    return NextResponse.json({ error: 'No daily challenges found' }, { status: 404 })
  }

  if (daily.completedIds.includes(challengeId)) {
    return NextResponse.json({ error: 'Already completed' }, { status: 400 })
  }

  // Update completed
  const updated = await prisma.dailyChallenge.update({
    where: { childId_date: { childId: session.childId, date: todayDate } },
    data: { completedIds: { push: challengeId } },
  })

  return NextResponse.json({
    completedIds: updated.completedIds,
    allDone: updated.completedIds.length === 5,
  })
}
