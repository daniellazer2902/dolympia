import type { GameModule } from '../types'
import { GeoGuessGame } from './GeoGuessGame'
import { scoreWithSpeedBonus } from '../scoring'

export const geoGuessModule: GameModule = {
  id: 'geo-guess',
  label: 'GeoGuess',
  icon: '🌍',
  defaultDuration: 15,
  minPlayers: 1,
  generateConfig(questions) {
    return { duration: 15, questions: questions.slice(0, 1) }
  },
  computeScore(submission, config) {
    const question = config.questions?.[0]
    if (!question) return 0
    const isCorrect =
      JSON.stringify(submission.value) === JSON.stringify(question.answer)
    const elapsed = (submission.timestamp - submission.startedAt) / 1000
    const timeLeft = config.duration - elapsed
    return scoreWithSpeedBonus({
      correct: isCorrect,
      timeLeft,
      totalTime: config.duration,
      base: 100,
      bonus: 50,
    })
  },
  Component: GeoGuessGame,
}
