'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface DeviceMotionResult {
  supported: boolean
  shakeCount: number
  requestPermission: () => Promise<void>
}

const SHAKE_THRESHOLD = 15

export function useDeviceMotion(): DeviceMotionResult {
  const [supported, setSupported] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)
  const lastShakeRef = useRef(0)

  // Detect support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasMotion = 'DeviceMotionEvent' in window
    if (!hasMotion) {
      setSupported(false)
      return
    }

    // iOS 13+ requires permission
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DME.requestPermission === 'function') {
      setNeedsPermission(true)
      setSupported(true)
      return
    }

    // Android / older iOS — test if we actually get events
    let gotEvent = false
    const probe = () => {
      gotEvent = true
    }
    window.addEventListener('devicemotion', probe)
    const timer = setTimeout(() => {
      window.removeEventListener('devicemotion', probe)
      setSupported(gotEvent)
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('devicemotion', probe)
    }
  }, [])

  // Listen for shakes
  useEffect(() => {
    if (!supported || needsPermission) return

    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity
      if (!acc) return

      const x = acc.x ?? 0
      const y = acc.y ?? 0
      const z = acc.z ?? 0
      const intensity = Math.sqrt(x * x + y * y + z * z)

      if (intensity > SHAKE_THRESHOLD) {
        const now = Date.now()
        // Debounce: at most 1 shake per 100ms
        if (now - lastShakeRef.current > 100) {
          lastShakeRef.current = now
          setShakeCount((c) => c + 1)
        }
      }
    }

    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [supported, needsPermission])

  const requestPermission = useCallback(async () => {
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DME.requestPermission !== 'function') return

    try {
      const result = await DME.requestPermission()
      if (result === 'granted') {
        setNeedsPermission(false)
      }
    } catch {
      // User denied or error — stay unsupported
      setSupported(false)
      setNeedsPermission(false)
    }
  }, [])

  return { supported: supported && !needsPermission, shakeCount, requestPermission }
}
