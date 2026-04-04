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

    channel.on('broadcast', { event: '*' }, (msg) => {
      const event = msg as BroadcastEvent
      const handler = handlersRef.current[event.type]
      if (handler) handler(event.payload)
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
