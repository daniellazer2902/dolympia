# dolympia — Plan 1 : Foundation + Lobby + Game Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold complet du projet Next.js, schéma Supabase, lobby temps réel fonctionnel (présence, équipes), moteur de jeu host-authoritative, et boucle de partie complète — sans les jeux réels (un placeholder "Round" suffit pour valider le flow).

**Architecture:** Next.js 14 App Router avec composants client pour toutes les pages interactives. Supabase Realtime Broadcast sur un channel `game:{code}` par partie. Zustand pour l'état client. Host-authoritative : le client du host orchestre la progression, les clients joueurs écoutent.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS (thème Fiesta custom), Supabase JS v2 + @supabase/ssr, Zustand, Vitest + @testing-library/react

---

## Carte des fichiers

```
dolympia/
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── .env.local                              ← à créer manuellement
│
├── supabase/
│   └── migrations/
│       └── 20260404000000_initial.sql
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                        # Accueil (créer / rejoindre)
    │   ├── lobby/[code]/page.tsx           # Salle d'attente
    │   ├── game/[code]/page.tsx            # Partie en cours
    │   ├── results/[code]/page.tsx         # Podium
    │   └── admin/
    │       ├── login/page.tsx
    │       └── dashboard/page.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts                   # Browser client (singleton)
    │   │   ├── server.ts                   # Server client (cookies)
    │   │   └── types.ts                    # Types DB
    │   └── utils.ts                        # generateCode, computeRounds
    │
    ├── store/
    │   ├── session.store.ts                # Session + joueur local
    │   └── game.store.ts                   # Phase, scores, joueurs
    │
    ├── hooks/
    │   ├── useChannel.ts                   # Supabase Broadcast
    │   ├── usePresence.ts                  # Supabase Presence
    │   ├── useTimer.ts                     # Timer synchronisé
    │   └── useGameEngine.ts               # Orchestration host
    │
    ├── games/
    │   ├── types.ts                        # Interface GameModule
    │   ├── registry.ts                     # Map des jeux
    │   └── scoring.ts                      # Helpers calcul score
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   └── Timer.tsx
    │   ├── lobby/
    │   │   ├── PlayerList.tsx
    │   │   └── TeamPicker.tsx
    │   └── game/
    │       ├── HUD.tsx
    │       ├── GameContainer.tsx
    │       └── RoundTransition.tsx
    │
    └── test/
        └── setup.ts
```

---

## Task 1 : Initialisation du projet

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts`, `src/test/setup.ts`

- [ ] **Étape 1 : Créer le projet Next.js**

```bash
cd C:/Users/Admin/Desktop/ClaudeApps/dolympia
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Répondre `No` à toutes les questions supplémentaires.

- [ ] **Étape 2 : Installer les dépendances**

```bash
npm install @supabase/supabase-js @supabase/ssr zustand
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Étape 3 : Configurer Vitest**

Créer `vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Étape 4 : Créer le setup de test**

Créer `src/test/setup.ts` :

```ts
import '@testing-library/jest-dom'
```

- [ ] **Étape 5 : Ajouter les scripts dans package.json**

Ajouter dans la section `"scripts"` de `package.json` :

```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

- [ ] **Étape 6 : Configurer Tailwind avec le thème Fiesta**

Remplacer `tailwind.config.ts` :

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fiesta: {
          bg: '#FFFBF0',
          orange: '#FF6B35',
          'orange-dark': '#c94a00',
          rose: '#FF3CAC',
          'rose-dark': '#c4006b',
          yellow: '#FFD700',
          'yellow-dark': '#b89a00',
          dark: '#1a1a2e',
          red: '#EF4444',
          blue: '#3B82F6',
          'red-team-bg': '#FFF0EE',
          'blue-team-bg': '#EEF3FF',
        },
      },
      fontFamily: {
        playful: ['Fredoka One', 'Trebuchet MS', 'sans-serif'],
      },
      boxShadow: {
        'btn-orange': '0 4px 0 #c94a00',
        'btn-rose': '0 4px 0 #c4006b',
        'btn-yellow': '0 4px 0 #b89a00',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Étape 7 : Ajouter la police Google Fonts dans le layout**

Remplacer `src/app/layout.tsx` :

```tsx
import type { Metadata } from 'next'
import { Fredoka_One } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-playful',
})

export const metadata: Metadata = {
  title: 'dolympia',
  description: 'Mini-jeux multijoueur en temps réel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${fredoka.variable} font-playful bg-fiesta-bg min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Étape 8 : Vérifier que le projet compile**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully`

- [ ] **Étape 9 : Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 project with Tailwind Fiesta theme and Vitest"
```

---

## Task 2 : Schéma Supabase

**Files:**
- Create: `supabase/migrations/20260404000000_initial.sql`

- [ ] **Étape 1 : Créer le projet Supabase**

Sur https://supabase.com/dashboard :
1. Créer un nouveau projet nommé `dolympia`
2. Récupérer `Project URL` et `anon key` depuis Settings > API
3. Récupérer `service_role key` pour l'admin

- [ ] **Étape 2 : Créer le fichier de migration**

Créer `supabase/migrations/20260404000000_initial.sql` :

```sql
-- Types énumérés
create type session_status as enum ('waiting', 'playing', 'finished');
create type session_mode as enum ('solo', 'team');
create type team_mode_type as enum ('auto', 'manual');
create type difficulty_level as enum ('easy', 'medium', 'hard');

-- Sessions (parties)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status session_status default 'waiting',
  mode session_mode default 'solo',
  team_mode team_mode_type,
  duration_min int default 20,
  total_rounds int default 5,
  current_round int default 0,
  games_order text[] default '{}',
  created_at timestamptz default now()
);

-- Joueurs
create table players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  pseudo text not null,
  team text check (team in ('red', 'blue')),
  is_host boolean default false,
  is_connected boolean default true,
  joined_at timestamptz default now()
);

-- Manches
create table rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  round_number int not null,
  game_type text not null,
  config jsonb default '{}',
  started_at timestamptz,
  ended_at timestamptz
);

-- Scores
create table scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  points int default 0,
  metadata jsonb default '{}'
);

-- Questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  game_type text not null,
  content text not null,
  options jsonb default '[]',
  answer jsonb not null,
  difficulty difficulty_level default 'medium',
  category text,
  created_at timestamptz default now()
);

-- RLS : activer sur toutes les tables
alter table sessions enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table scores enable row level security;
alter table questions enable row level security;

