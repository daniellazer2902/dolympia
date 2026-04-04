'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GameProps } from '../types'

function randomPos(areaW: number, areaH: number, size: number) {
  const x = Math.random() * Math.max(0, areaW - size)
  const y = Math.random() * Math.max(0, areaH - size)
  return { x, y }
}

const TARGET_SIZE = 64
const VISIBLE_MS = 1500

export function MovingTargetGame({ timeLeft, onSubmit, disabled }: GameProps) {
  const [hits, setHits] = useState(0)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [flash, setFlash] = useState(false)

  const areaRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)
  const hitsRef = useRef(0)

  // Keep hitsRef in sync
  hitsRef.current = hits

  const spawnTarget = useCallback(() => {
    const area = areaRef.current
    if (!area) return
    const { clientWidth: w, clientHeight: h } = area
    const newPos = randomPos(w, h, TARGET_SIZE)
    setPos(newPos)
    setAnimKey((k) => k + 1)

    // Auto-move after VISIBLE_MS if not clicked
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      spawnTarget()
    }, VISIBLE_MS)
  }, [])

  // Spawn first target on mount
  useEffect(() => {
    // Small delay so the area has rendered
    const id = setTimeout(() => spawnTarget(), 300)
    return () => {
      clearTimeout(id)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [spawnTarget])

  // Submit when time runs out or disabled
  useEffect(() => {
    if ((timeLeft <= 0 || disabled) && !submittedRef.current) {
      submittedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      setPos(null)
      onSubmit(hitsRef.current)
    }
  }, [timeLeft, disabled, onSubmit])

  const handleTargetClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled || submittedRef.current) return

      const newHits = hitsRef.current + 1
      setHits(newHits)
      hitsRef.current = newHits

      // Flash feedback
      setFlash(true)
      setTimeout(() => setFlash(false), 200)

      // Clear current timer and spawn new target
      if (timerRef.current) clearTimeout(timerRef.current)
      spawnTarget()
    },
    [disabled, spawnTarget],
  )

  const isFinished = submittedRef.current || timeLeft <= 0 || disabled

  return (
    <div className="flex flex-col items-center w-full h-full min-h-[60vh] gap-3">
      {/* Score display */}
      <div className="flex items-center gap-3 select-none">
        <span className="text-3xl">🎯</span>
        <span className="font-playful text-5xl md:text-6xl text-fiesta-rose drop-shadow-lg tabular-nums">
          {hits}
        </span>
      </div>

      {/* Game area */}
      <div
        ref={areaRef}
        className={`
          relative flex-1 w-full rounded-3xl border-2 border-fiesta-rose/30
          bg-gradient-to-br from-fiesta-bg to-white overflow-hidden cursor-crosshair
          transition-colors duration-200
          ${flash ? 'bg-fiesta-rose/10' : ''}
        `}
      >
        {isFinished ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl mb-3">
              {hits >= 8 ? '🔥' : hits >= 4 ? '👏' : '🎯'}
            </span>
            <p className="font-playful text-3xl md:text-4xl text-fiesta-dark">
              {hits} cible{hits !== 1 ? 's' : ''} !
            </p>
          </div>
        ) : (
          pos && (
            <button
              key={animKey}
              onClick={handleTargetClick}
              className="absolute rounded-full bg-gradient-to-br from-fiesta-rose to-fiesta-orange
                         border-4 border-white shadow-lg cursor-pointer select-none
                         flex items-center justify-center
                         hover:scale-110 active:scale-90
                         transition-transform duration-100
                         animate-target-pop"
              style={{
                width: TARGET_SIZE,
                height: TARGET_SIZE,
                left: pos.x,
                top: pos.y,
              }}
              aria-label="Cible"
            >
              <span className="text-2xl pointer-events-none">🎯</span>
            </button>
          )
        )}
      </div>

    </div>
  )
}
