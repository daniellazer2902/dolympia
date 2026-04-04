'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameProps } from '../types'

export function TapSpamGame({ timeLeft, onSubmit, disabled }: GameProps) {
  const [taps, setTaps] = useState(0)
  const [scale, setScale] = useState(1)
  const submittedRef = useRef(false)
  const tapsRef = useRef(0)

  // Keep ref in sync for the submit effect
  useEffect(() => {
    tapsRef.current = taps
  }, [taps])

  // Submit when disabled or time runs out
  useEffect(() => {
    if (submittedRef.current) return
    if (disabled || timeLeft <= 0) {
      submittedRef.current = true
      onSubmit(tapsRef.current)
    }
  }, [disabled, timeLeft, onSubmit])

  const handleTap = useCallback(() => {
    if (disabled || timeLeft <= 0) return
    setTaps((t) => t + 1)

    // Bounce animation
    setScale(0.85)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScale(1.1)
        setTimeout(() => setScale(1), 80)
      })
    })
  }, [disabled, timeLeft])

  const isFinished = disabled || timeLeft <= 0

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4 select-none">
      {/* Tap counter */}
      <div className="text-center">
        <p className="text-6xl font-playful font-bold text-fiesta-rose tabular-nums">
          {taps}
        </p>
        <p className="text-sm text-fiesta-dark/60 mt-1 font-medium uppercase tracking-wide">
          taps
        </p>
      </div>

      {/* Big tap button */}
      <button
        type="button"
        disabled={isFinished}
        onPointerDown={handleTap}
        className={[
          'relative w-44 h-44 rounded-full font-playful text-2xl text-white',
          'shadow-btn-rose active:shadow-none',
          'transition-shadow duration-75',
          'outline-none focus-visible:ring-4 focus-visible:ring-fiesta-rose/40',
          isFinished
            ? 'bg-gray-300 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-br from-fiesta-rose to-fiesta-orange cursor-pointer',
        ].join(' ')}
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 80ms cubic-bezier(.2,2,.5,1)',
        }}
      >
        <span className="pointer-events-none select-none text-5xl">
          {isFinished ? '🏁' : '👆'}
        </span>
      </button>

      {/* Time left hint */}
      <p
        className={[
          'text-lg font-playful tabular-nums',
          timeLeft <= 3 ? 'text-fiesta-red animate-pulse' : 'text-fiesta-dark/50',
        ].join(' ')}
      >
        {isFinished ? 'Terminé !' : `${timeLeft}s`}
      </p>
    </div>
  )
}
