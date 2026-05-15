import type { AgeTierConfig, TopicCategory } from './types'

export const AGE_TIER_CONFIGS: Record<string, AgeTierConfig> = {
  EXPLORER: {
    tier: 'EXPLORER',
    label: 'Explorer',
    ageRange: '4–7',
    personaName: 'Byte',
    personaDescription: 'a friendly robot coder who loves numbers and puzzles',
    allowedTopics: ['ANIMALS', 'NATURE', 'COUNTING', 'COLORS', 'STORIES', 'SPORTS', 'MATH'],
    maxResponseLength: 150,   // word guidance in prompt
    maxTokens: 900,           // enough for school-task responses in simple language
    vocabularyLevel: 'simple',
  },
  BUILDER: {
    tier: 'BUILDER',
    label: 'Builder',
    ageRange: '8–11',
    personaName: 'Max',
    personaDescription: 'a programmer and mathematician who makes hard things click',
    allowedTopics: [
      'ANIMALS',
      'NATURE',
      'SCIENCE',
      'HISTORY',
      'GEOGRAPHY',
      'CREATIVE_WRITING',
      'CODING',
      'COUNTING',
      'COLORS',
      'STORIES',
      'SPORTS',
      'MATH',
    ],
    maxResponseLength: 400,
    maxTokens: 1200,
    vocabularyLevel: 'intermediate',
  },
  CREATOR: {
    tier: 'CREATOR',
    label: 'Creator',
    ageRange: '12–15',
    personaName: 'Nova',
    personaDescription: 'a software engineer and mathematician who thinks rigorously',
    allowedTopics: [
      'ANIMALS',
      'NATURE',
      'SCIENCE',
      'HISTORY',
      'GEOGRAPHY',
      'CREATIVE_WRITING',
      'CODING',
      'CURRENT_EVENTS',
      'DEBATE',
      'ADVANCED_STEM',
      'COUNTING',
      'COLORS',
      'STORIES',
      'SPORTS',
      'MATH',
      'ALGORITHMS',
    ],
    maxResponseLength: 600,
    maxTokens: 2000,
    vocabularyLevel: 'advanced',
  },
}

export const TOPIC_LABELS: Record<TopicCategory, string> = {
  ANIMALS: 'Animals',
  SCIENCE: 'Science',
  HISTORY: 'History',
  GEOGRAPHY: 'Geography',
  CREATIVE_WRITING: 'Creative Writing',
  CODING: 'Coding & Programming',
  CURRENT_EVENTS: 'Current Events',
  DEBATE: 'Debate & Discussion',
  ADVANCED_STEM: 'Advanced STEM',
  NATURE: 'Nature',
  COUNTING: 'Counting & Numbers',
  COLORS: 'Colors & Art',
  STORIES: 'Stories',
  SPORTS: 'Sports & Athletes',
  MATH: 'Mathematics',
  ALGORITHMS: 'Algorithms & Computer Science',
}

// Blocked topic categories (never allowed for any tier)
export const ALWAYS_BLOCKED_TOPICS = [
  'violence',
  'self-harm',
  'suicide',
  'adult content',
  'drugs',
  'alcohol',
  'gambling',
  'weapons',
]

export const MAX_DAILY_MINUTES_DEFAULT = 60
export const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000 // 8 hours