-- Policies sessions : lecture publique, écriture publique (pas d'auth joueur en V1)
create policy "sessions_select" on sessions for select using (true);
create policy "sessions_insert" on sessions for insert with check (true);
create policy "sessions_update" on sessions for update using (true);

-- Policies players
create policy "players_select" on players for select using (true);
create policy "players_insert" on players for insert with check (true);
create policy "players_update" on players for update using (true);

-- Policies rounds
create policy "rounds_select" on rounds for select using (true);
create policy "rounds_insert" on rounds for insert with check (true);
create policy "rounds_update" on rounds for update using (true);

-- Policies scores
create policy "scores_select" on scores for select using (true);
create policy "scores_insert" on scores for insert with check (true);

-- Policies questions : lecture publique, écriture admin seulement (service_role)
create policy "questions_select" on questions for select using (true);
create policy "questions_write" on questions
  for all using (auth.role() = 'service_role');
```

- [ ] **Étape 3 : Exécuter la migration**

Dans le Dashboard Supabase > SQL Editor, copier-coller et exécuter le contenu du fichier SQL.

Vérifier que les 5 tables apparaissent dans le Table Editor.

- [ ] **Étape 4 : Activer Realtime sur les tables**

Dans Supabase > Database > Replication, activer Realtime pour : `sessions`, `players`, `rounds`, `scores`.

- [ ] **Étape 5 : Créer le compte admin Supabase Auth**

Dans Supabase > Authentication > Users > Add user :
- Email : `admin@dolympia.local`
- Password : choisir un mot de passe fort
- Cocher "Auto Confirm User"

- [ ] **Étape 6 : Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase database schema with RLS policies"
```

---

## Task 3 : Config Supabase + Types + Variables d'environnement

**Files:**
- Create: `.env.local`, `src/lib/supabase/types.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Étape 1 : Créer .env.local**

```bash
# .env.local — NE PAS committer ce fichier
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

Remplacer les valeurs depuis Supabase > Settings > API.

- [ ] **Étape 2 : Ajouter .env.local au .gitignore**

Vérifier que `.env.local` est dans `.gitignore` (Next.js l'ajoute par défaut).

- [ ] **Étape 3 : Créer les types DB**

Créer `src/lib/supabase/types.ts` :

```ts
export interface Session {
  id: string
  code: string
  host_id: string
  status: 'waiting' | 'playing' | 'finished'
  mode: 'solo' | 'team'
  team_mode: 'auto' | 'manual' | null
  duration_min: number
  total_rounds: number
  current_round: number
  games_order: string[]
  created_at: string
}

export interface Player {
  id: string
  session_id: string
  pseudo: string
  team: 'red' | 'blue' | null
  is_host: boolean
  is_connected: boolean
  joined_at: string
}

export interface Round {
  id: string
  session_id: string
  round_number: number
  game_type: string
  config: Record<string, unknown>
  started_at: string | null
  ended_at: string | null
}

export interface Score {
  id: string
  round_id: string
  player_id: string
  points: number
  metadata: Record<string, unknown>
}

export interface Question {
  id: string
  game_type: string
  content: string
  options: unknown[]
  answer: unknown
  difficulty: 'easy' | 'medium' | 'hard'
  category: string | null
  created_at: string
}

// Events Broadcast
export type GameEventType =
  | 'host:game_start'
  | 'host:round_start'
  | 'host:round_end'
  | 'host:game_end'
  | 'host:team_assign'
  | 'player:answer'
  | 'player:tap'
  | 'player:motion_score'
  | 'player:ready'

export interface BroadcastEvent<T = unknown> {
  type: GameEventType
  payload: T
}
```

- [ ] **Étape 4 : Créer le client browser Supabase**

Créer `src/lib/supabase/client.ts` :

```ts
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
```

- [ ] **Étape 5 : Créer le client server Supabase**

Créer `src/lib/supabase/server.ts` :

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

- [ ] **Étape 6 : Commit**

```bash
git add src/lib/ .gitignore
git commit -m "feat: add Supabase client setup and DB types"
```

---

## Task 4 : Utilitaires + Tests

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/utils.test.ts`

- [ ] **Étape 1 : Écrire les tests (TDD)**

Créer `src/lib/utils.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import {
  generateSessionCode,
  computeRoundCount,
  shuffleArray,
  assignTeams,
  computeSpeedBonus,
} from './utils'

describe('generateSessionCode', () => {
  it('génère un code de 6 caractères', () => {
    expect(generateSessionCode()).toHaveLength(6)
  })

  it('ne contient que des caractères alphanumériques sans ambiguïté', () => {
    const code = generateSessionCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('génère des codes différents', () => {
    const codes = new Set(Array.from({ length: 100 }, generateSessionCode))
    expect(codes.size).toBeGreaterThan(90)
  })
})

describe('computeRoundCount', () => {
  it('retourne 3 pour 10 min et 2 joueurs', () => {
    expect(computeRoundCount(10, 2)).toBe(3)
  })

  it('retourne 5 pour 20 min et 4 joueurs', () => {
    expect(computeRoundCount(20, 4)).toBe(5)
  })

  it('retourne 8 pour 30 min et 8 joueurs', () => {
    expect(computeRoundCount(30, 8)).toBe(8)
  })

  it('minimum 1 manche', () => {
    expect(computeRoundCount(1, 1)).toBeGreaterThanOrEqual(1)
  })
})

describe('shuffleArray', () => {
  it('conserve tous les éléments', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(arr)
    expect(shuffled).toHaveLength(arr.length)
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('ne modifie pas le tableau original', () => {
    const arr = [1, 2, 3]
    shuffleArray(arr)
    expect(arr).toEqual([1, 2, 3])
  })
})

describe('assignTeams', () => {
  it('assigne red et blue équitablement', () => {
    const ids = ['p1', 'p2', 'p3', 'p4']
    const result = assignTeams(ids)
    const reds = Object.values(result).filter(t => t === 'red')
    const blues = Object.values(result).filter(t => t === 'blue')
    expect(reds.length).toBe(2)
    expect(blues.length).toBe(2)
  })

  it('gère un nombre impair de joueurs', () => {
    const ids = ['p1', 'p2', 'p3']
    const result = assignTeams(ids)
    const values = Object.values(result)
    expect(values.every(v => v === 'red' || v === 'blue')).toBe(true)
  })

  it('assigne tous les joueurs', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5']
    const result = assignTeams(ids)
    expect(Object.keys(result)).toHaveLength(5)
  })
})

describe('computeSpeedBonus', () => {
  it('retourne le bonus max si répondu instantanément', () => {
    expect(computeSpeedBonus(20, 20, 50)).toBe(50)
  })

  it('retourne 0 si répondu à la toute fin', () => {
    expect(computeSpeedBonus(20, 0, 50)).toBe(0)
  })

  it('retourne un bonus proportionnel', () => {
    // 10s restantes sur 20s = 50% du bonus
    expect(computeSpeedBonus(20, 10, 50)).toBe(25)
  })
})
```

- [ ] **Étape 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm run test:run
```

Résultat attendu : `FAIL — cannot find module './utils'`

- [ ] **Étape 3 : Implémenter les utilitaires**

Créer `src/lib/utils.ts` :

```ts
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSessionCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

/**
 * Calcule le nombre de manches recommandé selon la durée et le nombre de joueurs.
 * Formule : durée_min / 4 + floor(joueurs / 3), plafonné entre 1 et 12.
 */
export function computeRoundCount(durationMin: number, playerCount: number): number {
  const base = Math.floor(durationMin / 4)
  const bonus = Math.floor(playerCount / 3)
  return Math.max(1, Math.min(12, base + bonus))
}

/** Fisher-Yates shuffle — retourne un nouveau tableau */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Assigne les équipes red/blue de façon équilibrée */
export function assignTeams(playerIds: string[]): Record<string, 'red' | 'blue'> {
  const shuffled = shuffleArray(playerIds)
  const half = Math.ceil(shuffled.length / 2)
  return shuffled.reduce<Record<string, 'red' | 'blue'>>((acc, id, i) => {
    acc[id] = i < half ? 'red' : 'blue'
    return acc
  }, {})
}

/**
 * Calcule le bonus de rapidité.
 * @param totalTime  durée totale de la manche en secondes
 * @param timeLeft   secondes restantes quand le joueur a répondu
 * @param maxBonus   bonus maximum possible
 */
export function computeSpeedBonus(
  totalTime: number,
  timeLeft: number,
  maxBonus: number
): number {
  if (totalTime === 0) return 0
  return Math.round((timeLeft / totalTime) * maxBonus)
}
```

- [ ] **Étape 4 : Lancer les tests pour vérifier qu'ils passent**

```bash
npm run test:run
```

Résultat attendu : `✓ 12 tests passed`

- [ ] **Étape 5 : Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: add session code generation, round count, shuffle, team assignment utilities"
```

---

## Task 5 : Stores Zustand

**Files:**
- Create: `src/store/session.store.ts`, `src/store/game.store.ts`

- [ ] **Étape 1 : Créer le store session**

Créer `src/store/session.store.ts` :

```ts
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
```

- [ ] **Étape 2 : Créer le store game**

Créer `src/store/game.store.ts` :

```ts
import { create } from 'zustand'
import type { Player, Round, Score } from '@/lib/supabase/types'

export type GamePhase =
  | 'lobby'
  | 'team_splash'
  | 'round_start'
  | 'playing'
  | 'inter_round'
  | 'finished'

interface GameStore {
  phase: GamePhase
  players: Player[]
  currentRound: Round | null
  roundScores: Score[]
  totalScores: Record<string, number>  // player_id → score cumulé
  setPhase: (phase: GamePhase) => void
  setPlayers: (players: Player[]) => void
  updatePlayer: (playerId: string, data: Partial<Player>) => void
  setCurrentRound: (round: Round) => void
  setRoundScores: (scores: Score[]) => void
  accumulateScores: (scores: Score[]) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  phase: 'lobby',
  players: [],
  currentRound: null,
  roundScores: [],
  totalScores: {},
  setPhase: (phase) => set({ phase }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (playerId, data) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === playerId ? { ...p, ...data } : p)),
    })),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setRoundScores: (roundScores) => set({ roundScores }),
  accumulateScores: (scores) =>
    set((state) => {
      const next = { ...state.totalScores }
      for (const s of scores) {
        next[s.player_id] = (next[s.player_id] ?? 0) + s.points
      }
      return { totalScores: next }
    }),
  reset: () =>
    set({
      phase: 'lobby',
      players: [],
      currentRound: null,
      roundScores: [],
      totalScores: {},
    }),
}))
```

- [ ] **Étape 3 : Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores for session and game state"
```

