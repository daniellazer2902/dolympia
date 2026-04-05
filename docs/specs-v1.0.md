# dolympia -- Specs V1.0

**Date :** 2026-04-04
**Statut :** Post-implementation -- documentation de l'existant

---

## 1. Architecture actuelle

### Stack

| Couche | Choix |
|--------|-------|
| Frontend | Next.js 14 App Router, React, TypeScript |
| State management | Zustand (2 stores : `session.store` + `game.store`) |
| Temps reel | Supabase Realtime Broadcast + Presence |
| Base de donnees | Supabase (PostgreSQL) |
| Hebergement | Vercel |

### Broadcast -- systeme d'evenements

Un channel Supabase par partie : `game:{code}`

**HOST vers CLIENTS :**

| Event | Payload | Quand |
|-------|---------|-------|
| `host:game_start` | `{ games_order, total_rounds, teams? }` | Le host lance la partie depuis le lobby |
| `host:round_start` | `{ round_number, game_type, config, started_at, round_id, games_order }` | Debut de chaque manche |
| `host:round_end` | `{ round_number, scores[] }` | Fin de manche, scores calcules |
| `host:game_end` | `{}` | Derniere manche terminee |
| `host:config_update` | `{ mode, teamMode }` | Host change la config dans le lobby |
| `host:game_go` | `{}` | Signal de navigation (mode equipe apres splash) |

**CLIENTS vers HOST :**

| Event | Payload | Quand |
|-------|---------|-------|
| `player:answer` | `{ player_id, value, timestamp }` | Le joueur soumet sa reponse |

### CRITIQUE : Le host ne recoit PAS son propre broadcast

Supabase Broadcast ne renvoie pas les messages a l'emetteur. Consequence : **toute action du host qui broadcast doit aussi mettre a jour le store local manuellement.**

Exemples dans le code actuel :
- `startGame()` : apres `send('host:game_start')`, le host gere lui-meme le splash equipe ou la navigation
- `endRound()` : le host appelle `setRoundScores()`, `accumulateScores()`, `setPhase('inter_round')` localement avant de broadcast
- `endGame()` : le host met `setPhase('finished')` localement, puis un `useEffect` detecte `phase === 'finished'` pour naviguer vers `/results`
- `startRound()` : le host appelle `setCurrentRound()` et `setPhase('playing')` localement

### useChannel -- le hook de broadcast

```typescript
useChannel(code, handlers)
```

- Cree/detruit un channel `game:{code}` sur mount/unmount
- Les handlers sont stockes dans une ref (pas de recreation du channel quand les handlers changent)
- Le dispatch se fait sur `msg.event` (pas `msg.type` -- `msg.type` est toujours `"broadcast"` dans Supabase)
- `send(type, payload)` envoie via `channel.send({ type: 'broadcast', event: type, payload })`

---

## 2. Flow de jeu complet

### Etape 1 : Accueil (`/`)

Le joueur peut :
- **Creer une partie** : genere un code 6 lettres, cree une session et un joueur host dans la DB, redirige vers `/lobby/{code}`
- **Rejoindre** : saisit un code + pseudo, cree un joueur dans la DB, redirige vers `/lobby/{code}`
- **Lien direct** : `/invite/{code}` demande uniquement le pseudo

### Etape 2 : Lobby (`/lobby/[code]`)

- **Poll DB toutes les 2s** pour synchroniser joueurs et session (filet de securite en plus du broadcast)
- **Presence Supabase** pour afficher qui est connecte en temps reel
- **Prefetch** de `/game/{code}` des l'entree dans le lobby

**Host uniquement :**
- Configure : nombre de manches (5/10/15/20), mode (solo/equipe), assignation equipes (auto/manuel)
- Les changements de config sont persistes en DB + broadcast via `host:config_update`
- Bouton "Lancer la partie" declenche `handleStart()` :
  1. Persiste la config finale en DB
  2. Appelle `startGame()` du game engine

**Joueurs non-host :**
- Voient la liste des joueurs et la config
- Attendent le broadcast `host:game_start`
- Mode equipe : recoivent le splash d'equipe (5s countdown)
- Mode solo : navigation directe vers `/game/{code}`

