import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@kidai/db'
import { getChildSession } from '@/lib/session'
import { getTodayDate } from '@/components/child/code-lab/daily-engine'
import { getLessonsForTier } from '@/components/child/code-lab/curriculum'
import type { LessonTier } from '@/components/child/code-lab/curriculum'
import Groq from 'groq-sdk'

/**
 * GET /api/code-lab/quiz
 * Generate today's optional 5-question quiz based on completed lessons.
 * Uses AI to generate fresh questions each day.
 */
export async function GET() {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId, tier } = session
  const today = getTodayDate()

  const dailySession = await prisma.dailyCodeSession.findUnique({
    where: { childId_date: { childId, date: today } },
  })

  if (!dailySession?.lessonIds.every(id =>
    [...(dailySession.completedIds ?? []), id].includes(id)
  )) {
    return NextResponse.json({ error: 'Complete today\'s lessons first!' }, { status: 403 })
  }

  if (dailySession.quizCompleted) {
    return NextResponse.json({ error: 'Quiz already completed today' }, { status: 400 })
  }

  // Build context from completed lessons
  const allLessons = getLessonsForTier(tier as LessonTier)
  const completedProgress = await prisma.codeLessonProgress.findMany({
    where: { childId },
    select: { lessonId: true },
  })
  const completedIds = new Set(completedProgress.map(p => p.lessonId))
  const completedLessons = allLessons.filter(l => completedIds.has(l.id))

  if (completedLessons.length === 0) {
    return NextResponse.json({ error: 'No completed lessons to quiz on' }, { status: 400 })
  }

  const lessonSummary = completedLessons
    .map(l => `- ${l.unit}: ${l.title} (concepts: ${l.concept.slice(0, 100)}...)`)
    .join('\n')

  const tierLabel = tier === 'EXPLORER' ? '4-7 year old beginner' :
                    tier === 'BUILDER'  ? '8-11 year old intermediate' :
                                         '12-15 year old advanced'

  const prompt = `Generate a 5-question multiple choice coding quiz for a ${tierLabel} student.

The student has completed these programming lessons:
${lessonSummary}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of why this is correct."
    }
  ]
}

Rules:
- Questions must test concepts from the completed lessons above
- Use simple language appropriate for the age group
- Make options plausible (wrong answers should be common mistakes)
- correct is the 0-based index of the right answer
- Each question tests a different concept
- Keep questions concise and clear`

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    })

    const raw = response.choices[0]?.message?.content ?? ''
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json({ questions: data.questions })
  } catch (e) {
    console.error('[quiz generation]', e)
    return NextResponse.json({ error: 'Could not generate quiz. Try again!' }, { status: 500 })
  }
}

/**
 * POST /api/code-lab/quiz
 * Submit quiz score
 */
export async function POST(req: NextRequest) {
  const session = await getChildSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { childId } = session
  const { score } = await req.json()
  const today = getTodayDate()

  await prisma.dailyCodeSession.updateMany({
    where: { childId, date: today },
    data: { quizCompleted: true, quizScore: score },
  })

  return NextResponse.json({ success: true })
}
