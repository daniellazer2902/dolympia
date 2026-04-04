'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { Button } from '@/components/ui/Button'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { setSession, setLocalPlayer } = useSessionStore()
  const [pseudo, setPseudo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!pseudo.trim()) { setError('Entre ton pseudo'); return }
    setLoading(true)
    const supabase = getSupabaseClient()

    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select()
      .eq('code', code)
      .eq('status', 'waiting')
      .single()

    if (sessionErr || !session) {
      setError('Code invalide ou partie déjà commencée')
      setLoading(false)
      return
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ session_id: session.id, pseudo: pseudo.trim(), is_host: false })
      .select()
      .single()

    if (playerErr || !player) {
      setError('Erreur lors de la connexion')
      setLoading(false)
      return
    }

    setSession(session)
    setLocalPlayer(player)
    router.push(`/lobby/${code}`)
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <h1 className="text-5xl font-playful text-fiesta-orange drop-shadow-[3px_3px_0_#FFD700]">
          dolympia!
        </h1>
        <p className="text-fiesta-dark/60 mt-2 text-sm font-medium">Tu es invité à rejoindre une partie</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border-2 border-fiesta-orange/20 flex flex-col gap-4">
        <div className="text-center">
          <p className="text-fiesta-dark/60 text-sm">Code de la partie</p>
          <p className="text-3xl font-playful text-fiesta-orange tracking-widest">{code}</p>
        </div>

        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => { setPseudo(e.target.value); setError('') }}
          maxLength={20}
          className="border-2 border-gray-300 rounded-xl px-4 py-3 text-center font-bold text-fiesta-dark focus:outline-none focus:border-fiesta-orange"
        />

        <Button variant="orange" size="lg" onClick={handleJoin} disabled={loading} className="w-full">
          {loading ? 'Connexion...' : 'Rejoindre la partie !'}
        </Button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>

      <p className="text-fiesta-dark/40 text-xs">&copy; Daniel Gavriline &middot; v1.0.0</p>
    </div>
  )
}
