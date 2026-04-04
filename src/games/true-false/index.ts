import type { GameModule } from '../types'
import { TrueFalseGame } from './TrueFalseGame'
import { scoreWithSpeedBonus } from '../scoring'

export const trueFalseModule: GameModule = {
  id: 'true-false',
  label: 'Vrai ou Faux',
  icon: '✅',
  defaultDuration: 10,
  minPlayers: 1,
  generateConfig(questions) {
    return { duration: 10, questions: questions.slice(0, 1) }
  },
  computeScore(submission, config) {
    const question = config.questions?.[0]
    if (!question) return 0
    const isCorrect = submission.value === question.answer
    const elapsed = (submission.timestamp - submission.startedAt) / 1000
    return scoreWithSpeedBonus({
      correct: isCorrect,
      timeLeft: config.duration - elapsed,
      totalTime: config.duration,
      base: 100,
      bonus: 50,
    })
  },
  Component: TrueFalseGame,
}