### Etape 3 : startGame() -- dans useGameEngine

1. Shuffle les GAME_IDS, en prend `total_rounds`
2. Si mode equipe : assigne les equipes (auto ou completion des choix manuels), persiste en DB
3. Met a jour la session en DB (`status: 'playing'`, `games_order`)
4. Broadcast `host:game_start`
5. `setTimeout` pour lancer `startRound(gamesOrder, 0)` :
   - **Mode equipe** : delai 6s (le temps du splash equipe)
   - **Mode solo** : delai 1s

### Etape 4 : startRound() -- debut de manche

1. Determine le `gameType` depuis `gamesOrder[roundIndex]`
2. Fetch les questions depuis la DB si le jeu en a besoin (quiz, true-false, mental-math, order-logic, geo-guess)
3. Appelle `gameModule.generateConfig(questions)` pour produire la config
4. Insere le round en DB (`rounds` table)
5. Vide les submissions precedentes
6. Met a jour le store local (host ne recoit pas son broadcast)
7. Broadcast `host:round_start`

### Etape 5 : Partie en cours (`/game/[code]`)

**GamePage** ecoute les broadcasts :
- `host:round_start` : met a jour le store, passe en phase `playing`
- `host:round_end` : accumule les scores, passe en phase `inter_round`
- `host:game_end` : navigue vers `/results/{code}`
- `player:answer` : le host enregistre les soumissions

**Filet de securite non-host** : poll DB toutes les secondes si la phase n'est ni `playing` ni `inter_round` ni `finished`. Cherche un round actif (sans `ended_at`). Permet de rattraper un broadcast rate.

**Soumission d'une reponse :**
1. Le composant du jeu appelle `onSubmit(value)`
2. `handleSubmit()` appelle `receiveSubmission(localPlayer.id, value)` (stocke localement)
3. Broadcast `player:answer` avec `{ player_id, value, timestamp }`

### Etape 6 : Timer et fin de manche

Le `useTimer` hook gere le countdown :
1. Decremente `timeLeft` chaque seconde
2. Quand `timeLeft` atteint 0, attend **800ms supplementaires** avant d'appeler `onEnd`
3. Ce delai permet aux jeux d'auto-soumettre leur reponse quand `timeLeft <= 0`

`onEnd` declenche `handleRoundEnd()` qui :
- Verifie que c'est bien le host (via `useSessionStore.getState()`, pas une closure)
- Appelle `endRound(roundId, gamesOrder, roundIndex)`

### Etape 7 : endRound() -- calcul des scores

1. Pour chaque joueur, recupere sa soumission depuis `submissionsRef`
2. Appelle `gameModule.computeScore(submission, config)` pour obtenir les points bruts
3. **Ajoute le bonus de rang** : trie les joueurs par score decroissant, puis `bonus = (playerCount - rank) * 5`
   - Exemple avec 4 joueurs : 1er +20, 2eme +15, 3eme +10, 4eme +5
4. Insere les scores en DB (`scores` table)
5. Met a jour `ended_at` sur le round en DB
6. Met a jour le store local (host)
7. Broadcast `host:round_end` avec les scores
8. `setTimeout(3000)` :
   - S'il reste des manches : `startRound(gamesOrder, nextIndex)`
   - Sinon : `endGame()`

### Etape 8 : endGame()

1. Met a jour la session en DB (`status: 'finished'`)
2. Met la phase a `finished` dans le store
3. Broadcast `host:game_end`
4. Tous les clients naviguent vers `/results/{code}`

### Etape 9 : Resultats (`/results/[code]`)

Affiche le podium et le classement final base sur les scores accumules.

---

## 3. Systeme de scoring

### computeScore -- par jeu

Chaque `GameModule` implemente `computeScore(submission, config)` qui retourne un nombre de points bruts.

**Helpers partages (scoring.ts) :**

- `scoreWithSpeedBonus({ correct, timeLeft, totalTime, base, bonus })` : si correct, retourne `base + round((timeLeft/totalTime) * bonus)`. Si incorrect, retourne 0.
- `scoreByRank(rank, totalPlayers)` : interpolation lineaire de 100 (1er) a 10 (dernier). Non utilise actuellement dans les computeScore individuels.
- `answerEquals(submitted, answer)` : compare une soumission a la reponse DB en gerant le double-jsonb (voir warning ci-dessous).
- `scorePartial(correct, total, max)` : score proportionnel au nombre de bonnes positions.

