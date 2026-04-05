import type { GameModule, PlayerSubmission } from '../types'
import { RPSGame } from './RPSGame'

export const rpsModule: GameModule = {
  id: 'rock-paper-scissors',
  label: 'Pierre-Feuille-Ciseaux',
  icon: '✊',
  defaultDuration: 30,
  minPlayers: 2,
  generateConfig() {
    return { duration: 30, pairs: [], soloPlayer: null }
  },
  computeScore(submission: PlayerSubmission) {
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: RPSGame,
}
