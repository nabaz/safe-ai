import type { AgeTier, TopicCategory } from '@kidai/shared'
import { AGE_TIER_CONFIGS } from '@kidai/shared'
import { getChatClient, getActiveProvider } from './client'
import { buildSystemPrompt } from './prompts'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamChatOptions {
  tier: AgeTier
  childName: string
  history: ChatMessage[]
  userMessage: string
  blockedTopics: TopicCategory[]
  customBlockedKeywords: string[]
  onChunk: (chunk: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: Error) => void
}

/**
 * Stream a chat response using the active provider (Groq or OpenAI).
 * Both use the OpenAI-compatible streaming API format.
 */
export async function streamChat(options: StreamChatOptions): Promise<void> {
  const {
    tier,
    childName,
    history,
    userMessage,
    blockedTopics,
    customBlockedKeywords,
    onChunk,
    onComplete,
    onError,
  } = options

  const config = AGE_TIER_CONFIGS[tier]
  const systemPrompt = buildSystemPrompt(tier, childName, blockedTopics, customBlockedKeywords)
  const { client, model } = getChatClient()

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    // Both Groq and OpenAI SDKs share the same streaming interface
    const stream = await (client as any).chat.completions.create({
      model,
      messages,
      max_tokens: config.maxResponseLength * 2,
      temperature: tier === 'CREATOR' ? 0.7 : 0.8,
      stream: true,
    })

    let fullResponse = ''

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''
      if (delta) {
        fullResponse += delta
        onChunk(delta)
      }
    }

    onComplete(fullResponse)
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown AI error'))
  }
}

/**
 * Generate a short conversation title from the first message.
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  const { client, model } = getChatClient()

  const response = await (client as any).chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          "Generate a short (3–5 word) friendly title for a children's chat conversation based on the first message. Return only the title, no quotes.",
      },
      { role: 'user', content: firstMessage },
    ],
    max_tokens: 20,
    temperature: 0.5,
  })

  return response.choices[0]?.message?.content?.trim() ?? 'New Conversation'
}
