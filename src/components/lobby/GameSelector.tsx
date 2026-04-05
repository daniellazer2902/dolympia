'use client'

import { useState, useEffect } from 'react'
import { fetchEnabledGameIds } from '@/lib/supabase/game-settings'
import { getAllGames } from '@/games/registry'

interface GameSelectorProps {
  disabledGames: string[]
  onToggle: (gameId: string, disabled: boolean) => void
}

export function GameSelector({ disabledGames, onToggle }: GameSelectorProps) {
  const [enabledGlobal, setEnabledGlobal] = useState<string[]>([])

  useEffect(() => {
    fetchEnabledGameIds().then(setEnabledGlobal)
  }, [])

  const allGames = getAllGames()
  const visibleGames = allGames.filter(g => enabledGlobal.includes(g.id))

  if (visibleGames.length === 0) return null

  return (
    <div>
      <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Mini-jeux actifs</label>
      <div className="grid grid-cols-2 gap-2">
        {visibleGames.map(game => {
          const isDisabled = disabledGames.includes(game.id)
          return (
            <button
              key={game.id}
              onClick={() => onToggle(game.id, !isDisabled)}
              className={`flex items-center gap-2 p-2 rounded-xl border-2 text-sm font-bold transition-all ${
                isDisabled
                  ? 'border-gray-200 bg-gray-100 text-fiesta-dark/40 line-through'
                  : 'border-fiesta-orange/30 bg-white text-fiesta-dark'
              }`}
            >
              <span>{game.icon}</span>
              <span className="truncate">{game.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-fiesta-dark/50 mt-1">
        {visibleGames.length - disabledGames.filter(id => visibleGames.some(g => g.id === id)).length} jeux activés sur {visibleGames.length}
      </p>
    </div>
  )
}
