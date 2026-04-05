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
    // Le composant soumet "Vrai"/"Faux" (string), la DB stocke true/false (boolean)
    const submittedBool = submission.value === 'Vrai' ? true : submission.value === 'Faux' ? false : submission.value
    const answerRaw = question.answer
    const answerBool = typeof answerRaw === 'string'
      ? (answerRaw === 'true' || answerRaw === '"true"')
      : answerRaw === true
    const isCorrect = submittedBool === answerBool
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
