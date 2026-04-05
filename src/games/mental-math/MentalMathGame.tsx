'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

export function MentalMathGame({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const submittedRef = useRef(false)
  const selectedRef = useRef<number | null>(null)

  const question = config.questions?.[0]

  // Auto-submit si le temps expire sans réponse
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(selectedRef.current ?? '') // vide = 0 points
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!question) return null

  const options = question.options as number[]

  const handleSelect = (value: number) => {
    if (selected !== null || disabled || submittedRef.current) return
    setSelected(value)
    selectedRef.current = value
    submittedRef.current = true
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
          const colors = [
            'bg-blue-600 text-white shadow-[0_4px_0_#1d4ed8] hover:brightness-110 active:translate-y-1 active:shadow-none',
            'bg-red-500 text-white shadow-[0_4px_0_#b91c1c] hover:brightness-110 active:translate-y-1 active:shadow-none',
            'bg-emerald-500 text-white shadow-[0_4px_0_#047857] hover:brightness-110 active:translate-y-1 active:shadow-none',
            'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-110 active:translate-y-1 active:shadow-none',
          ]

          let btnClass = 'relative rounded-xl py-5 text-2xl font-playful font-bold transition-all duration-200 '
          if (submitted && isThis) {
            btnClass += colors[i % colors.length] + ' ring-4 ring-white/50'
          } else if (submitted) {
            btnClass += colors[i % colors.length] + ' opacity-40'
          } else {
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

      {submitted && (
        <p className="text-sm text-fiesta-dark/70 font-medium animate-pulse">
          Réponse enregistrée !
        </p>
      )}
    </div>
  )
}
