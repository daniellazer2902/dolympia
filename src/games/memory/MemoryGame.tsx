'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

const EMOJIS = ['🎮', '🎲', '🎯', '🏆', '🎪', '🎨', '🎭', '🎵']
const TOTAL_PAIRS = EMOJIS.length

/** Shuffle with Fisher-Yates */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(): string[] {
  return shuffle([...EMOJIS, ...EMOJIS])
}

export function MemoryGame({ onSubmit, disabled }: GameProps) {
  const [cards] = useState(buildDeck)
  const [flipped, setFlipped] = useState<number[]>([])     // indices currently face-up (max 2)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [totalFlips, setTotalFlips] = useState(0)
  const [pairsFound, setPairsFound] = useState(0)
  const submittedRef = useRef(false)
  const lockRef = useRef(false)                             // prevent clicks during mismatch delay

  // Check for completion
  useEffect(() => {
    if (pairsFound === TOTAL_PAIRS && !submittedRef.current) {
      submittedRef.current = true
      onSubmit({ pairs: TOTAL_PAIRS, flips: totalFlips })
    }
  }, [pairsFound, totalFlips, onSubmit])

  const handleFlip = useCallback((index: number) => {
    if (disabled || lockRef.current) return
    if (matched.has(index)) return        // already matched
    if (flipped.includes(index)) return   // already face-up

    const next = [...flipped, index]
    setFlipped(next)
    setTotalFlips(prev => prev + 1)

    if (next.length === 2) {
      const [a, b] = next
      if (cards[a] === cards[b]) {
        // Match found
        setMatched(prev => {
          const s = new Set(prev)
          s.add(a)
          s.add(b)
          return s
        })
        setPairsFound(prev => prev + 1)
        setFlipped([])
      } else {
        // Mismatch — lock, wait 800ms, then flip back
        lockRef.current = true
        setTimeout(() => {
          setFlipped([])
          lockRef.current = false
        }, 800)
      }
    }
  }, [disabled, flipped, matched, cards])

  const isFaceUp = (i: number) => flipped.includes(i) || matched.has(i)
  const done = pairsFound === TOTAL_PAIRS

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 font-playful text-fiesta-dark">
        <span className="text-lg">
          Paires : <span className="text-fiesta-orange font-bold">{pairsFound}/{TOTAL_PAIRS}</span>
        </span>
        <span className="text-lg">
          Retournements : <span className="text-fiesta-rose font-bold">{totalFlips}</span>
        </span>
      </div>

      {/* Grid 4x4 */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-sm mx-auto">
        {cards.map((emoji, i) => {
          const faceUp = isFaceUp(i)
          const isMatched = matched.has(i)

          return (
            <button
              key={i}
              type="button"
              disabled={disabled || done}
              onClick={() => handleFlip(i)}
              className="relative aspect-square [perspective:600px] select-none"
              aria-label={faceUp ? emoji : 'Carte cachée'}
            >
              <div
                className={`
                  relative w-full h-full transition-transform duration-500
                  [transform-style:preserve-3d]
                  ${faceUp ? '[transform:rotateY(180deg)]' : ''}
                `}
              >
                {/* Back (default visible side) */}
                <div
                  className={`
                    absolute inset-0 flex items-center justify-center rounded-2xl
                    bg-gradient-to-br from-fiesta-orange to-fiesta-rose
                    text-white text-3xl font-playful shadow-btn-orange
                    [backface-visibility:hidden]
                    ${!faceUp && !disabled ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}
                    transition-all duration-200
                  `}
                >
                  ?
                </div>

                {/* Front (emoji side, rotated 180 so it faces forward when flipped) */}
                <div
                  className={`
                    absolute inset-0 flex items-center justify-center rounded-2xl
                    bg-white border-2
                    ${isMatched ? 'border-fiesta-yellow shadow-btn-yellow' : 'border-fiesta-orange/30'}
                    text-4xl [backface-visibility:hidden] [transform:rotateY(180deg)]
                    transition-all duration-200
                  `}
                >
                  {emoji}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Completion message */}
      {done && (
        <div className="text-center animate-bounce">
          <p className="font-playful text-3xl text-fiesta-orange drop-shadow-lg">
            🎉 Bravo !
          </p>
          <p className="text-fiesta-dark mt-1">
            {totalFlips} retournements
          </p>
        </div>
      )}
    </div>
  )
}
