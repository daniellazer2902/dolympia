# Plan 3 — V1 Polish + Nouveaux Jeux + GeoGuess — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finaliser la V1 (admin panel CRUD, animations Framer Motion, gestion jeux actifs), ajouter 5 mini-jeux interactifs (PFC, Point Rush, Territory, Draw & Guess, Mot Commun), et rendre GeoGuess fonctionnel avec Supabase Storage.

**Architecture:** Le projet est un Next.js 14 App Router avec Supabase (Broadcast + Presence + PostgreSQL). Les mini-jeux respectent le contrat `GameModule` (`src/games/types.ts`). Les jeux temps réel utilisent `useChannel` pour les broadcasts intra-round. Le scoring se fait dans `useGameEngine.endRound()` côté host.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS (thème Fiesta), Supabase JS v2, Zustand, Framer Motion (nouveau), Vitest

---

## Carte des fichiers

```
src/
├── games/
│   ├── types.ts                          # (modifier) ajouter GameEventType broadcast pour jeux temps réel
│   ├── registry.ts                       # (modifier) ajouter 5 nouveaux jeux dans GAME_IDS + imports
│   ├── scoring.ts                        # (existant, pas de modification)
│   ├── rock-paper-scissors/
│   │   ├── index.ts                      # (créer) GameModule export
│   │   └── RPSGame.tsx                   # (créer) Composant React duel PFC
│   ├── point-rush/
│   │   ├── index.ts                      # (créer) GameModule export
│   │   └── PointRushGame.tsx             # (créer) Grille partagée temps réel
│   ├── territory/
│   │   ├── index.ts                      # (créer) GameModule export
│   │   └── TerritoryGame.tsx             # (créer) Grille territorial temps réel
│   ├── draw-guess/
│   │   ├── index.ts                      # (créer) GameModule export
│   │   ├── DrawGuessGame.tsx             # (créer) Phases dessin → vote → reveal
│   │   └── DrawCanvas.tsx                # (créer) Canvas tactile/souris
│   └── common-word/
│       ├── index.ts                      # (créer) GameModule export
│       └── CommonWordGame.tsx            # (créer) Input + reveal matchs
│
├── lib/supabase/
│   ├── types.ts                          # (modifier) ajouter GameEventType pour nouveaux broadcasts
│   ├── questions.ts                      # (existant, pas de modification)
│   ├── draw-words.ts                     # (créer) Service fetch/CRUD draw_words
│   ├── word-pairs.ts                     # (créer) Service fetch/CRUD word_pairs
│   └── game-settings.ts                  # (créer) Service fetch/CRUD game_settings
│
├── hooks/
│   └── useGameEngine.ts                  # (modifier) scoring custom pour common-word et draw-guess
│
├── store/
│   └── game.store.ts                     # (existant, pas de modification)
│
├── components/
│   ├── game/
│   │   ├── GameContainer.tsx             # (modifier) ajouter animation fade-in Framer Motion
│   │   └── RoundTransition.tsx           # (modifier) animations stagger Framer Motion
│   ├── lobby/
│   │   ├── PlayerList.tsx                # (modifier) animation slide-in
│   │   └── GameSelector.tsx              # (créer) toggles jeux pour le host dans le lobby
│   └── ui/
│       └── Button.tsx                    # (existant, pas de modification)
│
├── app/
│   ├── lobby/[code]/page.tsx             # (modifier) ajouter GameSelector + fetch game_settings
│   ├── results/[code]/page.tsx           # (modifier) animations podium Framer Motion
│   └── admin/dashboard/
│       ├── page.tsx                      # (réécrire) Layout avec onglets
│       └── components/
│           ├── QuestionList.tsx           # (créer)
│           ├── QuestionForm.tsx           # (créer)
│           ├── GeoGuessUploader.tsx       # (créer)
│           ├── DrawWordList.tsx           # (créer)
│           ├── WordPairList.tsx           # (créer)
│           ├── GameSettingsPanel.tsx      # (créer)
│           └── StatsOverview.tsx          # (créer)
│
└── supabase/
    └── migrations/
        └── 20260405_plan3_tables.sql     # (créer) draw_words, word_pairs, game_settings + seeds
```

---

## Dépendances entre tâches

```
Task 1 (DB: tables + seeds) ──────────────────────┐
Task 2 (types + event types) ──────────────────────┤
Task 3 (services Supabase) ───────────────┐        │
                                          ▼        ▼
                      Task 4 (game_settings service + lobby GameSelector)
                                          │
Task 5 (Framer Motion install) ──────────┐│
                                         ▼▼
                      Task 6 (admin panel CRUD complet)
                      Task 7 (animations Framer Motion) ← indépendant du reste
                                          │
Task 8  (common-word)  ──── indépendant ──┤ dépend de Task 1,2,3
Task 9  (rock-paper-scissors) ── indép ───┤ dépend de Task 2
Task 10 (point-rush) ──── indépendant ────┤ dépend de Task 2
Task 11 (territory) ──── indépendant ─────┤ dépend de Task 2
Task 12 (draw-guess) ──── indépendant ────┤ dépend de Task 1,2,3
                                          ▼
                      Task 13 (registry + useGameEngine scoring custom)
                                          │
                      Task 14 (GeoGuess Storage + admin upload)
                                          │
                      🔵 CHECKPOINT — tout fonctionne
```

**Parallélisables :** Tasks 8-12 (les 5 jeux) sont toutes indépendantes entre elles.
**Parallélisables :** Tasks 6 et 7 sont indépendantes entre elles.

---

## Task 1 : Migration DB — nouvelles tables + seeds

**Files:**
- Create: `supabase/migrations/20260405_plan3_tables.sql`

- [ ] **Step 1 : Écrire le fichier SQL de migration**

```sql
-- ============================================
-- Plan 3 : nouvelles tables + seeds
-- ============================================

-- Table draw_words (mots pour Draw & Guess)
CREATE TABLE IF NOT EXISTS draw_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE draw_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draw_words_read" ON draw_words FOR SELECT USING (true);
CREATE POLICY "draw_words_write" ON draw_words FOR ALL USING (auth.role() = 'authenticated');

-- Table word_pairs (paires pour Mot Commun)
CREATE TABLE IF NOT EXISTS word_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a text NOT NULL,
  word_b text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "word_pairs_read" ON word_pairs FOR SELECT USING (true);
CREATE POLICY "word_pairs_write" ON word_pairs FOR ALL USING (auth.role() = 'authenticated');

-- Table game_settings (activation/désactivation globale des jeux)
CREATE TABLE IF NOT EXISTS game_settings (
  game_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_settings_read" ON game_settings FOR SELECT USING (true);
CREATE POLICY "game_settings_write" ON game_settings FOR ALL USING (auth.role() = 'authenticated');

-- Colonne disabled_games sur sessions (jeux désactivés par le host pour cette partie)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS disabled_games text[] DEFAULT NULL;

-- Seed game_settings : tous les jeux activés par défaut
INSERT INTO game_settings (game_id, enabled) VALUES
  ('quiz', true),
  ('true-false', true),
  ('mental-math', true),
  ('reflex', true),
  ('tap-spam', true),
  ('memory', true),
  ('moving-target', true),
  ('order-logic', true),
  ('shake-it', true),
  ('geo-guess', true),
  ('rock-paper-scissors', true),
  ('point-rush', true),
  ('territory', true),
  ('draw-guess', true),
  ('common-word', true)
ON CONFLICT (game_id) DO NOTHING;

-- Seed draw_words : 30 mots pour Draw & Guess
INSERT INTO draw_words (word, category) VALUES
  ('Éléphant', 'animal'),
  ('Pizza', 'nourriture'),
  ('Fusée', 'objet'),
  ('Sirène', 'mythologie'),
  ('Parapluie', 'objet'),
  ('Volcan', 'nature'),
  ('Robot', 'technologie'),
  ('Château', 'lieu'),
  ('Pirate', 'personnage'),
  ('Guitare', 'musique'),
  ('Dinosaure', 'animal'),
  ('Arc-en-ciel', 'nature'),
  ('Astronaute', 'métier'),
  ('Spaghetti', 'nourriture'),
  ('Dragon', 'mythologie'),
  ('Hélicoptère', 'véhicule'),
  ('Cactus', 'plante'),
  ('Fantôme', 'halloween'),
  ('Skateboard', 'sport'),
  ('Couronne', 'objet'),
  ('Méduse', 'animal'),
  ('Igloo', 'lieu'),
  ('Licorne', 'mythologie'),
  ('Croissant', 'nourriture'),
  ('Tornade', 'nature'),
  ('Clown', 'personnage'),
  ('Palmier', 'plante'),
  ('Monstre', 'fantaisie'),
  ('Baleine', 'animal'),
  ('Pyramide', 'lieu')
ON CONFLICT DO NOTHING;

-- Seed word_pairs : 30 paires pour Mot Commun
INSERT INTO word_pairs (word_a, word_b, category) VALUES
  ('Soleil', 'Plage', 'vacances'),
  ('Nuit', 'Étoile', 'ciel'),
  ('Chat', 'Souris', 'animaux'),
  ('Feu', 'Glace', 'éléments'),
  ('Livre', 'Aventure', 'loisirs'),
  ('Montagne', 'Neige', 'nature'),
  ('Musique', 'Danse', 'fête'),
  ('Roi', 'Château', 'royauté'),
  ('Café', 'Matin', 'quotidien'),
  ('Avion', 'Nuage', 'ciel'),
  ('Chocolat', 'Lait', 'nourriture'),
  ('Forêt', 'Loup', 'conte'),
  ('Pirate', 'Trésor', 'aventure'),
  ('Pluie', 'Parapluie', 'météo'),
  ('École', 'Crayon', 'éducation'),
  ('Hiver', 'Cheminée', 'saison'),
  ('Cinéma', 'Popcorn', 'loisirs'),
  ('Jardin', 'Fleur', 'nature'),
  ('Football', 'But', 'sport'),
  ('Mariage', 'Gâteau', 'fête'),
  ('Océan', 'Baleine', 'mer'),
  ('Vampire', 'Sang', 'horreur'),
  ('Paris', 'Tour', 'ville'),
  ('Bébé', 'Biberon', 'famille'),
  ('Guitare', 'Chanson', 'musique'),
  ('Espace', 'Fusée', 'science'),
  ('Clé', 'Porte', 'maison'),
  ('Pizza', 'Italie', 'pays'),
  ('Halloween', 'Citrouille', 'fête'),
  ('Diamant', 'Bague', 'bijoux')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2 : Exécuter la migration sur Supabase**

Instruction pour l'utilisateur : copier le contenu du fichier SQL et l'exécuter dans le SQL Editor du dashboard Supabase (https://supabase.com/dashboard). Vérifier que les 3 tables sont créées et que les seeds sont insérés.

De plus, créer le bucket `geo-images` dans Storage > New bucket :
- Nom : `geo-images`
- Public : oui
- Ajouter les policies RLS :
  - SELECT pour anon (lecture publique)
  - INSERT pour authenticated (écriture admin)

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/20260405_plan3_tables.sql
git commit -m "feat: add Plan 3 DB migration — draw_words, word_pairs, game_settings + seeds"
```

