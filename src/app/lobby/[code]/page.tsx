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

  // Fix bug #1 : le host envoie game_start mais ne reçoit pas son propre message
  // → les non-hosts naviguent via ce handler, le host navigue directement dans handleStart
  const { send } = useChannel(code, {
    'host:game_start': () => {
      router.push(`/game/${code}`)
    },
  })

  const { startGame } = useGameEngine(send)
  usePresence(code, localPlayer)

  // Récupérer la session si page rechargée
  useEffect(() => {
    if (session) return
    const supabase = getSupabaseClient()
    supabase.from('sessions').select().eq('code', code).single()
      .then(({ data }: { data: Session | null }) => { if (data) setSession(data) })
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

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 flex flex-col gap-4 max-w-md mx-auto">
      <div className="text-center pt-4">
        <p className="text-gray-600 text-sm font-medium">Code de la partie</p>
        <h1 className="text-4xl font-playful text-fiesta-orange tracking-widest">{code}</h1>
        <p className="text-gray-600 text-sm mt-1">
          {players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}
        </p>
      </div>

      <PlayerList players={players} localPlayerId={localPlayer?.id ?? ''} showTeams={mode === 'team'} />

      {isHost && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20 flex flex-col gap-4">
          <h2 className="font-bold text-gray-700">⚙️ Configuration</h2>

          <div>
            <label className="text-sm font-bold text-gray-600 block mb-2">Durée de partie</label>
            <div className="flex gap-2">
              {[10, 20, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm transition-all ${
                    duration === d ? 'border-fiesta-orange bg-fiesta-orange text-white' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              → {suggestedRounds} manches pour {players.length} joueur{players.length > 1 ? 's' : ''}
            </p>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 block mb-2">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('solo')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'solo' ? 'border-fiesta-rose bg-fiesta-rose text-white' : 'border-gray-200 text-gray-700'
                }`}
              >
                🏆 Solo
              </button>
              <button
                onClick={() => setMode('team')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'team' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700'
                }`}
              >
                👥 Équipes
              </button>
            </div>
          </div>

          {mode === 'team' && (
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-2">Assignation des équipes</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTeamMode('auto')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'auto' ? 'border-fiesta-yellow bg-fiesta-yellow text-gray-800' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  🎲 Auto
                </button>
                <button
                  onClick={() => setTeamMode('manual')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'manual' ? 'border-fiesta-yellow bg-fiesta-yellow text-gray-800' : 'border-gray-200 text-gray-700'
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
        </div>
      )}

      {!isHost && mode === 'team' && teamMode === 'manual' && localPlayerData && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20">
          <h2 className="font-bold text-gray-700 mb-3">Choisis ton équipe</h2>
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
        <p className="text-center text-gray-600 text-sm animate-pulse">
          ⏳ En attente du host...
        </p>
      )}
    </div>
  )
}
