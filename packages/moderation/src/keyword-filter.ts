import type { TopicCategory, ModerationResult } from '@kidai/shared'
import { TOPIC_LABELS, ALWAYS_BLOCKED_TOPICS } from '@kidai/shared'

// Patterns that should never appear in a children's platform
const HARD_BLOCKED_PATTERNS = [
  // Phone numbers — requires clear formatting (not random 10-digit numbers)
  /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
  // Email addresses
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  // URLs (prevent external links)
  /https?:\/\/[^\s]+/,
  /www\.[a-z0-9-]+\.[a-z]{2,}/i,
]

// Topic keyword maps — if child mentions these and topic is blocked, intercept
const TOPIC_KEYWORDS: Record<TopicCategory, string[]> = {
  ANIMALS: ['animal', 'pet', 'dog', 'cat', 'bird', 'fish', 'zoo'],
  SCIENCE: ['science', 'experiment', 'chemistry', 'biology', 'physics', 'atom', 'molecule'],
  HISTORY: ['history', 'historical', 'ancient', 'war', 'empire', 'civilization', 'century'],
  GEOGRAPHY: ['geography', 'country', 'continent', 'mountain', 'river', 'ocean', 'map'],
  CREATIVE_WRITING: ['story', 'poem', 'write', 'fiction', 'character', 'plot', 'narrative'],
  CODING: ['code', 'coding', 'program', 'python', 'javascript', 'algorithm', 'function'],
  CURRENT_EVENTS: ['news', 'current', 'today', 'election', 'politics', 'government', 'president'],
  DEBATE: ['debate', 'argue', 'opinion', 'perspective', 'agree', 'disagree', 'controversial'],
  ADVANCED_STEM: ['calculus', 'quantum', 'theorem', 'differential', 'integral', 'relativity'],
  NATURE: ['nature', 'tree', 'plant', 'forest', 'weather', 'season', 'flower'],
  COUNTING: ['count', 'number', 'math', 'add', 'subtract', 'multiply', 'divide'],
  COLORS: ['color', 'colour', 'red', 'blue', 'green', 'paint', 'draw', 'art'],
  STORIES: ['story', 'tale', 'once upon', 'fairy', 'fable', 'adventure', 'hero'],
  SPORTS: ['sport', 'athlete', 'football', 'soccer', 'basketball', 'swimming', 'tennis', 'olympic'],
  MATH: ['mathematics', 'algebra', 'geometry', 'equation', 'fraction', 'decimal', 'percentage', 'calculus', 'statistics', 'probability', 'theorem', 'proof'],
  ALGORITHMS: ['algorithm', 'sorting', 'searching', 'binary', 'complexity', 'recursion', 'big-o', 'data structure', 'graph', 'tree', 'hash'],
}

/**
 * Run keyword-based filtering:
 * 1. Check for hard-blocked patterns (PII, URLs)
 * 2. Check for always-blocked topics
 * 3. Check against parent-configured blocked topics and custom keywords
 */
export function runKeywordFilter(
  text: string,
  blockedTopics: TopicCategory[],
  customBlockedKeywords: string[]
): ModerationResult {
  const lower = text.toLowerCase()

  // 1. Hard-blocked patterns (PII / URLs)
  for (const pattern of HARD_BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        flagged: true,
        reason: 'pii_or_url_detected',
        score: 1,
      }
    }
  }

  // 2. Always-blocked topics
  for (const topic of ALWAYS_BLOCKED_TOPICS) {
    if (lower.includes(topic)) {
      return {
        flagged: true,
        reason: `always_blocked_topic:${topic}`,
        score: 1,
      }
    }
  }

  // 3. Custom parent-blocked keywords
  for (const keyword of customBlockedKeywords) {
    if (keyword && lower.includes(keyword.toLowerCase())) {
      return {
        flagged: true,
        reason: `custom_keyword:${keyword}`,
        score: 1,
      }
    }
  }

  // 4. Parent-blocked topic categories
  for (const blockedTopic of blockedTopics) {
    const keywords = TOPIC_KEYWORDS[blockedTopic] ?? []
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return {
          flagged: true,
          reason: `blocked_topic:${TOPIC_LABELS[blockedTopic]}`,
          score: 0.9,
        }
      }
    }
  }

  return { flagged: false }
}

// Stricter patterns for scanning AI output (we control what the AI writes)
const OUTPUT_PII_PATTERNS = [
  /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/, // phone numbers
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // email addresses
  /https?:\/\/[^\s]+/, // URLs
  /www\.[a-z0-9-]+\.[a-z]{2,}/i, // bare domains
  /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/i, // street addresses
]

/**
 * Scan AI output for PII patterns that should never be in a response
 * (e.g. if the AI accidentally generates a phone number or address)
 */
export function scanOutputForPII(text: string): ModerationResult {
  for (const pattern of OUTPUT_PII_PATTERNS) {
    if (pattern.test(text)) {
      return {
        flagged: true,
        reason: 'pii_in_output',
        score: 1,
      }
    }
  }
  return { flagged: false }
}
