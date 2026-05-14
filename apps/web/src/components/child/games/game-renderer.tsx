import { MultipleChoiceWidget } from './multiple-choice'
import { GuessingGameWidget } from './guessing-game'
import { AnimalMatchWidget } from './animal-match'
import type { GameData } from './types'

interface Props {
  game: GameData
  tier: string
}

// Map tier to Tailwind bg class for the game header
const TIER_ACCENT: Record<string, string> = {
  EXPLORER: 'bg-green-500',
  BUILDER: 'bg-blue-500',
  CREATOR: 'bg-purple-600',
}

export function GameRenderer({ game, tier }: Props) {
  const accentColor = TIER_ACCENT[tier] ?? 'bg-indigo-500'

  if (game.type === 'multiple_choice') {
    return <MultipleChoiceWidget game={game} accentColor={accentColor} />
  }
  if (game.type === 'guessing') {
    return <GuessingGameWidget game={game} accentColor={accentColor} />
  }
  if (game.type === 'animal_match') {
    return <AnimalMatchWidget game={game} accentColor={accentColor} />
  }

  return null
}