---

## Task 2 : Mettre à jour les types TypeScript

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1 : Ajouter les nouveaux types et event types**

Ajouter les interfaces `DrawWord`, `WordPair`, `GameSetting` et étendre `GameEventType` :

```ts
// Ajouter après l'interface Question existante :

export interface DrawWord {
  id: string
  word: string
  category: string | null
  created_at: string
}

export interface WordPair {
  id: string
  word_a: string
  word_b: string
  category: string | null
  created_at: string
}

export interface GameSetting {
  game_id: string
  enabled: boolean
  updated_at: string
}
```

Modifier `GameEventType` pour ajouter les nouveaux events :

```ts
export type GameEventType =
  | 'host:game_start'
  | 'host:game_go'
  | 'host:round_start'
  | 'host:round_end'
  | 'host:game_end'
  | 'host:team_assign'
  | 'host:config_update'
  | 'host:kick'
  | 'host:grid_state'       // Point Rush + Territory : état grille
  | 'host:rps_result'       // PFC : résultat d'une manche
  | 'host:draw_vote_phase'  // Draw & Guess : démarrer phase vote
  | 'host:draw_reveal'      // Draw & Guess : reveal final
  | 'player:answer'
  | 'player:tap'
  | 'player:motion_score'
  | 'player:ready'
  | 'player:grid_click'     // Point Rush : clic sur case
  | 'player:territory_click'// Territory : clic sur case
  | 'player:rps_choice'     // PFC : choix pierre/feuille/ciseau
  | 'player:vote'           // Draw & Guess : vote
  | 'player:drawing'        // Draw & Guess : envoi du dessin
```

Ajouter au `Session` interface :

```ts
// Ajouter dans l'interface Session existante, après games_order :
disabled_games: string[] | null
```

- [ ] **Step 2 : Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add Plan 3 types — DrawWord, WordPair, GameSetting + new event types"
```

---

## Task 3 : Services Supabase pour les nouvelles tables

**Files:**
- Create: `src/lib/supabase/draw-words.ts`
- Create: `src/lib/supabase/word-pairs.ts`
- Create: `src/lib/supabase/game-settings.ts`

- [ ] **Step 1 : Créer le service draw-words**

```ts
// src/lib/supabase/draw-words.ts
import { getSupabaseClient } from './client'
import { shuffleArray } from '@/lib/utils'
import type { DrawWord } from './types'

export async function fetchRandomWord(): Promise<DrawWord | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').select()
  if (!data || data.length === 0) return null
  return shuffleArray(data as DrawWord[])[0]
}

export async function fetchAllDrawWords(): Promise<DrawWord[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').select().order('created_at', { ascending: false })
  return (data ?? []) as DrawWord[]
}

export async function createDrawWord(word: string, category: string | null): Promise<DrawWord | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('draw_words').insert({ word, category }).select().single()
  return data as DrawWord | null
}

export async function updateDrawWord(id: string, word: string, category: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('draw_words').update({ word, category }).eq('id', id)
}

export async function deleteDrawWord(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('draw_words').delete().eq('id', id)
}
```

- [ ] **Step 2 : Créer le service word-pairs**

```ts
// src/lib/supabase/word-pairs.ts
import { getSupabaseClient } from './client'
import { shuffleArray } from '@/lib/utils'
import type { WordPair } from './types'

export async function fetchRandomPair(): Promise<WordPair | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').select()
  if (!data || data.length === 0) return null
  return shuffleArray(data as WordPair[])[0]
}

export async function fetchAllWordPairs(): Promise<WordPair[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').select().order('created_at', { ascending: false })
  return (data ?? []) as WordPair[]
}

export async function createWordPair(wordA: string, wordB: string, category: string | null): Promise<WordPair | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('word_pairs').insert({ word_a: wordA, word_b: wordB, category }).select().single()
  return data as WordPair | null
}

export async function updateWordPair(id: string, wordA: string, wordB: string, category: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('word_pairs').update({ word_a: wordA, word_b: wordB, category }).eq('id', id)
}

export async function deleteWordPair(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('word_pairs').delete().eq('id', id)
}
```

- [ ] **Step 3 : Créer le service game-settings**

```ts
// src/lib/supabase/game-settings.ts
import { getSupabaseClient } from './client'
import type { GameSetting } from './types'

export async function fetchGameSettings(): Promise<GameSetting[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.from('game_settings').select().order('game_id')
  return (data ?? []) as GameSetting[]
}

export async function fetchEnabledGameIds(): Promise<string[]> {
  const settings = await fetchGameSettings()
  return settings.filter(s => s.enabled).map(s => s.game_id)
}

