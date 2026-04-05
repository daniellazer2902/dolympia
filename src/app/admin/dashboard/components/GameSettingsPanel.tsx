'use client'

import { useState, useEffect } from 'react'
import { fetchGameSettings, toggleGameSetting } from '@/lib/supabase/game-settings'
import { getAllGames } from '@/games/registry'
import type { GameSetting } from '@/lib/supabase/types'

export function GameSettingsPanel() {
  const [settings, setSettings] = useState<GameSetting[]>([])
  const [loading, setLoading] = useState(true)

  const allGames = getAllGames()

  useEffect(() => {
    fetchGameSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  async function handleToggle(gameId: string, enabled: boolean) {
    await toggleGameSetting(gameId, enabled)
    setSettings(prev => prev.map(s => s.game_id === gameId ? { ...s, enabled } : s))
  }

  if (loading) return <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
      <h3 className="font-bold text-fiesta-dark mb-4">Activation / Désactivation des jeux</h3>
      <div className="flex flex-col gap-2">
        {allGames.map(game => {
          const setting = settings.find(s => s.game_id === game.id)
          const enabled = setting?.enabled ?? true

          return (
            <div
              key={game.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{game.icon}</span>
                <div>
                  <span className="font-bold text-fiesta-dark text-sm">{game.label}</span>
                  <span className="text-xs text-fiesta-dark/50 ml-2">{game.id}</span>
                </div>
              </div>
              <button
                onClick={() => handleToggle(game.id, !enabled)}
                className={`w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
