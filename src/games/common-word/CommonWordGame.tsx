'use client'

import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'

export function CommonWordGame({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef(input)
  inputRef.current = input

  const wordA = (config as unknown as { wordA: string }).wordA
  const wordB = (config as unknown as { wordB: string }).wordB

  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submitted) {
      setSubmitted(true)
      onSubmit(inputRef.current.trim().toLowerCase() || '')
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (submitted || disabled) return
    const value = input.trim().toLowerCase()
    if (!value) return
    setSubmitted(true)
    onSubmit(value)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full">
      <p className="text-sm text-fiesta-dark/60 font-medium">Quel mot relie ces deux mots ?</p>

      <div className="flex items-center gap-4">
        <span className="text-2xl font-playful text-fiesta-orange">{wordA}</span>
        <span className="text-fiesta-dark/40">+</span>
        <span className="text-2xl font-playful text-fiesta-rose">{wordB}</span>
      </div>

      {submitted ? (
        <div className="bg-white rounded-2xl px-6 py-4 border-2 border-emerald-400 text-center">
          <p className="text-emerald-600 font-bold">Réponse envoyée !</p>
          <p className="text-lg font-playful text-fiesta-dark mt-1">{input || '(vide)'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Tape un mot..."
            autoFocus
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-lg text-center font-bold text-fiesta-dark focus:outline-none focus:border-fiesta-orange"
            disabled={disabled}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="bg-fiesta-orange text-white font-bold rounded-full py-3 shadow-btn-orange active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  )
}
