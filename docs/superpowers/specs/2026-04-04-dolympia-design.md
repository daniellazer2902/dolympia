# dolympia — Design Spec
**Date :** 2026-04-04  
**Statut :** Approuvé

---

## Contexte

dolympia est une application web de mini-jeux multijoueur en temps réel, mobile-first. Des joueurs rejoignent une session via un code (ou lien direct), s'affrontent sur une série d'épreuves, et accumulent des points. L'usage principal est le jeu en présentiel (soirées, apéros), mais l'app est hébergée en ligne (Vercel) et supporte aussi le jeu à distance. Le nom est une contraction de "digital" + "olympia".

---

## Stack technique

| Couche | Choix |
|--------|-------|
| Frontend | Next.js 14 App Router, React, TypeScript |
| State management | Zustand |
| Temps réel | Supabase Realtime (Broadcast + Presence) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (admin uniquement en V1) |
| Storage | Supabase Storage (images GeoGuess) |
| Validation anti-triche | Supabase Edge Functions |
| Hébergement | Vercel |

---

## Identité visuelle — "Fiesta"

- **Fond :** `#FFFBF0` (blanc crème)
- **Couleurs principales :** orange `#FF6B35`, jaune `#FFD700`, rose `#FF3CAC`
- **Style :** cartoon/pop, formes rondes, boutons 3D (box-shadow décalée)
- **Typographie :** bold, playful (Trebuchet MS ou équivalent Google Fonts)
- **Vibe :** festif, accessible, tous publics

---

## Architecture globale

```
VERCEL
└── Next.js 14 App Router
    ├── /                      Accueil (créer / rejoindre)
    ├── /lobby/[code]          Salle d'attente
    ├── /game/[code]           Partie en cours
    ├── /results/[code]        Podium + classement
    └── /admin/dashboard       Gestion questions (protégé)

SUPABASE
├── PostgreSQL                 Persistance (sessions, joueurs, scores)
├── Realtime Broadcast         Événements temps réel (1 channel par partie)
├── Presence                   Présence joueurs dans le lobby/game
├── Auth                       Session admin
└── Storage                    Images GeoGuess
```

**Principe host-authoritative :** le client du host orchestre la progression de la partie (lancement, fin de manche, passage au jeu suivant). Les clients joueurs écoutent et obéissent. Les timers tournent côté client, synchronisés via le `started_at` broadcasté par le host.

---

## Modélisation des données (Supabase)

```sql
sessions
  id            uuid PK
  code          text UNIQUE        -- code 6 lettres ex: "XKQR7B"
  host_id       text               -- player_id du host
  status        enum               -- 'waiting' | 'playing' | 'finished'
  mode          enum               -- 'solo' | 'team'
  team_mode     enum               -- 'auto' | 'manual' | null
  duration_min  int                -- durée choisie (10 / 20 / 30 min)
  total_rounds  int                -- calculé au lancement
  current_round int
  games_order   text[]             -- ordre shufflé des mini-jeux
  created_at    timestamptz

players
  id            uuid PK
  session_id    uuid FK sessions
  pseudo        text
  team          enum               -- 'red' | 'blue' | null
  is_host       boolean
  is_connected  boolean            -- synchronisé via Presence
  joined_at     timestamptz

rounds
  id            uuid PK
  session_id    uuid FK sessions
  round_number  int
  game_type     text
  config        jsonb              -- paramètres spécifiques au jeu
  started_at    timestamptz
  ended_at      timestamptz

scores
  id            uuid PK
  round_id      uuid FK rounds
  player_id     uuid FK players
  points        int
  metadata      jsonb              -- données brutes (taps, reaction_ms, etc.)

questions
  id            uuid PK
  game_type     text               -- 'quiz' | 'true_false' | 'order' | 'geo'
  content       text               -- question, affirmation ou URL image
  options       jsonb              -- choix possibles
  answer        jsonb              -- bonne(s) réponse(s)
  difficulty    enum               -- 'easy' | 'medium' | 'hard'
  category      text
  created_at    timestamptz
```

**Notes :**
- RLS activé : un joueur ne peut accéder qu'aux données de ses propres sessions
- `config` en jsonb permet à chaque jeu d'avoir ses propres paramètres sans modifier le schéma
- `metadata` en jsonb permet un podium détaillé par manche

---

## Système temps réel — Broadcast

**Un channel par partie :** `game:{code}`

```
HOST → CLIENTS
  host:game_start     { games_order, total_rounds, teams? }
  host:round_start    { round_number, game_type, config, started_at }
  host:round_end      { round_number, scores[] }
  host:game_end       { final_scores[], ranking[] }
  host:team_assign    { assignments: { player_id: 'red'|'blue' }[] }

CLIENTS → HOST (+ broadcast)
  player:join         { player_id, pseudo }
  player:answer       { player_id, round_id, value, timestamp }
  player:tap          { player_id, count }
  player:motion_score { player_id, intensity }
  player:ready        { player_id }

SYSTÈME (Supabase gère)
  presence:sync / presence:join / presence:leave
```

**Reconnexion :** à la reconnexion, le client fetch `sessions` + `players` + `rounds` depuis la DB pour reconstruire son état, puis rejoint le channel Broadcast. Un badge "Reconnecté" s'affiche.

**Host déconnecté :** après 15 secondes sans reconnexion du host, la session est marquée `finished` et les joueurs voient les scores partiels.

**Joueur arrivant en cours de partie :** affichage "Partie en cours — tu rejoindras à la prochaine manche".

---

## Architecture des mini-jeux

Structure modulaire dans `src/games/` :

