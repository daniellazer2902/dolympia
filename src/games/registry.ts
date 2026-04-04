import type { GameModule } from './types'

// Les jeux seront ajoutés dans le Plan 2
const registry = new Map<string, GameModule>()

export function registerGame(module: GameModule) {
  registry.set(module.id, module)
}

export function getGame(id: string): GameModule | undefined {
  return registry.get(id)
}

export function getAllGames(): GameModule[] {
  return Array.from(registry.values())
}

export const GAME_IDS = [
  'quiz',
  'reflex',
  'tap-spam',
  'mental-math',
  'memory',
  'moving-target',
  'true-false',
  'order-logic',
  'shake-it',
  'geo-guess',
] as const

export type GameId = typeof GAME_IDS[number]
