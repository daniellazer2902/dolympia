import type { GameModule, PlayerSubmission } from '../types'
import { PointRushGame } from './PointRushGame'

interface Spawn {
  id: string
  row: number
  col: number
  type: '+5' | '+2' | '+1' | '÷2' | '-5' | '-3' | '-2'
  spawnAt: number
  expiresAt: number
}

function generateSpawns(): Spawn[] {
  const spawns: Spawn[] = []
  const rows = 8, cols = 6
  const duration = 15000
  const interval = 300 // spawn toutes les 300ms = ~50 spawns sur 15s
  let id = 0

  for (let t = 0; t < duration; t += interval) {
    const row = Math.floor(Math.random() * rows)
    const col = Math.floor(Math.random() * cols)
    const rand = Math.random()
    // Distribution : +1 (35%), +2 (25%), +5 (10%), ÷2 (8%), -2 (10%), -3 (7%), -5 (5%)
    const type: Spawn['type'] =
      rand < 0.35 ? '+1' :
      rand < 0.60 ? '+2' :
      rand < 0.70 ? '+5' :
      rand < 0.78 ? '÷2' :
      rand < 0.88 ? '-2' :
      rand < 0.95 ? '-3' : '-5'
    // Bonus (vert) durent 4s, malus (violet/orange) durent 2s
    const isBonus = type.startsWith('+')
    spawns.push({
      id: `s${id++}`,
      row, col, type,
      spawnAt: t,
      expiresAt: t + (isBonus ? 4000 : 2000),
    })
  }
  return spawns
}

export const pointRushModule: GameModule = {
  id: 'point-rush',
  label: 'Point Rush',
  icon: '💎',
  defaultDuration: 15,
  minPlayers: 2,
  generateConfig() {
    return {
      duration: 15,
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
