'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/store/game.store'
import type { GameProps } from '../types'

const PLAYER_COLORS = [
  '#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

export function TerritoryGame({ config, playerId, timeLeft, onSubmit, isHost, disabled, send, onBroadcast }: GameProps) {
  const { players } = useGameStore()
  const gridSize = (config as unknown as { gridSize: number }).gridSize ?? 10
  const totalCells = gridSize * gridSize

  const playerColorMap = useRef<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    players.forEach((p, i) => { map[p.id] = PLAYER_COLORS[i % PLAYER_COLORS.length] })
    playerColorMap.current = map
  }, [players])

  const [grid, setGrid] = useState<(string | null)[]>(Array(totalCells).fill(null))
  const gridRef = useRef<(string | null)[]>(Array(totalCells).fill(null))
  const submittedRef = useRef(false)

  const hostGridRef = useRef<(string | null)[]>(Array(totalCells).fill(null))

  useEffect(() => {
    if (!onBroadcast) return
    const unsubscribe = onBroadcast((event, payload) => {
      if (event === 'player:territory_click' && isHost) {
        const p = payload as { playerId: string; cellIndex: number }
        if (p.cellIndex < 0 || p.cellIndex >= totalCells) return
        if (hostGridRef.current[p.cellIndex] === p.playerId) return
        hostGridRef.current[p.cellIndex] = p.playerId
      }

      if (event === 'host:grid_state') {
        const p = payload as { grid: (string | null)[] }
        gridRef.current = p.grid
        setGrid([...p.grid])
      }
    })
    return unsubscribe
  }, [onBroadcast, isHost, totalCells])

  // Host broadcast every 500ms + W4: mettre à jour sa propre grille affichée
  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
      send?.('host:grid_state', { grid: hostGridRef.current })
      // W4: le host ne reçoit pas son propre broadcast → sync locale
      gridRef.current = hostGridRef.current
      setGrid([...hostGridRef.current])
    }, 500)
    return () => clearInterval(interval)
  }, [isHost, send])

  // Auto-submit
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      const myCells = gridRef.current.filter(id => id === playerId).length
      onSubmit(myCells)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(index: number) {
    if (disabled || grid[index] === playerId) return
    const newGrid = [...gridRef.current]
    newGrid[index] = playerId
    gridRef.current = newGrid
    setGrid(newGrid)
    // W4: Host ne reçoit pas son propre broadcast — mise à jour de la grille autoritative
    if (isHost) {
      hostGridRef.current[index] = playerId
    }
    send?.('player:territory_click', { playerId, cellIndex: index })
  }

  const myColor = playerColorMap.current[playerId] ?? '#FF6B35'
  const myCells = grid.filter(id => id === playerId).length

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: myColor }} />
          <span className="font-bold text-fiesta-dark">{myCells} cases</span>
        </div>
        <span className="text-fiesta-dark/40">= {myCells * 3} pts</span>
      </div>

      <div
        className="grid gap-0.5 w-full max-w-sm aspect-square"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((owner, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={disabled}
            className="aspect-square rounded-sm border border-gray-100 transition-colors active:scale-95"
            style={{
              backgroundColor: owner ? (playerColorMap.current[owner] ?? '#ccc') : '#f9fafb',
              opacity: owner === playerId ? 1 : owner ? 0.7 : 1,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
            <span className={p.id === playerId ? 'font-bold' : 'text-fiesta-dark/60'}>{p.pseudo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
