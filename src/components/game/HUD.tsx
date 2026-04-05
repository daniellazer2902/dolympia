'use client'

import { Timer } from '@/components/ui/Timer'
import { getGame } from '@/games/registry'
import type { Round } from '@/lib/supabase/types'

interface HUDProps {
  round: Round
  roundNumber: number
  totalRounds: number
  timeLeft: number
  myScore: number
  myTeam?: 'red' | 'blue' | null
  teamScore?: number
}

const teamColors = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
}

export function HUD({ round, roundNumber, totalRounds, timeLeft, myScore, myTeam, teamScore }: HUDProps) {
  return (
    <div className="bg-white border-b-2 border-fiesta-orange/20 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-fiesta-dark/70">
          Manche {roundNumber}/{totalRounds}
        </span>
        <span className="font-bold text-fiesta-orange">
          {(() => { const g = getGame(round.game_type); return g ? `${g.icon} ${g.label}` : round.game_type })()}
        </span>
        {myTeam && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${teamColors[myTeam]}`}>
            {myTeam === 'red' ? '🔴' : '🔵'} {myTeam}
          </span>
        )}
      </div>

      <Timer seconds={timeLeft} total={(round.config.duration as number) ?? 30} />

      <div className="flex justify-between text-sm">
        <span>🏅 <strong>{myScore} pts</strong></span>
        {myTeam && teamScore !== undefined && (
          <span className="text-fiesta-dark/70">Équipe: <strong>{teamScore} pts</strong></span>
        )}
      </div>
    </div>
  )
}