### Bonus de rang (dans endRound)

Apres le calcul par jeu, un **bonus de rang** est ajoute a tous les joueurs :

```
bonus = max(0, (playerCount - rank) * 5)
```

Ou `rank` est la position (0-indexed) dans le tri decroissant des scores bruts. Ce bonus recompense les meilleurs meme dans les jeux ou les scores bruts sont proches.

### answerEquals() -- gestion du double-jsonb

Les colonnes `answer` et `options` dans la table `questions` sont de type `jsonb`. Quand Supabase retourne ces donnees :
- Elles sont **deja parsees** en objets/tableaux JavaScript
- **NE PAS appeler `JSON.parse()` dessus** -- ca crasherait ou donnerait un resultat faux

Cependant, il arrive que certaines valeurs soient stockees comme des strings JSON dans le jsonb (double-encodage). `answerEquals()` gere ce cas :
1. Si `answer` est un string, tente `JSON.parse()` dessus
2. Si le parse echoue, garde le string tel quel
3. Compare ensuite par `===` (strings) ou `JSON.stringify` (objets/arrays)

---

## 4. WARNINGS CRITIQUES pour le developpement de nouveaux jeux

### W1 : Pas de side effects dans un state updater React

```typescript
// INTERDIT -- side effect dans setTimeLeft
setTimeLeft((prev) => {
  if (prev <= 1) {
    onEnd() // side effect dans un state updater = bugs imprevisibles
    return 0
  }
  return prev - 1
})
```

Le timer actuel decremente dans le state updater mais appelle `onEnd` dans un `useEffect` separe qui detecte `timeLeft <= 0`.

### W2 : Le timer appelle onEnd 800ms APRES timeLeft=0

Le `useTimer` attend 800ms apres que `timeLeft` atteint 0 avant d'appeler `onEnd`. Ce delai est intentionnel : il laisse le temps aux jeux de detecter `timeLeft <= 0` et d'auto-soumettre leur reponse.

**Consequence pour les jeux timer-based :** le composant du jeu doit auto-soumettre quand `disabled || timeLeft <= 0`, AVANT que le host ne calcule les scores.

### W3 : Utiliser des REFS pour les soumissions, pas des states React

Les jeux qui auto-soumettent a `timeLeft=0` doivent stocker leur valeur courante dans une **ref**, pas un state. Sinon la closure du `useEffect` capture une valeur stale.

```typescript
// CORRECT
const answerRef = useRef(null)
useEffect(() => {
  if (disabled || timeLeft <= 0) {
    onSubmit(answerRef.current)
  }
}, [disabled, timeLeft])

// FAUX -- answer est stale dans la closure
const [answer, setAnswer] = useState(null)
useEffect(() => {
  if (disabled || timeLeft <= 0) {
    onSubmit(answer) // closure stale !
  }
}, [disabled, timeLeft])
```

### W4 : Le host ne recoit pas ses propres broadcasts

Supabase Broadcast est fire-and-forget sans echo. Tout changement d'etat declenche par un broadcast du host doit AUSSI etre applique localement dans le code du host.

**Pattern obligatoire :**
```typescript
// 1. Mettre a jour le store local
setPhase('playing')
setCurrentRound(round)
// 2. PUIS broadcaster pour les autres
send('host:round_start', payload)
```

### W5 : Toujours await les DB writes

