'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { generateSessionCode } from '@/lib/utils'
import { useSessionStore } from '@/store/session.store'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  const router = useRouter()
  const { setSession, setLocalPlayer } = useSessionStore()
  const [joinCode, setJoinCode] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [mode, setMode] = useState<'join' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!pseudo.trim()) { setError('Entre ton pseudo'); return }
    setLoading(true)
    const supabase = getSupabaseClient()
    const code = generateSessionCode()
    const playerId = crypto.randomUUID()

    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .insert({ code, host_id: playerId })
      .select()
      .single()

    if (sessionErr || !session) {
      setError('Erreur lors de la création'); setLoading(false); return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ id: playerId, session_id: session.id, pseudo: pseudo.trim(), is_host: true })
      .select()
      .single()

    if (playerErr || !player) {
      setError('Erreur lors de la création'); setLoading(false); return
    }

    setSession(session)
    setLocalPlayer(player)
    router.push(`/lobby/${code}`)
  }

  async function handleJoin() {
    if (!pseudo.trim()) { setError('Entre ton pseudo'); return }
    if (!joinCode.trim()) { setError('Entre le code de la partie'); return }
    setLoading(true)
    const supabase = getSupabaseClient()
    const code = joinCode.trim().toUpperCase()

    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select()
      .eq('code', code)
      .eq('status', 'waiting')
      .single()

    if (sessionErr || !session) {
      setError('Code invalide ou partie déjà commencée'); setLoading(false); return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ session_id: session.id, pseudo: pseudo.trim(), is_host: false })
      .select()
      .single()

    if (playerErr || !player) {
      setError('Erreur lors de la connexion'); setLoading(false); return
    }

    setSession(session)
    setLocalPlayer(player)
    router.push(`/lobby/${code}`)
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center p-6 gap-6">
      {/* Logo */}
      <div className="text-center">
        <h1 className="text-5xl font-playful text-fiesta-orange drop-shadow-[3px_3px_0_#FFD700]">
          dolympia!
        </h1>
        <p className="text-fiesta-dark/60 mt-2 text-sm font-medium">Mini-jeux multijoueur</p>
      </div>

      {/* Carte principale */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border-2 border-fiesta-orange/20 flex flex-col gap-4">
        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => { setPseudo(e.target.value); setError('') }}
          maxLength={20}
          className="border-2 border-gray-300 rounded-xl px-4 py-3 text-center font-bold text-fiesta-dark focus:outline-none focus:border-fiesta-orange"
        />

        {mode === null && (
          <div className="flex flex-col gap-3">
            <Button variant="rose" size="lg" onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? 'Création...' : 'Créer une partie'}
            </Button>
            <Button variant="outline" size="lg" onClick={() => setMode('join')} className="w-full">
              Rejoindre
            </Button>
          </div>
        )}

        {mode === 'join' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Code de la partie (ex: ABX3K2)"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
              maxLength={6}
              className="border-2 border-gray-300 rounded-xl px-4 py-3 text-center font-bold text-fiesta-dark tracking-widest focus:outline-none focus:border-fiesta-orange uppercase"
            />
            <Button variant="orange" size="lg" onClick={handleJoin} disabled={loading} className="w-full">
              {loading ? 'Connexion...' : 'Rejoindre !'}
            </Button>
            <button onClick={() => setMode(null)} className="text-sm text-fiesta-dark/60 hover:text-fiesta-dark font-medium">
              Retour
            </button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
