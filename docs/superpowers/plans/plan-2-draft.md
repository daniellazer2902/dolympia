# dolympia — Plan 2 : Mini-jeux, Contenu, et Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les 10 mini-jeux concrets du MVP, connecter le système de questions depuis la DB, enrichir le scoring (vitesse, précision), ajouter les animations/transitions, et construire le panel admin pour gérer les questions.

**Prérequis:** Plan 1 complété (foundation, lobby, game engine, boucle de partie avec placeholder).

**Architecture existante:** Chaque jeu = un dossier dans `src/games/[id]/` qui exporte un `GameModule` (contrat défini dans `src/games/types.ts`). Le `GameContainer` résout le composant via `getGame()` du registry. Le `useGameEngine` orchestre la progression côté host. Le scoring utilise les helpers de `src/games/scoring.ts`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS (thème Fiesta), Supabase JS v2, Zustand, Framer Motion (nouveau), Vitest

---

## Carte des fichiers

```
dolympia/
├── src/
│   ├── games/
│   │   ├── types.ts                        # (modifier) ajouter QuestionPool, GameStatus
│   │   ├── registry.ts                     # (modifier) importer et enregistrer les 10 jeux
│   │   ├── scoring.ts                      # (existant, déjà fonctionnel)
│   │   ├── quiz/
│   │   │   ├── index.ts                    # GameModule export
│   │   │   └── QuizGame.tsx                # Composant React
│   │   ├── true-false/
│   │   │   ├── index.ts
│   │   │   └── TrueFalseGame.tsx
│   │   ├── mental-math/
│   │   │   ├── index.ts
│   │   │   ├── MentalMathGame.tsx
│   │   │   └── generator.ts               # Génération dynamique de calculs
│   │   ├── reflex/
│   │   │   ├── index.ts
│   │   │   └── ReflexGame.tsx
│   │   ├── tap-spam/
│   │   │   ├── index.ts
│   │   │   └── TapSpamGame.tsx
│   │   ├── memory/
│   │   │   ├── index.ts
│   │   │   └── MemoryGame.tsx
│   │   ├── moving-target/
│   │   │   ├── index.ts
│   │   │   └── MovingTargetGame.tsx
│   │   ├── order-logic/
│   │   │   ├── index.ts
│   │   │   └── OrderLogicGame.tsx
│   │   ├── shake-it/
│   │   │   ├── index.ts
│   │   │   ├── ShakeItGame.tsx
│   │   │   └── useDeviceMotion.ts          # Hook DeviceMotion + permission iOS
│   │   └── geo-guess/
│   │       ├── index.ts
│   │       └── GeoGuessGame.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── questions.ts                # Service fetch questions par game_type
│   │   └── sounds.ts                       # Gestionnaire sons (correct, wrong, tick, fanfare)
│   │
│   ├── hooks/
│   │   └── useGameEngine.ts                # (modifier) intégrer generateConfig + computeScore réels
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameContainer.tsx            # (modifier) passer totalRounds dynamique au HUD
│   │   │   ├── RoundTransition.tsx          # (modifier) animations Framer Motion
│   │   │   ├── RoundIntro.tsx               # Nouvel écran "3, 2, 1... Go!" avant chaque manche
│   │   │   └── HUD.tsx                      # (modifier) afficher icône + label du jeu
│   │   └── ui/
│   │       ├── AnimatedScore.tsx            # Score qui pop avec animation
│   │       └── FeedbackOverlay.tsx          # Overlay correct/incorrect
│   │
│   ├── app/
│   │   ├── game/[code]/page.tsx             # (modifier) ajouter phase round_intro
│   │   ├── results/[code]/page.tsx          # (modifier) animations podium, bouton rejouer
│   │   └── admin/
│   │       └── dashboard/page.tsx           # (réécrire) CRUD questions complet
│   │
│   └── test/
│       ├── games/
│       │   ├── quiz.test.ts
│       │   ├── mental-math.test.ts
│       │   ├── reflex.test.ts
│       │   ├── tap-spam.test.ts
│       │   ├── memory.test.ts
│       │   ├── true-false.test.ts
│       │   ├── order-logic.test.ts
│       │   └── geo-guess.test.ts
│       └── admin/
│           └── questions.test.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 20260405000000_seed_questions.sql  # Seed initial de questions
│   └── functions/
│       └── validate-submission/
│           └── index.ts                        # Edge Function anti-triche
│
└── public/
    └── sounds/
        ├── correct.mp3
        ├── wrong.mp3
        ├── tick.mp3
        ├── countdown.mp3
        └── fanfare.mp3
```

