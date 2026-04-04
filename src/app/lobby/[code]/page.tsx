'use client'

import { useEffect, useState, useCallback } from 'react'
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

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer, setSession } = useSessionStore()
  const { players, setPlayers } = useGameStore()
  const [mode, setMode] = useState<'solo' | 'team'>('solo')
  const [teamMode, setTeamMode] = useState<'auto' | 'manual'>('auto')
  const [duration, setDuration] = useState(20)
  const [loading, setLoading] = useState(false)

  const { send } = useChannel(code, {
    'host:game_start': () => {
      router.push(`/game/${code}`)
    },
    'host:config_update': (payload: unknown) => {
      const p = payload as { mode: 'solo' | 'team'; teamMode: 'auto' | 'manual' }
      setMode(p.mode)
      setTeamMode(p.teamMode)
    },
  })

  const { startGame } = useGameEngine(send)
  usePresence(code, localPlayer)

  const [initialLoading, setInitialLoading] = useState(!session)

  // Récupérer la session si page rechargée
  useEffect(() => {
    if (session) { setInitialLoading(false); return }
    const supabase = getSupabaseClient()
    supabase.from('sessions').select().eq('code', code).single()
      .then(({ data }: { data: Session | null }) => {
        if (data) setSession(data)
        setInitialLoading(false)
      })
  }, [code, session, setSession])

  // Fix bug #2 : postgres_changes nécessite une config Realtime + souffre de stale closure
  // → on poll la DB toutes les 2s, simple et fiable pour le lobby
  const fetchPlayers = useCallback(async () => {
    if (!session) return
    const supabase = getSupabaseClient()
    const { data } = await supabase.from('players').select().eq('session_id', session.id) as { data: Player[] | null }
    if (data) setPlayers(data)
  }, [session, setPlayers])

  useEffect(() => {
    fetchPlayers()
    const interval = setInterval(fetchPlayers, 2000)
    return () => clearInterval(interval)
  }, [fetchPlayers])

  const suggestedRounds = computeRoundCount(duration, players.length)
  const isHost = localPlayer?.is_host ?? false
  const localPlayerData = players.find(p => p.id === localPlayer?.id)

  function handleModeChange(newMode: 'solo' | 'team') {
    setMode(newMode)
    send('host:config_update', { mode: newMode, teamMode })
  }

  function handleTeamModeChange(newTeamMode: 'auto' | 'manual') {
    setTeamMode(newTeamMode)
    send('host:config_update', { mode, teamMode: newTeamMode })
  }

  async function handleCancel() {
    if (!session || !isHost) return
    const supabase = getSupabaseClient()
    await supabase.from('players').delete().eq('session_id', session.id)
    await supabase.from('sessions').delete().eq('id', session.id)
    send('host:game_end', {})
    router.push('/')
  }

  async function handleStart() {
    if (!session || !isHost) return
    setLoading(true)
    const supabase = getSupabaseClient()
    const updated = {
      mode,
      team_mode: mode === 'team' ? teamMode : null,
      duration_min: duration,
      total_rounds: suggestedRounds,
    }
    await supabase.from('sessions').update(updated).eq('id', session.id)
    setSession({ ...session, ...updated } as Session)
    await startGame()
    // Fix bug #1 : le host navigue directement, il ne reçoit pas son propre broadcast
    router.push(`/game/${code}`)
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-playful text-fiesta-orange drop-shadow-[3px_3px_0_#FFD700]">
          dolympia!
        </h1>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-fiesta-orange/30 border-t-fiesta-orange rounded-full animate-spin" />
          <p className="text-fiesta-dark/70 font-medium animate-pulse">
            Connexion à la partie...
          </p>
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
          <h2 className="font-bold text-fiesta-dark">⚙️ Configuration</h2>

          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Durée de partie</label>
            <div className="flex gap-2">
              {[10, 20, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm transition-all ${
                    duration === d ? 'border-fiesta-orange bg-fiesta-orange text-white' : 'border-gray-300 text-fiesta-dark'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
            <p className="text-xs text-fiesta-dark/60 mt-1 text-center">
              → {suggestedRounds} manches pour {players.length} joueur{players.length > 1 ? 's' : ''}
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('solo')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'solo' ? 'border-fiesta-rose bg-fiesta-rose text-white' : 'border-gray-300 text-fiesta-dark'
                }`}
              >
                🏆 Solo
              </button>
              <button
                onClick={() => handleModeChange('team')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'team' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-fiesta-dark'
                }`}
              >
                👥 Équipes
              </button>
            </div>
          </div>

          {mode === 'team' && (
            <div>
              <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Assignation des équipes</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTeamModeChange('auto')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'auto' ? 'border-fiesta-yellow bg-fiesta-yellow text-fiesta-dark' : 'border-gray-300 text-fiesta-dark'
                  }`}
                >
                  🎲 Auto
                </button>
                <button
                  onClick={() => handleTeamModeChange('manual')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'manual' ? 'border-fiesta-yellow bg-fiesta-yellow text-fiesta-dark' : 'border-gray-300 text-fiesta-dark'
                  }`}
                >
                  ✋ Manuel
                </button>
              </div>
            </div>
          )}

          <Button variant="rose" size="lg" onClick={handleStart} disabled={loading || players.length < 1} className="w-full">
            {loading ? 'Lancement...' : '🚀 Lancer la partie !'}
          </Button>
          <button
            onClick={handleCancel}
            className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium transition-colors"
          >
            Annuler la partie
          </button>
        </div>
      )}

      {/* Liste joueurs — après la config pour ne pas pousser les contrôles vers le bas */}
      <PlayerList players={players} localPlayerId={localPlayer?.id ?? ''} showTeams={mode === 'team'} />

      {!isHost && mode === 'team' && teamMode === 'manual' && localPlayerData && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20">
          <h2 className="font-bold text-fiesta-dark mb-3">Choisis ton équipe</h2>
          <TeamPicker
            playerId={localPlayer?.id ?? ''}
            currentTeam={localPlayerData.team}
            onTeamChange={(team) => {
              setPlayers(players.map(p => p.id === localPlayer?.id ? { ...p, team } : p))
            }}
          />
        </div>
      )}

      {!isHost && (
        <p className="text-center text-fiesta-dark/60 text-sm animate-pulse">
          En attente du host...
        </p>
      )}
    </div>
  )
}
