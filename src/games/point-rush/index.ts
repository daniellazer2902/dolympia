import type { GameModule, PlayerSubmission } from '../types'
import { PointRushGame } from './PointRushGame'

interface Spawn {
  id: string
  row: number
  col: number
  type: '+5' | '+2' | '+1' | '÷2'
  spawnAt: number
  expiresAt: number
}

function generateSpawns(): Spawn[] {
  const spawns: Spawn[] = []
  const rows = 8, cols = 6
  const duration = 20000
  const interval = 400 // spawn toutes les 400ms = ~50 spawns sur 20s
  let id = 0

  for (let t = 0; t < duration; t += interval) {
    const row = Math.floor(Math.random() * rows)
    const col = Math.floor(Math.random() * cols)
    const rand = Math.random()
    const type: Spawn['type'] = rand < 0.5 ? '+1' : rand < 0.8 ? '+2' : rand < 0.92 ? '+5' : '÷2'
    spawns.push({
      id: `s${id++}`,
      row, col, type,
      spawnAt: t,
      expiresAt: t + 2000,
    })
  }
  return spawns
}

export const pointRushModule: GameModule = {
  id: 'point-rush',
  label: 'Point Rush',
  icon: '💎',
  defaultDuration: 20,
  minPlayers: 2,
  generateConfig() {
    return {
      duration: 20,
      gridSize: { rows: 8, cols: 6 },
      spawns: generateSpawns(),
    }
  },
  computeScore(submission: PlayerSubmission) {
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: PointRushGame,
}
