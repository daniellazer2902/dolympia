'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Stats {
  questionsByType: Record<string, number>
  totalQuestions: number
  drawWords: number
  wordPairs: number
}

export function StatsOverview() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const [{ data: questions }, { data: words }, { data: pairs }] = await Promise.all([
        supabase.from('questions').select('game_type'),
        supabase.from('draw_words').select('id'),
        supabase.from('word_pairs').select('id'),
      ])

      const byType: Record<string, number> = {}
      for (const q of (questions ?? []) as { game_type: string }[]) {
        byType[q.game_type] = (byType[q.game_type] ?? 0) + 1
      }

      setStats({
        questionsByType: byType,
        totalQuestions: questions?.length ?? 0,
        drawWords: words?.length ?? 0,
        wordPairs: pairs?.length ?? 0,
      })
    }
    load()
  }, [])

  if (!stats) return <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Questions total" value={stats.totalQuestions} color="bg-fiesta-orange" />
        <StatCard label="Mots dessin" value={stats.drawWords} color="bg-fiesta-rose" />
        <StatCard label="Paires mots" value={stats.wordPairs} color="bg-blue-500" />
        <StatCard label="Types de jeu" value={Object.keys(stats.questionsByType).length} color="bg-emerald-500" />
      </div>

      <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
        <h3 className="font-bold text-fiesta-dark mb-3">Questions par type</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.questionsByType).sort(([,a],[,b]) => b - a).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm font-medium text-fiesta-dark">{type}</span>
              <span className="text-sm font-bold text-fiesta-orange">{count}</span>
            </div>
          ))}
          {Object.keys(stats.questionsByType).length === 0 && (
            <p className="text-sm text-fiesta-dark/50">Aucune question en base</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} text-white rounded-2xl p-4 text-center`}>
      <p className="text-3xl font-playful">{value}</p>
      <p className="text-xs font-medium opacity-90">{label}</p>
    </div>
  )
}
