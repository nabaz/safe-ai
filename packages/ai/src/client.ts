import OpenAI from 'openai'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Provider selection ────────────────────────────────────────────────────────
// Priority: AI_PROVIDER env var → GROQ_API_KEY → GEMINI_API_KEY → OPENAI_API_KEY
// Set AI_PROVIDER=groq|gemini|openai to force a specific provider

export type AIProvider = 'groq' | 'openai' | 'gemini'

export function getActiveProvider(): AIProvider {
  const env = process.env.AI_PROVIDER?.toLowerCase().trim()
  if (env === 'gemini' || env === 'google') return 'gemini'
  if (env === 'openai') return 'openai'
  if (env === 'groq') return 'groq'

  // Auto-detect based on available keys (priority order)
  if (process.env.GROQ_API_KEY?.trim()) return 'groq'
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'groq' // will fail at call time with a clear error
}

// ─── Model names ───────────────────────────────────────────────────────────────

// Groq: llama-3.3-70b is fast, free-tier, strong instruction following
export const GROQ_CHAT_MODEL = 'llama-3.3-70b-versatile'

// Google Gemini: free tier with generous limits (15 requests/min for free)
export const GEMINI_CHAT_MODEL = 'gemini-2.0-flash'

// OpenAI fallback
export const OPENAI_CHAT_MODEL = 'gpt-4o'

// OpenAI moderation (Groq/Gemini have no moderation endpoint — always use OpenAI for this)
export const MODERATION_MODEL = 'omni-moderation-latest'

// ─── Client factories ──────────────────────────────────────────────────────────

let _groq: Groq | null = null
let _openai: OpenAI | null = null
let _gemini: GoogleGenerativeAI | null = null

export function getGroqClient(): Groq {
  if (!_groq) {
    const key = process.env.GROQ_API_KEY?.trim()
    if (!key) throw new Error('GROQ_API_KEY environment variable is required')
    _groq = new Groq({ apiKey: key })
  }
  return _groq
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (!key) throw new Error('GEMINI_API_KEY environment variable is required')
    _gemini = new GoogleGenerativeAI(key)
  }
  return _gemini
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
 * Get the active chat client.
 * Groq's SDK is OpenAI-compatible so we can use it interchangeably.
 * Gemini requires special handling with a wrapper.
 */
export function getChatClient(): { 
  client: Groq | OpenAI | GoogleGenerativeAI
  model: string
  provider: AIProvider
} {
  const provider = getActiveProvider()
  if (provider === 'groq') {
    return { client: getGroqClient(), model: GROQ_CHAT_MODEL, provider: 'groq' }
  }
  if (provider === 'gemini') {
    return { client: getGeminiClient(), model: GEMINI_CHAT_MODEL, provider: 'gemini' }
  }
  return { client: getOpenAIClient(), model: OPENAI_CHAT_MODEL, provider: 'openai' }
}

/**
 * Get the active AI client for general use (chat completions, etc.)
 * Wraps Gemini to be OpenAI-compatible.
 */
export function getAiClient(): { chat: { completions: { create: (opts: any) => Promise<any> } } } {
  const { client, model, provider } = getChatClient()
  
  return {
    chat: {
      completions: {
        create: async (opts: any) => {
          const finalModel = opts.model || model

          // Gemini requires special wrapping
          if (provider === 'gemini') {
            const gemini = client as GoogleGenerativeAI
            const messages = opts.messages || []
            
            // Convert OpenAI format to Gemini format
            const contents: any[] = messages
              .filter((m: any) => m.role !== 'system')
              .map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
              }))

            const systemPrompt = messages.find((m: any) => m.role === 'system')?.content || ''
            
            const model_ = gemini.getGenerativeModel({
              model: finalModel,
              systemInstruction: systemPrompt,
            })

            const response = await model_.generateContentStream({
              contents,
            })

            // Wrap Gemini response to look like OpenAI
            const stream = response.stream
            return {
              [Symbol.asyncIterator]: async function* () {
                for await (const chunk of stream) {
                  yield {
                    choices: [
                      {
                        delta: {
                          content: chunk.text(),
                        },
                      },
                    ],
                  }
                }
              },
            }
          }

          // Groq and OpenAI are OpenAI-compatible
          return (client as any).chat.completions.create({
            ...opts,
            model: finalModel,
          })
        },
      },
    },
  }
}
