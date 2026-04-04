'use client'

import { useState } from 'react'
import type { GameProps } from '../types'

export function TrueFalseGame({ config, disabled, onSubmit }: GameProps) {
  const [submitted, setSubmitted] = useState<'Vrai' | 'Faux' | null>(null)

  const question = config.questions?.[0]
  if (!question) return null

  const correctAnswer = question.answer as string

  const handleClick = (value: 'Vrai' | 'Faux') => {
    if (disabled || submitted) return
    setSubmitted(value)
    onSubmit(value)
  }

  const isLocked = disabled || submitted !== null
  const isCorrect = submitted ? submitted === correctAnswer : null

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
        {/* Bouton Vrai */}
        <button
          type="button"
          onClick={() => handleClick('Vrai')}
          disabled={isLocked}
          className={`
            flex-1 rounded-2xl py-6 font-playful text-2xl font-bold text-white
            transition-all duration-150
            ${
              submitted === 'Vrai'
                ? isCorrect
                  ? 'bg-green-500 ring-4 ring-green-300'
                  : 'bg-fiesta-red ring-4 ring-red-300'
                : 'bg-green-500 shadow-[0_4px_0_#16a34a] hover:brightness-110 active:translate-y-1 active:shadow-none'
            }
            ${isLocked && submitted !== 'Vrai' ? 'opacity-40' : ''}
            disabled:cursor-not-allowed
          `}
        >
          Vrai
        </button>

        {/* Bouton Faux */}
        <button
          type="button"
          onClick={() => handleClick('Faux')}
          disabled={isLocked}
          className={`
            flex-1 rounded-2xl py-6 font-playful text-2xl font-bold text-white
            transition-all duration-150
            ${
              submitted === 'Faux'
                ? isCorrect === false
                  ? 'bg-green-500 ring-4 ring-green-300'
                  : 'bg-fiesta-red ring-4 ring-red-300'
                : 'bg-fiesta-red shadow-[0_4px_0_#b91c1c] hover:brightness-110 active:translate-y-1 active:shadow-none'
            }
            ${isLocked && submitted !== 'Faux' ? 'opacity-40' : ''}
            disabled:cursor-not-allowed
          `}
        >
          Faux
        </button>
      </div>

      {/* Feedback visuel */}
      {submitted && (
        <div
          className={`
            rounded-xl px-6 py-3 font-playful text-lg font-bold
            ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-fiesta-red'}
          `}
        >
          {isCorrect ? 'Bonne reponse !' : `Mauvaise reponse ! C'etait : ${correctAnswer}`}
        </div>
      )}
    </div>
  )
}
