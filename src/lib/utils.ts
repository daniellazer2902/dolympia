const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSessionCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

/**
 * Calcule le nombre de manches recommandé.
 * Formule : ceil(durée/4) + floor(joueurs/8), entre 1 et 12.
 */
export function computeRoundCount(durationMin: number, playerCount: number): number {
  const base = Math.ceil(durationMin / 4)
  const bonus = Math.floor(playerCount / 8)
  return Math.max(1, Math.min(12, base + bonus))
}

/** Fisher-Yates shuffle — retourne un nouveau tableau */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Assigne les équipes red/blue de façon équilibrée */
export function assignTeams(playerIds: string[]): Record<string, 'red' | 'blue'> {
  const shuffled = shuffleArray(playerIds)
  const half = Math.ceil(shuffled.length / 2)
  return shuffled.reduce<Record<string, 'red' | 'blue'>>((acc, id, i) => {
    acc[id] = i < half ? 'red' : 'blue'
    return acc
  }, {})
}

/**
 * Calcule le bonus de rapidité.
 * @param totalTime  durée totale en secondes
 * @param timeLeft   secondes restantes quand le joueur a répondu
 * @param maxBonus   bonus maximum possible
 */
export function computeSpeedBonus(totalTime: number, timeLeft: number, maxBonus: number): number {
  if (totalTime === 0) return 0
  return Math.round((timeLeft / totalTime) * maxBonus)
}
