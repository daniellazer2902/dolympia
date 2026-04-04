'use client'

import type { Player } from '@/lib/supabase/types'

interface PlayerListProps {
  players: Player[]
  localPlayerId: string
  showTeams?: boolean
}

const teamEmoji = { red: '🔴', blue: '🔵' } as const

export function PlayerList({ players, localPlayerId, showTeams }: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map(p => (
        <div
          key={p.id}
          className={`flex items-center justify-between p-3 rounded-xl border-2 ${
            p.id === localPlayerId ? 'border-fiesta-orange bg-fiesta-orange/10' : 'border-gray-100 bg-white'
          } ${!p.is_connected ? 'opacity-40' : ''}`}
        >
          <div className="flex items-center gap-2">
            {showTeams && p.team && <span>{teamEmoji[p.team]}</span>}
            <span className="font-bold">{p.pseudo}</span>
            {p.is_host && (
              <span className="text-xs bg-fiesta-yellow text-gray-700 px-2 py-0.5 rounded-full font-bold">Host</span>
            )}
            {p.id === localPlayerId && <span className="text-xs text-gray-400">(toi)</span>}
          </div>
          <span className={`w-2 h-2 rounded-full ${p.is_connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
      ))}
    </div>
  )
}