---

## Task 6 : Middleware admin + Protection des routes

**Files:**
- Create: `middleware.ts`

- [ ] **Étape 1 : Créer le middleware**

Créer `middleware.ts` à la racine du projet :

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protéger uniquement /admin/* (sauf /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({ request })
            response.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Étape 2 : Créer la page de login admin**

Créer `src/app/admin/login/page.tsx` :

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg border-2 border-fiesta-orange/20">
        <h1 className="text-2xl font-playful text-fiesta-orange mb-6 text-center">
          dolympia admin
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fiesta-orange"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fiesta-orange"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-fiesta-orange text-white font-bold rounded-full py-3 shadow-btn-orange active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Étape 3 : Créer un placeholder pour le dashboard admin**

Créer `src/app/admin/dashboard/page.tsx` :

```tsx
export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-fiesta-bg p-8">
      <h1 className="text-2xl font-playful text-fiesta-orange">Dashboard admin</h1>
      <p className="text-gray-500 mt-2">Gestion des questions — à implémenter dans le Plan 3.</p>
    </div>
  )
}
```

- [ ] **Étape 4 : Vérifier que le middleware fonctionne**

```bash
npm run dev
```

Naviguer vers `http://localhost:3000/admin/dashboard` → doit rediriger vers `/admin/login`.

- [ ] **Étape 5 : Commit**

```bash
git add middleware.ts src/app/admin/
git commit -m "feat: add admin auth middleware and login page"
```

---

## Task 7 : Composants UI de base

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Timer.tsx`

- [ ] **Étape 1 : Créer le composant Button**

Créer `src/components/ui/Button.tsx` :

```tsx
import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'orange' | 'rose' | 'yellow' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  orange: 'bg-fiesta-orange text-white shadow-btn-orange hover:brightness-105 active:translate-y-1 active:shadow-none',
  rose:   'bg-fiesta-rose   text-white shadow-btn-rose   hover:brightness-105 active:translate-y-1 active:shadow-none',
  yellow: 'bg-fiesta-yellow text-gray-800 shadow-btn-yellow hover:brightness-105 active:translate-y-1 active:shadow-none',
  outline:'bg-white border-2 border-fiesta-orange text-fiesta-orange hover:bg-fiesta-orange hover:text-white',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export function Button({ variant = 'orange', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'font-bold rounded-full transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

- [ ] **Étape 2 : Créer l'utilitaire cn (classnames)**

Créer `src/lib/cn.ts` :

```ts
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
```

- [ ] **Étape 3 : Créer le composant Timer**

Créer `src/components/ui/Timer.tsx` :

```tsx
'use client'

interface TimerProps {
  seconds: number
  total: number
}

export function Timer({ seconds, total }: TimerProps) {
  const pct = total > 0 ? (seconds / total) * 100 : 0
  const color = pct > 50 ? 'bg-fiesta-yellow' : pct > 25 ? 'bg-fiesta-orange' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold text-fiesta-dark tabular-nums">
        {seconds}s
      </div>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Étape 4 : Commit**

```bash
git add src/components/ui/ src/lib/cn.ts
git commit -m "feat: add Button and Timer UI components"
```

---

## Task 8 : Page d'accueil (créer / rejoindre)

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Étape 1 : Implémenter la page d'accueil**

Remplacer `src/app/page.tsx` :

```tsx
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
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
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
        <p className="text-gray-500 mt-2 text-sm">Mini-jeux multijoueur 🎮</p>
      </div>

      {/* Formulaire pseudo */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border-2 border-fiesta-orange/20 flex flex-col gap-4">
        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => { setPseudo(e.target.value); setError('') }}
          maxLength={20}
          className="border-2 border-gray-200 rounded-xl px-4 py-3 text-center font-bold focus:outline-none focus:border-fiesta-orange"
        />

        {mode === null && (
          <div className="flex flex-col gap-3">
            <Button variant="rose" size="lg" onClick={() => setMode('create')} className="w-full">
              🎉 Créer une partie
            </Button>
            <Button variant="outline" size="lg" onClick={() => setMode('join')} className="w-full">
              🚪 Rejoindre
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="flex flex-col gap-3">
            <Button variant="rose" size="lg" onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? 'Création...' : '🎉 Créer la partie'}
            </Button>
            <button onClick={() => setMode(null)} className="text-gray-400 text-sm underline">
              Retour
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Code de la partie"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
              maxLength={6}
              className="border-2 border-gray-200 rounded-xl px-4 py-3 text-center font-bold text-xl tracking-widest focus:outline-none focus:border-fiesta-orange"
            />
            <Button variant="orange" size="lg" onClick={handleJoin} disabled={loading} className="w-full">
              {loading ? 'Connexion...' : '🚀 Rejoindre'}
            </Button>
            <button onClick={() => setMode(null)} className="text-gray-400 text-sm underline">
              Retour
            </button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 : Tester manuellement**

```bash
npm run dev
```

- Ouvrir `http://localhost:3000`
- Entrer un pseudo → Créer une partie → vérifier que tu arrives sur `/lobby/XXXXXX`
- Dans Supabase Table Editor, vérifier que `sessions` et `players` ont une ligne

- [ ] **Étape 3 : Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add homepage with create/join session flow"
```

---

## Task 9 : Hook useChannel (Broadcast Supabase)

**Files:**
- Create: `src/hooks/useChannel.ts`

- [ ] **Étape 1 : Implémenter le hook**

Créer `src/hooks/useChannel.ts` :

```ts
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
```

- [ ] **Étape 2 : Commit**

```bash
git add src/hooks/useChannel.ts
git commit -m "feat: add useChannel hook for Supabase Broadcast"
```

---

## Task 10 : Hook usePresence

**Files:**
- Create: `src/hooks/usePresence.ts`

- [ ] **Étape 1 : Implémenter le hook**

Créer `src/hooks/usePresence.ts` :

```ts
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
```

- [ ] **Étape 2 : Commit**

```bash
git add src/hooks/usePresence.ts
git commit -m "feat: add usePresence hook for player online tracking"
```

---

## Task 11 : Hook useTimer

**Files:**
- Create: `src/hooks/useTimer.ts`, `src/hooks/useTimer.test.ts`

- [ ] **Étape 1 : Écrire les tests**

Créer `src/hooks/useTimer.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimer } from './useTimer'

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('décremente chaque seconde', () => {
    const { result } = renderHook(() => useTimer(5, true))
    expect(result.current.timeLeft).toBe(5)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.timeLeft).toBe(4)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.timeLeft).toBe(3)
  })

  it('ne va pas en dessous de 0', () => {
    const { result } = renderHook(() => useTimer(2, true))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.timeLeft).toBe(0)
  })

  it('appelle onEnd quand le timer atteint 0', () => {
    const onEnd = vi.fn()
    renderHook(() => useTimer(2, true, onEnd))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onEnd).toHaveBeenCalledOnce()
  })

  it('ne décremente pas si running = false', () => {
    const { result } = renderHook(() => useTimer(5, false))
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.timeLeft).toBe(5)
  })
})
```

- [ ] **Étape 2 : Lancer les tests pour vérifier l'échec**

```bash
npm run test:run
```

Résultat attendu : `FAIL — cannot find module './useTimer'`

- [ ] **Étape 3 : Implémenter le hook**

Créer `src/hooks/useTimer.ts` :

```ts
import { useState, useEffect, useRef } from 'react'

