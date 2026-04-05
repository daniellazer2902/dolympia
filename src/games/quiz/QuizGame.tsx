'use client'

import { useState, useRef, useEffect } from 'react'
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

export function QuizGame({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const questions = config.questions ?? []
  const totalQuestions = Math.min(questions.length, 3)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const answersRef = useRef<{ questionIndex: number; value: string; timestamp: number }[]>([])
  const submittedRef = useRef(false)

  const question = questions[currentIdx]

  // Auto-submit when disabled or time runs out
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit({ answers: answersRef.current })
    }
  }, [disabled, timeLeft])

  if (!question) {
    return (
      <p className="text-center text-fiesta-dark">Aucune question disponible.</p>
    )
  }

  const options = question.options as string[]

  function handleClick(optionIndex: number) {
    if (selected !== null || disabled || transitioning || submittedRef.current) return
    setSelected(optionIndex)
    answersRef.current.push({
      questionIndex: currentIdx,
      value: options[optionIndex],
      timestamp: Date.now(),
    })

    if (currentIdx + 1 < totalQuestions) {
      // More questions — show feedback briefly then advance
      setTransitioning(true)
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1)
        setSelected(null)
        setTransitioning(false)
      }, 800)
    } else {
      // Last question — submit
      if (!submittedRef.current) {
        submittedRef.current = true
        onSubmit({ answers: answersRef.current })
      }
    }
  }

  function optionClass(index: number) {
    const color = OPTION_COLORS[index % OPTION_COLORS.length]
    const hasSubmitted = selected !== null

    if (!hasSubmitted) {
      return disabled
        ? `${color.idle} opacity-50 cursor-not-allowed`
        : `${color.idle} cursor-pointer active:translate-y-[2px] active:shadow-none`
    }

    // After selection: highlight chosen option
    if (index === selected) return `${color.idle} ring-4 ring-white/50`
    return `${color.idle} opacity-40`
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      {/* Progress indicator */}
      <div className="text-sm font-medium text-fiesta-dark/70">
        Question {currentIdx + 1}/{totalQuestions}
      </div>

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
            key={`${currentIdx}-${i}`}
            onClick={() => handleClick(i)}
            disabled={selected !== null || disabled || transitioning}
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

      {/* Feedback after selection */}
      {selected !== null && !submittedRef.current && (
        <p className="text-sm text-fiesta-dark/70 font-medium animate-pulse">
          Reponse enregistree !
        </p>
      )}
    </div>
  )
}
