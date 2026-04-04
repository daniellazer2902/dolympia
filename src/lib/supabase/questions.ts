import { getSupabaseClient } from './client'
import type { Question } from './types'
import { shuffleArray } from '@/lib/utils'

export async function fetchQuestions(
  gameType: string,
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('questions').select().eq('game_type', gameType)
  if (difficulty) query = query.eq('difficulty', difficulty)
  const { data } = await query.limit(count * 3)
  if (!data) return []
  return shuffleArray(data as Question[]).slice(0, count)
}

export async function fetchAllQuestions(gameType?: string): Promise<Question[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('questions').select().order('created_at', { ascending: false })
  if (gameType) query = query.eq('game_type', gameType)
  const { data } = await query
  return (data ?? []) as Question[]
}
