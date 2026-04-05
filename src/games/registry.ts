import type { GameModule } from './types'
import { quizModule } from './quiz'
import { trueFalseModule } from './true-false'
import { mentalMathModule } from './mental-math'
import { reflexModule } from './reflex'
import { tapSpamModule } from './tap-spam'
import { memoryModule } from './memory'
import { movingTargetModule } from './moving-target'
import { orderLogicModule } from './order-logic'
import { shakeItModule } from './shake-it'
import { geoGuessModule } from './geo-guess'
import { rpsModule } from './rock-paper-scissors'
import { pointRushModule } from './point-rush'
import { territoryModule } from './territory'
import { drawGuessModule } from './draw-guess'
import { commonWordModule } from './common-word'

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
  'rock-paper-scissors',
  'point-rush',
  'territory',
  'draw-guess',
  'common-word',
] as const

export type GameId = typeof GAME_IDS[number]

function initRegistry() {
  registerGame(quizModule)
  registerGame(trueFalseModule)
  registerGame(mentalMathModule)
  registerGame(reflexModule)
  registerGame(tapSpamModule)
  registerGame(memoryModule)
  registerGame(movingTargetModule)
  registerGame(orderLogicModule)
  registerGame(shakeItModule)
  registerGame(geoGuessModule)
  registerGame(rpsModule)
  registerGame(pointRushModule)
  registerGame(territoryModule)
  registerGame(drawGuessModule)
  registerGame(commonWordModule)
}

// Auto-init au premier import
initRegistry()