export async function toggleGameSetting(gameId: string, enabled: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('game_settings').update({ enabled, updated_at: new Date().toISOString() }).eq('game_id', gameId)
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/lib/supabase/draw-words.ts src/lib/supabase/word-pairs.ts src/lib/supabase/game-settings.ts
git commit -m "feat: add Supabase services — draw-words, word-pairs, game-settings"
```

---

## Task 4 : GameSelector lobby + intégration game_settings dans startGame

**Files:**
- Create: `src/components/lobby/GameSelector.tsx`
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/app/lobby/[code]/page.tsx`

- [ ] **Step 1 : Créer le composant GameSelector**

```tsx
// src/components/lobby/GameSelector.tsx
'use client'

import { useState, useEffect } from 'react'
import { fetchEnabledGameIds } from '@/lib/supabase/game-settings'
import { getAllGames } from '@/games/registry'

interface GameSelectorProps {
  disabledGames: string[]
  onToggle: (gameId: string, disabled: boolean) => void
}

export function GameSelector({ disabledGames, onToggle }: GameSelectorProps) {
  const [enabledGlobal, setEnabledGlobal] = useState<string[]>([])

  useEffect(() => {
    fetchEnabledGameIds().then(setEnabledGlobal)
  }, [])

  const allGames = getAllGames()
  const visibleGames = allGames.filter(g => enabledGlobal.includes(g.id))

  if (visibleGames.length === 0) return null

  return (
    <div>
      <label className="text-sm font-bold text-fiesta-dark/80 block mb-2">Mini-jeux actifs</label>
      <div className="grid grid-cols-2 gap-2">
        {visibleGames.map(game => {
          const isDisabled = disabledGames.includes(game.id)
          return (
            <button
              key={game.id}
              onClick={() => onToggle(game.id, !isDisabled)}
              className={`flex items-center gap-2 p-2 rounded-xl border-2 text-sm font-bold transition-all ${
                isDisabled
                  ? 'border-gray-200 bg-gray-100 text-fiesta-dark/40 line-through'
                  : 'border-fiesta-orange/30 bg-white text-fiesta-dark'
              }`}
            >
              <span>{game.icon}</span>
              <span className="truncate">{game.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-fiesta-dark/50 mt-1">
        {visibleGames.length - disabledGames.length} jeux activés sur {visibleGames.length}
      </p>
    </div>
  )
}
```

- [ ] **Step 2 : Modifier useGameEngine — filtrer les jeux désactivés dans startGame**

Dans `src/hooks/useGameEngine.ts`, dans la fonction `startGame`, remplacer la ligne :

```ts
const gamesOrder = shuffleArray([...GAME_IDS]).slice(0, freshSession.total_rounds)
```

par :

```ts
// Filtrer les jeux désactivés (global + host)
const enabledIds = (await import('@/lib/supabase/game-settings').then(m => m.fetchEnabledGameIds()))
const hostDisabled = freshSession.disabled_games ?? []
const availableGames = GAME_IDS.filter(id => enabledIds.includes(id) && !hostDisabled.includes(id))
const gamesOrder = shuffleArray([...availableGames]).slice(0, freshSession.total_rounds)
```

- [ ] **Step 3 : Modifier lobby page — ajouter GameSelector pour le host**

Dans `src/app/lobby/[code]/page.tsx` :

1. Ajouter l'import :
```ts
import { GameSelector } from '@/components/lobby/GameSelector'
```

2. Ajouter un state pour disabled_games :
```ts
const [disabledGames, setDisabledGames] = useState<string[]>([])
```

3. Dans la fonction `handleStart`, avant `await startGame()`, persister `disabled_games` en DB :
```ts
await supabase.from('sessions').update({ ...updated, disabled_games: disabledGames.length > 0 ? disabledGames : null }).eq('id', session.id)
setSession({ ...session, ...updated, disabled_games: disabledGames.length > 0 ? disabledGames : null } as Session)
```

4. Dans le JSX du host (dans le bloc `{isHost && (...)}`), ajouter le `GameSelector` après le toggle "Afficher les réponses" :
```tsx
<GameSelector
  disabledGames={disabledGames}
  onToggle={(gameId, disabled) => {
    setDisabledGames(prev =>
      disabled ? [...prev, gameId] : prev.filter(id => id !== gameId)
    )
  }}
/>
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/lobby/GameSelector.tsx src/hooks/useGameEngine.ts src/app/lobby/[code]/page.tsx
git commit -m "feat: add game selector in lobby + filter disabled games in startGame"
```

---

## Task 5 : Installer Framer Motion

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Installer la dépendance**

```bash
npm install framer-motion
```

- [ ] **Step 2 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install framer-motion"
```

---

## Task 6 : Admin Panel CRUD complet

**Files:**
- Rewrite: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/dashboard/components/StatsOverview.tsx`
- Create: `src/app/admin/dashboard/components/QuestionList.tsx`
- Create: `src/app/admin/dashboard/components/QuestionForm.tsx`
- Create: `src/app/admin/dashboard/components/GeoGuessUploader.tsx`
- Create: `src/app/admin/dashboard/components/DrawWordList.tsx`
- Create: `src/app/admin/dashboard/components/WordPairList.tsx`
- Create: `src/app/admin/dashboard/components/GameSettingsPanel.tsx`

**Dépendances :** Tasks 1, 2, 3

Ce task est volumineux. L'agent implémenteur doit créer chaque composant un par un en suivant le style Fiesta existant (fond `bg-fiesta-bg`, `font-playful`, couleurs `fiesta-orange`, `fiesta-rose`, etc.). Voici les spécifications composant par composant.

- [ ] **Step 1 : Réécrire page.tsx — layout avec onglets**

```tsx
// src/app/admin/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { StatsOverview } from './components/StatsOverview'
import { QuestionList } from './components/QuestionList'
import { DrawWordList } from './components/DrawWordList'
import { WordPairList } from './components/WordPairList'
import { GameSettingsPanel } from './components/GameSettingsPanel'

type Tab = 'stats' | 'questions' | 'draw-words' | 'word-pairs' | 'game-settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'Vue d\'ensemble' },
  { id: 'questions', label: 'Questions' },
  { id: 'draw-words', label: 'Mots Dessin' },
  { id: 'word-pairs', label: 'Paires Mots' },
  { id: 'game-settings', label: 'Jeux' },
]

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('stats')

  return (
    <div className="min-h-screen bg-fiesta-bg p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-playful text-fiesta-orange mb-6">dolympia admin</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-2 ${
              tab === t.id
                ? 'border-fiesta-orange bg-fiesta-orange text-white'
                : 'border-gray-300 bg-white text-fiesta-dark hover:border-fiesta-orange/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsOverview />}
      {tab === 'questions' && <QuestionList />}
      {tab === 'draw-words' && <DrawWordList />}
      {tab === 'word-pairs' && <WordPairList />}
      {tab === 'game-settings' && <GameSettingsPanel />}

      <p className="text-fiesta-dark/40 text-xs mt-8">&copy; Daniel Gavriline &middot; v1.0.0</p>
    </div>
  )
}
```

- [ ] **Step 2 : Créer StatsOverview**

Composant qui fetch le count de questions par `game_type` et affiche des compteurs. Utilise `getSupabaseClient().from('questions').select('game_type')` puis compte en JS. Affiche aussi le nombre de `draw_words` et `word_pairs`.

- [ ] **Step 3 : Créer QuestionList**

Tableau avec :
- Filtre par `game_type` (select), `difficulty` (select), recherche texte dans `content`
- Pagination (20 par page)
- Boutons "Modifier" et "Supprimer" par ligne
- Bouton "Ajouter une question" qui ouvre `QuestionForm` en mode création
- La suppression demande confirmation (`window.confirm`)

State : `questions`, `filter`, `page`, `editingQuestion` (null ou Question pour édition), `showForm` (boolean).

Fetch via `fetchAllQuestions()` depuis `src/lib/supabase/questions.ts` (existe déjà).

- [ ] **Step 4 : Créer QuestionForm**

Formulaire adaptatif :
- Champ commun : `game_type` (select parmi quiz, true-false, order-logic, geo-guess), `difficulty` (select easy/medium/hard), `category` (text)
- Si `quiz` : `content` (textarea), `options` (4 inputs texte), `answer` (select parmi les 4 options)
- Si `true-false` : `content` (textarea), `answer` (toggle true/false)
- Si `order-logic` : `content` (textarea), `options` (inputs dynamiques, bouton + pour ajouter), `answer` (même liste = l'ordre correct)
- Si `geo-guess` : `GeoGuessUploader` pour l'image, `options` (4 inputs), `answer` (select parmi les 4)

Boutons : "Enregistrer" / "Annuler".
Insert/update via `getSupabaseClient().from('questions').insert(...)` ou `.update(...)`.

- [ ] **Step 5 : Créer GeoGuessUploader**

Composant :
- Input type `file` (accept image/*)
- Preview de l'image sélectionnée (ou de l'URL existante en mode édition)
- Au submit du formulaire parent : upload vers `supabase.storage.from('geo-images').upload('${crypto.randomUUID()}.${ext}', file)`
- Retourne l'URL publique via `getPublicUrl()`
- Stocke l'URL dans le champ `content` de la question

- [ ] **Step 6 : Créer DrawWordList**

Liste simple :
- Affiche tous les mots avec catégorie
- Bouton "Ajouter" → inline form (input word + input category + bouton save)
- Bouton "Supprimer" par mot (avec confirmation)
- Édition inline (cliquer sur le mot pour modifier)

Utilise les fonctions de `src/lib/supabase/draw-words.ts`.

- [ ] **Step 7 : Créer WordPairList**

Même pattern que DrawWordList mais avec word_a + word_b + category.

Utilise les fonctions de `src/lib/supabase/word-pairs.ts`.

- [ ] **Step 8 : Créer GameSettingsPanel**

Liste des 15 jeux avec un toggle ON/OFF chacun :
- Fetch `fetchGameSettings()` au mount
- Toggle → `toggleGameSetting(gameId, newValue)`
- Affiche l'icône + le label du jeu (depuis le registry `getAllGames()`)
- Si un jeu est désactivé, il apparaît grisé

- [ ] **Step 9 : Commit**

```bash
git add src/app/admin/dashboard/
git commit -m "feat: implement admin panel CRUD — questions, draw words, word pairs, game settings"
```

---

## Task 7 : Animations Framer Motion

**Files:**
- Modify: `src/components/game/RoundTransition.tsx`
- Modify: `src/components/game/GameContainer.tsx`
- Modify: `src/components/lobby/PlayerList.tsx`
- Modify: `src/app/results/[code]/page.tsx`

**Dépendances :** Task 5

- [ ] **Step 1 : RoundTransition — scores en cascade stagger**

Envelopper la liste des scores dans `<AnimatePresence>` + `<motion.div>` avec stagger :

```tsx
import { motion, AnimatePresence } from 'framer-motion'

// Remplacer le div de chaque score :
<AnimatePresence>
  {sorted.map((p, i) => (
    <motion.div
      key={p.id}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1, duration: 0.3 }}
      className={`flex items-center justify-between p-3 rounded-xl border-2 ${
        p.id === localPlayer?.id
          ? 'border-fiesta-orange bg-fiesta-orange/10'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* ... contenu identique ... */}
    </motion.div>
  ))}
