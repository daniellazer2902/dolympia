'use client'

import { useState, useEffect } from 'react'
import { fetchGameSettings, toggleGameSetting, updateGameDuration } from '@/lib/supabase/game-settings'
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

  async function handleDurationChange(gameId: string, value: string) {
    const duration = value === '' ? null : parseInt(value)
    if (value !== '' && (isNaN(duration!) || duration! < 1)) return
    await updateGameDuration(gameId, duration)
    setSettings(prev => prev.map(s => s.game_id === gameId ? { ...s, duration } : s))
  }

  if (loading) return <p className="text-fiesta-dark/60 animate-pulse">Chargement...</p>

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-gray-100">
      <h3 className="font-bold text-fiesta-dark mb-4">Gestion des jeux</h3>
      <div className="flex flex-col gap-2">
        {allGames.map(game => {
          const setting = settings.find(s => s.game_id === game.id)
          const enabled = setting?.enabled ?? true
          const duration = setting?.duration ?? null

          return (
            <div
              key={game.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}
            >
              {/* Icône + label */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl shrink-0">{game.icon}</span>
                <div className="min-w-0">
                  <span className="font-bold text-fiesta-dark text-sm block truncate">{game.label}</span>
                </div>
              </div>

              {/* Durée */}
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="300"
                  placeholder={String(game.defaultDuration)}
                  value={duration ?? ''}
                  onChange={e => handleDurationChange(game.id, e.target.value)}
                  className="w-14 border-2 border-gray-200 rounded-lg px-2 py-1 text-xs text-center text-fiesta-dark font-bold focus:outline-none focus:border-fiesta-orange"
                />
                <span className="text-xs text-fiesta-dark/40">s</span>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(game.id, !enabled)}
                className={`w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-fiesta-dark/40 mt-3">
        Durée : laissez vide pour la valeur par défaut du jeu. Modifiable en secondes.
      </p>
    </div>
  )
}
