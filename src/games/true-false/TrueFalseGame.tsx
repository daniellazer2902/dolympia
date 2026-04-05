'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

export function TrueFalseGame({ config, disabled, timeLeft, onSubmit }: GameProps) {
  const [submitted, setSubmitted] = useState<'Vrai' | 'Faux' | null>(null)
  const submittedRef = useRef(false)

  const question = config.questions?.[0]

  // Auto-submit si le temps expire sans réponse
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(submitted ?? '') // soumission vide = 0 points
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!question) return null

  const handleClick = (value: 'Vrai' | 'Faux') => {
    if (disabled || submitted || submittedRef.current) return
    setSubmitted(value)
    submittedRef.current = true
    onSubmit(value)
  }

  const isLocked = disabled || submitted !== null

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-6">
      {/* Affirmation */}
      <div className="w-full max-w-lg rounded-2xl border-2 border-fiesta-orange bg-white p-6 shadow-lg">
        <p className="text-center font-playful text-2xl leading-relaxed text-fiesta-dark">
          {question.content}
        </p>
      </div>

      {/* Boutons Vrai / Faux */}
      <div className="flex w-full max-w-lg gap-4">
        <button
          type="button"
          onClick={() => handleClick('Vrai')}
          disabled={isLocked}
          className={`
            flex-1 rounded-2xl py-6 font-playful text-2xl font-bold text-white
            transition-all duration-150
            ${submitted === 'Vrai' ? 'bg-green-500 ring-4 ring-white/50' : 'bg-green-500 shadow-[0_4px_0_#16a34a] hover:brightness-110 active:translate-y-1 active:shadow-none'}
            ${isLocked && submitted !== 'Vrai' ? 'opacity-40' : ''}
            disabled:cursor-not-allowed
          `}
        >
          Vrai
        </button>

        <button
          type="button"
          onClick={() => handleClick('Faux')}
          disabled={isLocked}
          className={`
            flex-1 rounded-2xl py-6 font-playful text-2xl font-bold text-white
            transition-all duration-150
            ${submitted === 'Faux' ? 'bg-fiesta-red ring-4 ring-white/50' : 'bg-fiesta-red shadow-[0_4px_0_#b91c1c] hover:brightness-110 active:translate-y-1 active:shadow-none'}
            ${isLocked && submitted !== 'Faux' ? 'opacity-40' : ''}
            disabled:cursor-not-allowed
          `}
        >
          Faux
        </button>
      </div>

      {submitted && (
        <p className="text-sm text-fiesta-dark/70 font-medium animate-pulse">
          Réponse enregistrée !
        </p>
      )}
    </div>
  )
}
