import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Player, Round, Score } from '@/lib/supabase/types'

export type GamePhase =
  | 'lobby'
  | 'team_splash'
  | 'round_start'
  | 'playing'
  | 'inter_round'
  | 'finished'

interface GameStore {
  phase: GamePhase
  players: Player[]
  currentRound: Round | null
  roundScores: Score[]
  totalScores: Record<string, number>
  setPhase: (phase: GamePhase) => void
  setPlayers: (players: Player[]) => void
  updatePlayer: (playerId: string, data: Partial<Player>) => void
  setCurrentRound: (round: Round) => void
  setRoundScores: (scores: Score[]) => void
  accumulateScores: (scores: Score[]) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      phase: 'lobby',
      players: [],
      currentRound: null,
      roundScores: [],
      totalScores: {},
      setPhase: (phase) => set({ phase }),
      setPlayers: (players) => set({ players }),
      updatePlayer: (playerId, data) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === playerId ? { ...p, ...data } : p)),
        })),
      setCurrentRound: (currentRound) => set({ currentRound }),
      setRoundScores: (roundScores) => set({ roundScores }),
      accumulateScores: (scores) =>
        set((state) => {
          const next = { ...state.totalScores }
          for (const s of scores) {
            next[s.player_id] = (next[s.player_id] ?? 0) + s.points
          }
          return { totalScores: next }
        }),
      reset: () =>
        set({
          phase: 'lobby',
          players: [],
          currentRound: null,
          roundScores: [],
          totalScores: {},
        }),
    }),
    { name: 'dolympia-game' }
  )
)
