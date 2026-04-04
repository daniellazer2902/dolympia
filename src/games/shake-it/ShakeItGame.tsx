'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameProps } from '../types'
import { useDeviceMotion } from './useDeviceMotion'

export function ShakeItGame({ timeLeft, onSubmit, disabled }: GameProps) {
  const { supported, shakeCount, requestPermission } = useDeviceMotion()
  const [desktopTaps, setDesktopTaps] = useState(0)
  const [permissionAsked, setPermissionAsked] = useState(false)

  // iOS : bloquer la popup "Annuler la saisie" déclenchée par le shake
  useEffect(() => {
    const blockUndo = (e: Event) => {
      const input = e as InputEvent
      if (input.inputType === 'historyUndo' || input.inputType === 'historyRedo') {
        e.preventDefault()
      }
    }
    document.addEventListener('beforeinput', blockUndo, { capture: true })
    return () => document.removeEventListener('beforeinput', blockUndo, { capture: true })
  }, [])
  const [btnScale, setBtnScale] = useState(1)
  const submittedRef = useRef(false)
  const countRef = useRef(0)

  const count = supported ? shakeCount : desktopTaps

  // Keep ref in sync
  useEffect(() => {
    countRef.current = count
  }, [count])

  // Submit when time runs out or disabled
  useEffect(() => {
    if (submittedRef.current) return
    if (disabled || timeLeft <= 0) {
      submittedRef.current = true
      onSubmit(countRef.current)
    }
  }, [disabled, timeLeft, onSubmit])

  const handleDesktopTap = useCallback(() => {
    if (disabled || timeLeft <= 0) return
    setDesktopTaps((t) => t + 1)

    // Bounce
    setBtnScale(0.85)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBtnScale(1.15)
        setTimeout(() => setBtnScale(1), 80)
      })
    })
  }, [disabled, timeLeft])

  const handlePermission = useCallback(async () => {
    await requestPermission()
    setPermissionAsked(true)
  }, [requestPermission])

  const isFinished = disabled || timeLeft <= 0

  // iOS permission gate
  if (supported === false && !permissionAsked && typeof window !== 'undefined') {
    // Check if it might be iOS needing permission
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DME?.requestPermission === 'function') {
      return (
        <div className="flex flex-col items-center justify-center gap-6 py-8 select-none">
          <p className="text-xl font-playful text-fiesta-dark text-center">
            Autorise le capteur de mouvement pour jouer !
          </p>
          <button
            type="button"
            onClick={handlePermission}
            className="px-8 py-4 rounded-2xl bg-gradient-to-br from-fiesta-yellow to-fiesta-orange text-white font-playful text-xl shadow-btn-orange active:shadow-none active:translate-y-1 transition-all"
          >
            Autoriser le capteur
          </button>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4 select-none">
      {/* Counter */}
      <div className="text-center">
        <p className="text-6xl font-playful font-bold text-fiesta-orange tabular-nums">
          {count}
        </p>
        <p className="text-sm text-fiesta-dark/60 mt-1 font-medium uppercase tracking-wide">
          {supported ? 'shakes' : 'taps'}
        </p>
      </div>

      {supported ? (
        /* Mobile: shake indicator */
        <div className="flex flex-col items-center gap-3">
          <span className={`text-8xl inline-block ${isFinished ? '' : 'animate-shake-vibrate'}`}>
            📱
          </span>
          <p className="text-lg font-playful text-fiesta-dark/80">
            {isFinished ? 'Terminé !' : 'Secoue ton téléphone !'}
          </p>
        </div>
      ) : (
        /* Desktop fallback: big tap button */
        <button
          type="button"
          disabled={isFinished}
          onPointerDown={handleDesktopTap}
          className={[
            'relative w-48 h-48 rounded-full font-playful text-2xl text-white',
            'shadow-btn-orange active:shadow-none',
            'transition-shadow duration-75',
            'outline-none focus-visible:ring-4 focus-visible:ring-fiesta-orange/40',
            isFinished
              ? 'bg-gray-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-br from-fiesta-orange to-fiesta-rose cursor-pointer',
          ].join(' ')}
          style={{
            transform: `scale(${btnScale})`,
            transition: 'transform 80ms cubic-bezier(.2,2,.5,1)',
          }}
        >
          <span className="pointer-events-none select-none text-3xl font-bold">
            {isFinished ? '🏁' : 'SECOUE !'}
          </span>
        </button>
      )}

      {/* Time left */}
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