</AnimatePresence>
```

- [ ] **Step 2 : GameContainer — fade-in entre les jeux**

Envelopper le contenu du jeu dans une `motion.div` avec `key={currentRound.id}` pour déclencher une animation à chaque changement de round :

```tsx
import { motion, AnimatePresence } from 'framer-motion'

// Dans le return, envelopper le composant du jeu :
<AnimatePresence mode="wait">
  <motion.div
    key={currentRound.id}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className="flex-1 p-4"
  >
    {/* gameModule.Component ... */}
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 3 : PlayerList — slide-in des joueurs**

Envelopper chaque joueur dans `motion.div` :

```tsx
import { motion } from 'framer-motion'

// Chaque div de joueur devient :
<motion.div
  key={p.id}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.05, duration: 0.2 }}
  className={`flex items-center ...`}
>
```

- [ ] **Step 4 : Results page — podium animé**

Animer les colonnes du podium (scale-up de bas en haut) :

```tsx
import { motion } from 'framer-motion'

// Chaque colonne du podium :
<motion.div
  key={p.id}
  initial={{ scaleY: 0, opacity: 0 }}
  animate={{ scaleY: 1, opacity: 1 }}
  transition={{ delay: 0.3 + i * 0.2, duration: 0.5, type: 'spring' }}
  style={{ transformOrigin: 'bottom' }}
  className="flex flex-col items-center flex-1"
>
```

Pour les confettis du 1er : ajouter un simple burst CSS (keyframe animation) ou une `motion.div` avec des emojis 🎉 qui s'animent en scatter. Pas besoin de librairie confetti — rester simple.

- [ ] **Step 5 : Commit**

```bash
git add src/components/game/RoundTransition.tsx src/components/game/GameContainer.tsx src/components/lobby/PlayerList.tsx src/app/results/[code]/page.tsx
git commit -m "feat: add Framer Motion animations — transitions, lobby, podium"
```

---

## Task 8 : Mini-jeu — Mot Commun (`common-word`)

**Files:**
- Create: `src/games/common-word/index.ts`
- Create: `src/games/common-word/CommonWordGame.tsx`

**Dépendances :** Tasks 1, 2, 3

- [ ] **Step 1 : Créer le module GameModule**

```ts
// src/games/common-word/index.ts
import type { GameModule } from '../types'
import { CommonWordGame } from './CommonWordGame'
import { fetchRandomPair } from '@/lib/supabase/word-pairs'

export const commonWordModule: GameModule = {
  id: 'common-word',
  label: 'Mot Commun',
  icon: '🤝',
  defaultDuration: 15,
  minPlayers: 2,
  generateConfig: async function(questions) {
    const pair = await fetchRandomPair()
    return {
      duration: 15,
      wordA: pair?.word_a ?? 'Soleil',
      wordB: pair?.word_b ?? 'Plage',
    }
  } as unknown as GameModule['generateConfig'],
  // computeScore retourne 0 — le scoring réel est dans endRound (besoin de toutes les soumissions)
  computeScore() {
    return 0
  },
  Component: CommonWordGame,
}
```

**Note :** `generateConfig` est async ici. Le `useGameEngine.startRound` doit `await` le résultat. Actuellement `generateConfig` est sync dans le type, mais on cast ici car `startRound` fait déjà un await sur tout le flow. L'alternative propre serait de modifier le type `GameModule.generateConfig` pour être `async`, mais cela impacterait les 10 jeux existants. Le cast est acceptable.

**IMPORTANT :** Le scoring réel pour ce jeu se fait dans `endRound` (Task 13), pas dans `computeScore`. Le host compare toutes les soumissions et attribue 20pts par match.

- [ ] **Step 2 : Créer le composant CommonWordGame**

```tsx
// src/games/common-word/CommonWordGame.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'

export function CommonWordGame({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef(input)
  inputRef.current = input

  const wordA = (config as { wordA: string }).wordA
  const wordB = (config as { wordB: string }).wordB

  // Auto-submit quand le temps est écoulé
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submitted) {
      setSubmitted(true)
      onSubmit(inputRef.current.trim().toLowerCase() || '')
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit() {
    if (submitted || disabled) return
    const value = input.trim().toLowerCase()
    if (!value) return
    setSubmitted(true)
    onSubmit(value)
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full">
      <p className="text-sm text-fiesta-dark/60 font-medium">Quel mot relie ces deux mots ?</p>

      <div className="flex items-center gap-4">
        <span className="text-2xl font-playful text-fiesta-orange">{wordA}</span>
        <span className="text-fiesta-dark/40">+</span>
        <span className="text-2xl font-playful text-fiesta-rose">{wordB}</span>
      </div>

      {submitted ? (
        <div className="bg-white rounded-2xl px-6 py-4 border-2 border-emerald-400 text-center">
          <p className="text-emerald-600 font-bold">Réponse envoyée !</p>
          <p className="text-lg font-playful text-fiesta-dark mt-1">{input || '(vide)'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Tape un mot..."
            autoFocus
            className="border-2 border-gray-300 rounded-xl px-4 py-3 text-lg text-center font-bold text-fiesta-dark focus:outline-none focus:border-fiesta-orange"
            disabled={disabled}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="bg-fiesta-orange text-white font-bold rounded-full py-3 shadow-btn-orange active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/games/common-word/
git commit -m "feat: add common-word mini-game — type your linking word"
```

---

## Task 9 : Mini-jeu — Pierre-Feuille-Ciseaux (`rock-paper-scissors`)

**Files:**
- Create: `src/games/rock-paper-scissors/index.ts`
- Create: `src/games/rock-paper-scissors/RPSGame.tsx`

**Dépendances :** Task 2

- [ ] **Step 1 : Créer le module GameModule**

```ts
// src/games/rock-paper-scissors/index.ts
import type { GameModule, PlayerSubmission, RoundConfig } from '../types'
import { RPSGame } from './RPSGame'

export const rpsModule: GameModule = {
  id: 'rock-paper-scissors',
  label: 'Pierre-Feuille-Ciseaux',
  icon: '✊',
  defaultDuration: 30,
  minPlayers: 2,
  generateConfig() {
    // Les paires sont générées par le host dans startRound, basées sur les joueurs actuels
    // generateConfig est appelé avant que les paires ne soient formées
    // Les paires seront injectées dans la config par le host dans endRound/startRound customisé
    return { duration: 30, pairs: [], soloPlayer: null }
  },
  computeScore(submission: PlayerSubmission, config: RoundConfig) {
    // Le score est calculé en temps réel par le host pendant les manches PFC
    // La valeur soumise est le score final déjà calculé
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: RPSGame,
}
```

- [ ] **Step 2 : Créer le composant RPSGame**

Le composant est complexe car il gère un duel en best of 3 avec broadcasts temps réel. Voici la structure :

