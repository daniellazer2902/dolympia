interface SpeedBonusParams {
  correct: boolean
  timeLeft: number
  totalTime: number
  base: number
  bonus: number
}

export function scoreWithSpeedBonus({ correct, timeLeft, totalTime, base, bonus }: SpeedBonusParams): number {
  if (!correct) return 0
  const speedBonus = totalTime > 0 ? Math.round((timeLeft / totalTime) * bonus) : 0
  return base + speedBonus
}

/** Score basé sur le classement (tap spam, shake it, réflexe) */
export function scoreByRank(rank: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 100
  const max = 100
  const min = 10
  return Math.round(max - ((rank - 1) / (totalPlayers - 1)) * (max - min))
}

/** Compare une soumission à la réponse DB (gère string JSON ou valeur parsée) */
export function answerEquals(submitted: unknown, answer: unknown): boolean {
  // Normaliser : si answer est un string JSON, le parser
  const normalizedAnswer = typeof answer === 'string'
    ? (() => { try { return JSON.parse(answer) } catch { return answer } })()
    : answer
  // Comparaison simple pour les strings
  if (typeof submitted === 'string' && typeof normalizedAnswer === 'string') {
    return submitted === normalizedAnswer
  }
  // Comparaison par sérialisation pour les objets/arrays
  return JSON.stringify(submitted) === JSON.stringify(normalizedAnswer)
}

/** Score partiel pour ordre logique */
export function scorePartial(correct: number, total: number, max: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * max)
}
