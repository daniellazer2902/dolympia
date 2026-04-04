import { describe, it, expect } from 'vitest'
import {
  generateSessionCode,
  computeRoundCount,
  shuffleArray,
  assignTeams,
  computeSpeedBonus,
} from './utils'

describe('generateSessionCode', () => {
  it('génère un code de 6 caractères', () => {
    expect(generateSessionCode()).toHaveLength(6)
  })

  it('ne contient que des caractères alphanumériques sans ambiguïté', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('génère des codes différents', () => {
    const codes = new Set(Array.from({ length: 100 }, generateSessionCode))
    expect(codes.size).toBeGreaterThan(90)
  })
})

describe('computeRoundCount', () => {
  it('retourne 3 pour 10 min et 2 joueurs', () => {
    expect(computeRoundCount(10, 2)).toBe(3)
  })

  it('retourne 5 pour 20 min et 4 joueurs', () => {
    expect(computeRoundCount(20, 4)).toBe(5)
  })

  it('retourne 9 pour 30 min et 8 joueurs', () => {
    expect(computeRoundCount(30, 8)).toBe(9)
  })

  it('minimum 1 manche', () => {
    expect(computeRoundCount(1, 1)).toBeGreaterThanOrEqual(1)
  })
})

describe('shuffleArray', () => {
  it('conserve tous les éléments', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(arr)
    expect(shuffled).toHaveLength(arr.length)
    expect([...shuffled].sort((a,b) => a-b)).toEqual([1, 2, 3, 4, 5])
  })

  it('ne modifie pas le tableau original', () => {
    const arr = [1, 2, 3]
    shuffleArray(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('assignTeams', () => {
  it('assigne red et blue équitablement', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const result = assignTeams(ids)
    const reds = Object.values(result).filter(t => t === 'red')
    const blues = Object.values(result).filter(t => t === 'blue')
    expect(reds.length).toBe(2)
    expect(blues.length).toBe(2)
  })

  it('gère un nombre impair de joueurs', () => {
    const ids = ['p1', 'p2', 'p3']
    const result = assignTeams(ids)
    const values = Object.values(result)
    expect(values.every(v => v === 'red' || v === 'blue')).toBe(true)
  })

  it('assigne tous les joueurs', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
    const result = assignTeams(ids)
    expect(Object.keys(result)).toHaveLength(5)
  })
})

describe('computeSpeedBonus', () => {
  it('retourne le bonus max si répondu instantanément', () => {
    expect(computeSpeedBonus(20, 20, 50)).toBe(50)
  })

  it('retourne 0 si répondu à la toute fin', () => {
    expect(computeSpeedBonus(20, 0, 50)).toBe(0)
  })

  it('retourne un bonus proportionnel', () => {
    expect(computeSpeedBonus(20, 10, 50)).toBe(25)
  })
})
