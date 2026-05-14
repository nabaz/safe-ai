// ── Game JSON schema ──────────────────────────────────────────────────────────
// The AI outputs a ```game ... ``` code block containing one of these shapes.
// The chat UI parses it and renders the appropriate game widget.

export type GameType = 'multiple_choice' | 'guessing' | 'animal_match'

// ── Multiple Choice ───────────────────────────────────────────────────────────
export interface MultipleChoiceGame {
  type: 'multiple_choice'
  title: string
  questions: {
    question: string
    options: string[]       // 3–4 options
    correct: number         // 0-indexed
    explanation: string     // shown after answering
  }[]
}

// ── Guessing Game ─────────────────────────────────────────────────────────────
export interface GuessingGame {
  type: 'guessing'
  title: string
  subject: string           // e.g. "a number between 1 and 20"
  answer: number | string
  hints: string[]           // revealed one at a time
  countdownSeconds: number  // e.g. 30
  successMessage: string
  failMessage: string
}

// ── Animal Match ──────────────────────────────────────────────────────────────
export interface AnimalMatchGame {
  type: 'animal_match'
  title: string
  instruction: string       // e.g. "Match each animal to where it lives!"
  pairs: {
    animal: string          // e.g. "🦁 Lion"
    match: string           // e.g. "Savanna"
  }[]
}

export type GameData = MultipleChoiceGame | GuessingGame | AnimalMatchGame

/**
 * Parse a game JSON block from AI output.
 * Returns null if the content is not valid game JSON.
 */
export function parseGameBlock(content: string): GameData | null {
  try {
    // Match ```game ... ``` block
    const match = content.match(/```game\s*([\s\S]*?)```/)
    if (!match?.[1]) return null
    const data = JSON.parse(match[1].trim())
    if (!data.type || !['multiple_choice', 'guessing', 'animal_match'].includes(data.type)) {
      return null
    }
    return data as GameData
  } catch {
    return null
  }
}

/**
 * Extract the text before/after the game block (intro message from AI)
 */
export function extractGameParts(content: string): { intro: string; game: GameData | null; outro: string } {
  const match = content.match(/([\s\S]*?)```game\s*([\s\S]*?)```([\s\S]*)/)
  if (!match) return { intro: content, game: null, outro: '' }

  let game: GameData | null = null
  try {
    game = JSON.parse(match[2].trim()) as GameData
  } catch {
    return { intro: content, game: null, outro: '' }
  }

  return {
    intro: match[1].trim(),
    game,
    outro: match[3].trim(),
  }
}
