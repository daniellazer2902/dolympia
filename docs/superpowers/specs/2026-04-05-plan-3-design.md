# dolympia — Plan 3 : V1 Polish + Nouveaux Jeux + GeoGuess

**Date :** 2026-04-05
**Statut :** Approuvé

---

## Objectif

Finaliser la V1 (admin panel, animations), ajouter 5 nouveaux mini-jeux interactifs multijoueur, et rendre GeoGuess fonctionnel avec stockage d'images sur Supabase Storage.

---

## Partie 1 : V1 Polish

### 1.1 — Admin Panel CRUD

**Route :** `/admin/dashboard` (existante, actuellement placeholder)
**Auth :** middleware existant (`/admin/login` + Supabase Auth)

**Fonctionnalités :**

- **Vue d'ensemble** : nombre de questions par `game_type`, total global
- **Liste des questions** : tableau filtrable par `game_type`, `difficulty`, `category`, avec pagination
- **Créer une question** : formulaire adapté au `game_type` sélectionné
  - Quiz : `content` (texte), `options` (4 choix), `answer` (le bon choix), `difficulty`, `category`
  - Vrai ou Faux : `content` (affirmation), `answer` (true/false), `difficulty`, `category`
  - Ordre logique : `content` (consigne), `options` (éléments à ordonner), `answer` (ordre correct en array), `difficulty`, `category`
  - GeoGuess : `content` (URL image Supabase Storage), `options` (4 choix pays/ville), `answer` (le bon choix), `difficulty`, `category`
  - Calcul mental : pas de questions en DB (générées dynamiquement) — non affiché dans l'admin
- **Modifier une question** : même formulaire, pré-rempli
- **Supprimer une question** : confirmation avant suppression
- **Upload image GeoGuess** : champ file dans le formulaire GeoGuess, upload vers Supabase Storage bucket `geo-images`, URL publique stockée dans `content`
- **Mots Draw & Guess** : section séparée pour gérer les mots imposés (CRUD simple : texte + catégorie). Stockés dans une nouvelle table `draw_words`.
- **Mots Mot Commun** : section séparée pour gérer les paires de mots. Stockés dans une nouvelle table `word_pairs`.

**Composants :**

```
src/app/admin/dashboard/
├── page.tsx                    # Layout avec onglets (Questions, GeoGuess Images, Draw Words, Word Pairs)
├── components/
│   ├── QuestionList.tsx        # Tableau filtrable + pagination
│   ├── QuestionForm.tsx        # Formulaire adaptatif par game_type
│   ├── GeoGuessUploader.tsx    # Upload image + preview
│   ├── DrawWordList.tsx        # CRUD mots Draw & Guess
│   ├── WordPairList.tsx        # CRUD paires Mot Commun
│   └── StatsOverview.tsx       # Compteurs par type
```

### 1.2 — Animations (Framer Motion)

**Dépendance :** `framer-motion` à installer.

**Animations ciblées :**

| Endroit | Animation |
|---------|-----------|
| `RoundTransition.tsx` | Scores apparaissent en cascade (stagger), barre de score qui grandit |
| `GameContainer.tsx` | Transition fade-in entre les jeux |
| `results/[code]/page.tsx` | Podium qui monte de bas en haut (scale-up), confettis pour le 1er |
| Lobby `PlayerList.tsx` | Joueurs qui arrivent avec un slide-in |
| Composants de jeu | Feedback visuel submit (scale bounce) |

Pas de sons. Pas de vibrations/haptique.

---

## Partie 2 : Nouveaux Mini-Jeux (5)

### Architecture commune

Les 5 nouveaux jeux respectent le contrat `GameModule` existant. Cependant, 3 d'entre eux (Point Rush, Territory, Pierre-Feuille-Ciseaux) nécessitent des **broadcasts temps réel pendant le round** (pas juste une soumission finale). Pour ces jeux, le composant utilise directement `useChannel` en plus du `onSubmit` standard.

**Nouveaux event types à ajouter dans `GameEventType` :**

```ts
| 'player:grid_click'     // Point Rush : joueur clique une case
| 'host:grid_state'       // Point Rush + Territory : état complet de la grille (broadcast 500ms)
| 'player:territory_click'// Territory : joueur colorie une case
| 'player:rps_choice'     // PFC : choix pierre/feuille/ciseau
| 'host:rps_result'       // PFC : résultat d'une manche
| 'player:vote'           // Draw & Guess : vote pour un dessin
```

