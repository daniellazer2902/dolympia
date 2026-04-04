import { describe, it, expect } from 'vitest'
import { scoreWithSpeedBonus, scoreByRank, scorePartial } from './scoring'

describe('scoreWithSpeedBonus', () => {
  it('retourne base+bonus si correct et temps max', () => {
    expect(scoreWithSpeedBonus({ correct: true, timeLeft: 20, totalTime: 20, base: 100, bonus: 50 })).toBe(150)
  })

  it('retourne base si correct sans temps restant', () => {
    expect(scoreWithSpeedBonus({ correct: true, timeLeft: 0, totalTime: 20, base: 100, bonus: 50 })).toBe(100)
  })

  it('retourne 0 si incorrect', () => {
    expect(scoreWithSpeedBonus({ correct: false, timeLeft: 20, totalTime: 20, base: 100, bonus: 50 })).toBe(0)
  })
})

describe('scoreByRank', () => {
  it('donne 100 au rang 1', () => {
    expect(scoreByRank(1, 4)).toBe(100)
  })

  it('donne au moins 10 au dernier rang', () => {
    expect(scoreByRank(4, 4)).toBeGreaterThanOrEqual(10)
  })

  it('scores décroissants par rang', () => {
    const s1 = scoreByRank(1, 5)
    const s2 = scoreByRank(2, 5)
    const s3 = scoreByRank(3, 5)
    expect(s1).toBeGreaterThan(s2)
    expect(s2).toBeGreaterThan(s3)
  })
})

describe('scorePartial', () => {
  it('retourne 100 si tous corrects', () => {
    expect(scorePartial(5, 5, 100)).toBe(100)
  })

  it('retourne 0 si rien de correct', () => {
    expect(scorePartial(0, 5, 100)).toBe(0)
  })

  it('retourne 60 si 3/5 corrects', () => {
    expect(scorePartial(3, 5, 100)).toBe(60)
  })
})
