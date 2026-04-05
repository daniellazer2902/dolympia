'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useChannel } from '@/hooks/useChannel'
import { useGameStore } from '@/store/game.store'
import type { GameProps } from '../types'

type Choice = 'rock' | 'paper' | 'scissors'

const CHOICES: { id: Choice; emoji: string; label: string }[] = [
  { id: 'rock', emoji: '🪨', label: 'Pierre' },
  { id: 'paper', emoji: '📄', label: 'Feuille' },
  { id: 'scissors', emoji: '✂️', label: 'Ciseaux' },
]

const SOLO_MESSAGES = [
  'Médaille de la solitude 🏅',
  'Champion par forfait ! 🏆',
  'Invaincu(e) techniquement 💪',
  'Le(la) plus fort(e)... par défaut 😅',
]

function getWinner(a: Choice, b: Choice): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw'
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'a'
  return 'b'
}

export function RPSGame({ config, playerId, timeLeft, onSubmit, isHost, disabled }: GameProps) {
  const { code } = useParams<{ code: string }>()
  const { players } = useGameStore()

  const pairs: [string, string][] = (config as unknown as { pairs: [string, string][] }).pairs ?? []
  const soloPlayer: string | null = (config as unknown as { soloPlayer: string | null }).soloPlayer

  const myPair = pairs.find(([a, b]) => a === playerId || b === playerId)
  const opponentId = myPair ? (myPair[0] === playerId ? myPair[1] : myPair[0]) : null
  const opponent = players.find(p => p.id === opponentId)

  const [currentManche, setCurrentManche] = useState(0)
  const [myChoice, setMyChoice] = useState<Choice | null>(null)
  const [mancheCountdown, setMancheCountdown] = useState(5)
  const [results, setResults] = useState<{ winner: string | null }[]>([])
  const [myWins, setMyWins] = useState(0)
  const [opponentWins, setOpponentWins] = useState(0)
  const [finished, setFinished] = useState(false)
  const [waitingOpponent, setWaitingOpponent] = useState(false)
  const [lastOpponentChoice, setLastOpponentChoice] = useState<Choice | null>(null)
  const submittedRef = useRef(false)

  const choicesRef = useRef<Map<string, Map<number, Choice>>>(new Map())
  const soloMsgRef = useRef(SOLO_MESSAGES[Math.floor(Math.random() * SOLO_MESSAGES.length)])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendRef = useRef<any>(null)

  const { send } = useChannel(code, {
    'player:rps_choice': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { playerId: string; manche: number; choice: Choice }
      if (!choicesRef.current.has(p.playerId)) choicesRef.current.set(p.playerId, new Map())
      choicesRef.current.get(p.playerId)!.set(p.manche, p.choice)

      for (const pair of pairs) {
        const [a, b] = pair
        const choiceA = choicesRef.current.get(a)?.get(p.manche)
        const choiceB = choicesRef.current.get(b)?.get(p.manche)
        if (choiceA && choiceB) {
          const winner = getWinner(choiceA, choiceB)
          const winnerId = winner === 'a' ? a : winner === 'b' ? b : null
          sendRef.current('host:rps_result', { manche: p.manche, pairA: a, pairB: b, choiceA, choiceB, winner: winnerId })
        }
      }
    }, [isHost, pairs]),

    'host:rps_result': useCallback((payload: unknown) => {
      const p = payload as { manche: number; pairA: string; pairB: string; choiceA: Choice; choiceB: Choice; winner: string | null }
      if (p.pairA !== playerId && p.pairB !== playerId) return

      const opChoice = p.pairA === playerId ? p.choiceB : p.choiceA
      setLastOpponentChoice(opChoice)
      setResults(prev => [...prev, { winner: p.winner }])

      if (p.winner === playerId) {
        setMyWins(prev => prev + 1)
      } else if (p.winner !== null) {
        setOpponentWins(prev => prev + 1)
      }

      setTimeout(() => {
        setMyChoice(null)
        setWaitingOpponent(false)
        setLastOpponentChoice(null)
        setMancheCountdown(5)
      }, 1500)
    }, [playerId]),
  })
  sendRef.current = send

  // Solo player
  useEffect(() => {
    if (soloPlayer === playerId && !submittedRef.current) {
      submittedRef.current = true
      setFinished(true)
      onSubmit(40)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown par manche
  useEffect(() => {
    if (finished || soloPlayer === playerId || !myPair) return
    setMancheCountdown(5)
    const interval = setInterval(() => {
      setMancheCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [currentManche, finished]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-choose on timeout (lose the manche)
  useEffect(() => {
    if (mancheCountdown === 0 && !myChoice && !finished && myPair) {
      // Don't submit - host will handle timeout via the global round timer
    }
  }, [mancheCountdown, myChoice, finished, myPair])

  // Check end of best of 3
  useEffect(() => {
    if (finished || submittedRef.current) return
    const totalPlayed = results.length

    if (myWins >= 2 || opponentWins >= 2 || totalPlayed >= 3) {
      setFinished(true)
      submittedRef.current = true
      const score = (myWins * 20) + (myWins > opponentWins ? 10 : 0)
      onSubmit(score)
      return
    }

    if (totalPlayed > currentManche) {
      setCurrentManche(totalPlayed)
    }
  }, [results.length, myWins, opponentWins]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit if round timer ends
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      setFinished(true)
      const score = (myWins * 20) + (myWins > opponentWins ? 10 : 0)
      onSubmit(score)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChoice(choice: Choice) {
    if (myChoice || finished || disabled) return
    setMyChoice(choice)
    setWaitingOpponent(true)
    send('player:rps_choice', { playerId, manche: currentManche, choice })
  }

  // === RENDERS ===

  if (soloPlayer === playerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <span className="text-6xl">😎</span>
        <p className="text-xl font-playful text-fiesta-orange text-center">
          {soloMsgRef.current}
        </p>
        <p className="text-fiesta-dark/60">+40 points de compensation</p>
      </div>
    )
  }

  if (finished) {
    const won = myWins > opponentWins
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <span className="text-5xl">{won ? '🎉' : myWins === opponentWins ? '🤝' : '😢'}</span>
        <p className="text-xl font-playful text-fiesta-dark">
          {won ? 'Victoire !' : myWins === opponentWins ? 'Égalité !' : 'Défaite...'}
        </p>
        <p className="text-fiesta-dark/60">{myWins} - {opponentWins}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full">
      <div className="text-center">
        <p className="text-sm text-fiesta-dark/60">Manche {currentManche + 1}/3 contre</p>
        <p className="text-lg font-playful text-fiesta-rose">{opponent?.pseudo ?? '???'}</p>
        <p className="text-xs text-fiesta-dark/50">{myWins} - {opponentWins}</p>
      </div>

      <div className="text-3xl font-playful text-fiesta-orange">{mancheCountdown}</div>

      {lastOpponentChoice ? (
        <div className="text-center">
          <p className="text-sm text-fiesta-dark/60 mb-2">{opponent?.pseudo} a joué :</p>
          <span className="text-5xl">{CHOICES.find(c => c.id === lastOpponentChoice)?.emoji}</span>
        </div>
      ) : waitingOpponent ? (
        <p className="text-fiesta-dark/60 animate-pulse">En attente de {opponent?.pseudo}...</p>
      ) : (
        <div className="flex gap-4">
          {CHOICES.map(c => (
            <button
              key={c.id}
              onClick={() => handleChoice(c.id)}
              disabled={!!myChoice || disabled}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-fiesta-orange hover:bg-fiesta-orange/10 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-4xl">{c.emoji}</span>
              <span className="text-xs font-bold text-fiesta-dark">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-2 mt-2">
          {results.map((r, i) => (
            <span key={i} className={`text-lg ${r.winner === playerId ? 'text-emerald-500' : r.winner === null ? 'text-gray-400' : 'text-red-400'}`}>
              {r.winner === playerId ? '✓' : r.winner === null ? '—' : '✗'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
