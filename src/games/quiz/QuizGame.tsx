'use client'

import { useState } from 'react'
import type { GameProps } from '../types'

const OPTION_COLORS = [
  {
    idle: 'bg-blue-600 text-white shadow-[0_4px_0_#1d4ed8] hover:brightness-110',
    wrong: 'bg-red-400/80 text-white',
  },
  {
    idle: 'bg-red-500 text-white shadow-[0_4px_0_#b91c1c] hover:brightness-110',
    wrong: 'bg-red-400/80 text-white',
  },
  {
    idle: 'bg-emerald-500 text-white shadow-[0_4px_0_#047857] hover:brightness-110',
    wrong: 'bg-red-400/80 text-white',
  },
  {
    idle: 'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-110',
    wrong: 'bg-red-400/80 text-white',
  },
] as const

export function QuizGame({ config, onSubmit, disabled }: GameProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const question = config.questions?.[0]
  if (!question) {
    return (
      <p className="text-center text-fiesta-dark">Aucune question disponible.</p>
    )
  }

  const options = question.options as string[]
  const hasSubmitted = selected !== null

  function handleClick(index: number) {
    if (hasSubmitted || disabled) return
    setSelected(index)
    onSubmit(options[index])
  }

  function optionClass(index: number) {
    const color = OPTION_COLORS[index % OPTION_COLORS.length]

    if (!hasSubmitted) {
      return disabled
        ? `${color.idle} opacity-50 cursor-not-allowed`
        : `${color.idle} cursor-pointer active:translate-y-[2px] active:shadow-none`
    }

    // Après soumission : montrer le choix sans révéler la réponse
    if (index === selected) return `${color.idle} ring-4 ring-white/50`
    return `${color.idle} opacity-40`
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Question */}
      <div className="bg-white border-2 border-fiesta-orange rounded-2xl p-6 w-full text-center shadow-md">
        <h2 className="text-xl font-playful text-fiesta-dark leading-snug">
          {question.content}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={hasSubmitted || disabled}
            className={`
              rounded-xl px-4 py-3 font-playful text-lg
              transition-all duration-150
              ${optionClass(i)}
            `}
          >
            {String(option)}
          </button>
        ))}
      </div>

      {/* Feedback after submission */}
      {hasSubmitted && (
        <p className="text-sm text-fiesta-dark/70 font-medium animate-pulse">
          Reponse enregistree !
        </p>
      )}
    </div>
  )
}
