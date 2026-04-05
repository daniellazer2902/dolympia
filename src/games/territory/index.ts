import type { GameModule, PlayerSubmission } from '../types'
import { TerritoryGame } from './TerritoryGame'

export const PLAYER_COLORS = [
  '#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

export const territoryModule: GameModule = {
  id: 'territory',
  label: 'Territory',
  icon: '🗺️',
  defaultDuration: 20,
  minPlayers: 2,
  generateConfig() {
    return {
      duration: 20,
      gridSize: 10,
      playerColors: {} as Record<string, string>,
    }
  },
  computeScore(submission: PlayerSubmission) {
    const cellCount = submission.value as number
    return typeof cellCount === 'number' ? cellCount * 3 : 0
  },
  Component: TerritoryGame,
}
