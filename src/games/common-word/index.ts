import type { GameModule } from '../types'
import { CommonWordGame } from './CommonWordGame'
import { fetchRandomPair } from '@/lib/supabase/word-pairs'

export const commonWordModule: GameModule = {
  id: 'common-word',
  label: 'Mot Commun',
  icon: '🤝',
  defaultDuration: 15,
  minPlayers: 2,
  generateConfig: async function() {
    const pair = await fetchRandomPair()
    return {
      duration: 15,
      wordA: pair?.word_a ?? 'Soleil',
      wordB: pair?.word_b ?? 'Plage',
    }
  } as unknown as GameModule['generateConfig'],
  computeScore() {
    return 0
  },
  Component: CommonWordGame,
}
