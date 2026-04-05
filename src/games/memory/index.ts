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
    const base = pairs * 20
    // Bonus de 10 si toutes les 8 paires trouvées
    const bonus = pairs >= 8 ? 10 : 0
    return base + bonus
  },
  Component: MemoryGame,
}
