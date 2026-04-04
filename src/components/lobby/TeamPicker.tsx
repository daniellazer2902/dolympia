'use client'

import { getSupabaseClient } from '@/lib/supabase/client'

interface TeamPickerProps {
  playerId: string
  currentTeam: 'red' | 'blue' | null
  onTeamChange: (team: 'red' | 'blue') => void
}

export function TeamPicker({ playerId, currentTeam, onTeamChange }: TeamPickerProps) {
  async function choose(team: 'red' | 'blue') {
    const supabase = getSupabaseClient()
    await supabase.from('players').update({ team }).eq('id', playerId)
    onTeamChange(team)
  }

  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => choose('red')}
        className={`flex-1 py-4 rounded-2xl text-2xl font-bold border-4 transition-all ${
          currentTeam === 'red' ? 'border-red-500 bg-red-50 scale-105' : 'border-gray-200 bg-white'
        }`}
      >
        🔴 Rouge
      </button>
      <button
        onClick={() => choose('blue')}
        className={`flex-1 py-4 rounded-2xl text-2xl font-bold border-4 transition-all ${
          currentTeam === 'blue' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-200 bg-white'
        }`}
      >
        🔵 Bleu
      </button>
    </div>
  )
}
