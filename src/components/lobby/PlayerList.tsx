'use client'

import { motion } from 'framer-motion'
import type { Player } from '@/lib/supabase/types'

interface PlayerListProps {
  players: Player[]
  localPlayerId: string
  showTeams?: boolean
  isHost?: boolean
  onKick?: (playerId: string) => void
}

const teamEmoji = { red: '🔴', blue: '🔵' } as const

const PLAYER_COLORS = [
  'text-fiesta-orange',
  'text-fiesta-rose',
  'text-blue-600',
  'text-emerald-600',
  'text-purple-600',
  'text-amber-600',
  'text-cyan-600',
  'text-red-600',
  'text-indigo-600',
  'text-teal-600',
]

export function PlayerList({ players, localPlayerId, showTeams, isHost, onKick }: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className={`flex items-center justify-between p-3 rounded-xl border-2 ${
            p.id === localPlayerId ? 'border-fiesta-orange bg-fiesta-orange/10' : 'border-gray-200 bg-white'
          } ${!p.is_connected ? 'opacity-40' : ''}`}
        >
          <div className="flex items-center gap-2">
            {showTeams && p.team && <span>{teamEmoji[p.team]}</span>}
            <span className={`font-bold ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`}>
              {p.pseudo}
            </span>
            {p.is_host && (
              <span className="text-xs bg-fiesta-yellow text-fiesta-dark px-2 py-0.5 rounded-full font-bold">Host</span>
            )}
            {p.id === localPlayerId && <span className="text-xs text-fiesta-dark/60 font-medium">(toi)</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${p.is_connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            {isHost && !p.is_host && onKick && (
              <button
                onClick={() => onKick(p.id)}
                className="text-xs text-fiesta-dark/40 hover:text-fiesta-rose transition-colors px-1"
                title={`Exclure ${p.pseudo}`}
              >
                ✕
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
