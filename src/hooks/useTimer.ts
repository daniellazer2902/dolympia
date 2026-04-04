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
          onEndRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, initialSeconds])

  return { timeLeft }
}
