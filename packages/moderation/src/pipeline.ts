import type { TopicCategory, ModerationResult } from '@kidai/shared'
import { runOpenAIModeration } from './openai-moderation'
import { runKeywordFilter, scanOutputForPII } from './keyword-filter'

export interface PipelineResult {
  allowed: boolean
  moderation: ModerationResult
  stage: 'input_keyword' | 'input_openai' | 'output_pii' | 'output_openai' | 'pass'
}

/**
 * Full input safety pipeline.
 * Stage 1: Fast keyword check (no API call, ~0ms)
 * Stage 2: OpenAI moderation API (async, ~200ms)
 *
 * Returns immediately if stage 1 blocks, saving API costs.
 */
export async function runInputPipeline(
  text: string,
  blockedTopics: TopicCategory[],
  customBlockedKeywords: string[]
): Promise<PipelineResult> {
  // Stage 1: keyword filter (fast, no cost)
  const keywordResult = runKeywordFilter(text, blockedTopics, customBlockedKeywords)
  if (keywordResult.flagged) {
    return { allowed: false, moderation: keywordResult, stage: 'input_keyword' }
  }

  // Stage 2: OpenAI moderation API
  const openaiResult = await runOpenAIModeration(text)
  if (openaiResult.flagged) {
    return { allowed: false, moderation: openaiResult, stage: 'input_openai' }
  }

  return { allowed: true, moderation: { flagged: false }, stage: 'pass' }
}

/**
 * Full output safety pipeline.
 * Stage 1: Fast PII scan
 * Stage 2: OpenAI moderation on the AI's response
 */
export async function runOutputPipeline(text: string): Promise<PipelineResult> {
  // Stage 1: PII scan on output
  const piiResult = scanOutputForPII(text)
  if (piiResult.flagged) {
    return { allowed: false, moderation: piiResult, stage: 'output_pii' }
  }

  // Stage 2: OpenAI moderation on AI response
  const openaiResult = await runOpenAIModeration(text)
  if (openaiResult.flagged) {
    return { allowed: false, moderation: openaiResult, stage: 'output_openai' }
  }

  return { allowed: true, moderation: { flagged: false }, stage: 'pass' }
}
