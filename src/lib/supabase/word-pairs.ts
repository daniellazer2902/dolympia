import { getSupabaseClient } from './client'
import { shuffleArray } from '@/lib/utils'
import type { WordPair } from './types'

export async function fetchRandomPair(): Promise<WordPair | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').select()
  if (!data || data.length === 0) return null
  return shuffleArray(data as WordPair[])[0]
}

export async function fetchAllWordPairs(): Promise<WordPair[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').select().order('created_at', { ascending: false })
  return (data ?? []) as WordPair[]
}

export async function createWordPair(wordA: string, wordB: string, category: string | null): Promise<WordPair | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').insert({ word_a: wordA, word_b: wordB, category }).select().single()
  return data as WordPair | null
}

export async function updateWordPair(id: string, wordA: string, wordB: string, category: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('word_pairs').update({ word_a: wordA, word_b: wordB, category }).eq('id', id)
}

export async function deleteWordPair(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('word_pairs').delete().eq('id', id)
}