```
src/games/
├── registry.ts          -- liste des jeux disponibles
├── types.ts             -- interface GameModule + GameProps
├── quiz/
├── reflex/
├── tap-spam/
├── mental-math/
├── memory/
├── moving-target/
├── true-false/
├── order-logic/
├── shake-it/
└── geo-guess/
```

**Contrat commun `GameModule` :**

```ts
interface GameModule {
  id: string
  label: string
  icon: string
  defaultDuration: number       // secondes
  minPlayers: number
  generateConfig(questions: Question[]): RoundConfig
  computeScore(submission: PlayerSubmission, config: RoundConfig): number
  Component: React.FC<GameProps>
}

interface GameProps {
  config: RoundConfig
  player: Player
  timeLeft: number
  onSubmit: (value: unknown) => void
  isHost: boolean
}
```

Ajouter un nouveau jeu = créer un dossier respectant ce contrat. Aucun autre fichier à modifier.

---

## Mini-jeux MVP

| Jeu | Mécanique | Durée | Anti-triche |
|-----|-----------|-------|-------------|
| Quiz | QCM, score = justesse + rapidité | 20s/question | Réponse unique par joueur |
| Calcul mental | Calcul généré dynamiquement, réponse libre | 15s | Réponse unique |
| Réflexe | Cliquer quand la couleur change | 10s | Logique client, score soumis une fois |
| Tap spam | Tapper le plus vite possible | 10s | Edge Function : max 20 taps/s |
| Memory | Trouver les paires, score inversement proportionnel aux coups | 60s | Logique client |
| Cible mouvante | Toucher les cibles qui apparaissent | 30s | Logique client |
| Vrai ou Faux | Affirmations insolites, justesse + rapidité | 10s/question | Réponse unique |
| Ordre logique | Remettre en ordre, score partiel | 30s | Logique client |
| Shake it | Secouer le téléphone (DeviceMotion API) | 10s | Edge Function : plafond d'intensité |
| GeoGuess lite | Photo d'un lieu → 4 choix pays/ville | 20s | Réponse unique |

**Note Shake it :** iOS 13+ nécessite une demande de permission explicite avant le jeu. Écran intermédiaire "Autorise l'accès au mouvement" à prévoir.

---

## Flow de partie

```
[ACCUEIL]
  ├── Créer → génère code 6 lettres → [LOBBY HOST]
  └── Rejoindre → code + pseudo → [LOBBY JOUEUR]

[LOBBY]
  ├── Présence temps réel des joueurs (Supabase Presence)
  ├── Suggestion : "Pour X joueurs et Y min → Z manches recommandées"
  ├── Host configure : durée, liste jeux, mode équipe (solo/auto/manuel)
  ├── Mode équipe manuel : joueurs swipent gauche (rouge) / droite (bleu)
  └── Host lance la partie

[LANCEMENT]
  └── Si équipes → splash 5s "Tu es dans l'équipe 🔴 Rouge !"

[MANCHE]
  ├── Écran jeu + timer + HUD (score perso, badge équipe)
  ├── Joueur soumet via onSubmit()
  └── Timer → 0 → host calcule → broadcast host:round_end

[INTER-MANCHE] (3s)
  └── Classement rapide de la manche → manche suivante

[FIN DE PARTIE]
  ├── Mode solo  : podium top 3 + classement complet tous joueurs
  └── Mode équipe : banner équipe gagnante + classement mélangé
                    avec fond coloré par équipe (rouge/bleu)
  └── Bouton "Rejouer" (recrée session avec mêmes joueurs)
```

---

## Système de score

| Jeu | Points max | Bonus |
|-----|-----------|-------|
| Quiz | 100 pts | +50 pts rapidité |
| Vrai ou Faux | 100 pts | +50 pts rapidité |
| Calcul mental | 80 pts | +40 pts rapidité |
| Réflexe | 150 pts | décroissant selon temps réaction |
| Cible mouvante | 150 pts | décroissant selon temps réaction |
| Tap spam | 100 pts (1er) → 10 pts (dernier) | — |
| Shake it | 100 pts (1er) → 10 pts (dernier) | — |
| Memory | 100 pts | inversement proportionnel aux coups |
| GeoGuess lite | 100 pts | +50 pts rapidité |
| Ordre logique | 100 pts (tout bon) | score partiel proportionnel |

**Mode équipe :** score équipe = somme des scores individuels des membres.  
**HUD :** score perso + score équipe affichés en temps réel pendant le jeu.

---

## Admin panel

**Accès :** `/admin/dashboard` (URL obscure)  
**Auth :** Supabase Auth, 1 compte admin créé manuellement. Middleware Next.js protège `/admin/*`.

**Fonctionnalités :**
- Vue d'ensemble : nb questions par type, stats basiques
- CRUD questions (quiz, vrai/faux, ordre logique, géoguess)
- Upload images GeoGuess → Supabase Storage
- Formulaires adaptés par `game_type`

**Évolution V2 :** la base Supabase Auth est prête pour ajouter des comptes joueurs (compte optionnel) sans refonte.

---

## Vérification / Test

1. **Lobby** : ouvrir deux onglets, créer une partie sur le premier, rejoindre sur le second → vérifier la présence en temps réel
2. **Lancement** : host lance → les deux clients passent en `/game/[code]` simultanément
3. **Manche** : jouer un quiz → vérifier que les scores apparaissent en inter-manche
4. **Reconnexion** : fermer et rouvrir l'onglet joueur pendant une manche → vérifier la récupération d'état
5. **Équipes** : mode équipe auto → vérifier le splash d'assignation + le HUD
6. **Fin de partie** : vérifier podium solo et podium équipe avec les bons fonds colorés
7. **Admin** : accéder à `/admin/dashboard` sans auth → vérifier redirect vers `/admin/login`
8. **Shake it** : tester sur mobile iOS → vérifier la demande de permission DeviceMotion
