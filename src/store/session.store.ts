import { create } from 'zustand'
import type { Session, Player } from '@/lib/supabase/types'

interface SessionStore {
  session: Session | null
  localPlayer: Player | null
  setSession: (session: Session) => void
  setLocalPlayer: (player: Player) => void
  reset: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  localPlayer: null,
  setSession: (session) => set({ session }),
  setLocalPlayer: (localPlayer) => set({ localPlayer }),
  reset: () => set({ session: null, localPlayer: null }),
}))