---

## Dépendances entre tâches

```
Task 1 (types + registry) ─────────────────────┐
Task 2 (service questions DB) ──────────┐       │
Task 3 (seed questions SQL) ────────────┤       │
                                        ▼       ▼
                              Task 4-13 (les 10 mini-jeux)
                                        │
                                        ▼
                              Task 14 (intégration useGameEngine)
                                        │
Task 15 (sons + feedback) ──────────────┤
Task 16 (animations transitions) ───────┤
                                        ▼
                              🔵 CHECKPOINT 2 — Jeux jouables
                                        │
Task 17 (admin CRUD questions) ─────────┤ (parallélisable)
Task 18 (Edge Function anti-triche) ────┤ (parallélisable)
                                        ▼
                              🔵 CHECKPOINT 3 — Admin + sécurité
                                        │
Task 19 (polish UX + vibrations) ───────┤
Task 20 (tests E2E) ───────────────────┤
                                        ▼
                              🔵 CHECKPOINT 4 — Plan 2 complet
```

---

## Task 1 : Enrichir les types et le registry

**Files:**
- Modify: `src/games/types.ts`, `src/games/registry.ts`

**Dépendances:** Aucune

- [ ] **Etape 1 : Ajouter GameStatus au types**

Ajouter dans `src/games/types.ts` :

```ts
/** Statut de soumission d'un joueur pendant une manche */
export type SubmissionStatus = 'pending' | 'submitted' | 'timeout'

/** Pool de questions récupérées depuis la DB */
export interface QuestionPool {
  gameType: string
  questions: Question[]
}
```

- [ ] **Etape 2 : Modifier le registry pour enregistrer les jeux au boot**

Modifier `src/games/registry.ts` pour importer et enregistrer les 10 modules :

```ts
// Imports ajoutés au fur et à mesure que les jeux sont implémentés
// import { quizModule } from './quiz'
// import { reflexModule } from './reflex'
// ...

// Fonction d'initialisation à appeler une fois au démarrage
export function initRegistry() {
  // registerGame(quizModule)
  // registerGame(reflexModule)
  // ...
}
```

Les imports seront décommentés au fur et à mesure que chaque jeu est implémenté.

- [ ] **Etape 3 : Commit**

---

## Task 2 : Service de questions depuis la DB

**Files:**
- Create: `src/lib/supabase/questions.ts`

**Dépendances:** Aucune (utilise le schéma DB existant)

- [ ] **Etape 1 : Créer le service questions**

Créer `src/lib/supabase/questions.ts` :

```ts
import { getSupabaseClient } from './client'
import type { Question } from './types'

/**
 * Récupère N questions aléatoires pour un type de jeu donné.
 * Utilise un ORDER BY random() côté Supabase.
 */
export async function fetchQuestions(
  gameType: string,
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('questions')
    .select()
    .eq('game_type', gameType)

  if (difficulty) {
    query = query.eq('difficulty', difficulty)
  }

  // Supabase ne supporte pas ORDER BY random() nativement,
  // on récupère plus que nécessaire et on shuffle côté client
  const { data, error } = await query.limit(count * 3)

  if (error || !data) return []

  // Shuffle Fisher-Yates et prendre les N premiers
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count) as Question[]
}

/**
 * Récupère toutes les questions pour l'admin.
 */
export async function fetchAllQuestions(gameType?: string): Promise<Question[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('questions').select().order('created_at', { ascending: false })

  if (gameType) {
    query = query.eq('game_type', gameType)
  }

  const { data } = await query
  return (data ?? []) as Question[]
}
```

- [ ] **Etape 2 : Commit**

---

## Task 3 : Seed de questions initiales

**Files:**
- Create: `supabase/migrations/20260405000000_seed_questions.sql`

**Dépendances:** Aucune (schema DB existant)

- [ ] **Etape 1 : Créer le fichier de seed**

Créer un fichier SQL avec au minimum :
- 20 questions Quiz (QCM, 4 options, catégories variées)
- 15 questions Vrai/Faux (affirmations insolites)
- 10 questions Ordre logique (séquences à remettre en ordre)
- 10 questions GeoGuess (content = URL image, options = 4 pays/villes)

