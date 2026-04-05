import type { Question } from '@/lib/supabase/types'

export interface RoundConfig {
  duration: number        // secondes
  questions?: Question[]  // questions si applicable
  [key: string]: unknown
}

export interface PlayerSubmission {
  playerId: string
  value: unknown
  timestamp: number       // Date.now() quand le joueur a soumis
  startedAt: number       // Date.now() quand la manche a commencé
}

export interface GameModule {
  id: string
  label: string
  icon: string
  defaultDuration: number
  minPlayers: number
  generateConfig(questions: Question[]): RoundConfig
  computeScore(submission: PlayerSubmission, config: RoundConfig): number
  Component: React.ComponentType<GameProps>
}

export interface GameProps {
  config: RoundConfig
  playerId: string
  timeLeft: number
  onSubmit: (value: unknown) => void
  isHost: boolean
  disabled: boolean
  /** Send a broadcast event (shared channel from game page) */
  send?: (type: string, payload: unknown) => void
  /** Register a handler for broadcast events not handled by the game page */
  onBroadcast?: (handler: (event: string, payload: unknown) => void) => (() => void)
  /** Force end the round early (for multi-phase games like draw-guess) */
  onRoundComplete?: () => void
}

export type SubmissionStatus = 'pending' | 'submitted' | 'timeout'

export interface QuestionPool {
  gameType: string
  questions: Question[]
}
