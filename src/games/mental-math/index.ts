import type { GameModule } from '../types'
import { MentalMathGame } from './MentalMathGame'
import { scoreWithSpeedBonus } from '../scoring'

export const mentalMathModule: GameModule = {
  id: 'mental-math',
  label: 'Calcul Mental',
  icon: '🧮',
  defaultDuration: 12,
  minPlayers: 1,
  generateConfig(questions) {
    return { duration: 12, questions: questions.slice(0, 1) }
  },
  computeScore(submission, config) {
    const question = config.questions?.[0]
    if (!question) return 0
    if (Number(submission.value) !== Number(question.answer)) return 0
    const elapsed = (submission.timestamp - submission.startedAt) / 1000
    const timeLeft = config.duration - elapsed
    return scoreWithSpeedBonus({
      correct: true,
      timeLeft,
      totalTime: config.duration,
      base: 100,
      bonus: 50,
    })
  },
  Component: MentalMathGame,
}