Format attendu pour chaque type :

```sql
-- Quiz
INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES
('quiz', 'Quelle est la capitale du Japon ?',
 '["Tokyo", "Osaka", "Kyoto", "Nagoya"]',
 '"Tokyo"', 'easy', 'géographie'),
-- ...

-- Vrai ou Faux
INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES
('true_false', 'Les pieuvres ont trois coeurs.',
 '["Vrai", "Faux"]',
 '"Vrai"', 'medium', 'science'),
-- ...

-- Ordre logique
INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES
('order', 'Classez ces planètes de la plus proche à la plus éloignée du Soleil',
 '["Mars", "Vénus", "Jupiter", "Mercure"]',
 '["Mercure", "Vénus", "Mars", "Jupiter"]', 'medium', 'science'),
-- ...

-- GeoGuess
INSERT INTO questions (game_type, content, options, answer, difficulty, category) VALUES
('geo', 'https://BUCKET_URL/geo/tour-eiffel.jpg',
 '["France", "Italie", "Espagne", "Belgique"]',
 '"France"', 'easy', 'monuments'),
-- ...
```

- [ ] **Etape 2 : Exécuter le seed dans Supabase SQL Editor** (MANUEL)

- [ ] **Etape 3 : Commit**

---

## 🔵 CHECKPOINT 1 — Infrastructure questions prête

**Vérification :**
1. Le service `fetchQuestions('quiz', 5)` retourne des questions depuis la DB
2. Le registry accepte l'enregistrement de `GameModule`
3. Les types sont cohérents

---

## Task 4 : Mini-jeu Quiz (QCM)

**Files:**
- Create: `src/games/quiz/index.ts`, `src/games/quiz/QuizGame.tsx`
- Create: `src/test/games/quiz.test.ts`
- Modify: `src/games/registry.ts` (enregistrer le module)

**Dépendances:** Tasks 1, 2

**Mécanique :** QCM avec 4 options. Score = 100 pts (bonne réponse) + jusqu'à 50 pts bonus rapidité. 20s par question.

- [ ] **Etape 1 : Ecrire les tests**

Tester `generateConfig` (retourne config avec questions) et `computeScore` (score correct + speed bonus, score incorrect = 0).

- [ ] **Etape 2 : Implémenter le module Quiz**

`src/games/quiz/index.ts` :

```ts
import type { GameModule, RoundConfig, PlayerSubmission } from '../types'
import { scoreWithSpeedBonus } from '../scoring'
import { fetchQuestions } from '@/lib/supabase/questions'
import { QuizGame } from './QuizGame'

export const quizModule: GameModule = {
  id: 'quiz',
  label: 'Quiz',
  icon: '🧠',
  defaultDuration: 20,
  minPlayers: 2,

  generateConfig: async (questions) => ({
    duration: 20,
    questions: questions.slice(0, 1), // 1 question par manche
  }),

  computeScore: (submission, config) => {
    const question = config.questions?.[0]
    if (!question) return 0
    const correct = JSON.stringify(submission.value) === JSON.stringify(question.answer)
    const elapsed = (submission.timestamp - submission.startedAt) / 1000
    const timeLeft = (config.duration ?? 20) - elapsed
    return scoreWithSpeedBonus({
      correct,
      timeLeft,
      totalTime: config.duration ?? 20,
      base: 100,
      bonus: 50,
    })
  },

  Component: QuizGame,
}
```

- [ ] **Etape 3 : Implémenter le composant QuizGame**

`src/games/quiz/QuizGame.tsx` :

Le composant affiche la question et 4 boutons d'options. Au clic, le joueur soumet sa réponse via `onSubmit(selectedOption)`. Les boutons sont désactivés après soumission. Feedback visuel : vert si correct, rouge si incorrect (après soumission).

- [ ] **Etape 4 : Enregistrer dans le registry**

Décommenter l'import et le `registerGame(quizModule)` dans `src/games/registry.ts`.

- [ ] **Etape 5 : Vérifier que les tests passent + Commit**

---

## Task 5 : Mini-jeu Vrai ou Faux

