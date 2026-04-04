'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

export function OrderLogicGame({ config, onSubmit, disabled }: GameProps) {
  const question = config.questions?.[0]
  const allOptions = (question?.options ?? []) as string[]

  const [ordered, setOrdered] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Drag state
  const [dragSource, setDragSource] = useState<{
    zone: 'remaining' | 'ordered'
    index: number
    item: string
  } | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)

  const remaining = allOptions.filter((opt) => !ordered.includes(opt))
  const allPlaced = ordered.length === allOptions.length && allOptions.length > 0
  const submittedRef = useRef(false)

  // Auto-soumettre quand le temps expire (meme si pas valide manuellement)
  useEffect(() => {
    if (disabled && !submittedRef.current) {
      submittedRef.current = true
      setSubmitted(true)
      onSubmit(ordered)
    }
  }, [disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Click mode (toujours actif, surtout pour mobile) ---

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

  // --- Drag & Drop handlers ---

  const handleDragStart = useCallback(
    (zone: 'remaining' | 'ordered', index: number, item: string) =>
      (e: React.DragEvent) => {
        if (disabled || submitted) {
          e.preventDefault()
          return
        }
        setDragSource({ zone, index, item })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', item)
      },
    [disabled, submitted],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || submitted) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    },
    [disabled, submitted],
  )

  const handleDragEnterOrdered = useCallback(
    (index: number) => (e: React.DragEvent) => {
      e.preventDefault()
      setDropTarget(index)
    },
    [],
  )

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragSource(null)
    setDropTarget(null)
  }, [])

  // Drop on the answer zone (append or reorder)
  const handleDropOnOrdered = useCallback(
    (targetIndex: number) => (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled || submitted || !dragSource) return

      setOrdered((prev) => {
        const next = [...prev]

        if (dragSource.zone === 'remaining') {
          // Insert from remaining into ordered at target position
          next.splice(targetIndex, 0, dragSource.item)
        } else {
          // Reorder within ordered zone
          const fromIndex = dragSource.index
          if (fromIndex === targetIndex) return prev
          // Remove from old position
          next.splice(fromIndex, 1)
          // Insert at new position
          next.splice(targetIndex, 0, dragSource.item)
        }

        return next
      })

      setDragSource(null)
      setDropTarget(null)
    },
    [disabled, submitted, dragSource],
  )

  // Drop on the answer zone container (append at end)
  const handleDropOnZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (disabled || submitted || !dragSource) return

      setOrdered((prev) => {
        if (dragSource.zone === 'remaining') {
          return [...prev, dragSource.item]
        } else {
          // Reorder: move to end
          const next = [...prev]
          next.splice(dragSource.index, 1)
          next.push(dragSource.item)
          return next
        }
      })

      setDragSource(null)
      setDropTarget(null)
    },
    [disabled, submitted, dragSource],
  )

  if (!question) {
    return (
      <p className="text-center text-fiesta-dark">Aucune question disponible.</p>
    )
  }

  const isLocked = disabled || submitted

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
          Glissez ou cliquez dans l&apos;ordre :
        </p>
        <div className="flex flex-wrap gap-2">
          {remaining.map((item, i) => (
            <button
              key={item}
              onClick={() => handlePick(item)}
              draggable={!isLocked}
              onDragStart={handleDragStart('remaining', i, item)}
              onDragEnd={handleDragEnd}
              disabled={isLocked}
              className={`
                rounded-full px-4 py-2 text-sm font-playful select-none
                bg-white border-2 border-fiesta-orange text-fiesta-dark
                shadow-sm transition-all duration-150
                ${
                  isLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-fiesta-orange hover:text-white active:scale-95 cursor-grab'
                }
                ${
                  dragSource?.zone === 'remaining' && dragSource.item === item
                    ? 'opacity-40 scale-95'
                    : ''
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
          onDragOver={handleDragOver}
          onDrop={handleDropOnZone}
          onDragLeave={handleDragLeave}
          className={`
            min-h-[56px] rounded-2xl border-2 border-dashed p-3
            flex flex-wrap gap-2 items-center
            transition-colors duration-150
            ${
              submitted
                ? 'border-green-400 bg-green-50'
                : dragSource
                  ? 'border-fiesta-orange bg-fiesta-orange/10'
                  : 'border-fiesta-rose/40 bg-fiesta-rose/5'
            }
          `}
        >
          {ordered.length === 0 && !dragSource ? (
            <span className="text-sm text-fiesta-dark/30 italic">
              Aucun element place...
            </span>
          ) : (
            <>
              {ordered.map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  draggable={!isLocked}
                  onDragStart={handleDragStart('ordered', i, item)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnterOrdered(i)}
                  onDrop={handleDropOnOrdered(i)}
                  className={`
                    inline-flex items-center gap-1 rounded-full px-3 py-1.5
                    text-sm font-playful select-none
                    transition-all duration-150
                    ${
                      submitted
                        ? 'bg-green-500 text-white'
                        : 'bg-fiesta-rose text-white'
                    }
                    ${!isLocked ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${
                      dragSource?.zone === 'ordered' && dragSource.index === i
                        ? 'opacity-40 scale-95'
                        : ''
                    }
                    ${
                      dropTarget === i && dragSource
                        ? 'ring-2 ring-fiesta-orange ring-offset-2'
                        : ''
                    }
                  `}
                >
                  <span className="opacity-60 text-xs">{i + 1}.</span>
                  {item}
                </span>
              ))}
              {/* Drop hint at end when dragging */}
              {dragSource && !isLocked && ordered.length > 0 && (
                <span className="inline-flex items-center rounded-full px-3 py-1.5 text-sm border-2 border-dashed border-fiesta-orange/50 text-fiesta-dark/30">
                  +
                </span>
              )}
            </>
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
