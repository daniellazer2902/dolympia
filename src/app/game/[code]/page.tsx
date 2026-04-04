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
import type { Round, Score, Player } from '@/lib/supabase/types'

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer } = useSessionStore()
  const { phase, setPhase, setCurrentRound, setRoundScores, accumulateScores, setPlayers, players } = useGameStore()
  const gamesOrderRef = useRef<string[]>([])
  const roundIndexRef = useRef(0)
  const currentRoundIdRef = useRef<string | null>(null)

  const { send } = useChannel(code, {
    'host:round_start': (payload: unknown) => {
      const p = payload as {
        round_id: string
        round_number: number
        game_type: string
        config: Record<string, unknown>
        started_at: string
        games_order?: string[]
      }
      const round: Round = {
        id: p.round_id,
        session_id: session?.id ?? '',
        round_number: p.round_number,
        game_type: p.game_type,
        config: p.config,
        started_at: p.started_at,
        ended_at: null,
      }
      if (p.games_order) gamesOrderRef.current = p.games_order
      roundIndexRef.current = p.round_number - 1
      currentRoundIdRef.current = p.round_id
      setCurrentRound(round)
      setPhase('playing')
    },
    'host:round_end': (payload: unknown) => {
      const p = payload as { scores: Score[] }
      setRoundScores(p.scores)
      accumulateScores(p.scores)
      setPhase('inter_round')
    },
    'host:team_assign': (payload: unknown) => {
      const p = payload as { assignments: Record<string, 'red' | 'blue'> }
      setPlayers(players.map(pl => ({
        ...pl,
        team: p.assignments[pl.id] ?? pl.team,
      })))
    },
    'host:game_end': () => {
      router.push(`/results/${code}`)
    },
  })

  const { receiveSubmission, endRound } = useGameEngine(send)

  // Charger les joueurs
  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()
    supabase.from('players').select().eq('session_id', session.id).then(({ data }: { data: Player[] | null }) => {
      if (data) setPlayers(data)
    })
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fix: les non-hosts ratent le broadcast round_start car ils arrivent après.
  // On récupère le round courant depuis la DB au mount.
  useEffect(() => {
    if (!session || localPlayer?.is_host) return
    if (phase !== 'lobby' && phase !== 'round_start') return

    const supabase = getSupabaseClient()
    supabase
      .from('rounds')
      .select()
      .eq('session_id', session.id)
      .is('ended_at', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .single()
      .then(({ data: round }: { data: Round | null }) => {
        if (!round) return
        // Récupérer games_order depuis la session
        supabase.from('sessions').select('games_order').eq('id', session.id).single()
          .then(({ data: sess }: { data: { games_order: string[] } | null }) => {
            if (sess?.games_order) gamesOrderRef.current = sess.games_order
            roundIndexRef.current = round.round_number - 1
            currentRoundIdRef.current = round.id
            setCurrentRound(round)
            setPhase('playing')
          })
      })
  }, [session?.id, localPlayer?.is_host, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(value: unknown) {
    if (!localPlayer) return
    receiveSubmission(localPlayer.id, value)
    send('player:answer', { player_id: localPlayer.id, value, timestamp: Date.now() })
  }

  function handleRoundEnd() {
    if (!localPlayer?.is_host || !currentRoundIdRef.current) return
    endRound(currentRoundIdRef.current, gamesOrderRef.current, roundIndexRef.current)
  }

  if (phase === 'team_splash') {
    const myTeam = players.find(p => p.id === localPlayer?.id)?.team
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-4">
        <p className="text-fiesta-dark/70 font-medium">Tu joues pour l&apos;équipe</p>
        <div className={`text-6xl font-playful ${myTeam === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
          {myTeam === 'red' ? '🔴 Rouge' : '🔵 Bleu'}
        </div>
        <p className="text-fiesta-dark/60 text-sm animate-pulse">La partie démarre dans 5s...</p>
      </div>
    )
  }

  if (phase === 'inter_round') {
    return <RoundTransition />
  }

  if (phase === 'lobby' || phase === 'round_start') {
    return (
      <div className="min-h-screen bg-fiesta-bg flex items-center justify-center">
        <p className="text-fiesta-dark/70 font-medium animate-pulse">Chargement de la manche...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex flex-col">
      <GameContainer onSubmit={handleSubmit} onRoundEnd={handleRoundEnd} />
    </div>
  )
}
