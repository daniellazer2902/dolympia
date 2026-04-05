import { useState, useEffect, useRef } from 'react'

export function useTimer(
  initialSeconds: number,
  running: boolean,
  onEnd?: () => void
) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const onEndRef = useRef(onEnd)

  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  useEffect(() => {
    setTimeLeft(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running || timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, initialSeconds])

  // Appeler onEnd APRÈS le render avec timeLeft=0 (pas dans le state updater)
  const firedRef = useRef(false)
  useEffect(() => {
    if (timeLeft <= 0 && running && !firedRef.current) {
      firedRef.current = true
      // Délai pour laisser les jeux soumettre leurs résultats (timeLeft=0 → auto-submit)
      setTimeout(() => onEndRef.current?.(), 800)
    }
    if (timeLeft > 0) firedRef.current = false
  }, [timeLeft, running])

  return { timeLeft }
}
