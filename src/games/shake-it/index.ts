import type { GameModule } from '../types'
import { ShakeItGame } from './ShakeItGame'

export const shakeItModule: GameModule = {
  id: 'shake-it',
  label: 'Shake It !',
  icon: '📱',
  defaultDuration: 10,
  minPlayers: 1,
  generateConfig() {
    return { duration: 10 }
  },
  computeScore(submission) {
    const shakes = Number(submission.value) || 0
    return Math.min(200, shakes * 5)
  },
  Component: ShakeItGame,
}
