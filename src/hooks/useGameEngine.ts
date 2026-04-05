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
    let config = gameModule
      ? await Promise.resolve(gameModule.generateConfig(questions))
      : { duration: 30 }

    // Injection config PFC : paires de joueurs
    if (gameType === 'rock-paper-scissors') {
      const { players: allPlayers } = useGameStore.getState()
      const shuffled = shuffleArray(allPlayers.map(p => p.id))
      const pairs: [string, string][] = []
      let soloPlayer: string | null = null
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1]])
      }
      if (shuffled.length % 2 !== 0) {
        soloPlayer = shuffled[shuffled.length - 1]
      }
      config = { ...config, pairs, soloPlayer }
    }

    // Injection config Territory : couleurs par joueur
    if (gameType === 'territory') {
      const { players: allPlayers } = useGameStore.getState()
      const TERRITORY_COLORS = ['#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6']
      const playerColors: Record<string, string> = {}
      allPlayers.forEach((p, i) => { playerColors[p.id] = TERRITORY_COLORS[i % TERRITORY_COLORS.length] })
      config = { ...config, playerColors }
    }

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

    // Strip les réponses de la config avant broadcast (anti-triche)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeConfig: any = { ...config }
    if (Array.isArray(safeConfig.questions)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      safeConfig.questions = safeConfig.questions.map(({ answer, ...rest }: any) => rest)
    }

    send('host:round_start', {
      round_number: roundIndex + 1,
      game_type: gameType,
      config: safeConfig,
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

    const rawScores = players.map(p => {
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

    // Scoring custom pour common-word : 20pts par match avec un autre joueur
    if (gameType === 'common-word') {
      const submissions = new Map<string, string>()
      players.forEach(p => {
        const sub = submissionsRef.current.get(p.id) as { value: unknown } | undefined
        if (sub && typeof sub.value === 'string') {
          submissions.set(p.id, sub.value.trim().toLowerCase())
        }
      })
      for (const score of rawScores) {
        const myWord = submissions.get(score.player_id)
        if (!myWord) { score.points = 0; continue }
        let matches = 0
        submissions.forEach((word, pid) => {
          if (pid !== score.player_id && word === myWord) matches++
        })
        score.points = matches * 20
      }
    }

    // Bonus de rang : 5 x nb_joueurs pour le 1er, 5 x (nb_joueurs-1) pour le 2ème, etc.
    const sorted = [...rawScores].sort((a, b) => b.points - a.points)
    const playerCount = players.length
    const scores = rawScores.map(s => {
      const rank = sorted.findIndex(r => r.player_id === s.player_id)
      const rankBonus = Math.max(0, (playerCount - rank) * 5)
      return { ...s, points: s.points + rankBonus }
    })

    await supabase.from('scores').insert(scores)
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', roundId)

    const fullScores = scores.map(s => ({ ...s, id: crypto.randomUUID() }))

    // Extraire les bonnes réponses pour l'affichage inter-manche (toutes les questions)
    const questions = (roundConfig as { questions?: { answer: unknown; content?: string }[] }).questions ?? []
    let correctAnswer: string | null = null
    if (questions.length > 0) {
      const answers = questions.map(q => {
        const raw = q.answer
        const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return raw } })() : raw
        return Array.isArray(parsed) ? parsed.join(' → ') : String(parsed)
      })
      correctAnswer = answers.length === 1 ? answers[0] : answers.map((a, i) => `${i + 1}. ${a}`).join('\n')
    }

    const { accumulateScores, setPhase, setRoundScores, setLastAnswer } = useGameStore.getState()
    setRoundScores(fullScores)
    setLastAnswer(correctAnswer)
    accumulateScores(fullScores)
    setPhase('inter_round')
    send('host:round_end', { round_number: roundIndex + 1, scores: fullScores, correctAnswer })

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

    // Filtrer les jeux désactivés (global + host)
    const { fetchEnabledGameIds } = await import('@/lib/supabase/game-settings')
    const enabledIds = await fetchEnabledGameIds()
    const hostDisabled = freshSession.disabled_games ?? []
    const availableGames = GAME_IDS.filter(id => enabledIds.includes(id) && !hostDisabled.includes(id))

    // Construire l'ordre des jeux : répéter si nécessaire, jamais le même d'affilée (sauf si 1 seul jeu)
    const totalRounds = freshSession.total_rounds
    const gamesOrder: string[] = []
    for (let i = 0; i < totalRounds; i++) {
      const lastGame = gamesOrder[gamesOrder.length - 1] ?? null
      const candidates = availableGames.length > 1
        ? availableGames.filter(g => g !== lastGame)
        : [...availableGames]
      gamesOrder.push(shuffleArray(candidates)[0])
    }

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
    // Bloquer les soumissions multiples — seule la première compte
    if (!submissionsRef.current.has(playerId)) {
      submissionsRef.current.set(playerId, { value, timestamp: Date.now() })
    }
  }, [])

  return { startGame, startRound, receiveSubmission, endRound, endGame }
}
