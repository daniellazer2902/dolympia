import type { GameModule } from '../types'
import { ReflexGame } from './ReflexGame'

export const reflexModule: GameModule = {
  id: 'reflex',
  label: 'Réflexe',
  icon: '⚡',
  defaultDuration: 10,
  minPlayers: 1,
  generateConfig() {
    return { duration: 10 }
  },
  computeScore(submission) {
    const reaction = Number(submission.value)
    if (reaction <= 0 || reaction > 2000) return 0 // trop tôt ou pas de clic
    // Plus rapide = plus de points (max 200 pour <200ms, min 10 pour >1000ms)
    if (reaction < 200) return 200
    if (reaction > 1000) return 10
    return Math.round(200 - (reaction - 200) * (190 / 800))
  },
  Component: ReflexGame,
}
