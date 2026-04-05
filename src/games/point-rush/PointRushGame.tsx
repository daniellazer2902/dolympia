'use client'

import { useState, useEffect, useRef } from 'react'
import type { GameProps } from '../types'

interface Spawn {
  id: string; row: number; col: number
  type: '+5' | '+2' | '+1' | '÷2'
  spawnAt: number; expiresAt: number
}

const TYPE_STYLES: Record<string, string> = {
  '+5': 'bg-emerald-600 text-white font-bold',
  '+2': 'bg-emerald-400 text-white font-bold',
  '+1': 'bg-emerald-200 text-emerald-800 font-bold',
  '÷2': 'bg-red-500 text-white font-bold',
}

export function PointRushGame({ config, playerId, timeLeft, onSubmit, isHost, disabled, send, onBroadcast }: GameProps) {
  const gridSize = (config as unknown as { gridSize: { rows: number; cols: number } }).gridSize
  const spawns: Spawn[] = (config as unknown as { spawns: Spawn[] }).spawns ?? []

  const [activeSpawns, setActiveSpawns] = useState<Map<string, Spawn>>(new Map())
  const [takenSpawns, setTakenSpawns] = useState<Set<string>>(new Set())
  const [myScore, setMyScore] = useState(0)
  const myScoreRef = useRef(0)
  const startTimeRef = useRef(Date.now())
  const submittedRef = useRef(false)

  // Host state
  const claimedRef = useRef<Map<string, string>>(new Map())
  const playerScoresRef = useRef<Map<string, number>>(new Map())

  // Register broadcast handlers
  useEffect(() => {
    if (!onBroadcast) return
    const unsubscribe = onBroadcast((event, payload) => {
      if (event === 'player:grid_click' && isHost) {
        const p = payload as { playerId: string; spawnId: string }
        if (claimedRef.current.has(p.spawnId)) return
        claimedRef.current.set(p.spawnId, p.playerId)

        const spawn = spawns.find(s => s.id === p.spawnId)
        if (!spawn) return
        const current = playerScoresRef.current.get(p.playerId) ?? 0
        let newScore: number
        if (spawn.type === '÷2') {
          newScore = Math.floor(current / 2)
        } else {
          newScore = current + parseInt(spawn.type)
        }
        playerScoresRef.current.set(p.playerId, newScore)
      }

      if (event === 'host:grid_state') {
        const p = payload as { claimed: Record<string, string>; scores: Record<string, number> }
        setTakenSpawns(new Set(Object.keys(p.claimed)))
        const score = p.scores[playerId] ?? 0
        setMyScore(score)
        myScoreRef.current = score
      }
    })
    return unsubscribe
  }, [onBroadcast, isHost, playerId, spawns])

  // Spawn timer
  useEffect(() => {
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const active = new Map<string, Spawn>()
      for (const s of spawns) {
        if (elapsed >= s.spawnAt && elapsed < s.expiresAt && !takenSpawns.has(s.id)) {
          active.set(s.id, s)
        }
      }
      setActiveSpawns(active)
    }, 100)
    return () => clearInterval(interval)
  }, [spawns, takenSpawns])

  // Host broadcast state every 500ms
  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
      const claimed: Record<string, string> = {}
      claimedRef.current.forEach((pid, sid) => { claimed[sid] = pid })
      const scores: Record<string, number> = {}
      playerScoresRef.current.forEach((s, pid) => { scores[pid] = s })
      send?.('host:grid_state', { claimed, scores })
    }, 500)
    return () => clearInterval(interval)
  }, [isHost, send])

  // Auto-submit
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(myScoreRef.current)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(spawn: Spawn) {
    if (disabled || takenSpawns.has(spawn.id)) return
    setTakenSpawns(prev => new Set(Array.from(prev).concat(spawn.id)))
    if (spawn.type === '÷2') {
      const newScore = Math.floor(myScoreRef.current / 2)
      setMyScore(newScore)
      myScoreRef.current = newScore
    } else {
      const pts = parseInt(spawn.type)
      setMyScore(prev => prev + pts)
      myScoreRef.current += pts
    }
    // W4: Host ne reçoit pas son propre broadcast — mise à jour locale de l'état autoritatif
    if (isHost) {
      if (!claimedRef.current.has(spawn.id)) {
        claimedRef.current.set(spawn.id, playerId)
        playerScoresRef.current.set(playerId, myScoreRef.current)
      }
    }
    send?.('player:grid_click', { playerId, spawnId: spawn.id })
  }

  const cells: (Spawn | null)[][] = Array.from({ length: gridSize.rows }, () =>
    Array(gridSize.cols).fill(null)
  )
  activeSpawns.forEach(spawn => {
    if (spawn.row < gridSize.rows && spawn.col < gridSize.cols) {
      cells[spawn.row][spawn.col] = spawn
    }
  })

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className="text-center">
        <p className="text-2xl font-playful text-fiesta-orange">{myScore} pts</p>
      </div>

      <div
        className="grid gap-1 w-full max-w-sm aspect-[3/4]"
        style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`, gridTemplateRows: `repeat(${gridSize.rows}, 1fr)` }}
      >
        {cells.flat().map((spawn, i) => (
          <button
            key={i}
            onClick={() => spawn && handleClick(spawn)}
            disabled={!spawn || disabled}
            className={`rounded-lg border border-gray-200 flex items-center justify-center text-xs transition-all ${
              spawn ? `${TYPE_STYLES[spawn.type]} active:scale-90 cursor-pointer` : 'bg-gray-50'
            }`}
          >
            {spawn?.type ?? ''}
          </button>
        ))}
      </div>
    </div>
  )
}