export function useTimer(
  initialSeconds: number,
  running: boolean,
  onEnd?: () => void
) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const onEndRef = useRef(onEnd)

  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  useEffect(() => {
    setTimeLeft(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running || timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          onEndRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [running, timeLeft === initialSeconds]) // redémarre si les secondes initiales changent

  return { timeLeft }
}
```

- [ ] **Étape 4 : Lancer les tests**

```bash
npm run test:run
```

Résultat attendu : `✓ 4 tests passed`

- [ ] **Étape 5 : Commit**

```bash
git add src/hooks/useTimer.ts src/hooks/useTimer.test.ts
git commit -m "feat: add synchronized countdown timer hook"
```

---

## Task 12 : Types GameModule + Registry + Scoring

**Files:**
- Create: `src/games/types.ts`, `src/games/registry.ts`, `src/games/scoring.ts`, `src/games/scoring.test.ts`

- [ ] **Étape 1 : Créer l'interface GameModule**

Créer `src/games/types.ts` :

```ts
import type { Question, Score } from '@/lib/supabase/types'

export interface RoundConfig {
  duration: number        // secondes
  questions?: Question[]  // questions si applicable
  [key: string]: unknown
}

export interface PlayerSubmission {
  playerId: string
  value: unknown
  timestamp: number       // Date.now() quand le joueur a soumis
  startedAt: number       // Date.now() quand la manche a commencé
}

export interface GameModule {
  id: string
  label: string
  icon: string
  defaultDuration: number
  minPlayers: number
  generateConfig(questions: Question[]): RoundConfig
  computeScore(submission: PlayerSubmission, config: RoundConfig): number
  Component: React.ComponentType<GameProps>
}

export interface GameProps {
  config: RoundConfig
  playerId: string
  timeLeft: number
  onSubmit: (value: unknown) => void
  isHost: boolean
  disabled: boolean
}
```

- [ ] **Étape 2 : Créer le scoring helpers + tests**

Créer `src/games/scoring.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { scoreWithSpeedBonus, scoreByRank, scorePartial } from './scoring'

describe('scoreWithSpeedBonus', () => {
  it('retourne base+bonus si correct et temps max', () => {
    expect(scoreWithSpeedBonus({ correct: true, timeLeft: 20, totalTime: 20, base: 100, bonus: 50 })).toBe(150)
  })

  it('retourne base si correct sans temps restant', () => {
    expect(scoreWithSpeedBonus({ correct: true, timeLeft: 0, totalTime: 20, base: 100, bonus: 50 })).toBe(100)
  })

  it('retourne 0 si incorrect', () => {
    expect(scoreWithSpeedBonus({ correct: false, timeLeft: 20, totalTime: 20, base: 100, bonus: 50 })).toBe(0)
  })
})

describe('scoreByRank', () => {
  it('donne 100 au rang 1', () => {
    expect(scoreByRank(1, 4)).toBe(100)
  })

  it('donne au moins 10 au dernier rang', () => {
    expect(scoreByRank(4, 4)).toBeGreaterThanOrEqual(10)
  })

  it('scores décroissants par rang', () => {
    const s1 = scoreByRank(1, 5)
    const s2 = scoreByRank(2, 5)
    const s3 = scoreByRank(3, 5)
    expect(s1).toBeGreaterThan(s2)
    expect(s2).toBeGreaterThan(s3)
  })
})

describe('scorePartial', () => {
  it('retourne 100 si tous corrects', () => {
    expect(scorePartial(5, 5, 100)).toBe(100)
  })

  it('retourne 0 si rien de correct', () => {
    expect(scorePartial(0, 5, 100)).toBe(0)
  })

  it('retourne 60 si 3/5 corrects', () => {
    expect(scorePartial(3, 5, 100)).toBe(60)
  })
})
```

- [ ] **Étape 3 : Implémenter scoring.ts**

Créer `src/games/scoring.ts` :

```ts
interface SpeedBonusParams {
  correct: boolean
  timeLeft: number
  totalTime: number
  base: number
  bonus: number
}

export function scoreWithSpeedBonus({ correct, timeLeft, totalTime, base, bonus }: SpeedBonusParams): number {
  if (!correct) return 0
  const speedBonus = totalTime > 0 ? Math.round((timeLeft / totalTime) * bonus) : 0
  return base + speedBonus
}

/** Score basé sur le classement (tap spam, shake it, réflexe) */
export function scoreByRank(rank: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 100
  const max = 100
  const min = 10
  return Math.round(max - ((rank - 1) / (totalPlayers - 1)) * (max - min))
}

/** Score partiel pour ordre logique */
export function scorePartial(correct: number, total: number, max: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * max)
}
```

- [ ] **Étape 4 : Lancer les tests**

```bash
npm run test:run
```

Résultat attendu : `✓ 8 tests passed`

- [ ] **Étape 5 : Créer un registry vide**

Créer `src/games/registry.ts` :

```ts
import type { GameModule } from './types'

