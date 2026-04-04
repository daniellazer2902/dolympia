'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { useGameStore } from '@/store/game.store'
import { Button } from '@/components/ui/Button'
import type { Player } from '@/lib/supabase/types'

interface PlayerWithScore extends Player {
  totalPoints: number
}

export default function ResultsPage() {
  useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer } = useSessionStore()
  const { totalScores } = useGameStore()
  const [players, setPlayers] = useState<PlayerWithScore[]>([])

  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()

    // Charger joueurs + rounds + scores depuis la DB (source de vérité)
    Promise.all([
      supabase.from('players').select().eq('session_id', session.id),
      supabase.from('rounds').select('id').eq('session_id', session.id),
    ]).then(async ([{ data: playersData }, { data: roundsData }]) => {
      if (!playersData) return

      // Calculer les totaux depuis la DB si disponibles, sinon fallback sur le store
      const dbTotals: Record<string, number> = {}
      if (roundsData && roundsData.length > 0) {
        const roundIds = roundsData.map((r: { id: string }) => r.id)
        const { data: scoresData } = await supabase
          .from('scores')
          .select('player_id, points')
          .in('round_id', roundIds)
        if (scoresData) {
          for (const s of scoresData) {
            dbTotals[s.player_id] = (dbTotals[s.player_id] ?? 0) + s.points
          }
        }
      }

      const withScores: PlayerWithScore[] = (playersData as Player[])
        .map(p => ({
          ...p,
          totalPoints: dbTotals[p.id] ?? totalScores[p.id] ?? 0,
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
      setPlayers(withScores)
    })
  }, [session?.id, totalScores])

  const top3 = players.slice(0, 3)
  const isTeam = session?.mode === 'team'

  const teamScores = isTeam
    ? players.reduce<Record<string, number>>((acc, p) => {
        if (p.team) acc[p.team] = (acc[p.team] ?? 0) + p.totalPoints
        return acc
      }, {})
    : {}
  const winningTeam = isTeam
    ? Object.entries(teamScores).sort(([, a], [, b]) => b - a)[0]
    : null

  // Podium : 2ème, 1er, 3ème
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumHeights = ['h-14', 'h-20', 'h-10']
  const medals = ['🥈', '🥇', '🥉']
  const podiumBg = ['bg-gray-300 text-fiesta-dark', 'bg-fiesta-yellow text-fiesta-dark', 'bg-amber-600 text-white']

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 max-w-md mx-auto flex flex-col gap-4 pb-8">
      <div className="flex justify-start pt-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>
          Rejouer
        </Button>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-playful text-fiesta-orange drop-shadow-[2px_2px_0_#FFD700]">
          🏆 Fin de partie !
        </h1>
        {winningTeam && (
          <p className="text-lg font-bold mt-1" style={{ color: winningTeam[0] === 'red' ? '#EF4444' : '#3B82F6' }}>
            {winningTeam[0] === 'red' ? '🔴' : '🔵'} Équipe {winningTeam[0] === 'red' ? 'Rouge' : 'Bleue'} gagne !
            <span className="text-fiesta-dark/60 text-sm ml-2 font-normal">
              {teamScores.red ?? 0} vs {teamScores.blue ?? 0} pts
            </span>
          </p>
        )}
      </div>

      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-2 h-32">
          {podiumOrder.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center flex-1">
              <span className="text-lg">{medals[i]}</span>
              <span className="text-xs font-bold truncate w-full text-center text-fiesta-dark">{p.pseudo}</span>
              <span className="text-xs text-fiesta-dark/70 font-medium">{p.totalPoints} pts</span>
              <div className={`w-full rounded-t-lg flex items-center justify-center font-bold text-sm ${podiumHeights[i]} ${podiumBg[i]}`}>
                {i === 0 ? '2' : i === 1 ? '1' : '3'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-fiesta-dark uppercase tracking-wider">Classement complet</h2>
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
              isTeam && p.team === 'red' ? 'bg-red-50 border-l-4 border-l-red-400 border-r-gray-100 border-t-gray-100 border-b-gray-100' :
              isTeam && p.team === 'blue' ? 'bg-blue-50 border-l-4 border-l-blue-400 border-r-gray-100 border-t-gray-100 border-b-gray-100' :
              i === 0 ? 'bg-yellow-50 border-fiesta-yellow' :
              i === 1 ? 'bg-gray-50 border-gray-200' :
              i === 2 ? 'bg-amber-50 border-amber-200' :
              'bg-white border-gray-100'
            } ${p.id === localPlayer?.id ? 'ring-2 ring-fiesta-orange' : ''}`}
          >
            <span className="font-bold text-fiesta-dark/70 w-6 text-center">#{i + 1}</span>
            {isTeam && p.team && <span>{p.team === 'red' ? '🔴' : '🔵'}</span>}
            <span className="font-bold flex-1 text-fiesta-dark">{p.pseudo}</span>
            <span className="font-bold text-fiesta-orange">{p.totalPoints} pts</span>
          </div>
        ))}
      </div>

    </div>
  )
}
