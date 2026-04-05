'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/store/game.store'
import type { GameProps } from '../types'

type Choice = 'rock' | 'paper' | 'scissors'
type ManchePhase = 'choosing' | 'waiting' | 'showing_result' | 'done'

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

function getWinner(a: string, b: string): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw'
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'a'
  return 'b'
}

function randomChoice(): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors']
  return choices[Math.floor(Math.random() * choices.length)]
}

export function RPSGame({ config, playerId, timeLeft, onSubmit, isHost, disabled, send, onBroadcast }: GameProps) {
  const { players } = useGameStore()

  const pairs: [string, string][] = (config as unknown as { pairs: [string, string][] }).pairs ?? []
  const soloPlayer: string | null = (config as unknown as { soloPlayer: string | null }).soloPlayer

  const myPair = pairs.find(([a, b]) => a === playerId || b === playerId)
  const opponentId = myPair ? (myPair[0] === playerId ? myPair[1] : myPair[0]) : null
  const opponent = players.find(p => p.id === opponentId)
  const me = players.find(p => p.id === playerId)

  const [manchePhase, setManchePhase] = useState<ManchePhase>('choosing')
  const [currentManche, setCurrentManche] = useState(0)
  const [myChoice, setMyChoice] = useState<Choice | null>(null)
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null)
  const [mancheCountdown, setMancheCountdown] = useState(5)
  const [mancheWinner, setMancheWinner] = useState<string | null>(null)
  const [isDraw, setIsDraw] = useState(false)
  const [myWins, setMyWins] = useState(0)
  const [opponentWins, setOpponentWins] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const submittedRef = useRef(false)

  const choicesRef = useRef<Map<string, Map<number, Choice>>>(new Map())
  const soloMsgRef = useRef(SOLO_MESSAGES[Math.floor(Math.random() * SOLO_MESSAGES.length)])
  const myWinsRef = useRef(0)
  const opponentWinsRef = useRef(0)
  // Manche counter used inside tryResolve/showResult closures
  const mancheCounterRef = useRef(0)

  // Sync refs
  useEffect(() => { myWinsRef.current = myWins }, [myWins])
  useEffect(() => { opponentWinsRef.current = opponentWins }, [opponentWins])
  useEffect(() => { mancheCounterRef.current = currentManche }, [currentManche])

  // Broadcast handlers
  useEffect(() => {
    if (!onBroadcast) return
    const unsubscribe = onBroadcast((event, payload) => {
      if (event === 'player:rps_choice' && isHost) {
        const p = payload as { playerId: string; manche: number; choice: string }
        if (!choicesRef.current.has(p.playerId)) choicesRef.current.set(p.playerId, new Map())
        choicesRef.current.get(p.playerId)!.set(p.manche, p.choice as Choice)
        tryResolve(p.manche)
      }

      if (event === 'host:rps_result') {
        const p = payload as { manche: number; pairA: string; pairB: string; choiceA: string; choiceB: string; winner: string | null }
        if (p.pairA !== playerId && p.pairB !== playerId) return
        processRpsResult(p)
      }
    })
    return unsubscribe
  }, [onBroadcast, isHost, pairs, playerId, send]) // eslint-disable-line react-hooks/exhaustive-deps

  // Try to resolve a manche (host only)
  function tryResolve(manche: number) {
    for (const pair of pairs) {
      const [a, b] = pair
      const choiceA = choicesRef.current.get(a)?.get(manche)
      const choiceB = choicesRef.current.get(b)?.get(manche)
      if (choiceA && choiceB) {
        const winner = getWinner(choiceA, choiceB)
        const winnerId = winner === 'a' ? a : winner === 'b' ? b : null
        const result = { manche, pairA: a, pairB: b, choiceA, choiceB, winner: winnerId }
        send?.('host:rps_result', result)
        // W4: host traite aussi localement
        processRpsResult(result)
      }
    }
  }

  // Process and display the result of a manche (guard: ignore if already showing a result)
  const processingMancheRef = useRef<number>(-1)
  function processRpsResult(p: { manche: number; pairA: string; pairB: string; choiceA: string; choiceB: string; winner: string | null }) {
    // Éviter de traiter deux fois le même résultat
    if (processingMancheRef.current === p.manche) return
    processingMancheRef.current = p.manche

    const opChoice = (p.pairA === playerId ? p.choiceB : p.choiceA) as Choice
    setOpponentChoice(opChoice)
    setMancheWinner(p.winner)

    const draw = p.winner === null
    setIsDraw(draw)
    setManchePhase('showing_result')

    if (!draw) {
      if (p.winner === playerId) {
        setMyWins(prev => prev + 1)
      } else {
        setOpponentWins(prev => prev + 1)
      }
    }
  }

  // Solo player — 40 pts automatiques
  useEffect(() => {
    if (soloPlayer === playerId && !submittedRef.current) {
      submittedRef.current = true
      setGameFinished(true)
      onSubmit(40)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown de 5s par manche (uniquement en phase "choosing")
  useEffect(() => {
    if (manchePhase !== 'choosing' || gameFinished || soloPlayer === playerId || !myPair) return
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
  }, [manchePhase, gameFinished, currentManche]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pick random when countdown reaches 0 and player hasn't chosen
  // Délai de 500ms pour éviter un pick immédiat au changement de manche
  useEffect(() => {
    if (mancheCountdown !== 0 || manchePhase !== 'choosing' || myChoice || gameFinished || disabled) return
    const timeout = setTimeout(() => {
      // Re-vérifier après le délai (la manche a pu changer entre-temps)
      if (!myChoice && manchePhase === 'choosing' && !gameFinished) {
        handleChoice(randomChoice())
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [mancheCountdown, manchePhase, myChoice, gameFinished, disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase "showing_result" — draw: 1.5s then replay same manche; win/loss: 2s then advance or finish
  useEffect(() => {
    if (manchePhase !== 'showing_result') return

    const delay = isDraw ? 1500 : 2000
    const timeout = setTimeout(() => {
      if (isDraw) {
        // Replay same manche — draw doesn't count
        setMyChoice(null)
        setOpponentChoice(null)
        setMancheWinner(null)
        setIsDraw(false)
        processingMancheRef.current = -1 // Reset guard pour rejouer la même manche
        setManchePhase('choosing')
        return
      }

      const newMyWins = myWinsRef.current
      const newOpWins = opponentWinsRef.current

      // First to 2 wins ends the game
      if (newMyWins >= 2 || newOpWins >= 2) {
        setManchePhase('done')
        setGameFinished(true)
        if (!submittedRef.current) {
          submittedRef.current = true
          const score = (newMyWins * 20) + (newMyWins > newOpWins ? 10 : 0)
          onSubmit(score)
        }
      } else {
        // Next manche
        const nextManche = mancheCounterRef.current + 1
        setCurrentManche(nextManche)
        setMyChoice(null)
        setOpponentChoice(null)
        setMancheWinner(null)
        setIsDraw(false)
        processingMancheRef.current = -1 // Reset guard pour la nouvelle manche
        setManchePhase('choosing')
      }
    }, delay)
    return () => clearTimeout(timeout)
  }, [manchePhase, isDraw]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit si le timer global expire
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      setGameFinished(true)
      const score = (myWinsRef.current * 20) + (myWinsRef.current > opponentWinsRef.current ? 10 : 0)
      onSubmit(score)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChoice(choice: Choice) {
    if (myChoice || manchePhase !== 'choosing' || gameFinished || disabled) return
    setMyChoice(choice)
    setManchePhase('waiting')
    send?.('player:rps_choice', { playerId, manche: currentManche, choice })

    // W4: Host enregistre localement et tente de résoudre
    if (isHost) {
      if (!choicesRef.current.has(playerId)) choicesRef.current.set(playerId, new Map())
      choicesRef.current.get(playerId)!.set(currentManche, choice)
      tryResolve(currentManche)
    }
  }

  // === RENDERS ===

  if (soloPlayer === playerId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <span className="text-6xl">😎</span>
        <p className="text-xl font-playful text-fiesta-orange text-center">{soloMsgRef.current}</p>
        <p className="text-fiesta-dark/60">+40 points de compensation</p>
      </div>
    )
  }

  if (gameFinished) {
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
      {/* Header: Manche X/3 + score line */}
      <div className="text-center">
        <p className="text-sm font-playful text-fiesta-dark/70 mb-1">Manche {currentManche + 1}/3</p>
        <p className="text-lg font-playful text-fiesta-dark">
          <span className="text-fiesta-rose">{me?.pseudo ?? 'Toi'}</span>
          {'  '}
          <span className="text-fiesta-orange">{myWins} - {opponentWins}</span>
          {'  '}
          <span className="text-fiesta-rose">{opponent?.pseudo ?? '???'}</span>
        </p>
      </div>

      {manchePhase === 'choosing' && (
        <>
          <div className="text-3xl font-playful text-fiesta-orange">{mancheCountdown}</div>
          <div className="flex gap-4">
            {CHOICES.map(c => (
              <button
                key={c.id}
                onClick={() => handleChoice(c.id)}
                disabled={disabled}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-fiesta-orange hover:bg-fiesta-orange/10 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="text-4xl">{c.emoji}</span>
                <span className="text-xs font-bold text-fiesta-dark">{c.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {manchePhase === 'waiting' && (
        <div className="text-center">
          <p className="text-lg font-playful text-fiesta-dark mb-2">
            Tu as joué : {CHOICES.find(c => c.id === myChoice)?.emoji}
          </p>
          <p className="text-fiesta-dark/60 animate-pulse">En attente de {opponent?.pseudo}...</p>
        </div>
      )}

      {manchePhase === 'showing_result' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-fiesta-dark/60 mb-1">Toi</p>
              <span className="text-5xl">{CHOICES.find(c => c.id === myChoice)?.emoji}</span>
            </div>
            <span className="text-2xl font-playful text-fiesta-dark">VS</span>
            <div className="text-center">
              <p className="text-xs text-fiesta-dark/60 mb-1">{opponent?.pseudo}</p>
              <span className="text-5xl">{CHOICES.find(c => c.id === opponentChoice)?.emoji}</span>
            </div>
          </div>
          <p className={`text-xl font-playful ${
            isDraw ? 'text-amber-500' :
            mancheWinner === playerId ? 'text-emerald-500' : 'text-red-400'
          }`}>
            {isDraw ? 'Égalité ! On recommence...' :
             mancheWinner === playerId ? 'Gagné !' : 'Perdu !'}
          </p>
        </div>
      )}
    </div>
  )
}
