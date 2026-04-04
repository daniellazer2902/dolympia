'use client'

import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'

export function RoundTransition() {
  const { roundScores, players, currentRound } = useGameStore()
  const { localPlayer } = useSessionStore()

  const sorted = [...players]
    .map(p => ({ ...p, pts: roundScores.find(s => s.player_id === p.id)?.points ?? 0 }))
    .sort((a, b) => b.pts - a.pts)

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4 bg-fiesta-bg">
      <h2 className="text-2xl font-playful text-fiesta-orange">
        Manche {currentRound?.round_number} terminée !
      </h2>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-3 rounded-xl border-2 ${
              p.id === localPlayer?.id
                ? 'border-fiesta-orange bg-fiesta-orange/10'
                : 'border-gray-100 bg-white'
            }`}
          >
            <span className="font-bold text-fiesta-dark/70">#{i + 1}</span>
            <span className="font-bold flex-1 ml-3">{p.pseudo}</span>
            <span className="font-bold text-fiesta-orange">+{p.pts} pts</span>
          </div>
        ))}
      </div>
      <p className="text-fiesta-dark/60 text-sm animate-pulse">Prochaine manche dans 3s...</p>
    </div>
  )
}
