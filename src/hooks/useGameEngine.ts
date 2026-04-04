'use client'

import { useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import { shuffleArray, assignTeams } from '@/lib/utils'
import { GAME_IDS } from '@/games/registry'
import type { GameEventType } from '@/lib/supabase/types'

export function useGameEngine(
  send: (type: GameEventType, payload: unknown) => void
) {
  const { session, localPlayer } = useSessionStore()
  const { players, setPhase, setCurrentRound, accumulateScores } = useGameStore()
  const submissionsRef = useRef<Map<string, unknown>>(new Map())

  const startRound = useCallback(async (gamesOrder: string[], roundIndex: number) => {
    if (!session) return

    const supabase = getSupabaseClient()
    const gameType = gamesOrder[roundIndex]
    const startedAt = new Date().toISOString()
    const duration = 30

    const { data: round } = await supabase
      .from('rounds')
      .insert({
        session_id: session.id,
        round_number: roundIndex + 1,
        game_type: gameType,
        config: { duration },
        started_at: startedAt,
      })
      .select()
      .single()

    if (!round) return

    submissionsRef.current.clear()
    setCurrentRound(round)
    setPhase('playing')

    send('host:round_start', {
      round_number: roundIndex + 1,
      game_type: gameType,
      config: { duration },
      started_at: startedAt,
      round_id: round.id,
      games_order: gamesOrder,
    })
  }, [session, send, setCurrentRound, setPhase])

  const endGame = useCallback(async () => {
    if (!session) return
    const supabase = getSupabaseClient()
    await supabase.from('sessions').update({ status: 'finished' }).eq('id', session.id)
    setPhase('finished')
    send('host:game_end', {})
  }, [session, send, setPhase])

  const endRound = useCallback(async (
    roundId: string,
    gamesOrder: string[],
    roundIndex: number
  ) => {
    if (!session) return

    const supabase = getSupabaseClient()

    const scores = players.map(p => ({
      round_id: roundId,
      player_id: p.id,
      points: submissionsRef.current.has(p.id) ? 50 : 0,
      metadata: {},
    }))

    await supabase.from('scores').insert(scores)
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', roundId)

    const fullScores = scores.map(s => ({ ...s, id: crypto.randomUUID() }))
    accumulateScores(fullScores)
    setPhase('inter_round')
    send('host:round_end', { round_number: roundIndex + 1, scores: fullScores })

    const nextIndex = roundIndex + 1
    if (nextIndex < gamesOrder.length) {
      setTimeout(() => startRound(gamesOrder, nextIndex), 3000)
    } else {
      setTimeout(() => endGame(), 3000)
    }
  }, [session, players, send, accumulateScores, setPhase, startRound, endGame])

  const startGame = useCallback(async () => {
    if (!session || !localPlayer?.is_host) return

    const supabase = getSupabaseClient()
    const gamesOrder = shuffleArray([...GAME_IDS]).slice(0, session.total_rounds)

    let teams: Record<string, 'red' | 'blue'> | undefined
    if (session.mode === 'team') {
      teams = assignTeams(players.map(p => p.id))
      await Promise.all(
        Object.entries(teams).map(([playerId, team]) =>
          supabase.from('players').update({ team }).eq('id', playerId)
        )
      )
    }

    await supabase
      .from('sessions')
      .update({ status: 'playing', games_order: gamesOrder })
      .eq('id', session.id)

    send('host:game_start', { games_order: gamesOrder, total_rounds: session.total_rounds, teams })

    if (teams) {
      send('host:team_assign', { assignments: teams })
      setPhase('team_splash')
      setTimeout(() => startRound(gamesOrder, 0), 5000)
    } else {
      startRound(gamesOrder, 0)
    }
  }, [session, localPlayer, players, send, setPhase, startRound])

  const receiveSubmission = useCallback((playerId: string, value: unknown) => {
    submissionsRef.current.set(playerId, value)
  }, [])

  return { startGame, startRound, receiveSubmission, endRound, endGame }
}
