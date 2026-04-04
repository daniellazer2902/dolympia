'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GameProps } from '../types'

type Phase = 'waiting' | 'ready' | 'tooEarly' | 'done'

export function ReflexGame({ onSubmit, disabled }: GameProps) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [reactionMs, setReactionMs] = useState<number | null>(null)
  const greenAtRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Schedule the green flash on mount
  useEffect(() => {
    const delay = 2000 + Math.random() * 3000 // 2-5s
    timeoutRef.current = setTimeout(() => {
      greenAtRef.current = performance.now()
      setPhase('ready')
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleClick = useCallback(() => {
    if (disabled) return

    if (phase === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setPhase('tooEarly')
      // Submit a penalty value (> 2000 means no score)
      onSubmit(9999)
    } else if (phase === 'ready') {
      const ms = Math.round(performance.now() - greenAtRef.current)
      setReactionMs(ms)
      setPhase('done')
      onSubmit(ms)
    }
  }, [phase, disabled, onSubmit])

  const resetAfterTooEarly = useCallback(() => {
    setPhase('waiting')
    const delay = 2000 + Math.random() * 3000
    timeoutRef.current = setTimeout(() => {
      greenAtRef.current = performance.now()
      setPhase('ready')
    }, delay)
  }, [])

  /* ----- Render helpers ----- */

  if (phase === 'tooEarly') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl cursor-pointer select-none
                   bg-fiesta-rose text-white transition-colors duration-200"
        onClick={resetAfterTooEarly}
      >
        <span className="text-6xl mb-4 animate-bounce">💥</span>
        <h2 className="font-playful text-4xl md:text-5xl drop-shadow-lg mb-2">
          Trop tôt !
        </h2>
        <p className="text-lg opacity-90">Clique pour réessayer</p>
      </div>
    )
  }

  if (phase === 'done' && reactionMs !== null) {
    const fast = reactionMs < 300
    const slow = reactionMs > 800
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl
                      bg-fiesta-bg text-fiesta-dark">
        <span className="text-6xl mb-4">{fast ? '🔥' : slow ? '🐢' : '⚡'}</span>
        <h2 className="font-playful text-3xl md:text-4xl mb-2">
          {fast ? 'Ultra rapide !' : slow ? 'Pas mal...' : 'Bien joué !'}
        </h2>
        <p className="font-playful text-6xl md:text-7xl text-fiesta-orange drop-shadow-lg">
          {reactionMs} <span className="text-3xl">ms</span>
        </p>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl cursor-pointer select-none
                   bg-emerald-500 text-white transition-colors duration-100 animate-pulse"
        onClick={handleClick}
      >
        <span className="text-7xl mb-4">🟢</span>
        <h2 className="font-playful text-5xl md:text-6xl drop-shadow-lg">
          MAINTENANT !
        </h2>
      </div>
    )
  }

  // phase === 'waiting'
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl cursor-pointer select-none
                 bg-gradient-to-br from-fiesta-orange to-fiesta-rose text-white transition-colors duration-200"
      onClick={handleClick}
    >
      <span className="text-7xl mb-4 animate-pulse">🔴</span>
      <h2 className="font-playful text-4xl md:text-5xl drop-shadow-lg">
        Attends...
      </h2>
      <p className="mt-3 text-lg opacity-80 animate-pulse">
        Ne clique pas encore !
      </p>
    </div>
  )
}
