import OpenAI from 'openai'
import type { ModerationResult } from '@kidai/shared'

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

/**
 * Run OpenAI's moderation API on a piece of text.
 *
 * Note: Groq has no moderation endpoint. We always use OpenAI for this
 * regardless of which provider is active for chat.
 *
 * Failure behaviour:
 * - No OPENAI_API_KEY: skip moderation, pass through (keyword filter still runs).
 * - API error: pass through and log — don't block on infrastructure failures.
 */
export async function runOpenAIModeration(text: string): Promise<ModerationResult> {
  const openai = getOpenAI()

  if (!openai) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        '[moderation] OPENAI_API_KEY not set — OpenAI moderation skipped (keyword filter still active)'
      )
    }
    return { flagged: false }
  }

  try {
    const response = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    })

    const result = response.results[0]
    if (!result) return { flagged: false }
    if (!result.flagged) return { flagged: false }

    const categories = result.categories as unknown as Record<string, boolean>
    const scores = result.category_scores as unknown as Record<string, number>

    const flaggedCategories = Object.entries(categories)
      .filter(([, flagged]) => flagged)
      .map(([cat]) => cat)

    const maxScoreCategory = flaggedCategories.reduce(
      (max, cat) => (scores[cat] > (scores[max] ?? 0) ? cat : max),
      flaggedCategories[0] ?? ''
    )

    return {
      flagged: true,
      reason: maxScoreCategory,
      score: scores[maxScoreCategory] ?? 1,
      categories,
    }
  } catch (error) {
    console.error('[moderation] OpenAI moderation API error (passing through):', error)
    return { flagged: false, reason: 'moderation_api_error' }
  }
}
