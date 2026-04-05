'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { useGameStore } from '@/store/game.store'
import { useChannel } from '@/hooks/useChannel'
import { useGameEngine } from '@/hooks/useGameEngine'
import { GameContainer } from '@/components/game/GameContainer'
import { RoundTransition } from '@/components/game/RoundTransition'
import type { Round, Score, Player, Session } from '@/lib/supabase/types'

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer } = useSessionStore()
  const { phase, currentRound, setPhase, setCurrentRound, setRoundScores, accumulateScores, setPlayers, players } = useGameStore()
  const gamesOrderRef = useRef<string[]>([])
  const roundIndexRef = useRef(0)
  const currentRoundIdRef = useRef<string | null>(null)

  // Système de listeners pour les jeux temps réel (PointRush, Territory, RPS, DrawGuess)
  const gameListenersRef = useRef<Set<(event: string, payload: unknown) => void>>(new Set())

  // === BROADCASTS : source de vérité pour les transitions ===
  const { send } = useChannel(code, {
    'host:round_start': (payload: unknown) => {
      const p = payload as {
        round_id: string; round_number: number; game_type: string
        config: Record<string, unknown>; started_at: string; games_order?: string[]
      }
      if (p.games_order) gamesOrderRef.current = p.games_order
      roundIndexRef.current = p.round_number - 1
      currentRoundIdRef.current = p.round_id
      setCurrentRound({
        id: p.round_id, session_id: session?.id ?? '', round_number: p.round_number,
        game_type: p.game_type, config: p.config, started_at: p.started_at, ended_at: null,
      })
      setPhase('playing')
    },
    'host:round_end': (payload: unknown) => {
      const p = payload as { scores: Score[]; correctAnswer?: string }
      setRoundScores(p.scores)
      accumulateScores(p.scores)
      useGameStore.getState().setLastAnswer(p.correctAnswer ?? null)
      setPhase('inter_round')
    },
    'host:game_end': () => {
      router.push(`/results/${code}`)
    },
    'player:answer': (payload: unknown) => {
      // Le host enregistre les soumissions des autres joueurs pour le scoring
      const p = payload as { player_id: string; value: unknown; timestamp: number }
      receiveSubmissionRef.current?.(p.player_id, p.value)
    },
    // Forward des events temps réel vers les composants de jeu
    'host:grid_state': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('host:grid_state', payload))
    },
    'player:grid_click': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('player:grid_click', payload))
    },
    'player:territory_click': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('player:territory_click', payload))
    },
    'player:rps_choice': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('player:rps_choice', payload))
    },
    'host:rps_result': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('host:rps_result', payload))
    },
    'player:drawing': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('player:drawing', payload))
    },
    'host:draw_vote_phase': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('host:draw_vote_phase', payload))
    },
    'player:vote': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('player:vote', payload))
    },
    'host:draw_reveal': (payload: unknown) => {
      gameListenersRef.current.forEach(fn => fn('host:draw_reveal', payload))
    },
  })

  const { receiveSubmission, endRound } = useGameEngine(send)
  const receiveSubmissionRef = useRef(receiveSubmission)
  receiveSubmissionRef.current = receiveSubmission

  // Host: naviguer vers results quand la partie est finie
  // (le host ne reçoit pas son propre broadcast host:game_end)
  useEffect(() => {
    if (phase === 'finished') {
      router.push(`/results/${code}`)
    }
  }, [phase, code, router])

  // Synchroniser les refs depuis le store — couvre le cas du host
  // qui ne reçoit pas son propre broadcast host:round_start
  useEffect(() => {
    if (!currentRound) return
    currentRoundIdRef.current = currentRound.id
    roundIndexRef.current = currentRound.round_number - 1
  }, [currentRound?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // === CHARGEMENT : joueurs + session depuis la DB ===
  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()
    Promise.all([
      supabase.from('sessions').select().eq('id', session.id).single() as Promise<{ data: Session | null }>,
      supabase.from('players').select().eq('session_id', session.id) as Promise<{ data: Player[] | null }>,
    ]).then(([{ data: sessData }, { data: playersData }]) => {
      if (playersData) setPlayers(playersData)
      if (sessData?.games_order) gamesOrderRef.current = sessData.games_order
    })
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // === FILET DE SÉCURITÉ : non-host poll DB si broadcast raté ===
  useEffect(() => {
    if (!session || localPlayer?.is_host) return
    const supabase = getSupabaseClient()
    let cancelled = false

    const poll = async () => {
      const p = useGameStore.getState().phase
      if (p === 'playing' || p === 'inter_round' || p === 'finished') return

      const { data: round } = await supabase
        .from('rounds').select().eq('session_id', session.id)
        .is('ended_at', null).order('round_number', { ascending: false })
        .limit(1).single() as { data: Round | null }
      if (cancelled || !round) return

      const { data: sess } = await supabase
        .from('sessions').select('games_order').eq('id', session.id)
        .single() as { data: { games_order: string[] } | null }
      if (cancelled) return

      if (sess?.games_order) gamesOrderRef.current = sess.games_order
      roundIndexRef.current = round.round_number - 1
      currentRoundIdRef.current = round.id
      setCurrentRound(round)
      setPhase('playing')
    }

    // Poll immédiat puis toutes les secondes
    poll()
    const interval = setInterval(poll, 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [session?.id, localPlayer?.is_host]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(value: unknown) {
    if (!localPlayer) return
    receiveSubmission(localPlayer.id, value)
    send('player:answer', { player_id: localPlayer.id, value, timestamp: Date.now() })
  }

  function handleRoundEnd() {
    const fp = useSessionStore.getState().localPlayer
    if (!fp?.is_host || !currentRoundIdRef.current) return
    endRound(currentRoundIdRef.current, gamesOrderRef.current, roundIndexRef.current)
  }

  // === RENDU ===

  if (phase === 'inter_round') {
    return <RoundTransition />
  }

  // Écran d'attente — avec infos d'équipe si mode team
  if (phase !== 'playing' && phase !== 'finished') {
    const isTeam = session?.mode === 'team'
    const myTeam = players.find(p => p.id === localPlayer?.id)?.team
    const teammates = isTeam ? players.filter(p => p.team === myTeam && p.id !== localPlayer?.id) : []
    const opponents = isTeam ? players.filter(p => p.team && p.team !== myTeam) : []

    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-5 p-6">
        <h1 className="text-3xl font-playful text-fiesta-orange drop-shadow-[2px_2px_0_#FFD700]">
          dolympia!
        </h1>

        {isTeam && myTeam && (
          <>
            <div className={`text-4xl font-playful ${myTeam === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
              {myTeam === 'red' ? '🔴 Équipe Rouge' : '🔵 Équipe Bleue'}
            </div>

            {teammates.length > 0 && (
              <div className="text-center">
                <p className="text-fiesta-dark/60 text-sm mb-2">Tes coéquipiers</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {teammates.map(p => (
                    <span key={p.id} className={`px-3 py-1 rounded-full font-bold text-sm text-white ${myTeam === 'red' ? 'bg-red-400' : 'bg-blue-400'}`}>
                      {p.pseudo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {opponents.length > 0 && (
              <div className="text-center">
                <p className="text-fiesta-dark/60 text-sm mb-2">En face</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {opponents.map(p => (
                    <span key={p.id} className={`px-3 py-1 rounded-full font-bold text-sm text-white ${p.team === 'red' ? 'bg-red-400' : 'bg-blue-400'}`}>
                      {p.pseudo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-fiesta-orange/30 border-t-fiesta-orange rounded-full animate-spin" />
          <p className="text-fiesta-dark/70 font-medium animate-pulse">
            {isTeam ? 'La manche arrive...' : 'Préparation de la manche...'}
          </p>
        </div>
        <p className="text-fiesta-dark/40 text-xs mt-4">&copy; Daniel Gavriline &middot; v1.0.0</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex flex-col">
      <GameContainer
        onSubmit={handleSubmit}
        onRoundEnd={handleRoundEnd}
        send={send as (type: string, payload: unknown) => void}
        onBroadcast={(handler) => {
          gameListenersRef.current.add(handler)
          return () => { gameListenersRef.current.delete(handler) }
        }}
      />
    </div>
  )
}
