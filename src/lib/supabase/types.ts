// Stub — will be replaced in Task 3 with full Supabase types
export interface Session {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'playing' | 'finished'
  mode: 'solo' | 'team'
  team_mode: 'auto' | 'manual' | null
  duration_min: number
  total_rounds: number
  current_round: number
  games_order: string[]
  created_at: string
}

export interface Player {
  id: string
  session_id: string
  pseudo: string
  team: 'red' | 'blue' | null
  is_host: boolean
  is_connected: boolean
  joined_at: string
}

export interface Round {
  id: string
  session_id: string
  round_number: number
  game_type: string
  config: Record<string, unknown>
  started_at: string | null
  ended_at: string | null
}

export interface Score {
  id: string
  round_id: string
  player_id: string
  points: number
  metadata: Record<string, unknown>
}

export interface Question {
  id: string
  game_type: string
  content: string
  options: unknown[]
  answer: unknown
  difficulty: 'easy' | 'medium' | 'hard'
  category: string | null
  created_at: string
}

export type GameEventType =
  | 'host:game_start'
  | 'host:game_go'
  | 'host:round_start'
  | 'host:round_end'
  | 'host:game_end'
  | 'host:team_assign'
  | 'host:config_update'
  | 'player:answer'
  | 'player:tap'
  | 'player:motion_score'
  | 'player:ready'

export interface BroadcastEvent<T = unknown> {
  type: GameEventType
  payload: T
}
