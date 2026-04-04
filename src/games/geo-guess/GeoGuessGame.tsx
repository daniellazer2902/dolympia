'use client'

import { useState } from 'react'
import type { GameProps } from '../types'

const OPTION_COLORS = [
  {
    idle: 'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-110',
    wrong: 'bg-fiesta-red/80 text-white',
  },
  {
    idle: 'bg-fiesta-rose text-white shadow-btn-rose hover:brightness-110',
    wrong: 'bg-fiesta-red/80 text-white',
  },
  {
    idle: 'bg-fiesta-blue text-white hover:brightness-110',
    wrong: 'bg-fiesta-red/80 text-white',
  },
  {
    idle: 'bg-fiesta-yellow text-fiesta-dark shadow-btn-yellow hover:brightness-110',
    wrong: 'bg-fiesta-red/80 text-white',
  },
] as const

const CORRECT_CLASS = 'bg-green-500 text-white ring-4 ring-green-300'

export function GeoGuessGame({ config, onSubmit, disabled }: GameProps) {
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

    const isCorrect = JSON.stringify(options[index]) === JSON.stringify(question!.answer)
    if (isCorrect) return CORRECT_CLASS
    if (index === selected) return color.wrong
    return `${color.idle} opacity-40`
  }

  const isCorrectAnswer =
    hasSubmitted &&
    JSON.stringify(options[selected!]) === JSON.stringify(question.answer)

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Globe icon */}
      <span className="text-5xl" role="img" aria-label="globe">
        🌍
      </span>

      {/* Clue card */}
      <div className="bg-gradient-to-br from-fiesta-orange/10 via-white to-fiesta-rose/10 border-2 border-fiesta-orange rounded-2xl p-6 w-full text-center shadow-md">
        <p className="text-xs font-playful uppercase tracking-widest text-fiesta-orange mb-2">
          Indice
        </p>
        <h2 className="text-xl font-playful text-fiesta-dark leading-snug">
          {question.content}
        </h2>
      </div>

      {/* Answer options */}
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
        <p
          className={`text-sm font-playful font-medium ${
            isCorrectAnswer ? 'text-green-600' : 'text-fiesta-red'
          }`}
        >
          {isCorrectAnswer ? 'Bonne reponse ! 🎉' : 'Mauvaise reponse...'}
        </p>
      )}
    </div>
  )
}
