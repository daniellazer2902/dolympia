'use client'

import { useState } from 'react'
import type { GameProps } from '../types'

export function MentalMathGame({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const question = config.questions?.[0]
  if (!question) return null

  const options = question.options as number[]
  const correctAnswer = Number(question.answer)

  const handleSelect = (value: number) => {
    if (selected !== null || disabled) return
    setSelected(value)
    setIsCorrect(value === correctAnswer)
    onSubmit(value)
  }

  const submitted = selected !== null

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto px-4">
      {/* Timer pill */}
      <div
        className={`
          rounded-full px-5 py-1 font-playful text-lg font-bold tracking-wide
          ${timeLeft <= 3 ? 'bg-fiesta-red text-white animate-pulse' : 'bg-fiesta-yellow text-fiesta-dark'}
        `}
      >
        {timeLeft}s
      </div>

      {/* Operation display */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-fiesta-orange/20 px-8 py-6 w-full text-center">
        <p className="text-sm font-semibold text-fiesta-orange uppercase tracking-wider mb-2">
          Calcul Mental
        </p>
        <p className="text-5xl font-playful text-fiesta-dark leading-tight">
          {question.content}
        </p>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {options.map((opt, i) => {
          const num = Number(opt)
          const isThis = selected === num
          const showCorrect = submitted && num === correctAnswer
          const showWrong = submitted && isThis && !isCorrect

          let btnClass =
            'relative rounded-xl py-5 text-2xl font-playful font-bold transition-all duration-200 '

          if (showCorrect) {
            btnClass += 'bg-emerald-500 text-white scale-105 ring-4 ring-emerald-300'
          } else if (showWrong) {
            btnClass += 'bg-fiesta-red text-white scale-95 ring-4 ring-red-300'
          } else if (submitted) {
            btnClass += 'bg-gray-200 text-gray-400 cursor-default'
          } else {
            // Rotate fiesta colors across buttons
            const colors = [
              'bg-blue-600 text-white shadow-[0_4px_0_#1d4ed8] hover:brightness-110 active:translate-y-1 active:shadow-none',
              'bg-red-500 text-white shadow-[0_4px_0_#b91c1c] hover:brightness-110 active:translate-y-1 active:shadow-none',
              'bg-emerald-500 text-white shadow-[0_4px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none',
              'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-110 active:translate-y-1 active:shadow-none',
            ]
            btnClass += colors[i % colors.length]
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(num)}
              disabled={submitted || disabled}
              className={btnClass}
            >
              {num}
            </button>
          )
        })}
      </div>

      {/* Feedback message */}
      {submitted && (
        <p
          className={`
            text-xl font-playful font-bold animate-bounce
            ${isCorrect ? 'text-emerald-500' : 'text-fiesta-red'}
          `}
        >
          {isCorrect ? 'Bravo !' : `Raté ! La réponse était ${correctAnswer}`}
        </p>
      )}
    </div>
  )
}
