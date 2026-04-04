'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'

export function RoundTransition() {
  const { roundScores, players, currentRound, totalScores } = useGameStore()
  const { localPlayer } = useSessionStore()
  const [countdown, setCountdown] = useState(3)

  // Countdown visuel 3, 2, 1
  useEffect(() => {
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const sorted = [...players]
    .map(p => ({
      ...p,
      pts: roundScores.find(s => s.player_id === p.id)?.points ?? 0,
      total: totalScores[p.id] ?? 0,
    }))
    .sort((a, b) => b.pts - a.pts)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5 bg-fiesta-bg">
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
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-bold text-fiesta-dark/70 w-8">#{i + 1}</span>
            <span className="font-bold flex-1 text-fiesta-dark">{p.pseudo}</span>
            <div className="text-right">
              <span className="font-bold text-fiesta-orange">+{p.pts}</span>
              <span className="text-fiesta-dark/50 text-sm ml-2">({p.total} total)</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl font-playful text-fiesta-orange">{countdown}</span>
        <p className="text-fiesta-dark/60 text-sm">Prochaine manche...</p>
      </div>
    </div>
  )
}
