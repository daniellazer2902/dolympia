'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { BroadcastEvent, GameEventType } from '@/lib/supabase/types'

type EventHandler<T = unknown> = (payload: T) => void
type Handlers = Partial<Record<GameEventType, EventHandler<unknown>>>

export function useChannel(code: string | null, handlers: Handlers) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const handlersRef = useRef(handlers)

  // Garder les handlers à jour sans recréer le channel
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!code) return

    const supabase = getSupabaseClient()
    const channel = supabase.channel(`game:${code}`)

    channel.on('broadcast', { event: '*' }, (msg: Record<string, unknown>) => {
      // msg.type = "broadcast" (catégorie Supabase), msg.event = le vrai nom de l'event
      const eventType = msg.event as GameEventType
      const handler = handlersRef.current[eventType]
      if (handler) handler(msg.payload)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [code])

  const send = useCallback(
    <T>(type: GameEventType, payload: T) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: type,
        payload,
      })
    },
    []
  )

  return { send }
}
