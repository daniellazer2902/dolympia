import { getSupabaseClient } from './client'
import { shuffleArray } from '@/lib/utils'
import type { DrawWord } from './types'

export async function fetchRandomWord(): Promise<DrawWord | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').select()
  if (!data || data.length === 0) return null
  return shuffleArray(data as DrawWord[])[0]
}

export async function fetchAllDrawWords(): Promise<DrawWord[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').select().order('created_at', { ascending: false })
  return (data ?? []) as DrawWord[]
}

export async function createDrawWord(word: string, category: string | null): Promise<DrawWord | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').insert({ word, category }).select().single()
  return data as DrawWord | null
}

export async function updateDrawWord(id: string, word: string, category: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('draw_words').update({ word, category }).eq('id', id)
}

export async function deleteDrawWord(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('draw_words').delete().eq('id', id)
}
