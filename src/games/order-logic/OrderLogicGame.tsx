'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

export function OrderLogicGame({ config, onSubmit, disabled }: GameProps) {
  const question = config.questions?.[0]
  const allOptions = (question?.options ?? []) as string[]

  const [ordered, setOrdered] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const remaining = allOptions.filter((opt) => !ordered.includes(opt))
  const allPlaced = ordered.length === allOptions.length && allOptions.length > 0
  const submittedRef = useRef(false)

  // Auto-soumettre quand le temps expire (même si pas validé manuellement)
  useEffect(() => {
    if (disabled && !submittedRef.current) {
      submittedRef.current = true
      setSubmitted(true)
      onSubmit(ordered)
    }
  }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePick = useCallback(
    (item: string) => {
      if (disabled || submitted) return
      setOrdered((prev) => [...prev, item])
    },
    [disabled, submitted],
  )

  const handleUndo = useCallback(() => {
    if (disabled || submitted) return
    setOrdered((prev) => prev.slice(0, -1))
  }, [disabled, submitted])

  const handleValidate = useCallback(() => {
    if (!allPlaced || submitted || disabled) return
    setSubmitted(true)
    onSubmit(ordered)
  }, [allPlaced, submitted, disabled, onSubmit, ordered])

  if (!question) {
    return (
      <p className="text-center text-fiesta-dark">Aucune question disponible.</p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4">
      {/* Consigne */}
      <div className="bg-white border-2 border-fiesta-orange rounded-2xl p-5 w-full text-center shadow-md">
        <h2 className="text-xl font-playful text-fiesta-dark leading-snug">
          {question.content}
        </h2>
      </div>

      {/* Elements a placer */}
      <div className="w-full">
        <p className="text-sm font-medium text-fiesta-dark/60 mb-2">
          Cliquez dans l&apos;ordre :
        </p>
        <div className="flex flex-wrap gap-2">
          {remaining.map((item) => (
            <button
              key={item}
              onClick={() => handlePick(item)}
              disabled={disabled || submitted}
              className={`
                rounded-full px-4 py-2 text-sm font-playful
                bg-white border-2 border-fiesta-orange text-fiesta-dark
                shadow-sm transition-all duration-150
                ${
                  disabled || submitted
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-fiesta-orange hover:text-white active:scale-95 cursor-pointer'
                }
              `}
            >
              {item}
            </button>
          ))}
          {remaining.length === 0 && !submitted && (
            <span className="text-sm text-fiesta-dark/40 italic">
              Tous les elements sont places !
            </span>
          )}
        </div>
      </div>

      {/* Zone reponse */}
      <div className="w-full">
        <p className="text-sm font-medium text-fiesta-dark/60 mb-2">
          Votre ordre :
        </p>
        <div
          className={`
            min-h-[56px] rounded-2xl border-2 border-dashed p-3
            flex flex-wrap gap-2 items-center
            ${submitted ? 'border-green-400 bg-green-50' : 'border-fiesta-rose/40 bg-fiesta-rose/5'}
          `}
        >
          {ordered.length === 0 ? (
            <span className="text-sm text-fiesta-dark/30 italic">
              Aucun element place...
            </span>
          ) : (
            ordered.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1.5
                  text-sm font-playful
                  ${submitted ? 'bg-green-500 text-white' : 'bg-fiesta-rose text-white'}
                `}
              >
                <span className="opacity-60 text-xs">{i + 1}.</span>
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        {ordered.length > 0 && !submitted && (
          <button
            onClick={handleUndo}
            disabled={disabled}
            className="
              flex-1 rounded-xl px-4 py-2.5 font-playful text-sm
              bg-white border-2 border-fiesta-dark/20 text-fiesta-dark
              hover:border-fiesta-dark/40 active:scale-95
              transition-all duration-150
            "
          >
            Annuler le dernier
          </button>
        )}

        {allPlaced && !submitted && (
          <button
            onClick={handleValidate}
            disabled={disabled}
            className="
              flex-1 rounded-xl px-4 py-3 font-playful text-lg
              bg-fiesta-orange text-white shadow-btn-orange
              hover:brightness-110 active:translate-y-[2px] active:shadow-none
              transition-all duration-150
            "
          >
            Valider
          </button>
        )}
      </div>

      {submitted && (
        <p className="text-sm text-fiesta-dark/70 font-medium animate-pulse">
          Reponse enregistree !
        </p>
      )}
    </div>
  )
}