**Nouvelles tables DB :**

```sql
draw_words
  id            uuid PK
  word          text NOT NULL
  category      text
  created_at    timestamptz DEFAULT now()

word_pairs
  id            uuid PK
  word_a        text NOT NULL
  word_b        text NOT NULL
  category      text
  created_at    timestamptz DEFAULT now()
```

---

### 2.1 — Pierre-Feuille-Ciseaux (`rock-paper-scissors`)

**Mécanique :**
- Au début du round, le host forme des paires aléatoires parmi les joueurs
- Si nombre impair : le joueur restant ne joue pas et reçoit automatiquement 40 points + message comique ("Médaille de la solitude", "Champion par forfait", etc.)
- Chaque paire joue en best of 3 (max 3 manches)
- 5 secondes par manche pour choisir pierre/feuille/ciseau
- Si un joueur ne répond pas dans les 5s → il perd la manche automatiquement
- Scoring : 20 points par manche gagnée + 10 points bonus si victoire du best of 3

**Flow broadcast :**
1. Host broadcast `host:round_start` avec `config.pairs` (array de `[playerA_id, playerB_id]`) et `config.soloPlayer` (id du joueur solo ou null)
2. Les joueurs voient leur adversaire et font leur choix → broadcast `player:rps_choice` au host
3. Le host attend les 2 choix (ou timeout 5s) → broadcast `host:rps_result` avec le résultat de la manche
4. Après max 3 manches (ou victoire anticipée 2-0), le host calcule les scores finaux

**`computeScore` :** Le host accumule les résultats des manches côté local. À la fin, chaque joueur a un score = `(manches gagnées * 20) + (victoire best of 3 ? 10 : 0)`. Le joueur solo = 40pts.

**Config :**
```ts
{
  duration: 30, // durée totale max (3 manches * 5s + transitions)
  pairs: [string, string][],
  soloPlayer: string | null,
}
```

**Composant :** Affiche l'adversaire, les 3 boutons (🪨📄✂️), countdown 5s, résultat de chaque manche, score courant du duel.

---

### 2.2 — Point Rush (`point-rush`)

**Mécanique :**
- Grille partagée en temps réel (~8x6 = 48 cases)
- Des points apparaissent aléatoirement sur la grille toutes les ~800ms et restent 2 secondes
- Types de points : `+5` (rare, vert foncé), `+2` (commun, vert), `+1` (très commun, vert clair), `÷2` (rare, rouge — divise le score du round par 2)
- Premier joueur à cliquer capture le point (les autres voient la case disparaître)
- Durée : 20 secondes

**Architecture temps réel :**
- Le **host** génère la séquence de spawns (positions + types + timestamps) dans `generateConfig` et l'inclut dans la config. Ceci garantit que tous les clients voient les mêmes spawns.
- Quand un joueur clique un point → broadcast `player:grid_click` `{ playerId, cellIndex, spawnId }`
- Le host valide (premier arrivé gagne) et broadcast `host:grid_state` toutes les 500ms avec l'état complet : quelles cellules sont prises et par qui
- Côté client : **optimisme local** — le joueur voit immédiatement sa capture, corrigée au prochain `host:grid_state` si quelqu'un a cliqué avant

**`computeScore` :** Le host maintient un score par joueur dans le round. À la fin, `onSubmit` est appelé avec le score final. `computeScore` retourne directement `submission.value` (le score déjà calculé par le host).

**Config :**
```ts
{
  duration: 20,
  gridSize: { rows: 8, cols: 6 },
  spawns: Array<{ id: string, row: number, col: number, type: '+5'|'+2'|'+1'|'÷2', spawnAt: number, expiresAt: number }>,
}
```

---

### 2.3 — Territory (`territory`)

**Mécanique :**
- Grille partagée 10x10 (100 cases)
- Chaque joueur a une couleur unique (assignée au début du round, palette de 10 couleurs prédéfinies)
- Cliquer une case vide → elle prend ta couleur (1 clic)
- Cliquer une case d'un adversaire → elle prend ta couleur (1 clic, écrasement autorisé)
- Cliquer ta propre case → rien
- Durée : 20 secondes
- Score = nombre de cases à ta couleur à la fin × 3 points