```tsx
// src/games/rock-paper-scissors/RPSGame.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useChannel } from '@/hooks/useChannel'
import { useGameStore } from '@/store/game.store'
import { useSessionStore } from '@/store/session.store'
import type { GameProps } from '../types'

type Choice = 'rock' | 'paper' | 'scissors'
type RoundResult = { winner: string | null; choiceA: Choice; choiceB: Choice }

const CHOICES: { id: Choice; emoji: string; label: string }[] = [
  { id: 'rock', emoji: '🪨', label: 'Pierre' },
  { id: 'paper', emoji: '📄', label: 'Feuille' },
  { id: 'scissors', emoji: '✂️', label: 'Ciseaux' },
]

const SOLO_MESSAGES = [
  'Médaille de la solitude 🏅',
  'Champion par forfait ! 🏆',
  'Invaincu(e) techniquement 💪',
  'Le(la) plus fort(e)... par défaut 😅',
]

function getWinner(a: Choice, b: Choice): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw'
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'a'
  return 'b'
}

export function RPSGame({ config, playerId, timeLeft, onSubmit, isHost, disabled }: GameProps) {
  const { code } = useParams<{ code: string }>()
  const { players } = useGameStore()

  const pairs: [string, string][] = (config as { pairs: [string, string][] }).pairs ?? []
  const soloPlayer: string | null = (config as { soloPlayer: string | null }).soloPlayer

  // Trouver mon adversaire
  const myPair = pairs.find(([a, b]) => a === playerId || b === playerId)
  const opponentId = myPair ? (myPair[0] === playerId ? myPair[1] : myPair[0]) : null
  const opponent = players.find(p => p.id === opponentId)

  const [currentManche, setCurrentManche] = useState(0) // 0, 1, 2
  const [myChoice, setMyChoice] = useState<Choice | null>(null)
  const [mancheCountdown, setMancheCountdown] = useState(5)
  const [results, setResults] = useState<RoundResult[]>([])
  const [myWins, setMyWins] = useState(0)
  const [opponentWins, setOpponentWins] = useState(0)
  const [finished, setFinished] = useState(false)
  const [waitingOpponent, setWaitingOpponent] = useState(false)

  // Host tracking : tous les choix reçus pour cette manche
  const choicesRef = useRef<Map<string, Map<number, Choice>>>(new Map()) // playerId → manche → choix
  const mancheTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scores finaux pour chaque joueur (host seulement)
  const scoresRef = useRef<Map<string, number>>(new Map())

  const isSolo = soloPlayer === playerId

  const { send } = useChannel(code, {
    'player:rps_choice': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { playerId: string; manche: number; choice: Choice }
      if (!choicesRef.current.has(p.playerId)) choicesRef.current.set(p.playerId, new Map())
      choicesRef.current.get(p.playerId)!.set(p.manche, p.choice)

      // Vérifier si les deux joueurs de chaque paire ont choisi pour cette manche
      for (const pair of pairs) {
        const [a, b] = pair
        const choiceA = choicesRef.current.get(a)?.get(p.manche)
        const choiceB = choicesRef.current.get(b)?.get(p.manche)
        if (choiceA && choiceB) {
          const winner = getWinner(choiceA, choiceB)
          const winnerId = winner === 'a' ? a : winner === 'b' ? b : null
          send('host:rps_result', { manche: p.manche, pairA: a, pairB: b, choiceA, choiceB, winner: winnerId })
        }
      }
    }, [isHost, pairs, send]),

    'host:rps_result': useCallback((payload: unknown) => {
      const p = payload as { manche: number; pairA: string; pairB: string; choiceA: Choice; choiceB: Choice; winner: string | null }
      // Est-ce que ce résultat me concerne ?
      if (p.pairA !== playerId && p.pairB !== playerId) return

      const opChoice = p.pairA === playerId ? p.choiceB : p.choiceA
      setResults(prev => [...prev, { winner: p.winner, choiceA: p.choiceA, choiceB: p.choiceB }])

      if (p.winner === playerId) {
        setMyWins(prev => prev + 1)
      } else if (p.winner !== null) {
        setOpponentWins(prev => prev + 1)
      }

      // Préparer la manche suivante
      setMyChoice(null)
      setWaitingOpponent(false)
      setMancheCountdown(5)
    }, [playerId]),
  })

  // Solo player — score automatique + message
  useEffect(() => {
    if (isSolo && !finished) {
      setFinished(true)
      onSubmit(40)
    }
  }, [isSolo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown par manche
  useEffect(() => {
    if (finished || isSolo || !myPair) return
    if (mancheTimerRef.current) clearInterval(mancheTimerRef.current)

    setMancheCountdown(5)
    mancheTimerRef.current = setInterval(() => {
      setMancheCountdown(prev => {
        if (prev <= 1) {
          // Temps écoulé, auto-submit si pas de choix
          if (!myChoice) {
            // Ne pas choisir = perdre cette manche (le host résoudra avec timeout)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (mancheTimerRef.current) clearInterval(mancheTimerRef.current) }
  }, [currentManche, finished, isSolo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Vérifier fin du best of 3
  useEffect(() => {
    if (finished) return
    const totalManchesPlayed = results.length

    // Victoire anticipée (2-0)
    if (myWins >= 2 || opponentWins >= 2 || totalManchesPlayed >= 3) {
      setFinished(true)
      const score = (myWins * 20) + (myWins > opponentWins ? 10 : 0)
      onSubmit(score)
      return
    }

    // Passer à la manche suivante
    if (totalManchesPlayed > currentManche) {
      setCurrentManche(totalManchesPlayed)
    }
  }, [results.length, myWins, opponentWins]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChoice(choice: Choice) {
    if (myChoice || finished || disabled) return
    setMyChoice(choice)
    setWaitingOpponent(true)
    send('player:rps_choice', { playerId, manche: currentManche, choice })
  }

  // === RENDU ===

  if (isSolo) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <span className="text-6xl">😎</span>
        <p className="text-xl font-playful text-fiesta-orange text-center">
          {SOLO_MESSAGES[Math.floor(Math.random() * SOLO_MESSAGES.length)]}
        </p>
        <p className="text-fiesta-dark/60">+40 points de compensation</p>
      </div>
    )
  }

  if (finished) {
    const won = myWins > opponentWins
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <span className="text-5xl">{won ? '🎉' : '😢'}</span>
        <p className="text-xl font-playful text-fiesta-dark">
          {won ? 'Victoire !' : myWins === opponentWins ? 'Égalité !' : 'Défaite...'}
        </p>
        <p className="text-fiesta-dark/60">{myWins} - {opponentWins}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full">
      <div className="text-center">
        <p className="text-sm text-fiesta-dark/60">Manche {currentManche + 1}/3 contre</p>
        <p className="text-lg font-playful text-fiesta-rose">{opponent?.pseudo ?? '???'}</p>
        <p className="text-xs text-fiesta-dark/50">{myWins} - {opponentWins}</p>
      </div>

      <div className="text-3xl font-playful text-fiesta-orange">{mancheCountdown}</div>

      {waitingOpponent ? (
        <p className="text-fiesta-dark/60 animate-pulse">En attente de {opponent?.pseudo}...</p>
      ) : (
        <div className="flex gap-4">
          {CHOICES.map(c => (
            <button
              key={c.id}
              onClick={() => handleChoice(c.id)}
              disabled={!!myChoice || disabled}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-fiesta-orange hover:bg-fiesta-orange/10 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-4xl">{c.emoji}</span>
              <span className="text-xs font-bold text-fiesta-dark">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-2 mt-2">
          {results.map((r, i) => (
            <span key={i} className={`text-lg ${r.winner === playerId ? 'text-emerald-500' : r.winner === null ? 'text-gray-400' : 'text-red-400'}`}>
              {r.winner === playerId ? '✓' : r.winner === null ? '—' : '✗'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/games/rock-paper-scissors/
git commit -m "feat: add rock-paper-scissors mini-game — duel best of 3"
```

---

## Task 10 : Mini-jeu — Point Rush (`point-rush`)

**Files:**
- Create: `src/games/point-rush/index.ts`
- Create: `src/games/point-rush/PointRushGame.tsx`

**Dépendances :** Task 2

- [ ] **Step 1 : Créer le module GameModule**

```ts
// src/games/point-rush/index.ts
import type { GameModule, PlayerSubmission, RoundConfig } from '../types'
import { PointRushGame } from './PointRushGame'

interface Spawn {
  id: string
  row: number
  col: number
  type: '+5' | '+2' | '+1' | '÷2'
  spawnAt: number  // ms offset depuis le début du round
  expiresAt: number
}

function generateSpawns(): Spawn[] {
  const spawns: Spawn[] = []
  const rows = 8, cols = 6
  const duration = 20000 // 20s en ms
  const interval = 800 // spawn toutes les 800ms
  let id = 0

  for (let t = 0; t < duration; t += interval) {
    const row = Math.floor(Math.random() * rows)
    const col = Math.floor(Math.random() * cols)
    const rand = Math.random()
    // Distribution : +1 (50%), +2 (30%), +5 (12%), ÷2 (8%)
    const type: Spawn['type'] = rand < 0.5 ? '+1' : rand < 0.8 ? '+2' : rand < 0.92 ? '+5' : '÷2'
    spawns.push({
      id: `s${id++}`,
      row, col, type,
      spawnAt: t,
      expiresAt: t + 2000,
    })
  }
  return spawns
}

export const pointRushModule: GameModule = {
  id: 'point-rush',
  label: 'Point Rush',
  icon: '💎',
  defaultDuration: 20,
  minPlayers: 2,
  generateConfig() {
    return {
      duration: 20,
      gridSize: { rows: 8, cols: 6 },
      spawns: generateSpawns(),
    }
  },
  computeScore(submission: PlayerSubmission) {
    // Score déjà calculé par le host
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: PointRushGame,
}
```

- [ ] **Step 2 : Créer le composant PointRushGame**

