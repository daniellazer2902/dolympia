'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Player } from '@/lib/supabase/types'
import { useGameStore } from '@/store/game.store'

export function usePresence(code: string | null, localPlayer: Player | null) {
  const { updatePlayer } = useGameStore()
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null>(null)

  useEffect(() => {
    if (!code || !localPlayer) return

    const supabase = getSupabaseClient()
    const channel = supabase.channel(`presence:${code}`)

    channel
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const p of newPresences) {
          updatePlayer(p.player_id as string, { is_connected: true })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const p of leftPresences) {
          updatePlayer(p.player_id as string, { is_connected: false })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ player_id: localPlayer.id, pseudo: localPlayer.pseudo })
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code, localPlayer, updatePlayer])
}
