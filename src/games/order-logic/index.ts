import type { GameModule } from '../types'
import { OrderLogicGame } from './OrderLogicGame'
import { scoreWithSpeedBonus } from '../scoring'

export const orderLogicModule: GameModule = {
  id: 'order-logic',
  label: 'Ordre Logique',
  icon: '🔢',
  defaultDuration: 20,
  minPlayers: 1,
  generateConfig(questions) {
    return { duration: 20, questions: questions.slice(0, 1) }
  },
  computeScore(submission, config) {
    const question = config.questions?.[0]
    if (!question) return 0
    const answer = JSON.parse(JSON.stringify(question.answer)) as string[]
    const submitted = submission.value as string[]
    if (!Array.isArray(submitted)) return 0
    // Compter les elements correctement places
    let correct = 0
    for (let i = 0; i < answer.length; i++) {
      if (submitted[i] === answer[i]) correct++
    }
    const ratio = correct / answer.length
    if (ratio < 1) return Math.round(ratio * 80) // partiel
    // Tout correct : bonus vitesse
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
  Component: OrderLogicGame,
}
