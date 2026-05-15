import { NextRequest, NextResponse } from 'next/server'
import { getChildSession } from '@/lib/session'
import { prisma } from '@kidai/db'
import { getLevelInfo, getTotalXp } from '@/lib/points'
import { getLessonsForTier } from '@/components/child/code-lab/curriculum'
import { getAiClient } from '@kidai/ai'

const PYTHON_RUNNER_LIMITS = `
SUPPORTED PYTHON FEATURES:
- print() with multiple arguments
- Variables (strings, numbers, booleans)
- if/elif/else statements
- for...in loops and for...in range() loops
- def functions with parameters and return
- List operations: append, remove, sort, reverse, indexing, slicing
- Dictionary operations: access, add, update
- Math operators: +, -, *, /, **, %
- Comparison: ==, !=, <, >, <=, >=
- Boolean: True, False, and, or, not
- Built-in functions: len(), str(), int(), float(), round(), range(), abs(), max(), min(), sum()
- String concatenation with +
- f-strings (basic)

NOT SUPPORTED:
- import statements (except: no imports at all)
- while loops
- list comprehensions
- try/except
- classes
- file I/O
- external libraries
- input()
- complex string formatting
`

function generateChallengeId(tier: string, index: number, dateKey: string): string {
  return `ai-${tier}-${dateKey}-${index}`
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

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
${difficulty === 'easy' ? `
- Simple, fun puzzles using basic code
- Real-world scenarios: games, school, home, animals, sports
- Examples: "count animals", "check if password is long enough", "determine if you won a game"
` : difficulty === 'medium' ? `
- Moderate logic puzzles using loops, conditionals, lists
- Real-world scenarios: managing data, solving puzzles, game mechanics
- Examples: "find winners in a race", "sort scores", "validate data"
` : `
- Complex problem-solving with functions and algorithms
- Real-world scenarios: data analysis, optimization, pattern finding
- Examples: "find duplicates", "optimize strategy", "analyze patterns"
`}

TIER GUIDELINES (for Python simplicity):
${tier === 'EXPLORER' ? `
- Ages 4-7. Use print(), if/else, basic loops (for i in range(X))
- Starter code should have ___ placeholders
- Concepts explained in 2-3 simple sentences
` : tier === 'BUILDER' ? `
- Ages 8-11. Use variables, if/else, loops, functions, lists
- Starter code can have some blanks and some complete code
- Concepts in 3-4 sentences with examples
` : `
- Ages 12-15. Use functions, lists, dictionaries, nested logic
- Starter code can be mostly complete with key parts blank
- Concepts can be detailed
`}

PYTHON RUNNER LIMITS (MUST FOLLOW):
${PYTHON_RUNNER_LIMITS}

REQUIREMENTS:
- Generate EXACTLY 5 challenges
- ALL must be "subject": "coding" (NO math challenges)
- ALL must be real-world brain teasers/logic puzzles
- Examples: password validator, pizza slicer, race winner finder, duplicate detector, pattern matcher
- Progressively increase in difficulty from #1 to #5 within the ${difficulty} level

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
  "starterCode": "Code with ___ placeholders for blanks",
  "solutionCode": "Complete working solution",
  "expectedOutput": "What the output looks like",
  "hints": ["hint 1", "hint 2", "hint 3"]
}

IMPORTANT RULES:
1. starterCode MUST have ___ placeholders
2. solutionCode MUST be complete with NO ___
3. solutionCode output MUST match expectedOutput when run
4. All code MUST work within Python runner limits
5. NO import statements, NO while loops, NO list comprehensions
6. Keep titles under 40 characters
7. Make them FUN and ENGAGING — real-world scenarios only
8. Each challenge solvable in 2-5 minutes
9. Difficulty should match the ${difficulty.toUpperCase()} level above
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

    // Assign proper IDs
    const dateKey = new Date().toISOString().slice(0, 10)
    return challenges.map((c: any, i: number) => ({
      ...c,
      id: generateChallengeId(tier, i, dateKey),
    }))
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
