'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'

export function RoundTransition() {
  const { roundScores, players, currentRound, totalScores, lastAnswer, showAnswers } = useGameStore()
  const { localPlayer } = useSessionStore()
  const [countdown, setCountdown] = useState(3)

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

      {showAnswers && lastAnswer && (
        <div className="bg-white border-2 border-emerald-400 rounded-2xl px-5 py-3 max-w-sm w-full text-center">
          <p className="text-xs text-fiesta-dark/60 uppercase tracking-wide mb-1">
            {lastAnswer.includes('\n') ? 'Bonnes réponses' : 'Bonne réponse'}
          </p>
          {lastAnswer.includes('\n') ? (
            <div className="flex flex-col gap-1">
              {lastAnswer.split('\n').map((line, i) => (
                <p key={i} className="font-playful text-base text-emerald-600">{line}</p>
              ))}
            </div>
          ) : (
            <p className="font-playful text-lg text-emerald-600">{lastAnswer}</p>
          )}
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col gap-2">
        <AnimatePresence>
          {sorted.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl font-playful text-fiesta-orange">{countdown}</span>
        <p className="text-fiesta-dark/60 text-sm">Prochaine manche...</p>
      </div>
    </div>
  )
}
