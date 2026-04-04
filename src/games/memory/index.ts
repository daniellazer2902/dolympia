import type { GameModule } from '../types'
import { MemoryGame } from './MemoryGame'

export const memoryModule: GameModule = {
  id: 'memory',
  label: 'Memory',
  icon: '🧠',
  defaultDuration: 60,
  minPlayers: 1,
  generateConfig() {
    return { duration: 60 }
  },
  computeScore(submission) {
    const data = submission.value as { pairs?: number; flips?: number }
    const pairs = data?.pairs ?? 0
    const flips = data?.flips ?? 99
    if (pairs < 8) return pairs * 10 // incomplet
    // Toutes les paires : bonus basé sur le nombre de retournements (16 min = parfait)
    const efficiency = Math.max(0, 1 - (flips - 16) / 32)
    return Math.round(100 + efficiency * 100)
  },
  Component: MemoryGame,
}