**Files:**
- Create: `src/games/true-false/index.ts`, `src/games/true-false/TrueFalseGame.tsx`
- Create: `src/test/games/true-false.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Tasks 1, 2

**Mécanique :** Affirmation insolite, le joueur choisit Vrai ou Faux. Score = 100 pts + 50 pts rapidité. 10s par question.

- [ ] **Etape 1 : Tests**
- [ ] **Etape 2 : Implémenter le module** (même pattern que Quiz, mais 2 boutons Vrai/Faux)
- [ ] **Etape 3 : Composant TrueFalseGame** (boutons larges Vrai / Faux, feedback couleur)
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 6 : Mini-jeu Calcul Mental

**Files:**
- Create: `src/games/mental-math/index.ts`, `src/games/mental-math/MentalMathGame.tsx`, `src/games/mental-math/generator.ts`
- Create: `src/test/games/mental-math.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** Calcul généré dynamiquement (pas de DB), réponse libre (input numérique). Score = 80 pts + 40 pts rapidité. 15s.

- [ ] **Etape 1 : Tests** (tester le générateur : opérations +, -, x avec difficulté progressive)
- [ ] **Etape 2 : Implémenter le générateur**

`src/games/mental-math/generator.ts` :
- `easy` : addition/soustraction de nombres < 50
- `medium` : multiplication < 12, additions < 100
- `hard` : opérations mixtes, nombres plus grands

- [ ] **Etape 3 : Implémenter le module** (generateConfig utilise le générateur, pas la DB)
- [ ] **Etape 4 : Composant MentalMathGame** (affiche le calcul, input numérique, bouton valider)
- [ ] **Etape 5 : Enregistrer + Commit**

---

## Task 7 : Mini-jeu Réflexe

**Files:**
- Create: `src/games/reflex/index.ts`, `src/games/reflex/ReflexGame.tsx`
- Create: `src/test/games/reflex.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** L'écran est d'une couleur neutre. Après un délai aléatoire (2-6s), la couleur change. Le joueur doit cliquer le plus vite possible. Score basé sur le temps de réaction. 10s total (inclut l'attente).

- [ ] **Etape 1 : Tests** (computeScore : plus rapide = plus de points, clic trop tôt = 0)
- [ ] **Etape 2 : Module** (generateConfig inclut un `triggerDelay` aléatoire entre 2000 et 6000ms)
- [ ] **Etape 3 : Composant ReflexGame**
  - Phase "Attendez..." (fond rouge)
  - Phase "CLIQUEZ !" (fond vert, démarrer le chrono)
  - Si clic trop tôt : "Trop tôt !" + score 0
  - Afficher le temps de réaction en ms après le clic
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 8 : Mini-jeu Tap Spam

**Files:**
- Create: `src/games/tap-spam/index.ts`, `src/games/tap-spam/TapSpamGame.tsx`
- Create: `src/test/games/tap-spam.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** Tapper le plus vite possible pendant 10s. Le score est basé sur le classement (1er = 100 pts, dernier = 10 pts). Anti-triche : max 20 taps/s.

- [ ] **Etape 1 : Tests** (computeScore prend en compte le rank ; anti-triche : taps > 20/s ignorés)
- [ ] **Etape 2 : Module** (computeScore utilise `scoreByRank` de scoring.ts)
- [ ] **Etape 3 : Composant TapSpamGame**
  - Gros bouton central pulsant
  - Compteur de taps visible en gros
  - Le joueur broadcast `player:tap` avec son count toutes les 500ms
  - A la fin du timer, `onSubmit(tapCount)`
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 9 : Mini-jeu Memory

**Files:**
- Create: `src/games/memory/index.ts`, `src/games/memory/MemoryGame.tsx`
- Create: `src/test/games/memory.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** Grille de cartes (4x4 = 8 paires). Trouver les paires. Score inversement proportionnel au nombre de coups. 60s.

- [ ] **Etape 1 : Tests** (computeScore : moins de coups = plus de points ; max 100 pts si parfait)
- [ ] **Etape 2 : Module** (generateConfig produit des paires d'emoji randomisées)
- [ ] **Etape 3 : Composant MemoryGame**
  - Grille 4x4 avec cartes retournées
  - Animation flip au clic
  - Si paire trouvée : cartes restent visibles
  - Si pas de paire : retournement après 1s
  - Compteur de coups visible
  - A la fin (toutes paires ou timeout) : `onSubmit({ pairs: found, moves: totalMoves })`
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 10 : Mini-jeu Cible Mouvante

**Files:**
- Create: `src/games/moving-target/index.ts`, `src/games/moving-target/MovingTargetGame.tsx`
- Create: `src/test/games/moving-target.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** Des cibles (cercles colorés) apparaissent à des positions aléatoires et restent visibles 1-2s. Le joueur doit les toucher. Score décroissant selon le temps de réaction par cible. 30s.

