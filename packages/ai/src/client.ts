import OpenAI from 'openai'
import Groq from 'groq-sdk'

// ─── Provider selection ────────────────────────────────────────────────────────
// Priority: GROQ_API_KEY → OPENAI_API_KEY → error
// Set AI_PROVIDER=openai to force OpenAI even if Groq key is present.

export type AIProvider = 'groq' | 'openai'

export function getActiveProvider(): AIProvider {
  if (process.env.AI_PROVIDER === 'openai') return 'openai'
  if (process.env.GROQ_API_KEY?.trim()) return 'groq'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'groq' // will fail at call time with a clear error
}

// ─── Model names ───────────────────────────────────────────────────────────────

// Groq: llama-3.3-70b is fast, free-tier, strong instruction following
export const GROQ_CHAT_MODEL = 'llama-3.3-70b-versatile'

// OpenAI fallback
export const OPENAI_CHAT_MODEL = 'gpt-4o'

// OpenAI moderation (Groq has no moderation endpoint — always use OpenAI for this)
export const MODERATION_MODEL = 'omni-moderation-latest'

// ─── Client factories ──────────────────────────────────────────────────────────

let _groq: Groq | null = null
let _openai: OpenAI | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    const key = process.env.GROQ_API_KEY?.trim()
    if (!key) throw new Error('GROQ_API_KEY environment variable is required')
    _groq = new Groq({ apiKey: key })
  }
  return _groq
}

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) throw new Error('OPENAI_API_KEY environment variable is required')
    _openai = new OpenAI({ apiKey: key })
  }
  return _openai
}

/**
 * Get the active chat client as an OpenAI-compatible instance.
 * Groq's SDK is OpenAI-compatible so we can use it interchangeably.
 */
export function getChatClient(): { client: Groq | OpenAI; model: string } {
  const provider = getActiveProvider()
  if (provider === 'groq') {
    return { client: getGroqClient(), model: GROQ_CHAT_MODEL }
  }
  return { client: getOpenAIClient(), model: OPENAI_CHAT_MODEL }
}
