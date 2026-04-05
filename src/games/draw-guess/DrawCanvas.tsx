'use client'

import { useRef, useEffect, useCallback } from 'react'

export interface Stroke {
  points: [number, number][]
}

interface DrawCanvasProps {
  width?: number
  height?: number
  disabled?: boolean
  onStrokesChange?: (strokes: Stroke[]) => void
  replayStrokes?: Stroke[]
  replaySpeed?: number
}

export function DrawCanvas({ width = 300, height = 300, disabled, onStrokesChange, replayStrokes, replaySpeed = 10 }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<[number, number][]>([])

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent): [number, number] => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return [
      (clientX - rect.left) / rect.width,
      (clientY - rect.top) / rect.height,
    ]
  }, [])

  function drawAll(strokes: Stroke[]) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0] * canvas.width, stroke.points[i][1] * canvas.height)
      }
      ctx.stroke()
    }
  }

  // Replay mode
  useEffect(() => {
    if (!replayStrokes || replayStrokes.length === 0) return
    let cancelled = false

    const allPoints: { strokeIdx: number; pointIdx: number }[] = []
    replayStrokes.forEach((s, si) => s.points.forEach((_, pi) => allPoints.push({ strokeIdx: si, pointIdx: pi })))

    const totalPoints = allPoints.length
    if (totalPoints === 0) return
    const totalMs = 5000
    const stepMs = Math.max(16, totalMs / totalPoints)
    let current = 0

    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return }
      current += replaySpeed
      if (current >= totalPoints) {
        drawAll(replayStrokes)
        clearInterval(interval)
        return
      }

      const visibleStrokes: Stroke[] = []
      let pointsSoFar = 0
      for (let si = 0; si < replayStrokes.length; si++) {
        const stroke = replayStrokes[si]
        const pointsInStroke = stroke.points.length
        if (pointsSoFar + pointsInStroke <= current) {
          visibleStrokes.push(stroke)
          pointsSoFar += pointsInStroke
        } else {
          const remaining = current - pointsSoFar
          if (remaining > 0) {
            visibleStrokes.push({ points: stroke.points.slice(0, remaining) })
          }
          break
        }
      }
      drawAll(visibleStrokes)
    }, stepMs)

    return () => { cancelled = true; clearInterval(interval) }
  }, [replayStrokes, replaySpeed])

  function handleStart(e: React.TouchEvent | React.MouseEvent) {
    if (disabled || replayStrokes) return
    e.preventDefault()
    isDrawingRef.current = true
    currentStrokeRef.current = [getPos(e)]
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawingRef.current || disabled || replayStrokes) return
    e.preventDefault()
    currentStrokeRef.current.push(getPos(e))
    drawAll([...strokesRef.current, { points: currentStrokeRef.current }])
  }

  function handleEnd() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push({ points: [...currentStrokeRef.current] })
      onStrokesChange?.([...strokesRef.current])
    }
    currentStrokeRef.current = []
  }

  function handleClear() {
    strokesRef.current = []
    onStrokesChange?.([])
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-gray-300 rounded-xl bg-white touch-none"
        style={{ width: '100%', maxWidth: width, aspectRatio: `${width}/${height}` }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {!disabled && !replayStrokes && (
        <button onClick={handleClear} className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium">
          Effacer
        </button>
      )}
    </div>
  )
}
