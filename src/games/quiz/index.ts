import type { GameModule } from '../types'
import { QuizGame } from './QuizGame'
import { scoreWithSpeedBonus, answerEquals } from '../scoring'

export const quizModule: GameModule = {
  id: 'quiz',
  label: 'Quiz',
  icon: '❓',
  defaultDuration: 30,
  minPlayers: 1,
  generateConfig(questions) {
    return { duration: 30, questions: questions.slice(0, 3) }
  },
  computeScore(submission, config) {
    const questions = config.questions ?? []
    const data = submission.value as { answers: { questionIndex: number; value: string; timestamp: number }[] }
    if (!data?.answers) return 0

    let total = 0
    for (const ans of data.answers) {
      const question = questions[ans.questionIndex]
      if (!question) continue
      const isCorrect = answerEquals(ans.value, question.answer)
      const elapsed = (ans.timestamp - submission.startedAt) / 1000
      const timeLeft = config.duration - elapsed
      total += scoreWithSpeedBonus({
        correct: isCorrect,
        timeLeft,
        totalTime: config.duration,
        base: 30,
        bonus: 20,
      })
    }
    return total
  },
  Component: QuizGame,
}
