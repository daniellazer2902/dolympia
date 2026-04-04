import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimer } from './useTimer'

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('décremente chaque seconde', () => {
    const { result } = renderHook(() => useTimer(5, true))
    expect(result.current.timeLeft).toBe(5)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.timeLeft).toBe(4)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.timeLeft).toBe(3)
  })

  it('ne va pas en dessous de 0', () => {
    const { result } = renderHook(() => useTimer(2, true))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.timeLeft).toBe(0)
  })

  it('appelle onEnd quand le timer atteint 0', () => {
    const onEnd = vi.fn()
    renderHook(() => useTimer(2, true, onEnd))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('ne décremente pas si running = false', () => {
    const { result } = renderHook(() => useTimer(5, false))
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.timeLeft).toBe(5)
  })
})