**Architecture temps réel (sync optimiste) :**
1. Le joueur clique → coloration **immédiate** côté client (optimiste)
2. Broadcast `player:territory_click` `{ playerId, cellIndex }` vers le host
3. Le host maintient l'état authoritatif de la grille (dernière écriture gagne, basé sur l'ordre de réception)
4. Le host broadcast `host:grid_state` `{ grid: string[] }` (tableau de 100 éléments, chaque élément = playerId ou null) toutes les 500ms
5. Le client remplace son état local par l'état du host à chaque sync → corrige les conflits

**`computeScore` :** Host compte les cases par joueur dans la grille finale. `submission.value` = nombre de cases possédées. Score = `value * 3`.

**Config :**
```ts
{
  duration: 20,
  gridSize: 10,
  playerColors: Record<string, string>, // playerId → couleur hex
}
```

---

### 2.4 — Draw & Guess (`draw-guess`)

**Mécanique :**
- Phase 1 — Dessin (60s) : chaque joueur voit un mot imposé (même mot pour tous) et dessine sur un canvas
- Phase 2 — Vote (9s par dessin) : les dessins sont affichés en timelapse anonyme un par un, chaque joueur vote pour chaque dessin (sauf le sien) avec un bouton 👍
- Phase 3 — Reveal : affichage de tous les dessins avec le nom de l'auteur et le nombre de votes

**Scoring :** Chaque vote reçu = 25 points. Le joueur avec le plus de votes reçoit un bonus de 25 points supplémentaires.

**Données :**
- Mots stockés dans la table `draw_words` (30+ mots en seed initial)
- Le host pioche 1 mot aléatoirement via `generateConfig`
- Les dessins sont des données canvas (strokes) stockées temporairement côté client, pas en DB

**Flow :**
1. `host:round_start` avec `config.word` (le mot à dessiner)
2. Phase dessin : chaque joueur dessine localement (pas de broadcast pendant le dessin)
3. À la fin du timer dessin (60s), chaque joueur broadcast `player:answer` avec `{ strokes: DrawStroke[] }` (liste de traits)
4. Le host collecte tous les dessins et broadcast la phase de vote
5. Pendant le vote : les joueurs broadcast `player:vote` `{ targetPlayerId }` pour chaque dessin liké
6. Après tous les dessins vus : le host calcule les scores et broadcast `host:round_end`

**Canvas :**
- Canvas HTML5 tactile/souris
- Trait noir, épaisseur 3px
- Un bouton "Effacer" pour recommencer
- Les strokes sont enregistrés comme `Array<{ points: [number, number][] }>` (chaque stroke = liste de coordonnées normalisées 0-1)
- Le timelapse rejoue les strokes en accéléré (~5s pour 60s de dessin)

**Config :**
```ts
{
  duration: 60, // phase dessin
  word: string,
  voteDuration: 9, // secondes par dessin lors du vote
}
```

**Note :** Ce jeu a un flow multi-phase (dessin → vote → reveal) contrairement aux autres jeux. Le composant gère les phases en interne via un state local. Le timer `useTimer` gère la phase dessin (60s). Les phases vote et reveal sont gérées par des timers internes au composant.

---

### 2.5 — Mot Commun (`common-word`)