// Les jeux seront ajoutés dans le Plan 2
const registry = new Map<string, GameModule>()

export function registerGame(module: GameModule) {
  registry.set(module.id, module)
}

export function getGame(id: string): GameModule | undefined {
  return registry.get(id)
}

export function getAllGames(): GameModule[] {
  return Array.from(registry.values())
}

export const GAME_IDS = [
  'quiz',
  'reflex',
  'tap-spam',
  'mental-math',
  'memory',
  'moving-target',
  'true-false',
  'order-logic',
  'shake-it',
  'geo-guess',
] as const

export type GameId = typeof GAME_IDS[number]
```

- [ ] **Étape 6 : Commit**

```bash
git add src/games/
git commit -m "feat: add GameModule interface, registry, and scoring utilities"
```

---

## Task 13 : Hook useGameEngine (orchestration host)

**Files:**
- Create: `src/hooks/useGameEngine.ts`

- [ ] **Étape 1 : Implémenter le hook**

Créer `src/hooks/useGameEngine.ts` :

```ts
'use client'

import { useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import { shuffleArray, assignTeams } from '@/lib/utils'
import { GAME_IDS } from '@/games/registry'
import type { Score, Player } from '@/lib/supabase/types'

export function useGameEngine(
  send: (type: string, payload: unknown) => void
) {
  const { session, localPlayer } = useSessionStore()
  const { players, setPhase, setCurrentRound, accumulateScores } = useGameStore()
  const submissionsRef = useRef<Map<string, unknown>>(new Map())

  /** Lance la partie depuis le lobby */
  const startGame = useCallback(async () => {
    if (!session || !localPlayer?.is_host) return

    const supabase = getSupabaseClient()
    const gamesOrder = shuffleArray([...GAME_IDS]).slice(0, session.total_rounds)

    // Assigner les équipes si mode team
    let teams: Record<string, 'red' | 'blue'> | undefined
    if (session.mode === 'team') {
      teams = assignTeams(players.map(p => p.id))
      // Persister les équipes en DB
      await Promise.all(
        Object.entries(teams).map(([playerId, team]) =>
          supabase.from('players').update({ team }).eq('id', playerId)
        )
      )
    }

    // Mettre à jour la session
    await supabase
      .from('sessions')
      .update({ status: 'playing', games_order: gamesOrder })
      .eq('id', session.id)

    send('host:game_start', { games_order: gamesOrder, total_rounds: session.total_rounds, teams })

    if (teams) {
      send('host:team_assign', { assignments: teams })
      setPhase('team_splash')
      setTimeout(() => startRound(gamesOrder, 0), 5000)
    } else {
      startRound(gamesOrder, 0)
    }
  }, [session, localPlayer, players, send, setPhase])

  /** Démarre une manche */
  const startRound = useCallback(async (gamesOrder: string[], roundIndex: number) => {
    if (!session) return

    const supabase = getSupabaseClient()
    const gameType = gamesOrder[roundIndex]
    const startedAt = new Date().toISOString()
    const duration = 30 // durée par défaut, surchargée par chaque jeu dans le Plan 2

    const { data: round } = await supabase
      .from('rounds')
      .insert({
        session_id: session.id,
        round_number: roundIndex + 1,
        game_type: gameType,
        config: { duration },
        started_at: startedAt,
      })
      .select()
      .single()

    if (!round) return

    submissionsRef.current.clear()
    setCurrentRound(round)
    setPhase('playing')

    send('host:round_start', {
      round_number: roundIndex + 1,
      game_type: gameType,
      config: { duration },
      started_at: startedAt,
      round_id: round.id,
    })
  }, [session, send, setCurrentRound, setPhase])

  /** Reçoit la soumission d'un joueur */
  const receiveSubmission = useCallback((playerId: string, value: unknown) => {
    submissionsRef.current.set(playerId, value)
  }, [])

  /** Termine une manche (appelé par le host quand le timer expire) */
  const endRound = useCallback(async (
    roundId: string,
    gamesOrder: string[],
    roundIndex: number
  ) => {
    if (!session) return

    const supabase = getSupabaseClient()

    // Calculer les scores (logique placeholder — surchargée par les jeux dans le Plan 2)
    const scores: Score[] = players.map(p => ({
      id: crypto.randomUUID(),
      round_id: roundId,
      player_id: p.id,
      points: submissionsRef.current.has(p.id) ? 50 : 0,
      metadata: {},
    }))

    // Persister les scores
    await supabase.from('scores').insert(scores)

    // Marquer la manche comme terminée
    await supabase.from('rounds').update({ ended_at: new Date().toISOString() }).eq('id', roundId)

    accumulateScores(scores)
    setPhase('inter_round')
    send('host:round_end', { round_number: roundIndex + 1, scores })

    // Passer à la manche suivante ou terminer
    const nextIndex = roundIndex + 1
    if (nextIndex < gamesOrder.length) {
      setTimeout(() => startRound(gamesOrder, nextIndex), 3000)
    } else {
      setTimeout(() => endGame(), 3000)
    }
  }, [session, players, send, accumulateScores, setPhase, startRound])

  /** Termine la partie */
  const endGame = useCallback(async () => {
    if (!session) return
    const supabase = getSupabaseClient()
    await supabase.from('sessions').update({ status: 'finished' }).eq('id', session.id)
    setPhase('finished')
    send('host:game_end', {})
  }, [session, send, setPhase])

  return { startGame, startRound, receiveSubmission, endRound, endGame }
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: add host game engine hook (orchestration)"
```

---

## Task 14 : Composants Game (HUD, GameContainer, RoundTransition)

**Files:**
- Create: `src/components/game/HUD.tsx`, `src/components/game/GameContainer.tsx`, `src/components/game/RoundTransition.tsx`

- [ ] **Étape 1 : Créer le HUD**

Créer `src/components/game/HUD.tsx` :

```tsx
'use client'

import { Timer } from '@/components/ui/Timer'
import type { Player, Round } from '@/lib/supabase/types'

interface HUDProps {
  round: Round
  roundNumber: number
  totalRounds: number
  timeLeft: number
  myScore: number
  myTeam?: 'red' | 'blue' | null
  teamScore?: number
}

const teamColors = {
  red: 'bg-fiesta-red text-white',
  blue: 'bg-fiesta-blue text-white',
}

export function HUD({ round, roundNumber, totalRounds, timeLeft, myScore, myTeam, teamScore }: HUDProps) {
  return (
    <div className="bg-white border-b-2 border-fiesta-orange/20 p-3 flex flex-col gap-2">
      {/* Ligne 1 : manche + jeu + équipe */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-500">
          Manche {roundNumber}/{totalRounds}
        </span>
        <span className="font-bold text-fiesta-orange">{round.game_type}</span>
        {myTeam && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${teamColors[myTeam]}`}>
            {myTeam === 'red' ? '🔴' : '🔵'} {myTeam}
          </span>
        )}
      </div>

      {/* Ligne 2 : timer */}
      <Timer seconds={timeLeft} total={round.config.duration as number ?? 30} />

      {/* Ligne 3 : scores */}
      <div className="flex justify-between text-sm">
        <span>🏅 <strong>{myScore} pts</strong></span>
        {myTeam && teamScore !== undefined && (
          <span className="text-gray-500">Équipe: <strong>{teamScore} pts</strong></span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Étape 2 : Créer le GameContainer**

Créer `src/components/game/GameContainer.tsx` :

```tsx
'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import { useTimer } from '@/hooks/useTimer'
import { getGame } from '@/games/registry'
import { HUD } from './HUD'

interface GameContainerProps {
  onSubmit: (value: unknown) => void
  onRoundEnd: () => void
}

export function GameContainer({ onSubmit, onRoundEnd }: GameContainerProps) {
  const { currentRound, phase, totalScores, players } = useGameStore()
  const { localPlayer } = useSessionStore()

  const duration = (currentRound?.config?.duration as number) ?? 30
  const { timeLeft } = useTimer(duration, phase === 'playing', onRoundEnd)

  if (!currentRound || !localPlayer) return null

  const gameModule = getGame(currentRound.game_type)
  const myScore = totalScores[localPlayer.id] ?? 0
  const myPlayer = players.find(p => p.id === localPlayer.id)

  // Calcul score équipe
  let teamScore: number | undefined
  if (myPlayer?.team) {
    teamScore = players
      .filter(p => p.team === myPlayer.team)
      .reduce((acc, p) => acc + (totalScores[p.id] ?? 0), 0)
  }

  return (
    <div className="flex flex-col h-full">
      <HUD
        round={currentRound}
        roundNumber={currentRound.round_number}
        totalRounds={10}
        timeLeft={timeLeft}
        myScore={myScore}
        myTeam={myPlayer?.team}
        teamScore={teamScore}
      />
      <div className="flex-1 p-4">
        {gameModule ? (
          <gameModule.Component
            config={currentRound.config as never}
            playerId={localPlayer.id}
            timeLeft={timeLeft}
            onSubmit={onSubmit}
            isHost={localPlayer.is_host}
            disabled={phase !== 'playing'}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Jeu "{currentRound.game_type}" à venir...</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Étape 3 : Créer l'écran de transition inter-manche**

Créer `src/components/game/RoundTransition.tsx` :

```tsx
'use client'

import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'

export function RoundTransition() {
  const { roundScores, players, currentRound } = useGameStore()
  const { localPlayer } = useSessionStore()

  const sorted = [...players]
    .map(p => ({ ...p, pts: roundScores.find(s => s.player_id === p.id)?.points ?? 0 }))
    .sort((a, b) => b.pts - a.pts)

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4 bg-fiesta-bg">
      <h2 className="text-2xl font-playful text-fiesta-orange">
        Manche {currentRound?.round_number} terminée !
      </h2>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-3 rounded-xl border-2 ${
              p.id === localPlayer?.id
                ? 'border-fiesta-orange bg-fiesta-orange/10'
                : 'border-gray-100 bg-white'
            }`}
          >
            <span className="font-bold text-gray-500">#{i + 1}</span>
            <span className="font-bold flex-1 ml-3">{p.pseudo}</span>
            <span className="font-bold text-fiesta-orange">+{p.pts} pts</span>
          </div>
        ))}
      </div>
      <p className="text-gray-400 text-sm animate-pulse">Prochaine manche dans 3s...</p>
    </div>
  )
}
```

- [ ] **Étape 4 : Commit**

```bash
git add src/components/game/
git commit -m "feat: add HUD, GameContainer, and RoundTransition components"
```

---

## Task 15 : Page Lobby

**Files:**
- Create: `src/components/lobby/PlayerList.tsx`, `src/components/lobby/TeamPicker.tsx`, `src/app/lobby/[code]/page.tsx`

- [ ] **Étape 1 : Créer PlayerList**

Créer `src/components/lobby/PlayerList.tsx` :

```tsx
'use client'

import type { Player } from '@/lib/supabase/types'

interface PlayerListProps {
  players: Player[]
  localPlayerId: string
  showTeams?: boolean
}

const teamColors = { red: '🔴', blue: '🔵' }

export function PlayerList({ players, localPlayerId, showTeams }: PlayerListProps) {
  return (
    <div className="flex flex-col gap-2">
      {players.map(p => (
        <div
          key={p.id}
          className={`flex items-center justify-between p-3 rounded-xl border-2 ${
            p.id === localPlayerId ? 'border-fiesta-orange bg-fiesta-orange/10' : 'border-gray-100 bg-white'
          } ${!p.is_connected ? 'opacity-40' : ''}`}
        >
          <div className="flex items-center gap-2">
            {showTeams && p.team && <span>{teamColors[p.team]}</span>}
            <span className="font-bold">{p.pseudo}</span>
            {p.is_host && <span className="text-xs bg-fiesta-yellow text-gray-700 px-2 py-0.5 rounded-full font-bold">Host</span>}
            {p.id === localPlayerId && <span className="text-xs text-gray-400">(toi)</span>}
          </div>
          <span className={`w-2 h-2 rounded-full ${p.is_connected ? 'bg-green-400' : 'bg-gray-300'}`} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Étape 2 : Créer TeamPicker**

Créer `src/components/lobby/TeamPicker.tsx` :

```tsx
'use client'

import { getSupabaseClient } from '@/lib/supabase/client'

interface TeamPickerProps {
  playerId: string
  currentTeam: 'red' | 'blue' | null
  onTeamChange: (team: 'red' | 'blue') => void
}

export function TeamPicker({ playerId, currentTeam, onTeamChange }: TeamPickerProps) {
  async function choose(team: 'red' | 'blue') {
    const supabase = getSupabaseClient()
    await supabase.from('players').update({ team }).eq('id', playerId)
    onTeamChange(team)
  }

  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => choose('red')}
        className={`flex-1 py-4 rounded-2xl text-2xl font-bold border-4 transition-all ${
          currentTeam === 'red'
            ? 'border-red-500 bg-red-50 scale-105'
            : 'border-gray-200 bg-white'
        }`}
      >
        🔴 Rouge
      </button>
      <button
        onClick={() => choose('blue')}
        className={`flex-1 py-4 rounded-2xl text-2xl font-bold border-4 transition-all ${
          currentTeam === 'blue'
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-200 bg-white'
        }`}
      >
        🔵 Bleu
      </button>
    </div>
  )
}
```

- [ ] **Étape 3 : Créer la page Lobby**

Créer `src/app/lobby/[code]/page.tsx` :

```tsx
'use client'

import { useEffect, useState } from 'react'
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
  const { session, localPlayer, setSession, setLocalPlayer } = useSessionStore()
  const { players, setPlayers, setPhase } = useGameStore()
  const [mode, setMode] = useState<'solo' | 'team'>('solo')
  const [teamMode, setTeamMode] = useState<'auto' | 'manual'>('auto')
  const [duration, setDuration] = useState(20)
  const [loading, setLoading] = useState(false)

  const { send } = useChannel(code, {
    'host:game_start': (payload: any) => {
      router.push(`/game/${code}`)
    },
  })

  const { startGame } = useGameEngine(send as any)

  usePresence(code, localPlayer)

  // Récupérer la session + joueurs si page rechargée
  useEffect(() => {
    if (session) return
    const supabase = getSupabaseClient()
    supabase.from('sessions').select().eq('code', code).single().then(({ data }) => {
      if (data) setSession(data as Session)
    })
  }, [code])

  // Abonnement Realtime aux joueurs
  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()

    // Charger les joueurs initiaux
    supabase.from('players').select().eq('session_id', session.id).then(({ data }) => {
      if (data) setPlayers(data as Player[])
    })

    // Écouter les nouveaux joueurs
    const sub = supabase
      .channel(`lobby-players:${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` },
        (payload) => setPlayers([...players, payload.new as Player])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `session_id=eq.${session.id}` },
        (payload) => setPlayers(players.map(p => p.id === (payload.new as Player).id ? payload.new as Player : p))
      )
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [session?.id])

  const suggestedRounds = computeRoundCount(duration, players.length)
  const isHost = localPlayer?.is_host ?? false
  const localPlayerData = players.find(p => p.id === localPlayer?.id)

  async function handleStart() {
    if (!session || !isHost) return
    setLoading(true)
    const supabase = getSupabaseClient()
    await supabase.from('sessions').update({
      mode,
      team_mode: mode === 'team' ? teamMode : null,
      duration_min: duration,
      total_rounds: suggestedRounds,
    }).eq('id', session.id)

    const updated = { ...session, mode, team_mode: mode === 'team' ? teamMode : null, duration_min: duration, total_rounds: suggestedRounds }
    setSession(updated as Session)
    await startGame()
  }

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 flex flex-col gap-4 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <p className="text-gray-400 text-sm">Code de la partie</p>
        <h1 className="text-4xl font-playful text-fiesta-orange tracking-widest">{code}</h1>
        <p className="text-gray-400 text-sm mt-1">{players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}</p>
      </div>

      {/* Joueurs */}
      <PlayerList players={players} localPlayerId={localPlayer?.id ?? ''} showTeams={mode === 'team'} />

      {/* Config host */}
      {isHost && (
        <div className="bg-white rounded-2xl p-4 border-2 border-fiesta-orange/20 flex flex-col gap-4">
          <h2 className="font-bold text-gray-700">⚙️ Configuration</h2>

          {/* Durée */}
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">Durée de partie</label>
            <div className="flex gap-2">
              {[10, 20, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm transition-all ${
                    duration === d ? 'border-fiesta-orange bg-fiesta-orange text-white' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">
              → {suggestedRounds} manches suggérées pour {players.length} joueur{players.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Mode */}
          <div>
            <label className="text-sm font-bold text-gray-500 block mb-2">Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('solo')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'solo' ? 'border-fiesta-rose bg-fiesta-rose text-white' : 'border-gray-200 text-gray-600'
                }`}
              >
                🏆 Solo
              </button>
              <button
                onClick={() => setMode('team')}
                className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                  mode === 'team' ? 'border-fiesta-blue bg-fiesta-blue text-white' : 'border-gray-200 text-gray-600'
                }`}
              >
                👥 Équipes
              </button>
            </div>
          </div>

          {/* Mode équipe */}
          {mode === 'team' && (
            <div>
              <label className="text-sm font-bold text-gray-500 block mb-2">Assignation des équipes</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTeamMode('auto')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'auto' ? 'border-fiesta-yellow bg-fiesta-yellow text-gray-800' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  🎲 Auto
                </button>
                <button
                  onClick={() => setTeamMode('manual')}
                  className={`flex-1 py-2 rounded-xl font-bold border-2 text-sm ${
                    teamMode === 'manual' ? 'border-fiesta-yellow bg-fiesta-yellow text-gray-800' : 'border-gray-200 text-gray-600'
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

      {/* Sélecteur d'équipe manuel pour les joueurs */}
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
        <p className="text-center text-gray-400 text-sm animate-pulse">
          En attente du host...
        </p>
      )}
    </div>
  )
}
```

- [ ] **Étape 4 : Tester le lobby**

```bash
npm run dev
```

1. Ouvrir deux onglets sur `http://localhost:3000`
2. Onglet 1 : entrer "Alice", Créer une partie → noter le code
3. Onglet 2 : entrer "Bob", Rejoindre avec le code
4. Vérifier que les deux joueurs apparaissent en temps réel dans le lobby
5. Host : changer la durée → vérifier que le compteur de manches s'adapte

- [ ] **Étape 5 : Commit**

```bash
git add src/app/lobby/ src/components/lobby/
git commit -m "feat: add lobby page with real-time player list and game configuration"
```

---

## Task 16 : Page Game (boucle de partie)

**Files:**
- Create: `src/app/game/[code]/page.tsx`

- [ ] **Étape 1 : Implémenter la page de jeu**

Créer `src/app/game/[code]/page.tsx` :

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { useGameStore } from '@/store/game.store'
import { useChannel } from '@/hooks/useChannel'
import { useGameEngine } from '@/hooks/useGameEngine'
import { GameContainer } from '@/components/game/GameContainer'
import { RoundTransition } from '@/components/game/RoundTransition'
import type { Round, Score, Player } from '@/lib/supabase/types'

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer } = useSessionStore()
  const { phase, setPhase, setCurrentRound, setRoundScores, accumulateScores, setPlayers } = useGameStore()
  const gamesOrderRef = useRef<string[]>([])
  const roundIndexRef = useRef(0)
  const currentRoundIdRef = useRef<string | null>(null)

  const { send } = useChannel(code, {
    'host:round_start': (payload: any) => {
      const round: Round = {
        id: payload.round_id,
        session_id: session?.id ?? '',
        round_number: payload.round_number,
        game_type: payload.game_type,
        config: payload.config,
        started_at: payload.started_at,
        ended_at: null,
      }
      gamesOrderRef.current = payload.games_order ?? gamesOrderRef.current
      roundIndexRef.current = payload.round_number - 1
      currentRoundIdRef.current = payload.round_id
      setCurrentRound(round)
      setPhase('playing')
    },
    'host:round_end': (payload: any) => {
      setRoundScores(payload.scores as Score[])
      accumulateScores(payload.scores as Score[])
      setPhase('inter_round')
    },
    'host:team_assign': (payload: any) => {
      // Mettre à jour les équipes des joueurs dans le store
    },
    'host:game_end': () => {
      router.push(`/results/${code}`)
    },
  })

  const { receiveSubmission, endRound } = useGameEngine(send as any)

  // Charger les joueurs si page rechargée
  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()
    supabase.from('players').select().eq('session_id', session.id).then(({ data }) => {
      if (data) setPlayers(data as Player[])
    })
  }, [session?.id])

  function handleSubmit(value: unknown) {
    if (!localPlayer) return
    receiveSubmission(localPlayer.id, value)
    send('player:answer', { player_id: localPlayer.id, value, timestamp: Date.now() })
  }

  function handleRoundEnd() {
    if (!localPlayer?.is_host || !currentRoundIdRef.current) return
    endRound(currentRoundIdRef.current, gamesOrderRef.current, roundIndexRef.current)
  }

  // Splash équipes
  if (phase === 'team_splash') {
    const myTeam = useGameStore.getState().players.find(p => p.id === localPlayer?.id)?.team
    return (
      <div className="min-h-screen bg-fiesta-bg flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Tu joues pour l'équipe</p>
        <div className={`text-6xl font-playful ${myTeam === 'red' ? 'text-red-500' : 'text-blue-500'}`}>
          {myTeam === 'red' ? '🔴 Rouge' : '🔵 Bleu'}
        </div>
        <p className="text-gray-400 text-sm animate-pulse">La partie démarre dans 5s...</p>
      </div>
    )
  }

  if (phase === 'inter_round') {
    return <RoundTransition />
  }

  if (phase === 'lobby' || phase === 'round_start') {
    return (
      <div className="min-h-screen bg-fiesta-bg flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Chargement de la manche...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fiesta-bg flex flex-col">
      <GameContainer onSubmit={handleSubmit} onRoundEnd={handleRoundEnd} />
    </div>
  )
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/app/game/
git commit -m "feat: add game page with full round lifecycle"
```

---

## Task 17 : Page Results (Podium + Classement)

**Files:**
- Create: `src/app/results/[code]/page.tsx`

- [ ] **Étape 1 : Implémenter la page résultats**

Créer `src/app/results/[code]/page.tsx` :

```tsx
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
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { session, localPlayer } = useSessionStore()
  const { totalScores } = useGameStore()
  const [players, setPlayers] = useState<PlayerWithScore[]>([])

  useEffect(() => {
    if (!session) return
    const supabase = getSupabaseClient()
    supabase.from('players').select().eq('session_id', session.id).then(({ data }) => {
      if (!data) return
      const withScores: PlayerWithScore[] = (data as Player[])
        .map(p => ({ ...p, totalPoints: totalScores[p.id] ?? 0 }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
      setPlayers(withScores)
    })
  }, [session?.id, totalScores])

  const top3 = players.slice(0, 3)
  const rest = players.slice(3)
  const isTeam = session?.mode === 'team'

  // Calcul score équipe
  const teamScores = isTeam
    ? players.reduce<Record<string, number>>((acc, p) => {
        if (p.team) acc[p.team] = (acc[p.team] ?? 0) + p.totalPoints
        return acc
      }, {})
    : {}
  const winningTeam = isTeam
    ? Object.entries(teamScores).sort(([, a], [, b]) => b - a)[0]
    : null

  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumHeights = ['h-14', 'h-20', 'h-10']
  const medals = ['🥈', '🥇', '🥉']

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 max-w-md mx-auto flex flex-col gap-4 pb-8">
      {/* Titre */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-playful text-fiesta-orange drop-shadow-[2px_2px_0_#FFD700]">
          🏆 Fin de partie !
        </h1>
        {winningTeam && (
          <p className="text-lg font-bold mt-1" style={{ color: winningTeam[0] === 'red' ? '#EF4444' : '#3B82F6' }}>
            {winningTeam[0] === 'red' ? '🔴' : '🔵'} Équipe {winningTeam[0] === 'red' ? 'Rouge' : 'Bleue'} gagne !
            <span className="text-gray-400 text-sm ml-2 font-normal">{teamScores.red} vs {teamScores.blue} pts</span>
          </p>
        )}
      </div>

      {/* Podium */}
      {top3.length >= 2 && (
        <div className="flex items-end justify-center gap-2 h-32">
          {podiumOrder.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center flex-1">
              <span className="text-lg">{medals[i]}</span>
              <span className="text-xs font-bold truncate w-full text-center">{p.pseudo}</span>
              <span className="text-xs text-gray-500">{p.totalPoints} pts</span>
              <div
                className={`w-full rounded-t-lg flex items-center justify-center text-white font-bold text-sm ${podiumHeights[i]} ${
                  i === 1 ? 'bg-fiesta-yellow text-gray-700' : i === 0 ? 'bg-gray-300' : 'bg-amber-600'
                }`}
              >
                {i === 0 ? '2' : i === 1 ? '1' : '3'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Classement complet */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Classement complet</h2>
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
              isTeam && p.team === 'red' ? 'bg-fiesta-red-team-bg border-l-4 border-l-red-400 border-r-transparent border-t-transparent border-b-transparent' :
              isTeam && p.team === 'blue' ? 'bg-fiesta-blue-team-bg border-l-4 border-l-blue-400 border-r-transparent border-t-transparent border-b-transparent' :
              i === 0 ? 'bg-yellow-50 border-fiesta-yellow' :
              i === 1 ? 'bg-gray-50 border-gray-200' :
              i === 2 ? 'bg-amber-50 border-amber-200' :
              'bg-white border-gray-100'
            } ${p.id === localPlayer?.id ? 'ring-2 ring-fiesta-orange' : ''}`}
          >
            <span className="font-bold text-gray-400 w-6 text-center">#{i + 1}</span>
            {isTeam && p.team && (
              <span>{p.team === 'red' ? '🔴' : '🔵'}</span>
            )}
            <span className="font-bold flex-1">{p.pseudo}</span>
            <span className="font-bold text-fiesta-orange">{p.totalPoints} pts</span>
          </div>
        ))}
      </div>

      {/* Bouton rejouer */}
      {localPlayer?.is_host && (
        <Button variant="rose" size="lg" onClick={() => router.push('/')} className="w-full mt-2">
          🎮 Rejouer
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/app/results/
git commit -m "feat: add results page with podium and team-aware leaderboard"
```

---

## Task 18 : Test bout en bout + Vérification finale

- [ ] **Étape 1 : Lancer tous les tests**

```bash
npm run test:run
```

Résultat attendu : tous les tests passent (`✓ utils`, `✓ scoring`, `✓ useTimer`)

- [ ] **Étape 2 : Test manuel complet**

```bash
npm run dev
```

**Scénario A — Solo :**
1. Onglet 1 : "Alice" → Créer une partie → noter le code
2. Onglet 2 : "Bob" → Rejoindre avec le code
3. Onglet 3 : "Charlie" → Rejoindre avec le code
4. Onglet 1 (host) : mode Solo, 10 min → Lancer
5. Vérifier : tous les onglets naviguent vers `/game/XXXX`
6. Le timer tourne pendant 30s
7. À la fin : écran inter-manche avec scores, puis manche suivante automatiquement
8. Après toutes les manches : redirect vers `/results/XXXX`
9. Vérifier le podium et le classement

**Scénario B — Équipes auto :**
1. Répéter avec mode Équipes > Auto
2. Vérifier le splash d'assignation (5s)
3. Vérifier les indicateurs d'équipe dans le HUD
4. Vérifier le classement coloré par équipe dans les résultats

**Scénario C — Reconnexion :**
1. Pendant une manche, fermer l'onglet d'un joueur
2. Rouvrir et naviguer vers `/game/XXXX`
3. Vérifier que le joueur retrouve la manche en cours

- [ ] **Étape 3 : Vérifier la protection admin**

```bash
curl http://localhost:3000/admin/dashboard
```

Résultat attendu : redirection vers `/admin/login`

- [ ] **Étape 4 : Build de production**

```bash
npm run build
```

Résultat attendu : `✓ Compiled successfully` sans erreurs TypeScript

- [ ] **Étape 5 : Commit final du Plan 1**

```bash
git add -A
git commit -m "feat: complete Plan 1 — foundation, lobby, game engine, results"
```

---

## Résumé du Plan 1

À la fin de ce plan, dolympia est entièrement fonctionnel **sans les jeux réels** : les joueurs peuvent créer une session, se rejoindre en temps réel dans le lobby, configurer les équipes, lancer une partie, traverser N manches avec un timer, et voir le podium final.

Le Plan 2 ajoutera les 10 mini-jeux en branchant leurs composants sur l'architecture `GameModule` déjà en place.
