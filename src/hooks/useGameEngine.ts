'use client'

import { useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import { shuffleArray, assignTeams, fillMissingTeams } from '@/lib/utils'
import { GAME_IDS, getGame } from '@/games/registry'
import { fetchQuestions } from '@/lib/supabase/questions'
import type { GameEventType } from '@/lib/supabase/types'

export function useGameEngine(
  send: (type: GameEventType, payload: unknown) => void
) {
  const submissionsRef = useRef<Map<string, unknown>>(new Map())

  const startRound = useCallback(async (gamesOrder: string[], roundIndex: number) => {
    const { session } = useSessionStore.getState()
    if (!session) return

    const supabase = getSupabaseClient()
    const gameType = gamesOrder[roundIndex]
    const gameModule = getGame(gameType)
    const startedAt = new Date().toISOString()

    // Fetch les questions depuis la DB si le jeu en a besoin
    const needsQuestions = ['quiz', 'true-false', 'mental-math', 'order-logic', 'geo-guess']
    const questions = needsQuestions.includes(gameType)
      ? await fetchQuestions(gameType, 3)
      : []

    // Générer la config via le module du jeu (durée, questions, etc.)
    const config = gameModule
      ? gameModule.generateConfig(questions)
      : { duration: 30 }

    const { data: round } = await supabase
      .from('rounds')
      .insert({
        session_id: session.id,
        round_number: roundIndex + 1,
        game_type: gameType,
        config,
        started_at: startedAt,
      })
      .select()
      .single()

    if (!round) return

    submissionsRef.current.clear()
    const { setCurrentRound, setPhase } = useGameStore.getState()
    setCurrentRound(round)
    setPhase('playing')

    send('host:round_start', {
      round_number: roundIndex + 1,
      game_type: gameType,
      config,
      started_at: startedAt,
      round_id: round.id,
      games_order: gamesOrder,
    })
  }, [send])

  const endGame = useCallback(async () => {
    const { session } = useSessionStore.getState()
    if (!session) return
    const supabase = getSupabaseClient()
    await supabase.from('sessions').update({ status: 'finished' }).eq('id', session.id)
    useGameStore.getState().setPhase('finished')
    send('host:game_end', {})
  }, [send])

  const endRound = useCallback(async (
    roundId: string,
    gamesOrder: string[],
    roundIndex: number
  ) => {
    const { session } = useSessionStore.getState()
    if (!session) return

    const supabase = getSupabaseClient()
    const { players, currentRound } = useGameStore.getState()
    const gameType = gamesOrder[roundIndex]
    const gameModule = getGame(gameType)
    const roundConfig = currentRound?.config ?? { duration: 30 }
    const roundStartedAt = currentRound?.started_at
      ? new Date(currentRound.started_at).getTime()
      : Date.now()

    const scores = players.map(p => {
      const sub = submissionsRef.current.get(p.id) as { value: unknown; timestamp: number } | undefined
      let points = 0
      if (sub && gameModule) {
        points = gameModule.computeScore(
          { playerId: p.id, value: sub.value, timestamp: sub.timestamp, startedAt: roundStartedAt },
          roundConfig as import('@/games/types').RoundConfig
        )
      }
      return { round_id: roundId, player_id: p.id, points, metadata: {} }
    })

    await supabase.from('scores').insert(scores)
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', roundId)

    const fullScores = scores.map(s => ({ ...s, id: crypto.randomUUID() }))
    const { accumulateScores, setPhase } = useGameStore.getState()
    accumulateScores(fullScores)
    setPhase('inter_round')
    send('host:round_end', { round_number: roundIndex + 1, scores: fullScores })

    const nextIndex = roundIndex + 1
    if (nextIndex < gamesOrder.length) {
      setTimeout(() => startRound(gamesOrder, nextIndex), 3000)
    } else {
      setTimeout(() => endGame(), 3000)
    }
  }, [send, startRound, endGame])

  const startGame = useCallback(async () => {
    // Lire la session fraîche depuis le store (pas la closure qui peut être stale)
    const { session: freshSession, localPlayer: freshPlayer } = useSessionStore.getState()
    const { players: freshPlayers } = useGameStore.getState()
    if (!freshSession || !freshPlayer?.is_host) return

    const supabase = getSupabaseClient()
    const gamesOrder = shuffleArray([...GAME_IDS]).slice(0, freshSession.total_rounds)

    let teams: Record<string, 'red' | 'blue'> | undefined
    if (freshSession.mode === 'team') {
      if (freshSession.team_mode === 'manual') {
        // Garder les choix existants, compléter les manquants équitablement
        teams = fillMissingTeams(freshPlayers.map(p => ({ id: p.id, team: p.team })))
      } else {
        // Mode auto : tout réassigner aléatoirement
        teams = assignTeams(freshPlayers.map(p => p.id))
      }
      await Promise.all(
        Object.entries(teams).map(([playerId, team]) =>
          supabase.from('players').update({ team }).eq('id', playerId)
        )
      )
    }

    await supabase
      .from('sessions')
      .update({ status: 'playing', games_order: gamesOrder })
      .eq('id', freshSession.id)

    if (teams) {
      const { setPlayers, players: currentPlayers } = useGameStore.getState()
      setPlayers(currentPlayers.map(p => ({ ...p, team: teams![p.id] ?? p.team })))
    }

    // Broadcaster game_start — tout le monde navigue vers /game/[code]
    send('host:game_start', {
      games_order: gamesOrder,
      total_rounds: freshSession.total_rounds,
      teams,
    })

    // Timer : splash 5s dans le lobby + navigation prefetchée ~0.5s
    // Solo : navigation directe ~0.5s
    const delay = freshSession.mode === 'team' ? 6000 : 1000
    setTimeout(() => startRound(gamesOrder, 0), delay)
  }, [send, startRound])

  const receiveSubmission = useCallback((playerId: string, value: unknown) => {
    submissionsRef.current.set(playerId, { value, timestamp: Date.now() })
  }, [])

  return { startGame, startRound, receiveSubmission, endRound, endGame }
}
