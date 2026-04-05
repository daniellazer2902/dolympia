import type { GameModule } from '../types'
import { MemoryGame } from './MemoryGame'

export const memoryModule: GameModule = {
  id: 'memory',
  label: 'Memory',
  icon: '🧠',
  defaultDuration: 30,
  minPlayers: 1,
  generateConfig() {
    return { duration: 30 }
  },
  computeScore(submission) {
    const data = submission.value as { pairs?: number }
    const pairs = data?.pairs ?? 0
    return pairs * 20
  },
  Component: MemoryGame,
}
