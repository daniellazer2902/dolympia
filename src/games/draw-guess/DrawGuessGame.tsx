'use client'

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/store/game.store'
import { DrawCanvas, type Stroke } from './DrawCanvas'
import type { GameProps } from '../types'

type Phase = 'drawing' | 'waiting_drawings' | 'voting' | 'reveal'

interface Drawing {
  playerId: string
  strokes: Stroke[]
}

export function DrawGuessGame({ config, playerId, onSubmit, isHost, send, onBroadcast, onRoundComplete }: GameProps) {
  const { players } = useGameStore()

  const word = (config as unknown as { word: string }).word
  const drawDuration = (config as unknown as { drawDuration?: number }).drawDuration ?? 60
  const voteDuration = (config as unknown as { voteDuration: number }).voteDuration ?? 8

  const [phase, setPhase] = useState<Phase>('drawing')
  const [drawTimeLeft, setDrawTimeLeft] = useState(drawDuration)
  const strokesRef = useRef<Stroke[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [currentDrawingIdx, setCurrentDrawingIdx] = useState(0)
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [voteTimer, setVoteTimer] = useState(voteDuration)
  const [revealData, setRevealData] = useState<{ playerId: string; pseudo: string; votes: number }[]>([])
  const submittedRef = useRef(false)
  const drawingSubmittedRef = useRef(false)

  const drawingsRef = useRef<Drawing[]>([])
  const votesRef = useRef<Map<string, number>>(new Map())

  // Register broadcast handlers via onBroadcast
  useEffect(() => {
    if (!onBroadcast) return
    const unsubscribe = onBroadcast((event, payload) => {
      if (event === 'player:drawing' && isHost) {
        const p = payload as { playerId: string; strokes: Stroke[] }
        if (!drawingsRef.current.some(d => d.playerId === p.playerId)) {
          drawingsRef.current.push(p)
        }
      }

      if (event === 'host:draw_vote_phase') {
        const p = payload as { drawings: Drawing[] }
        setDrawings(p.drawings)
        setPhase('voting')
        setCurrentDrawingIdx(0)
        setVoteTimer(voteDuration)
      }

      if (event === 'player:vote' && isHost) {
        const p = payload as { targetPlayerId: string }
        const current = votesRef.current.get(p.targetPlayerId) ?? 0
        votesRef.current.set(p.targetPlayerId, current + 1)
      }

      if (event === 'host:draw_reveal') {
        const p = payload as { results: { playerId: string; pseudo: string; votes: number }[]; scores: Record<string, number> }
        setRevealData(p.results)
        setPhase('reveal')
        if (!submittedRef.current) {
          submittedRef.current = true
          onSubmit(p.scores[playerId] ?? 0)
        }
      }
    })
    return unsubscribe
  }, [onBroadcast, isHost, playerId, onSubmit, voteDuration])

  // === TIMER DESSIN INTERNE ===
  useEffect(() => {
    if (phase !== 'drawing') return
    const interval = setInterval(() => {
      setDrawTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // Quand le timer dessin atteint 0 → soumettre le dessin
  useEffect(() => {
    if (phase !== 'drawing' || drawTimeLeft > 0 || drawingSubmittedRef.current) return
    drawingSubmittedRef.current = true
    send?.('player:drawing', { playerId, strokes: strokesRef.current })

    if (isHost) {
      setPhase('waiting_drawings')
      setTimeout(() => {
        if (!drawingsRef.current.some(d => d.playerId === playerId)) {
          drawingsRef.current.push({ playerId, strokes: strokesRef.current })
        }
        const shuffled = [...drawingsRef.current].sort(() => Math.random() - 0.5)
        send?.('host:draw_vote_phase', { drawings: shuffled })
        setDrawings(shuffled)
        setPhase('voting')
        setCurrentDrawingIdx(0)
        setVoteTimer(voteDuration)
      }, 2500)
    } else {
      setPhase('waiting_drawings')
    }
  }, [drawTimeLeft, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // === VOTE TIMER ===
  useEffect(() => {
    if (phase !== 'voting' || drawings.length === 0) return
    setVoteTimer(voteDuration)

    const interval = setInterval(() => {
      setVoteTimer(prev => {
        if (prev <= 1) {
          setCurrentDrawingIdx(idx => {
            const next = idx + 1
            if (next >= drawings.length) {
              clearInterval(interval)
              if (isHost) {
                const results = drawings.map(d => {
                  const pseudo = players.find(p => p.id === d.playerId)?.pseudo ?? '???'
                  const voteCount = votesRef.current.get(d.playerId) ?? 0
                  return { playerId: d.playerId, pseudo, votes: voteCount }
                }).sort((a, b) => b.votes - a.votes)

                const maxVotes = results[0]?.votes ?? 0
                const scores: Record<string, number> = {}
                for (const r of results) {
                  scores[r.playerId] = r.votes * 25 + (r.votes === maxVotes && maxVotes > 0 ? 25 : 0)
                }

                send?.('host:draw_reveal', { results, scores })
                setRevealData(results)
                setPhase('reveal')
                if (!submittedRef.current) {
                  submittedRef.current = true
                  onSubmit(scores[playerId] ?? 0)
                }
              }
              return idx
            }
            return next
          })
          return voteDuration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, drawings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleVote(targetPlayerId: string) {
    if (targetPlayerId === playerId || myVotes.has(targetPlayerId)) return
    setMyVotes(prev => new Set(Array.from(prev).concat(targetPlayerId)))
    send?.('player:vote', { targetPlayerId })
    // W4: Host ne reçoit pas son propre broadcast — compter le vote localement
    if (isHost) {
      const current = votesRef.current.get(targetPlayerId) ?? 0
      votesRef.current.set(targetPlayerId, current + 1)
    }
  }

  // Auto-avancer après le reveal (5s) — le host termine le round
  const [revealCountdown, setRevealCountdown] = useState(5)
  useEffect(() => {
    if (phase !== 'reveal') return
    setRevealCountdown(5)
    const interval = setInterval(() => {
      setRevealCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (isHost && onRoundComplete) {
            onRoundComplete()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, isHost, onRoundComplete])

  // === PHASE DESSIN ===
  if (phase === 'drawing') {
    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <div className="text-center">
          <p className="text-sm text-fiesta-dark/60">Dessine :</p>
          <p className="text-2xl font-playful text-fiesta-orange">{word}</p>
          <p className="text-lg font-playful text-fiesta-rose">{drawTimeLeft}s</p>
        </div>
        <DrawCanvas
          width={300}
          height={300}
          disabled={drawTimeLeft <= 0}
          onStrokesChange={(s) => { strokesRef.current = s }}
        />
      </div>
    )
  }

  // === ATTENTE DES DESSINS ===
  if (phase === 'waiting_drawings') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <div className="w-10 h-10 border-4 border-fiesta-orange/30 border-t-fiesta-orange rounded-full animate-spin" />
        <p className="text-fiesta-dark/70 font-medium animate-pulse">Réception des dessins...</p>
      </div>
    )
  }

  // === PHASE VOTE ===
  if (phase === 'voting' && drawings.length > 0) {
    const current = drawings[currentDrawingIdx]
    if (!current) return null
    const isMe = current.playerId === playerId

    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <div className="text-center">
          <p className="text-sm text-fiesta-dark/60">
            Dessin {currentDrawingIdx + 1}/{drawings.length} — {voteTimer}s
          </p>
          <p className="text-lg font-playful text-fiesta-dark">Mot : {word}</p>
        </div>

        <DrawCanvas width={300} height={300} disabled replayStrokes={current.strokes} />

        {isMe ? (
          <p className="text-fiesta-dark/60 italic">C&apos;est ton dessin !</p>
        ) : (
          <button
            onClick={() => handleVote(current.playerId)}
            disabled={myVotes.has(current.playerId)}
            className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
              myVotes.has(current.playerId)
                ? 'bg-emerald-500 text-white'
                : 'bg-fiesta-orange text-white shadow-btn-orange active:translate-y-1 active:shadow-none'
            }`}
          >
            {myVotes.has(current.playerId) ? '✓ Voté !' : '👍 Voter'}
          </button>
        )}
      </div>
    )
  }

  // === PHASE REVEAL ===
  if (phase === 'reveal') {
    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <h2 className="text-xl font-playful text-fiesta-orange">Résultats du dessin ({revealCountdown}s)</h2>
        <div className="w-full max-w-sm flex flex-col gap-2">
          {revealData.map((r, i) => (
            <div key={r.playerId} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
              r.playerId === playerId ? 'border-fiesta-orange bg-fiesta-orange/10' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-fiesta-dark/60">#{i + 1}</span>
                <span className="font-bold text-fiesta-dark">{r.pseudo}</span>
              </div>
              <span className="font-bold text-fiesta-orange">{r.votes} 👍</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