Les ecritures Supabase sont asynchrones. Un `await` manquant cree des race conditions (ex: le broadcast part avant que le round soit insere en DB, les clients fetchent un round qui n'existe pas encore).

```typescript
// CORRECT
const { data: round } = await supabase.from('rounds').insert({...}).select().single()
send('host:round_start', { round_id: round.id })

// FAUX
supabase.from('rounds').insert({...}) // fire-and-forget
send('host:round_start', { round_id: '???' }) // round pas encore en DB
```

### W6 : question.answer peut etre un string JSON ou une valeur parsee

Toujours utiliser `answerEquals()` de `scoring.ts` pour comparer une soumission a une reponse DB. Ne jamais faire `submission.value === question.answer` directement (sauf pour les booleans simples comme true-false).

Pour order-logic specifiquement, le code parse manuellement avec un guard :
```typescript
const answer: string[] = typeof rawAnswer === 'string'
  ? JSON.parse(rawAnswer)
  : rawAnswer as string[]
```

### W7 : Lire le state frais, pas les closures

Les callbacks dans `useGameEngine` et les handlers de page utilisent `useSessionStore.getState()` et `useGameStore.getState()` au lieu des valeurs des closures React, qui peuvent etre stale.

---

## 5. Liste des 10 mini-jeux

| # | ID | Label | Duree (s) | Scoring |
|---|-----|-------|-----------|---------|
| 1 | `quiz` | Quiz | 15 | `answerEquals` + speed bonus : base 100, bonus 50 |
| 2 | `true-false` | Vrai ou Faux | 10 | Comparaison directe + speed bonus : base 100, bonus 50 |
| 3 | `mental-math` | Calcul Mental | 12 | `Number()` comparaison + speed bonus : base 100, bonus 50 |
| 4 | `reflex` | Reflexe | 10 | Temps de reaction en ms. <200ms = 200pts, >1000ms = 10pts, interpolation lineaire entre |
| 5 | `tap-spam` | Tap Spam | 10 | 1 point par tap, max 200 |
| 6 | `memory` | Memory | 30 | 20 points par paire trouvee |
| 7 | `moving-target` | Cible Mouvante | 15 | 2 points par cible touchee |
| 8 | `order-logic` | Ordre Logique | 20 | 20 points par element bien place (score partiel) |
| 9 | `shake-it` | Shake It ! | 10 | 5 points par shake, max 200 |
| 10 | `geo-guess` | GeoGuess | 15 | `answerEquals` + speed bonus : base 100, bonus 50 |

**Rappel :** a tous ces scores bruts s'ajoute le **bonus de rang** : `(playerCount - rank) * 5` points.

### Jeux a questions (fetch DB)

Quiz, Vrai ou Faux, Calcul Mental, Ordre Logique, GeoGuess fetchent 3 questions depuis la DB via `fetchQuestions(gameType, 3)`. La config generee par `generateConfig()` inclut ces questions.

### Jeux purement client

Reflexe, Tap Spam, Memory, Cible Mouvante, Shake It ne fetchent pas de questions. Leur config ne contient que la duree.

---

## 6. Interfaces TypeScript cles

### GameModule

```typescript
interface GameModule {
  id: string
  label: string
  icon: string
  defaultDuration: number
  minPlayers: number
  generateConfig(questions: Question[]): RoundConfig
  computeScore(submission: PlayerSubmission, config: RoundConfig): number
  Component: React.ComponentType<GameProps>
}
```

### GameProps

```typescript
interface GameProps {
  config: RoundConfig
  playerId: string
  timeLeft: number
  onSubmit: (value: unknown) => void
  isHost: boolean
  disabled: boolean  // true quand le joueur a deja soumis
}
```

### PlayerSubmission

```typescript
interface PlayerSubmission {
  playerId: string
  value: unknown
  timestamp: number   // Date.now() quand le joueur a soumis
  startedAt: number   // Date.now() quand la manche a commence
}
```

### RoundConfig

```typescript
interface RoundConfig {
  duration: number
  questions?: Question[]
  [key: string]: unknown
}
```

---

## 7. Registre des jeux

Le fichier `src/games/registry.ts` maintient un `Map<string, GameModule>`. Les jeux sont enregistres au premier import via `initRegistry()`.

Pour ajouter un nouveau jeu :
1. Creer un dossier `src/games/{game-id}/` avec un `index.ts` exportant un `GameModule`
2. Ajouter l'import et `registerGame()` dans `registry.ts`
3. Ajouter l'ID dans le tableau `GAME_IDS`

Le `generateConfig()` est appele par le host dans `startRound()`. Le `computeScore()` est appele par le host dans `endRound()`. Le `Component` est rendu par `GameContainer` pendant la phase `playing`.
