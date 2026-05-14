// Age tiers for child profiles
export type AgeTier = 'EXPLORER' | 'BUILDER' | 'CREATOR'

// Message roles
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

// Alert types from safety pipeline
export type AlertType =
  | 'INPUT_BLOCKED'
  | 'OUTPUT_FLAGGED'
  | 'TIME_LIMIT_REACHED'
  | 'BLACKOUT_ATTEMPTED'

// Topic categories that can be toggled per child
export type TopicCategory =
  | 'ANIMALS'
  | 'SCIENCE'
  | 'HISTORY'
  | 'GEOGRAPHY'
  | 'CREATIVE_WRITING'
  | 'CODING'
  | 'CURRENT_EVENTS'
  | 'DEBATE'
  | 'ADVANCED_STEM'
  | 'NATURE'
  | 'COUNTING'
  | 'COLORS'
  | 'STORIES'
  | 'SPORTS'

// Moderation result from the safety pipeline
export interface ModerationResult {
  flagged: boolean
  reason?: string
  score?: number
  categories?: Record<string, boolean>
}

// Age tier configuration
export interface AgeTierConfig {
  tier: AgeTier
  label: string
  ageRange: string
  personaName: string
  personaDescription: string
  allowedTopics: TopicCategory[]
  maxResponseLength: number  // word guidance for the system prompt
  maxTokens: number          // hard token limit sent to the AI API
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced'
}

// Child session token payload
export interface ChildSessionPayload {
  childId: string
  parentId: string
  tier: AgeTier
  displayName: string
}