- [ ] **Etape 1 : Tests**
- [ ] **Etape 2 : Module** (generateConfig : nombre de cibles, vitesse d'apparition)
- [ ] **Etape 3 : Composant MovingTargetGame**
  - Zone de jeu plein écran
  - Cibles qui apparaissent à des positions CSS aléatoires
  - Animation de pop-in et shrink
  - Score par cible touchée (bonus si rapide)
  - `onSubmit({ hits, totalTargets, avgReactionMs })`
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 11 : Mini-jeu Ordre Logique

**Files:**
- Create: `src/games/order-logic/index.ts`, `src/games/order-logic/OrderLogicGame.tsx`
- Create: `src/test/games/order-logic.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Tasks 1, 2

**Mécanique :** Liste d'éléments mélangés à remettre dans le bon ordre (drag-and-drop). Score partiel proportionnel. 30s.

- [ ] **Etape 1 : Tests** (computeScore : utilise `scorePartial` ; full correct = 100)
- [ ] **Etape 2 : Module** (questions depuis DB, type 'order')
- [ ] **Etape 3 : Composant OrderLogicGame**
  - Liste verticale draggable (touch-friendly pour mobile)
  - Éléments déplaçables avec handle
  - Bouton "Valider" pour soumettre l'ordre
  - Feedback visuel : éléments bien placés en vert
- [ ] **Etape 4 : Enregistrer + Commit**

---

## Task 12 : Mini-jeu Shake It

**Files:**
- Create: `src/games/shake-it/index.ts`, `src/games/shake-it/ShakeItGame.tsx`, `src/games/shake-it/useDeviceMotion.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Task 1

**Mécanique :** Secouer le téléphone (DeviceMotion API). Score basé sur le classement d'intensité. 10s. iOS 13+ requiert permission explicite.

- [ ] **Etape 1 : Créer le hook useDeviceMotion**

```ts
// useDeviceMotion.ts
// - Demande la permission DeviceMotionEvent.requestPermission() sur iOS
// - Écoute devicemotion events
// - Calcule l'intensité cumulée (somme des |acceleration.x| + |y| + |z|)
// - Expose : { intensity, permissionGranted, requestPermission }
```

- [ ] **Etape 2 : Module** (computeScore utilise `scoreByRank`)
- [ ] **Etape 3 : Composant ShakeItGame**
  - Écran de permission si iOS ("Autorise l'accès au mouvement")
  - Jauge d'intensité animée
  - Le joueur broadcast `player:motion_score` régulièrement
  - `onSubmit(totalIntensity)` à la fin du timer
- [ ] **Etape 4 : Fallback desktop** (alternative clavier : marteler une touche, même mécanique que tap-spam)
- [ ] **Etape 5 : Enregistrer + Commit**

---

## Task 13 : Mini-jeu GeoGuess Lite

**Files:**
- Create: `src/games/geo-guess/index.ts`, `src/games/geo-guess/GeoGuessGame.tsx`
- Create: `src/test/games/geo-guess.test.ts`
- Modify: `src/games/registry.ts`

**Dépendances:** Tasks 1, 2

**Mécanique :** Photo d'un lieu (depuis Supabase Storage), 4 choix de pays/ville. Score = 100 pts + 50 pts rapidité. 20s.

- [ ] **Etape 1 : Tests**
- [ ] **Etape 2 : Module** (même pattern que Quiz, mais le content est une URL d'image)
- [ ] **Etape 3 : Composant GeoGuessGame**
  - Image plein écran (aspect-ratio preservé)
  - 4 boutons de choix en bas
  - Feedback visuel après réponse
- [ ] **Etape 4 : Upload de quelques images de test dans Supabase Storage** (MANUEL)
- [ ] **Etape 5 : Enregistrer + Commit**

---

## 🔵 CHECKPOINT 2 — Les 10 mini-jeux sont implémentés

**Vérification :**
1. `getAllGames()` retourne 10 modules
2. Chaque jeu a un composant fonctionnel et un `computeScore` testé
3. Les jeux basés sur des questions (quiz, true-false, order, geo) récupèrent depuis la DB
4. Les jeux générés dynamiquement (mental-math, reflex, tap-spam, memory, moving-target, shake-it) fonctionnent sans DB

---

## Task 14 : Intégration useGameEngine avec les vrais jeux

**Files:**
- Modify: `src/hooks/useGameEngine.ts`
- Modify: `src/components/game/GameContainer.tsx`

**Dépendances:** Tasks 4-13 (au moins quelques jeux implémentés)

- [ ] **Etape 1 : Modifier startRound pour utiliser generateConfig**

Dans `useGameEngine.ts`, le `startRound` actuel utilise une durée fixe de 30s et ne passe pas de questions. Le modifier pour :
1. Récupérer le `GameModule` via `getGame(gameType)`
2. Fetch les questions depuis la DB si le jeu en a besoin
3. Appeler `module.generateConfig(questions)` pour obtenir la config
4. Utiliser `module.defaultDuration` au lieu de 30s hardcodé
5. Broadcaster la config complète (SANS les réponses pour les joueurs)

**Important :** La config broadcastée ne doit PAS inclure `question.answer` pour éviter la triche. Créer une fonction `sanitizeConfig` qui strip les réponses avant broadcast. Le host garde la config complète pour le scoring.

- [ ] **Etape 2 : Modifier endRound pour utiliser computeScore**

Dans `useGameEngine.ts`, le `endRound` actuel donne 50 pts à tous ceux qui ont soumis. Le modifier pour :
1. Récupérer le `GameModule` via `getGame(gameType)`
2. Pour chaque submission, appeler `module.computeScore(submission, config)`
3. Pour les jeux basés sur le classement (tap-spam, shake-it), trier d'abord, puis appeler `scoreByRank`
4. Sauvegarder les scores réels dans la DB

- [ ] **Etape 3 : Modifier GameContainer pour passer totalRounds dynamique**

Le HUD affiche actuellement `totalRounds={10}` en dur. Le remplacer par la vraie valeur depuis le store session.

- [ ] **Etape 4 : Tests d'intégration**
- [ ] **Etape 5 : Commit**

---

## Task 15 : Sons et feedback

**Files:**
- Create: `src/lib/sounds.ts`, `public/sounds/*.mp3`
- Create: `src/components/ui/FeedbackOverlay.tsx`, `src/components/ui/AnimatedScore.tsx`

**Dépendances:** Aucune (parallélisable avec Task 14)

- [ ] **Etape 1 : Créer le gestionnaire de sons**

`src/lib/sounds.ts` :

```ts
const sounds = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  tick: '/sounds/tick.mp3',
  countdown: '/sounds/countdown.mp3',
  fanfare: '/sounds/fanfare.mp3',
} as const

type SoundName = keyof typeof sounds

const audioCache = new Map<string, HTMLAudioElement>()

export function playSound(name: SoundName) {
  const src = sounds[name]
  let audio = audioCache.get(src)
  if (!audio) {
    audio = new Audio(src)
    audioCache.set(src, audio)
  }
  audio.currentTime = 0
  audio.play().catch(() => {}) // Ignorer les erreurs autoplay
}

export function preloadSounds() {
  Object.values(sounds).forEach(src => {
    const audio = new Audio(src)
    audioCache.set(src, audio)
  })
}
```

Note : trouver ou générer des sons libres de droits (courts, style jeu arcade). Possibilité d'utiliser des fichiers synthétisés via Web Audio API comme fallback si pas de fichiers MP3.

- [ ] **Etape 2 : Créer FeedbackOverlay**

Overlay plein écran semi-transparent qui apparaît brièvement (500ms) :
- Vert + check si correct
- Rouge + croix si incorrect
- Avec vibration courte sur mobile (`navigator.vibrate(100)`)

- [ ] **Etape 3 : Créer AnimatedScore**

Composant qui affiche "+N pts" avec une animation (scale up + fade out) quand le score change.

- [ ] **Etape 4 : Intégrer dans les composants de jeu**

Ajouter les appels `playSound('correct')` et `playSound('wrong')` dans les composants quiz, true-false, geo-guess, mental-math. Ajouter le `FeedbackOverlay` dans `GameContainer`.

- [ ] **Etape 5 : Commit**

---

## Task 16 : Animations et transitions

**Files:**
- Modify: `src/components/game/RoundTransition.tsx`
- Create: `src/components/game/RoundIntro.tsx`
- Modify: `src/app/game/[code]/page.tsx`
- Modify: `src/app/results/[code]/page.tsx`

**Dépendances:** Aucune (parallélisable avec Task 14)

- [ ] **Etape 1 : Installer Framer Motion**

```bash
npm install framer-motion
```

- [ ] **Etape 2 : Créer RoundIntro (countdown)**

Nouvel écran affiché 3s avant chaque manche :
- Affiche l'icône et le label du jeu à venir
- Countdown "3... 2... 1... GO !" avec animation scale
- Transition fluide vers le jeu

- [ ] **Etape 3 : Ajouter la phase round_intro dans le flow**

Modifier le `GamePhase` dans `game.store.ts` pour inclure `'round_intro'`. Modifier `useGameEngine.ts` et `page.tsx` pour afficher le `RoundIntro` pendant 3s avant de passer à `playing`.

- [ ] **Etape 4 : Animer RoundTransition**

Ajouter des animations Framer Motion :
- Classement qui slide-in de gauche à droite
- Scores qui comptent de 0 à N
- Médailles qui pop

- [ ] **Etape 5 : Animer la page Results**

- Podium qui monte avec un spring animation
- Confetti ou particules pour le gagnant (utiliser une lib lightweight ou CSS animations)
- Classement complet qui slide-in progressivement

- [ ] **Etape 6 : Commit**

---

## 🔵 CHECKPOINT 3 — Jeux jouables avec polish

**Vérification :**
1. Une partie complète fonctionne : lobby -> intro manche -> jeu -> scores -> prochain jeu -> résultats
2. Les scores sont calculés correctement selon chaque type de jeu
3. Sons et vibrations fonctionnent sur mobile
4. Les animations sont fluides et ne bloquent pas l'interaction
5. Le flow est agréable de bout en bout

---

## Task 17 : Admin CRUD questions

**Files:**
- Rewrite: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/dashboard/QuestionForm.tsx`
- Create: `src/app/admin/dashboard/QuestionList.tsx`
- Create: `src/app/admin/dashboard/ImageUploader.tsx`

**Dépendances:** Task 2

- [ ] **Etape 1 : Créer le composant QuestionList**

Liste paginée des questions avec :
- Filtres par `game_type` et `difficulty`
- Compteur par type (ex: "Quiz: 20, Vrai/Faux: 15, ...")
- Boutons Modifier / Supprimer sur chaque ligne
- Recherche par contenu

- [ ] **Etape 2 : Créer le composant QuestionForm**

Formulaire adaptatif selon le `game_type` sélectionné :
- **Quiz** : content (textarea), 4 options (inputs), réponse correcte (radio), difficulté, catégorie
- **Vrai/Faux** : content (textarea), réponse (toggle Vrai/Faux), difficulté, catégorie
- **Ordre logique** : content (textarea), éléments à ordonner (liste drag-and-drop), difficulté, catégorie
- **GeoGuess** : upload image + 4 options + réponse correcte

Utiliser le `service_role` key via une route API Next.js pour les opérations d'écriture.

- [ ] **Etape 3 : Créer le composant ImageUploader**

Pour GeoGuess :
- Upload vers Supabase Storage (bucket `geo-images`)
- Preview de l'image
- Retourne l'URL publique à insérer dans `content`

- [ ] **Etape 4 : Route API pour les mutations**

Créer `src/app/api/admin/questions/route.ts` :
- `POST` : créer une question (utilise service_role key)
- `PUT` : modifier une question
- `DELETE` : supprimer une question
- Vérifier que l'utilisateur est authentifié admin

- [ ] **Etape 5 : Assembler le dashboard**

Réécrire `src/app/admin/dashboard/page.tsx` :
- Vue d'ensemble avec stats (nb questions par type)
- Onglets ou sidebar pour naviguer entre la liste et le formulaire d'ajout
- Formulaire d'édition dans une modale ou inline

- [ ] **Etape 6 : Protéger avec middleware**

Vérifier que le middleware existant redirige bien `/admin/dashboard` vers `/admin/login` si non authentifié.

- [ ] **Etape 7 : Commit**

---

## Task 18 : Edge Function anti-triche

**Files:**
- Create: `supabase/functions/validate-submission/index.ts`

**Dépendances:** Task 14

- [ ] **Etape 1 : Créer l'Edge Function**

`supabase/functions/validate-submission/index.ts` :

Validations :
- **Tap spam** : rejeter si > 20 taps/s
- **Shake it** : rejeter si intensité > plafond réaliste (ex: 5000 unités)
- **Timing** : rejeter si `timestamp` < `started_at` du round
- **Unicité** : rejeter si le joueur a déjà soumis pour ce round

- [ ] **Etape 2 : Déployer la function** (MANUEL via `supabase functions deploy`)
- [ ] **Etape 3 : Intégrer l'appel dans useGameEngine**

Avant d'accepter un score, le host peut optionnellement appeler l'Edge Function pour valider. En V1, c'est principalement une validation côté client + vérification basique côté host.

- [ ] **Etape 4 : Commit**

---

## Task 19 : Polish UX final

**Files:**
- Modify: divers composants existants

**Dépendances:** Tasks 14, 15, 16

- [ ] **Etape 1 : Vibrations mobiles**

Ajouter `navigator.vibrate()` aux moments clés :
- Réponse correcte : vibration courte (50ms)
- Réponse incorrecte : double vibration (50ms, pause 50ms, 50ms)
- Fin de manche : vibration longue (200ms)
- Countdown 3-2-1 : vibration à chaque chiffre

- [ ] **Etape 2 : Son countdown**

Le timer des 3 dernières secondes joue un son "tick" à chaque seconde. Modifier `useTimer` ou le composant `Timer` pour déclencher `playSound('tick')` quand `timeLeft <= 3`.

- [ ] **Etape 3 : Reconnexion améliorée**

Implémenter le flow de reconnexion décrit dans le design spec :
- A la reconnexion, fetch `sessions` + `players` + `rounds` depuis la DB
- Reconstruire l'état du store
- Afficher un badge "Reconnecte..." temporaire
- Si le joueur arrive en cours de manche, afficher "Tu rejoindras a la prochaine manche"

- [ ] **Etape 4 : Host déconnecté**

Si le host n'est pas revenu après 15s (vérifier via Presence) :
- Afficher un message "L'hote s'est deconnecte..."
- Après 15s : marquer la session `finished` et rediriger vers les résultats partiels

- [ ] **Etape 5 : Bouton "Rejouer" fonctionnel**

Sur la page résultats, le bouton "Rejouer" du host doit :
1. Créer une nouvelle session avec un nouveau code
2. Broadcaster l'URL aux joueurs actuels
3. Tous les joueurs sont redirigés vers le nouveau lobby

- [ ] **Etape 6 : Commit**

---

## Task 20 : Tests E2E

**Files:**
- Modify/Create: `tests/` ou `e2e/` (Playwright)

**Dépendances:** Toutes les tâches précédentes

- [ ] **Etape 1 : Scénarios à couvrir**

1. Créer une partie, rejoindre avec un second joueur, lancer, jouer un quiz, voir les scores
2. Mode équipe : vérifier l'assignation et le splash
3. Reconnexion : fermer un onglet et rouvrir
4. Admin : login, créer une question, vérifier qu'elle apparaît dans la liste
5. Fin de partie : vérifier le podium et le classement

- [ ] **Etape 2 : Implémenter les tests**
- [ ] **Etape 3 : Commit**

---

## 🔵 CHECKPOINT 4 — Plan 2 complet

**Vérification finale :**
1. Les 10 mini-jeux sont jouables et scorés correctement
2. Les questions viennent de la DB (quiz, vrai/faux, ordre, geo)
3. Le scoring intègre la vitesse et la précision
4. Les animations et transitions sont fluides
5. Les sons fonctionnent (avec fallback silencieux si autoplay bloqué)
6. Le panel admin permet de gérer les questions
7. L'anti-triche basique est en place
8. La reconnexion fonctionne
9. Le bouton "Rejouer" crée une nouvelle session
10. Le build passe sans erreur : `npm run build`
11. Les tests passent : `npm run test:run`

---

## Résumé des tâches parallélisables

| Groupe | Tâches | Condition |
|--------|--------|-----------|
| Groupe A | Tasks 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | Après Task 1 (les jeux sans DB) ou Tasks 1+2 (les jeux avec DB). Les 10 jeux sont indépendants entre eux. |
| Groupe B | Tasks 15, 16 | Parallélisables avec Task 14, aucune dépendance mutuelle |
| Groupe C | Task 17 | Parallélisable avec le Groupe B |
| Groupe D | Task 18 | Après Task 14 |
| Séquentiel | Task 14 après Groupe A, Task 19 après 14+15+16, Task 20 en dernier |
