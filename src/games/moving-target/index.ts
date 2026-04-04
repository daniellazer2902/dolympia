import type { GameModule } from '../types'
import { MovingTargetGame } from './MovingTargetGame'

export const movingTargetModule: GameModule = {
  id: 'moving-target',
  label: 'Cible Mouvante',
  icon: '🎯',
  defaultDuration: 15,
  minPlayers: 1,
  generateConfig() {
    return { duration: 15 }
  },
  computeScore(submission) {
    const hits = Number(submission.value) || 0
    return Math.min(200, hits * 40)
  },
  Component: MovingTargetGame,
}
