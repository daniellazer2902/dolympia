import type { GameModule, PlayerSubmission } from '../types'
import { DrawGuessGame } from './DrawGuessGame'
import { fetchRandomWord } from '@/lib/supabase/draw-words'

export const drawGuessModule: GameModule = {
  id: 'draw-guess',
  label: 'Draw & Guess',
  icon: '🎨',
  defaultDuration: 60,
  minPlayers: 2,
  generateConfig: async function() {
    const word = await fetchRandomWord()
    return {
      duration: 60,
      word: word?.word ?? 'Chat',
      voteDuration: 8,
    }
  } as unknown as GameModule['generateConfig'],
  computeScore(submission: PlayerSubmission) {
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: DrawGuessGame,
}
