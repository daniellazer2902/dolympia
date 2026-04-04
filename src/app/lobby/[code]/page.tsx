'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { useGameStore } from '@/store/game.store'
import { usePresence } from '@/hooks/usePresence'
import { useChannel } from '@/hooks/useChannel'
import { useGameEngine } from '@/hooks/useGameEngine'
import { computeRoundCount } from '@/lib/utils'
import { PlayerList } from '@/components/lobby/PlayerList'
import { TeamPicker } from '@/components/lobby/TeamPicker'
import { Button } from '@/components/ui/Button'
import type { Session, Player } from '@/lib/supabase/types'

// Données du splash affiché DANS le lobby avant la navigation
interface SplashData {
  myTeam: 'red' | 'blue' | null
  teammates: Player[]
  opponents: Player[]
}

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer, setSession } = useSessionStore()
  const { players, setPlayers } = useGameStore()

  const [hostMode, setHostMode] = useState<'solo' | 'team'>('solo')
  const [hostTeamMode, setHostTeamMode] = useState<'auto' | 'manual'>('auto')
  const [duration, setDuration] = useState(20)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [splash, setSplash] = useState<SplashData | null>(null)
  const [countdown, setCountdown] = useState(5)

  const isHost = localPlayer?.is_host ?? false
  const mode = isHost ? hostMode : (session?.mode ?? 'solo')
  const teamMode = isHost ? hostTeamMode : (session?.team_mode ?? 'auto')

  const { send } = useChannel(code, {
    'host:game_start': (payload: unknown) => {
      const p = payload as { teams?: Record<string, 'red' | 'blue'> }
      if (p.teams) {
        const freshPlayers = useGameStore.getState().players
        const updatedPlayers = freshPlayers.map(pl => ({
          ...pl,
          team: p.teams![pl.id] ?? pl.team,
        }))
        setPlayers(updatedPlayers)
        showSplash(updatedPlayers)
      } else {
        router.push(`/game/${code}`)
      }
    },
    'host:game_go': () => {
      // Signal du host : tout le monde navigue MAINTENANT
      router.push(`/game/${code}`)
    },
    'host:config_update': (payload: unknown) => {
      const p = payload as { mode: 'solo' | 'team'; teamMode: 'auto' | 'manual' }
      const current = useSessionStore.getState().session
      if (current) {
        useSessionStore.getState().setSession({
          ...current, mode: p.mode, team_mode: p.teamMode,
        } as Session)
      }
    },
  })

  const { startGame } = useGameEngine(send)
  usePresence(code, localPlayer)

  // Précharger la game page dès l'entrée dans le lobby
  useEffect(() => {
    router.prefetch(`/game/${code}`)
  }, [code, router])

  const sessionIdRef = useRef<string | null>(null)

  // Afficher le splash d'équipe
  function showSplash(playerList: Player[]) {
    const myTeam = playerList.find(p => p.id === localPlayer?.id)?.team ?? null
    const teammates = playerList.filter(p => p.team === myTeam && p.id !== localPlayer?.id)
    const opponents = playerList.filter(p => p.team && p.team !== myTeam)
    setSplash({ myTeam, teammates, opponents })
  }

  // Countdown visuel (décoratif) + navigation après 5s (timer séparé)
  useEffect(() => {
    if (!splash) return
    router.prefetch(`/game/${code}`)

    // Timer visuel : 5, 4, 3, 2, 1, 0
    setCountdown(5)
    const countdownInterval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1))
    }, 1000)

    // Navigation : exactement 5s après le splash, indépendant du countdown
    const navTimeout = setTimeout(() => {
      router.push(`/game/${code}`)
    }, 5000)

    return () => { clearInterval(countdownInterval); clearTimeout(navTimeout) }
  }, [splash, code, router])

  // Poll DB toutes les 2s
  useEffect(() => {
    const supabase = getSupabaseClient()
    let cancelled = false

    const fetchAll = async () => {
      let sid = sessionIdRef.current
      if (!sid) {
        const { data } = await supabase.from('sessions').select().eq('code', code).single() as { data: Session | null }
        if (cancelled || !data) return
        setSession(data)
        sessionIdRef.current = data.id
        sid = data.id
        setInitialLoading(false)
      }

      const [{ data: playersData }, { data: sessionData }] = await Promise.all([
        supabase.from('players').select().eq('session_id', sid) as Promise<{ data: Player[] | null }>,
        supabase.from('sessions').select().eq('id', sid).single() as Promise<{ data: Session | null }>,
      ])
      if (cancelled) return
      if (playersData) setPlayers(playersData)
      if (sessionData) {
        setSession(sessionData)
        // Filet de sécurité : si la session est passée en 'playing', naviguer
        if (sessionData.status === 'playing') {
          router.push(`/game/${code}`)
        }
      }
    }

    if (session?.id) {
      sessionIdRef.current = session.id
      setInitialLoading(false)
    }

    fetchAll()
    const interval = setInterval(fetchAll, 2000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedRounds = computeRoundCount(duration, players.length)
  const localPlayerTeam = players.find(p => p.id === localPlayer?.id)?.team ?? null

  async function handleModeChange(newMode: 'solo' | 'team') {
    setHostMode(newMode)
    if (session) {
      const supabase = getSupabaseClient()
      const newTeamMode = newMode === 'team' ? hostTeamMode : null
      await supabase.from('sessions').update({ mode: newMode, team_mode: newTeamMode }).eq('id', session.id)
      send('host:config_update', { mode: newMode, teamMode: newTeamMode ?? 'auto' })
    }
  }

  async function handleTeamModeChange(newTeamMode: 'auto' | 'manual') {
    setHostTeamMode(newTeamMode)
    if (session) {
      const supabase = getSupabaseClient()
      await supabase.from('sessions').update({ team_mode: newTeamMode }).eq('id', session.id)
      send('host:config_update', { mode: hostMode, teamMode: newTeamMode })
    }
  }

  async function handleLeave() {
    if (!localPlayer) return
    const supabase = getSupabaseClient()
    await supabase.from('players').delete().eq('id', localPlayer.id)
    router.push('/')
  }

  async function handleCancel() {
    if (!session || !isHost) return
    const supabase = getSupabaseClient()
    await supabase.from('players').delete().eq('session_id', session.id)
    await supabase.from('sessions').delete().eq('id', session.id)
    router.push('/')
  }

  async function handleStart() {
    if (!session || !isHost) return
    setLoading(true)
    const supabase = getSupabaseClient()
    const updated = {
      mode: hostMode,
      team_mode: hostMode === 'team' ? hostTeamMode : null,
      duration_min: duration,
      total_rounds: suggestedRounds,
    }
    await supabase.from('sessions').update(updated).eq('id', session.id)
    setSession({ ...session, ...updated } as Session)

    // startGame assigne les équipes, met à jour la DB, broadcast game_start, lance le timer startRound
    await startGame()

    // Le host ne reçoit pas son propre broadcast, on gère manuellement
    if (hostMode === 'team') {
      // Recharger les joueurs pour avoir les teams assignées par startGame
      const { data: freshPlayers } = await supabase
        .from('players').select().eq('session_id', session.id) as { data: Player[] | null }
      if (freshPlayers) {
        setPlayers(freshPlayers)
        showSplash(freshPlayers)
      }
    } else {
      router.push(`/game/${code}`)
    }
  }

  // === RENDU ===

  // Splash d'équipe (affiché DANS le lobby)
  if (splash) {
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-3xl font-playful text-fiesta-orange drop-shadow-[2px_2px_0_#FFD700]">
          dolympia!
        </h1>

        <p className="text-fiesta-dark/70 font-medium">Tu joues pour l&apos;équipe</p>
        <div className={`text-5xl font-playful ${splash.myTeam === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
          {splash.myTeam === 'red' ? '🔴 Rouge' : '🔵 Bleu'}
        </div>

        {splash.teammates.length > 0 && (
          <div className="text-center">
            <p className="text-fiesta-dark/60 text-sm mb-2">Tes coéquipiers</p>
            <div className="flex flex-wrap justify-center gap-2">
              {splash.teammates.map(p => (
                <span key={p.id} className={`px-3 py-1 rounded-full font-bold text-sm text-white ${splash.myTeam === 'red' ? 'bg-red-400' : 'bg-blue-400'}`}>
                  {p.pseudo}
                </span>
              ))}
            </div>
          </div>
        )}

        {splash.opponents.length > 0 && (
          <div className="text-center">
            <p className="text-fiesta-dark/60 text-sm mb-2">En face</p>
            <div className="flex flex-wrap justify-center gap-2">
              {splash.opponents.map(p => (
                <span key={p.id} className={`px-3 py-1 rounded-full font-bold text-sm text-white ${p.team === 'red' ? 'bg-red-400' : 'bg-blue-400'}`}>
                  {p.pseudo}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 mt-4">
          <span className="text-5xl font-playful text-fiesta-orange">{countdown}</span>
          <p className="text-fiesta-dark/60 text-sm">La partie commence...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-playful text-fiesta-orange drop-shadow-[3px_3px_0_#FFD700]">
          dolympia!
        </h1>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-fiesta-rose/30 border-t-fiesta-rose rounded-full animate-spin" />
          <p className="text-fiesta-dark/70 font-medium animate-pulse">Lancement de la partie...</p>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-playful text-fiesta-orange drop-shadow-[3px_3px_0_#FFD700]">
          dolympia!
        </h1>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-fiesta-orange/30 border-t-fiesta-orange rounded-full animate-spin" />
          <p className="text-fiesta-dark/70 font-medium animate-pulse">Connexion à la partie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 flex flex-col gap-4 max-w-md mx-auto">
      <div className="text-center pt-4">
        <p className="text-fiesta-dark/60 text-sm font-medium">Code de la partie</p>
        <h1 className="text-4xl font-playful text-fiesta-orange tracking-widest">{code}</h1>
        <p className="text-fiesta-dark/60 text-sm mt-1">
          {players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}
        </p>
      </div>

      {isHost && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20 flex flex-col gap-4">
          <h2 className="font-bold text-fiesta-dark">Configuration</h2>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Durée de partie</label>
            <div className="flex gap-2">
              {[10, 20, 30].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm transition-all ${duration === d ? 'border-fiesta-orange bg-fiesta-orange text-white' : 'border-gray-300 text-fiesta-dark'}`}
                >{d} min</button>
              ))}
            </div>
            <p className="text-xs text-fiesta-dark/60 mt-1 text-center">
              {suggestedRounds} manches pour {players.length} joueur{players.length > 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Mode</label>
            <div className="flex gap-2">
              <button onClick={() => handleModeChange('solo')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${hostMode === 'solo' ? 'border-fiesta-rose bg-fiesta-rose text-white' : 'border-gray-300 text-fiesta-dark'}`}
              >Solo</button>
              <button onClick={() => handleModeChange('team')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${hostMode === 'team' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-fiesta-dark'}`}
              >Équipes</button>
            </div>
          </div>
          {hostMode === 'team' && (
            <div>
              <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Assignation des équipes</label>
              <div className="flex gap-2">
                <button onClick={() => handleTeamModeChange('auto')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${hostTeamMode === 'auto' ? 'border-fiesta-yellow bg-fiesta-yellow text-fiesta-dark' : 'border-gray-300 text-fiesta-dark'}`}
                >Auto</button>
                <button onClick={() => handleTeamModeChange('manual')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${hostTeamMode === 'manual' ? 'border-fiesta-yellow bg-fiesta-yellow text-fiesta-dark' : 'border-gray-300 text-fiesta-dark'}`}
                >Manuel</button>
              </div>
            </div>
          )}
          <Button variant="rose" size="lg" onClick={handleStart} disabled={loading || players.length < 1} className="w-full">
            {loading ? 'Lancement...' : 'Lancer la partie !'}
          </Button>
          <button onClick={handleCancel} className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium transition-colors">
            Annuler la partie
          </button>
        </div>
      )}

      {mode === 'team' && teamMode === 'manual' && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20">
          <h2 className="font-bold text-fiesta-dark mb-3">Choisis ton équipe</h2>
          <TeamPicker playerId={localPlayer?.id ?? ''} currentTeam={localPlayerTeam}
            onTeamChange={(team) => { setPlayers(players.map(p => p.id === localPlayer?.id ? { ...p, team } : p)) }}
          />
        </div>
      )}

      <PlayerList players={players} localPlayerId={localPlayer?.id ?? ''} showTeams={mode === 'team'} />

      {!isHost && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-fiesta-dark/60 text-sm animate-pulse">En attente du host...</p>
          <button onClick={handleLeave} className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium transition-colors">
            Quitter la partie
          </button>
        </div>
      )}

      <p className="text-center text-fiesta-dark/40 text-xs mt-auto pt-4">&copy; Daniel Gavriline &middot; v1.0.0</p>
    </div>
  )
}
