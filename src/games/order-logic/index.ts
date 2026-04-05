import type { GameModule } from '../types'
import { OrderLogicGame } from './OrderLogicGame'

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
    // answer peut être un string JSON ou un tableau déjà parsé (double jsonb)
    const rawAnswer = question.answer
    const answer: string[] = typeof rawAnswer === 'string' ? JSON.parse(rawAnswer) : rawAnswer as string[]
    const submitted = submission.value as string[]
    if (!Array.isArray(submitted) || !Array.isArray(answer)) return 0
    // 20 points par mot bien placé
    let correct = 0
    for (let i = 0; i < answer.length; i++) {
      if (submitted[i] === answer[i]) correct++
    }
    return correct * 30
  },
  Component: OrderLogicGame,
}