```tsx
// src/games/point-rush/PointRushGame.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useChannel } from '@/hooks/useChannel'
import { useSessionStore } from '@/store/session.store'
import type { GameProps } from '../types'

interface Spawn {
  id: string; row: number; col: number
  type: '+5' | '+2' | '+1' | '÷2'
  spawnAt: number; expiresAt: number
}

interface CellState {
  spawn: Spawn | null
  takenBy: string | null
}

const TYPE_STYLES: Record<string, string> = {
  '+5': 'bg-emerald-600 text-white font-bold',
  '+2': 'bg-emerald-400 text-white font-bold',
  '+1': 'bg-emerald-200 text-emerald-800 font-bold',
  '÷2': 'bg-red-500 text-white font-bold',
}

export function PointRushGame({ config, playerId, timeLeft, onSubmit, isHost, disabled }: GameProps) {
  const { code } = useParams<{ code: string }>()

  const gridSize = (config as { gridSize: { rows: number; cols: number } }).gridSize
  const spawns: Spawn[] = (config as { spawns: Spawn[] }).spawns ?? []

  const [activeSpawns, setActiveSpawns] = useState<Map<string, Spawn>>(new Map())
  const [takenSpawns, setTakenSpawns] = useState<Set<string>>(new Set())
  const [myScore, setMyScore] = useState(0)
  const myScoreRef = useRef(0)
  const startTimeRef = useRef(Date.now())

  // Host state
  const claimedRef = useRef<Map<string, string>>(new Map()) // spawnId → playerId
  const playerScoresRef = useRef<Map<string, number>>(new Map())

  const { send } = useChannel(code, {
    'player:grid_click': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { playerId: string; spawnId: string }
      // Premier arrivé gagne
      if (claimedRef.current.has(p.spawnId)) return
      claimedRef.current.set(p.spawnId, p.playerId)

      // Calculer le score
      const spawn = spawns.find(s => s.id === p.spawnId)
      if (!spawn) return
      const current = playerScoresRef.current.get(p.playerId) ?? 0
      let newScore: number
      if (spawn.type === '÷2') {
        newScore = Math.floor(current / 2)
      } else {
        newScore = current + parseInt(spawn.type)
      }
      playerScoresRef.current.set(p.playerId, newScore)
    }, [isHost, spawns]),

    'host:grid_state': useCallback((payload: unknown) => {
      const p = payload as { claimed: Record<string, string>; scores: Record<string, number> }
      // Mettre à jour les spawns pris
      setTakenSpawns(new Set(Object.keys(p.claimed)))
      // Mettre à jour mon score
      const score = p.scores[playerId] ?? 0
      setMyScore(score)
      myScoreRef.current = score
    }, [playerId]),
  })

  // Spawn timer : afficher les points au bon moment
  useEffect(() => {
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const active = new Map<string, Spawn>()
      for (const s of spawns) {
        if (elapsed >= s.spawnAt && elapsed < s.expiresAt && !takenSpawns.has(s.id)) {
          active.set(s.id, s)
        }
      }
      setActiveSpawns(active)
    }, 100)
    return () => clearInterval(interval)
  }, [spawns, takenSpawns])

  // Host : broadcast l'état toutes les 500ms
  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
      const claimed: Record<string, string> = {}
      claimedRef.current.forEach((pid, sid) => { claimed[sid] = pid })
      const scores: Record<string, number> = {}
      playerScoresRef.current.forEach((s, pid) => { scores[pid] = s })
      send('host:grid_state', { claimed, scores })
    }, 500)
    return () => clearInterval(interval)
  }, [isHost, send])

  // Auto-submit score final quand le temps est écoulé
  useEffect(() => {
    if (disabled || timeLeft <= 0) {
      onSubmit(myScoreRef.current)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(spawn: Spawn) {
    if (disabled || takenSpawns.has(spawn.id)) return
    // Optimisme local
    setTakenSpawns(prev => new Set([...prev, spawn.id]))
    if (spawn.type === '÷2') {
      const newScore = Math.floor(myScoreRef.current / 2)
      setMyScore(newScore)
      myScoreRef.current = newScore
    } else {
      const pts = parseInt(spawn.type)
      setMyScore(prev => prev + pts)
      myScoreRef.current += pts
    }
    send('player:grid_click', { playerId, spawnId: spawn.id })
  }

  // Rendu de la grille
  const cells: (Spawn | null)[][] = Array.from({ length: gridSize.rows }, () =>
    Array(gridSize.cols).fill(null)
  )
  activeSpawns.forEach(spawn => {
    cells[spawn.row][spawn.col] = spawn
  })

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className="text-center">
        <p className="text-2xl font-playful text-fiesta-orange">{myScore} pts</p>
      </div>

      <div
        className="grid gap-1 w-full max-w-sm aspect-[3/4]"
        style={{ gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`, gridTemplateRows: `repeat(${gridSize.rows}, 1fr)` }}
      >
        {cells.flat().map((spawn, i) => (
          <button
            key={i}
            onClick={() => spawn && handleClick(spawn)}
            disabled={!spawn || disabled}
            className={`rounded-lg border border-gray-200 flex items-center justify-center text-xs transition-all ${
              spawn ? `${TYPE_STYLES[spawn.type]} active:scale-90 cursor-pointer` : 'bg-gray-50'
            }`}
          >
            {spawn?.type ?? ''}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/games/point-rush/
git commit -m "feat: add point-rush mini-game — shared grid with real-time scoring"
```

---

## Task 11 : Mini-jeu — Territory (`territory`)

**Files:**
- Create: `src/games/territory/index.ts`
- Create: `src/games/territory/TerritoryGame.tsx`

**Dépendances :** Task 2

- [ ] **Step 1 : Créer le module GameModule**

```ts
// src/games/territory/index.ts
import type { GameModule, PlayerSubmission } from '../types'
import { TerritoryGame } from './TerritoryGame'

const PLAYER_COLORS = [
  '#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

export const territoryModule: GameModule = {
  id: 'territory',
  label: 'Territory',
  icon: '🗺️',
  defaultDuration: 20,
  minPlayers: 2,
  generateConfig(questions, players) {
    // players n'est pas passé par le contrat actuel, on le gère via le store dans le composant
    return {
      duration: 20,
      gridSize: 10,
      playerColors: {} as Record<string, string>, // sera rempli par le host dans startRound customisé
    }
  },
  computeScore(submission: PlayerSubmission) {
    const cellCount = submission.value as number
    return typeof cellCount === 'number' ? cellCount * 3 : 0
  },
  Component: TerritoryGame,
}

export { PLAYER_COLORS }
```

- [ ] **Step 2 : Créer le composant TerritoryGame**

```tsx
// src/games/territory/TerritoryGame.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useChannel } from '@/hooks/useChannel'
import { useGameStore } from '@/store/game.store'
import type { GameProps } from '../types'

const PLAYER_COLORS = [
  '#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6',
]

export function TerritoryGame({ config, playerId, timeLeft, onSubmit, isHost, disabled }: GameProps) {
  const { code } = useParams<{ code: string }>()
  const { players } = useGameStore()
  const gridSize = (config as { gridSize: number }).gridSize ?? 10
  const totalCells = gridSize * gridSize

  // Assigner couleurs aux joueurs (déterministe par index)
  const playerColorMap = useRef<Record<string, string>>({})
  useEffect(() => {
    const map: Record<string, string> = {}
    players.forEach((p, i) => { map[p.id] = PLAYER_COLORS[i % PLAYER_COLORS.length] })
    playerColorMap.current = map
  }, [players])

  const [grid, setGrid] = useState<(string | null)[]>(Array(totalCells).fill(null))
  const gridRef = useRef<(string | null)[]>(Array(totalCells).fill(null))

  // Host: grille authoritative
  const hostGridRef = useRef<(string | null)[]>(Array(totalCells).fill(null))

  const { send } = useChannel(code, {
    'player:territory_click': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { playerId: string; cellIndex: number }
      if (p.cellIndex < 0 || p.cellIndex >= totalCells) return
      // Dernière écriture gagne (pas de protection)
      if (hostGridRef.current[p.cellIndex] === p.playerId) return // déjà à moi
      hostGridRef.current[p.cellIndex] = p.playerId
    }, [isHost, totalCells]),

    'host:grid_state': useCallback((payload: unknown) => {
      const p = payload as { grid: (string | null)[] }
      gridRef.current = p.grid
      setGrid([...p.grid])
    }, []),
  })

  // Host broadcast l'état toutes les 500ms
  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
      send('host:grid_state', { grid: hostGridRef.current })
    }, 500)
    return () => clearInterval(interval)
  }, [isHost, send])

  // Auto-submit à la fin
  useEffect(() => {
    if (disabled || timeLeft <= 0) {
      const myCells = gridRef.current.filter(id => id === playerId).length
      onSubmit(myCells)
    }
  }, [disabled, timeLeft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick(index: number) {
    if (disabled || grid[index] === playerId) return
    // Optimisme local
    const newGrid = [...gridRef.current]
    newGrid[index] = playerId
    gridRef.current = newGrid
    setGrid(newGrid)
    send('player:territory_click', { playerId, cellIndex: index })
  }

  const myColor = playerColorMap.current[playerId] ?? '#FF6B35'
  const myCells = grid.filter(id => id === playerId).length

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: myColor }} />
          <span className="font-bold text-fiesta-dark">{myCells} cases</span>
        </div>
        <span className="text-fiesta-dark/40">= {myCells * 3} pts</span>
      </div>

      <div
        className="grid gap-0.5 w-full max-w-sm aspect-square"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((owner, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={disabled}
            className="aspect-square rounded-sm border border-gray-100 transition-colors active:scale-95"
            style={{
              backgroundColor: owner ? (playerColorMap.current[owner] ?? '#ccc') : '#f9fafb',
              opacity: owner === playerId ? 1 : owner ? 0.7 : 1,
            }}
          />
        ))}
      </div>

      {/* Légende joueurs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
            <span className={p.id === playerId ? 'font-bold' : 'text-fiesta-dark/60'}>{p.pseudo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/games/territory/
git commit -m "feat: add territory mini-game — capture grid squares in real-time"
```

---

## Task 12 : Mini-jeu — Draw & Guess (`draw-guess`)

**Files:**
- Create: `src/games/draw-guess/index.ts`
- Create: `src/games/draw-guess/DrawCanvas.tsx`
- Create: `src/games/draw-guess/DrawGuessGame.tsx`

**Dépendances :** Tasks 1, 2, 3

- [ ] **Step 1 : Créer le module GameModule**

```ts
// src/games/draw-guess/index.ts
import type { GameModule, PlayerSubmission } from '../types'
import { DrawGuessGame } from './DrawGuessGame'
import { fetchRandomWord } from '@/lib/supabase/draw-words'

export const drawGuessModule: GameModule = {
  id: 'draw-guess',
  label: 'Draw & Guess',
  icon: '🎨',
  defaultDuration: 60,
  minPlayers: 2,
  generateConfig: async function() {
    const word = await fetchRandomWord()
    return {
      duration: 60,
      word: word?.word ?? 'Chat',
      voteDuration: 8,
    }
  } as unknown as GameModule['generateConfig'],
  computeScore(submission: PlayerSubmission) {
    // Score = nombre de votes reçus × 25 + bonus si plus voté
    // Calculé dans endRound custom (Task 13)
    const val = submission.value as number
    return typeof val === 'number' ? val : 0
  },
  Component: DrawGuessGame,
}
```

- [ ] **Step 2 : Créer le composant DrawCanvas**

```tsx
// src/games/draw-guess/DrawCanvas.tsx
'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

export interface Stroke {
  points: [number, number][]
}

interface DrawCanvasProps {
  width?: number
  height?: number
  disabled?: boolean
  onStrokesChange?: (strokes: Stroke[]) => void
  replayStrokes?: Stroke[] // pour le timelapse
  replaySpeed?: number // multiplicateur de vitesse
}

export function DrawCanvas({ width = 300, height = 300, disabled, onStrokesChange, replayStrokes, replaySpeed = 10 }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<[number, number][]>([])

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent): [number, number] => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return [
      (clientX - rect.left) / rect.width,
      (clientY - rect.top) / rect.height,
    ]
  }, [])

  function drawAll(strokes: Stroke[]) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0] * canvas.width, stroke.points[i][1] * canvas.height)
      }
      ctx.stroke()
    }
  }

  // Mode replay
  useEffect(() => {
    if (!replayStrokes) return
    let cancelled = false
    const allPoints: { strokeIdx: number; pointIdx: number }[] = []
    replayStrokes.forEach((s, si) => s.points.forEach((_, pi) => allPoints.push({ strokeIdx: si, pointIdx: pi })))

    const totalPoints = allPoints.length
    const intervalMs = 5000 / Math.max(totalPoints, 1) // 5s total pour le timelapse
    let current = 0

    const interval = setInterval(() => {
      if (cancelled || current >= totalPoints) { clearInterval(interval); return }
      current += replaySpeed
      const visibleStrokes = replayStrokes.map((s, si) => ({
        points: s.points.filter((_, pi) => {
          const idx = allPoints.findIndex(a => a.strokeIdx === si && a.pointIdx === pi)
          return idx < current
        }),
      })).filter(s => s.points.length > 0)
      drawAll(visibleStrokes)
    }, intervalMs)

    return () => { cancelled = true; clearInterval(interval) }
  }, [replayStrokes, replaySpeed])

  function handleStart(e: React.TouchEvent | React.MouseEvent) {
    if (disabled || replayStrokes) return
    e.preventDefault()
    isDrawingRef.current = true
    currentStrokeRef.current = [getPos(e)]
  }

  function handleMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawingRef.current || disabled || replayStrokes) return
    e.preventDefault()
    currentStrokeRef.current.push(getPos(e))
    drawAll([...strokesRef.current, { points: currentStrokeRef.current }])
  }

  function handleEnd() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current.push({ points: [...currentStrokeRef.current] })
      onStrokesChange?.([...strokesRef.current])
    }
    currentStrokeRef.current = []
  }

  function handleClear() {
    strokesRef.current = []
    onStrokesChange?.([])
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-gray-300 rounded-xl bg-white touch-none"
        style={{ width: '100%', maxWidth: width, aspectRatio: `${width}/${height}` }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {!disabled && !replayStrokes && (
        <button onClick={handleClear} className="text-sm text-fiesta-dark/60 hover:text-fiesta-rose font-medium">
          Effacer
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Créer le composant DrawGuessGame**

Le composant gère 3 phases internes : dessin → vote → reveal.

```tsx
// src/games/draw-guess/DrawGuessGame.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useChannel } from '@/hooks/useChannel'
import { useGameStore } from '@/store/game.store'
import { DrawCanvas, type Stroke } from './DrawCanvas'
import type { GameProps } from '../types'

type Phase = 'drawing' | 'voting' | 'reveal'

interface Drawing {
  playerId: string
  strokes: Stroke[]
}

export function DrawGuessGame({ config, playerId, timeLeft, onSubmit, isHost, disabled }: GameProps) {
  const { code } = useParams<{ code: string }>()
  const { players } = useGameStore()

  const word = (config as { word: string }).word
  const voteDuration = (config as { voteDuration: number }).voteDuration ?? 8

  const [phase, setPhase] = useState<Phase>('drawing')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const strokesRef = useRef<Stroke[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [currentDrawingIdx, setCurrentDrawingIdx] = useState(0)
  const [votes, setVotes] = useState<Record<string, number>>({}) // playerId → vote count
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set()) // playerIds I voted for
  const [voteTimer, setVoteTimer] = useState(voteDuration)
  const [revealData, setRevealData] = useState<{ playerId: string; pseudo: string; votes: number }[]>([])

  // Host: collect drawings and votes
  const drawingsRef = useRef<Drawing[]>([])
  const votesRef = useRef<Map<string, number>>(new Map())

  const { send } = useChannel(code, {
    'player:drawing': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { playerId: string; strokes: Stroke[] }
      drawingsRef.current.push(p)
    }, [isHost]),

    'host:draw_vote_phase': useCallback((payload: unknown) => {
      const p = payload as { drawings: Drawing[] }
      setDrawings(p.drawings)
      setPhase('voting')
      setCurrentDrawingIdx(0)
      setVoteTimer(voteDuration)
    }, [voteDuration]),

    'player:vote': useCallback((payload: unknown) => {
      if (!isHost) return
      const p = payload as { targetPlayerId: string }
      const current = votesRef.current.get(p.targetPlayerId) ?? 0
      votesRef.current.set(p.targetPlayerId, current + 1)
    }, [isHost]),

    'host:draw_reveal': useCallback((payload: unknown) => {
      const p = payload as { results: { playerId: string; pseudo: string; votes: number }[]; scores: Record<string, number> }
      setRevealData(p.results)
      setPhase('reveal')
      // Submit mon score
      const myScore = p.scores[playerId] ?? 0
      onSubmit(myScore)
    }, [playerId, onSubmit]),
  })

  // Auto-submit dessin à la fin du timer
  useEffect(() => {
    if (phase !== 'drawing') return
    if (disabled || timeLeft <= 0) {
      send('player:drawing', { playerId, strokes: strokesRef.current })

      // Host: attendre un peu puis lancer le vote
      if (isHost) {
        setTimeout(() => {
          // Ajouter le dessin du host (il ne reçoit pas son propre broadcast)
          drawingsRef.current.push({ playerId, strokes: strokesRef.current })
          const shuffled = [...drawingsRef.current].sort(() => Math.random() - 0.5)
          send('host:draw_vote_phase', { drawings: shuffled })
          // Le host aussi passe en mode vote
          setDrawings(shuffled)
          setPhase('voting')
          setCurrentDrawingIdx(0)
        }, 1500) // 1.5s de délai pour recevoir les derniers dessins
      }
    }
  }, [disabled, timeLeft, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer de vote : avancer toutes les voteDuration secondes
  useEffect(() => {
    if (phase !== 'voting' || drawings.length === 0) return
    const interval = setInterval(() => {
      setVoteTimer(prev => {
        if (prev <= 1) {
          // Passer au dessin suivant
          setCurrentDrawingIdx(idx => {
            const next = idx + 1
            if (next >= drawings.length) {
              // Fin du vote
              clearInterval(interval)
              if (isHost) {
                // Calculer les scores et reveal
                const results = drawings.map(d => {
                  const pseudo = players.find(p => p.id === d.playerId)?.pseudo ?? '???'
                  const voteCount = votesRef.current.get(d.playerId) ?? 0
                  return { playerId: d.playerId, pseudo, votes: voteCount }
                }).sort((a, b) => b.votes - a.votes)

                const maxVotes = results[0]?.votes ?? 0
                const scores: Record<string, number> = {}
                for (const r of results) {
                  scores[r.playerId] = r.votes * 25 + (r.votes === maxVotes && maxVotes > 0 ? 25 : 0)
                }

                send('host:draw_reveal', { results, scores })
                setRevealData(results)
                setPhase('reveal')
                onSubmit(scores[playerId] ?? 0)
              }
              return idx
            }
            return next
          })
          return voteDuration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, drawings.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleVote(targetPlayerId: string) {
    if (targetPlayerId === playerId || myVotes.has(targetPlayerId)) return
    setMyVotes(prev => new Set([...prev, targetPlayerId]))
    send('player:vote', { targetPlayerId })
  }

  // === PHASE DESSIN ===
  if (phase === 'drawing') {
    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <div className="text-center">
          <p className="text-sm text-fiesta-dark/60">Dessine :</p>
          <p className="text-2xl font-playful text-fiesta-orange">{word}</p>
        </div>
        <DrawCanvas
          width={300}
          height={300}
          disabled={disabled || timeLeft <= 0}
          onStrokesChange={(s) => { setStrokes(s); strokesRef.current = s }}
        />
      </div>
    )
  }

  // === PHASE VOTE ===
  if (phase === 'voting' && drawings.length > 0) {
    const current = drawings[currentDrawingIdx]
    if (!current) return null
    const isMe = current.playerId === playerId

    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <div className="text-center">
          <p className="text-sm text-fiesta-dark/60">
            Dessin {currentDrawingIdx + 1}/{drawings.length} — {voteTimer}s
          </p>
          <p className="text-lg font-playful text-fiesta-dark">Mot : {word}</p>
        </div>

        <DrawCanvas width={300} height={300} disabled replayStrokes={current.strokes} />

        {isMe ? (
          <p className="text-fiesta-dark/60 italic">C&apos;est ton dessin !</p>
        ) : (
          <button
            onClick={() => handleVote(current.playerId)}
            disabled={myVotes.has(current.playerId)}
            className={`px-6 py-3 rounded-full font-bold text-lg transition-all ${
              myVotes.has(current.playerId)
                ? 'bg-emerald-500 text-white'
                : 'bg-fiesta-orange text-white shadow-btn-orange active:translate-y-1 active:shadow-none'
            }`}
          >
            {myVotes.has(current.playerId) ? '✓ Voté !' : '👍 Voter'}
          </button>
        )}
      </div>
    )
  }

  // === PHASE REVEAL ===
  if (phase === 'reveal') {
    return (
      <div className="flex flex-col items-center gap-4 h-full">
        <h2 className="text-xl font-playful text-fiesta-orange">Résultats du dessin</h2>
        <div className="w-full max-w-sm flex flex-col gap-2">
          {revealData.map((r, i) => (
            <div key={r.playerId} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
              r.playerId === playerId ? 'border-fiesta-orange bg-fiesta-orange/10' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-fiesta-dark/60">#{i + 1}</span>
                <span className="font-bold text-fiesta-dark">{r.pseudo}</span>
              </div>
              <span className="font-bold text-fiesta-orange">{r.votes} 👍</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/games/draw-guess/
git commit -m "feat: add draw-guess mini-game — draw, vote on timelapse, reveal"
```

---

## Task 13 : Intégrer les 5 jeux dans le registry + scoring custom dans useGameEngine

**Files:**
- Modify: `src/games/registry.ts`
- Modify: `src/hooks/useGameEngine.ts`

**Dépendances :** Tasks 8, 9, 10, 11, 12

- [ ] **Step 1 : Mettre à jour le registry**

Dans `src/games/registry.ts`, ajouter les imports et enregistrements :

```ts
// Ajouter ces imports en haut du fichier :
import { rpsModule } from './rock-paper-scissors'
import { pointRushModule } from './point-rush'
import { territoryModule } from './territory'
import { drawGuessModule } from './draw-guess'
import { commonWordModule } from './common-word'
```

Mettre à jour `GAME_IDS` :

```ts
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
  'rock-paper-scissors',
  'point-rush',
  'territory',
  'draw-guess',
  'common-word',
] as const
```

Ajouter dans `initRegistry()` :

```ts
registerGame(rpsModule)
registerGame(pointRushModule)
registerGame(territoryModule)
registerGame(drawGuessModule)
registerGame(commonWordModule)
```

- [ ] **Step 2 : Modifier useGameEngine — scoring custom pour common-word**

Dans `src/hooks/useGameEngine.ts`, dans la fonction `endRound`, après le calcul normal des `rawScores` et avant le bonus de rang, ajouter un traitement spécial pour `common-word` :

```ts
// Après la ligne : const rawScores = players.map(p => { ... })

// Scoring custom pour common-word : 20pts par match avec un autre joueur
if (gameType === 'common-word') {
  const submissions = new Map<string, string>()
  players.forEach(p => {
    const sub = submissionsRef.current.get(p.id) as { value: unknown } | undefined
    if (sub && typeof sub.value === 'string') {
      submissions.set(p.id, sub.value.trim().toLowerCase())
    }
  })

  for (const score of rawScores) {
    const myWord = submissions.get(score.player_id)
    if (!myWord) { score.points = 0; continue }
    let matches = 0
    submissions.forEach((word, pid) => {
      if (pid !== score.player_id && word === myWord) matches++
    })
    score.points = matches * 20
  }
}

// Scoring custom pour draw-guess : score déjà calculé dans le composant via broadcast
// computeScore retourne directement submission.value qui est le score final
```

- [ ] **Step 3 : Modifier useGameEngine — generateConfig async + paires RPS**

Dans `startRound`, le `generateConfig` pour certains jeux est maintenant async. Modifier :

```ts
// Remplacer :
const config = gameModule
  ? gameModule.generateConfig(questions)
  : { duration: 30 }

// Par :
let config = gameModule
  ? await Promise.resolve(gameModule.generateConfig(questions))
  : { duration: 30 }

// Injection des paires PFC si nécessaire
if (gameType === 'rock-paper-scissors') {
  const { players: allPlayers } = useGameStore.getState()
  const shuffled = shuffleArray(allPlayers.map(p => p.id))
  const pairs: [string, string][] = []
  let soloPlayer: string | null = null
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]])
  }
  if (shuffled.length % 2 !== 0) {
    soloPlayer = shuffled[shuffled.length - 1]
  }
  config = { ...config, pairs, soloPlayer }
}

// Injection des couleurs Territory si nécessaire
if (gameType === 'territory') {
  const { players: allPlayers } = useGameStore.getState()
  const PLAYER_COLORS = ['#FF6B35', '#FF3CAC', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444', '#6366F1', '#14B8A6']
  const playerColors: Record<string, string> = {}
  allPlayers.forEach((p, i) => { playerColors[p.id] = PLAYER_COLORS[i % PLAYER_COLORS.length] })
  config = { ...config, playerColors }
}
```

- [ ] **Step 4 : Ajouter les jeux nécessitant des questions dans la liste needsQuestions**

Dans `startRound`, la liste `needsQuestions` doit aussi inclure les jeux qui fetchent des données custom :

```ts
// Après le fetch de questions, ajouter un fetch pour draw-guess et common-word
if (gameType === 'draw-guess' || gameType === 'common-word') {
  // generateConfig est déjà async et fait le fetch dans le module
  // Pas besoin de fetch supplémentaire
}
```

(Pas de changement nécessaire ici car `generateConfig` est déjà `await`é.)

- [ ] **Step 5 : Commit**

```bash
git add src/games/registry.ts src/hooks/useGameEngine.ts
git commit -m "feat: register 5 new games + custom scoring in useGameEngine"
```

---

## Task 14 : GeoGuess fonctionnel — Supabase Storage + admin upload

**Files:**
- Modify: `src/app/admin/dashboard/components/GeoGuessUploader.tsx` (déjà créé en Task 6)
- Modify: `src/games/geo-guess/GeoGuessGame.tsx`

**Dépendances :** Task 6

L'essentiel est déjà fait dans Task 6 (GeoGuessUploader). Cette tâche vérifie que le composant de jeu affiche bien les images :

- [ ] **Step 1 : Vérifier GeoGuessGame**

Lire `src/games/geo-guess/GeoGuessGame.tsx` et vérifier que `config.questions[0].content` est utilisé comme URL d'image dans une balise `<img>`. Si le composant utilise déjà `content` comme texte/URL, rien à changer. Sinon, remplacer l'affichage du `content` par :

```tsx
{question.content && question.content.startsWith('http') ? (
  <img
    src={question.content}
    alt="GeoGuess"
    className="w-full max-w-sm rounded-xl object-cover aspect-video"
  />
) : (
  <p className="text-fiesta-dark font-medium text-center">{question.content}</p>
)}
```

- [ ] **Step 2 : Commit (si modifications)**

```bash
git add src/games/geo-guess/GeoGuessGame.tsx
git commit -m "feat: GeoGuess displays images from Supabase Storage URLs"
```

---

## Task 15 : Build final + vérification

**Files:** Aucun (vérification uniquement)

- [ ] **Step 1 : Lancer le build**

```bash
npm run build
```

Corriger toute erreur TypeScript ou d'import.

- [ ] **Step 2 : Lancer les tests existants**

```bash
npm test
```

Corriger les tests cassés.

- [ ] **Step 3 : Vérification manuelle**

Checklist :
- [ ] Admin panel : onglets navigables, CRUD questions fonctionne
- [ ] Admin : toggles jeux ON/OFF persistent
- [ ] Lobby : GameSelector visible pour le host, jeux désactivés grisés
- [ ] Les 5 nouveaux jeux apparaissent dans le registry (`getAllGames()`)
- [ ] Animations Framer Motion visibles (transitions, lobby, podium)

- [ ] **Step 4 : Commit final**

```bash
git add -A
git commit -m "fix: Plan 3 build fixes and verifications"
```