**Mécanique :**
- Deux mots s'affichent (ex: "Soleil" + "Plage")
- Chaque joueur a 15 secondes pour écrire UN mot qui relie les deux
- À la fin du timer, les réponses sont comparées
- Scoring : 20 points par match (même mot qu'un autre joueur, comparaison case-insensitive + trim)
- Reveal : affichage de tous les mots soumis, groupés par valeur, avec le nombre de matchs

**Données :**
- Paires de mots stockées dans la table `word_pairs` (30+ paires en seed initial)
- Le host pioche 1 paire via `generateConfig`

**Flow :**
1. `host:round_start` avec `config.wordA` et `config.wordB`
2. Les joueurs tapent et soumettent via `player:answer` `{ value: "string" }`
3. Le host collecte, normalise (lowercase + trim), et calcule les matchs

**`computeScore` :** Le host compare les réponses de tous les joueurs. Pour chaque paire de joueurs ayant le même mot (après normalisation), chacun reçoit 20 points. Un joueur avec 3 matchs = 60 points.

**Note :** `computeScore` ne peut pas fonctionner en isolation (il a besoin de toutes les soumissions pour compter les matchs). Le calcul se fait donc dans `endRound` du `useGameEngine`, similaire au pattern existant mais avec une logique custom. Le `computeScore` du module retourne 0 (placeholder) et le scoring réel est fait dans `endRound` en détectant `gameType === 'common-word'`.

**Config :**
```ts
{
  duration: 15,
  wordA: string,
  wordB: string,
}
```

---

## Partie 3 : GeoGuess Fonctionnel

### 3.1 — Supabase Storage

**Bucket :** `geo-images` (public)
- Créé manuellement dans le dashboard Supabase (comme le projet lui-même)
- Policy : lecture publique (anon), écriture authentifiée uniquement (admin)

**Workflow admin :**
1. L'admin sélectionne `game_type: geo-guess` dans le formulaire
2. Un champ file apparaît pour uploader l'image
3. L'image est uploadée vers `geo-images/{uuid}.{ext}` via `supabase.storage.from('geo-images').upload()`
4. L'URL publique est obtenue via `getPublicUrl()` et stockée dans `questions.content`

**Workflow jeu :**
- Le composant `GeoGuessGame` affiche l'image via une balise `<img>` avec l'URL publique depuis `config.questions[0].content`
- C'est déjà le comportement actuel — il suffit que `content` contienne une URL valide

### 3.2 — Seed initial

Prévoir 10-15 questions GeoGuess avec des images libres de droits (paysages reconnaissables). Les images seront uploadées manuellement par l'utilisateur via l'admin panel après le déploiement. Le seed SQL contiendra les questions textuelles (options, réponses) avec `content` en placeholder (`'TODO: upload image'`) que l'admin remplira.

---

## Résumé des modifications DB

### Nouvelles tables

```sql
CREATE TABLE draw_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE word_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a text NOT NULL,
  word_b text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- RLS : lecture publique, écriture admin seulement
ALTER TABLE draw_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "draw_words_read" ON draw_words FOR SELECT USING (true);
CREATE POLICY "draw_words_write" ON draw_words FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "word_pairs_read" ON word_pairs FOR SELECT USING (true);
CREATE POLICY "word_pairs_write" ON word_pairs FOR ALL USING (auth.role() = 'authenticated');
```

### Supabase Storage

```sql
-- Bucket geo-images (à créer via dashboard Supabase)
-- Policy lecture publique :
CREATE POLICY "geo_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'geo-images');
-- Policy écriture admin :
CREATE POLICY "geo_images_auth_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'geo-images' AND auth.role() = 'authenticated');
```

---

## Résumé des nouveaux GameModule IDs

| ID | Label | Durée | Catégorie |
|----|-------|-------|-----------|
| `rock-paper-scissors` | Pierre-Feuille-Ciseaux | 30s | Duel |
| `point-rush` | Point Rush | 20s | Compétition directe |
| `territory` | Territory | 20s | Compétition directe |
| `draw-guess` | Draw & Guess | 60s + vote | Créatif/Social |
| `common-word` | Mot Commun | 15s | Social |

Le `GAME_IDS` dans `registry.ts` passera de 10 à 15 jeux.

---

## Carte des nouveaux fichiers

```
src/
├── games/
│   ├── rock-paper-scissors/
│   │   ├── index.ts
│   │   └── RPSGame.tsx
│   ├── point-rush/
│   │   ├── index.ts
│   │   └── PointRushGame.tsx
│   ├── territory/
│   │   ├── index.ts
│   │   └── TerritoryGame.tsx
│   ├── draw-guess/
│   │   ├── index.ts
│   │   ├── DrawGuessGame.tsx
│   │   └── DrawCanvas.tsx          # Composant canvas réutilisable
│   └── common-word/
│       ├── index.ts
│       └── CommonWordGame.tsx
│
├── app/admin/dashboard/
│   ├── page.tsx                    # Refonte complète
│   └── components/
│       ├── QuestionList.tsx
│       ├── QuestionForm.tsx
│       ├── GeoGuessUploader.tsx
│       ├── DrawWordList.tsx
│       ├── WordPairList.tsx
│       └── StatsOverview.tsx
│
└── lib/supabase/
    ├── draw-words.ts               # Service fetch/CRUD draw_words
    └── word-pairs.ts               # Service fetch/CRUD word_pairs
```

---

## Ce qui est hors scope

- Sons / audio
- Edge Functions anti-triche
- Vibrations / retour haptique
- Comptes joueurs (V2)
- PWA
- Statistiques / historique des parties
- Déploiement Vercel (séparé)
