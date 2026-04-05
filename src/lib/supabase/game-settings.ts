import { getSupabaseClient } from './client'
import type { GameSetting } from './types'

export async function fetchGameSettings(): Promise<GameSetting[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('game_settings').select().order('game_id')
  return (data ?? []) as GameSetting[]
}

export async function fetchEnabledGameIds(): Promise<string[]> {
  const settings = await fetchGameSettings()
  return settings.filter(s => s.enabled).map(s => s.game_id)
}

export async function toggleGameSetting(gameId: string, enabled: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('game_settings').update({ enabled, updated_at: new Date().toISOString() }).eq('game_id', gameId)
}

export async function updateGameDuration(gameId: string, duration: number | null): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('game_settings').update({ duration, updated_at: new Date().toISOString() }).eq('game_id', gameId)
}

export async function fetchGameDuration(gameId: string): Promise<number | null> {
  const settings = await fetchGameSettings()
  return settings.find(s => s.game_id === gameId)?.duration ?? null
}
