import type { GameModule } from '../types'
import { TapSpamGame } from './TapSpamGame'

export const tapSpamModule: GameModule = {
  id: 'tap-spam',
  label: 'Tap Spam',
  icon: '👆',
  defaultDuration: 10,
  minPlayers: 1,
  generateConfig() {
    return { duration: 10 }
  },
  computeScore(submission) {
    const taps = Number(submission.value) || 0
    // 1 point par tap, max 200
    return Math.min(200, taps)
  },
  Component: TapSpamGame,
}
