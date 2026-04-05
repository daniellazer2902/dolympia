# dolympia — Patterns de jeux & Guide de broadcast

**Derniere mise a jour :** 2026-04-05

Ce document definit les patterns de communication des mini-jeux et sert de reference pour la creation de futurs jeux.

---

## Les 4 patterns

### Pattern A — Submit simple

**Jeux :** Quiz, Vrai ou Faux, Calcul Mental, GeoGuess, Mot Commun

**Principe :** Le joueur interagit avec l'UI et soumet UNE reponse. Pas de broadcast pendant le round. Le scoring se fait dans `endRound` via `computeScore`.

**Props utilisees :** `config`, `onSubmit`, `disabled`, `timeLeft` (optionnel)

**Regles :**
- `onSubmit(value)` est appele quand le joueur valide OU quand `disabled || timeLeft <= 0`
- La valeur soumise doit correspondre a ce que `computeScore` attend
- Pas besoin de `send`, `onBroadcast`, `isHost`, `onRoundComplete`

**Scoring :**
- Classique : `computeScore(submission, config)` retourne les points
- Exception Mot Commun : `computeScore` retourne 0, le scoring reel est dans `endRound` (besoin de comparer TOUTES les soumissions)

**Template :**
```tsx
export function MonJeu({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [answer, setAnswer] = useState(null)
  const submittedRef = useRef(false)
  const answerRef = useRef(answer)
  answerRef.current = answer

  // Auto-submit quand le temps expire
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(answerRef.current)  // REF, pas state (closure stale W3)
    }
  }, [disabled, timeLeft])

  function handleSubmit() {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit(answer)
  }
  // ...
}
```

---

### Pattern B — Accumulation + auto-submit

**Jeux :** Tap Spam, Shake It, Reflexe, Cible Mouvante, Memory, Ordre Logique

**Principe :** Le joueur accumule un score/compteur pendant le round (taps, clics, paires...). A l'expiration du timer, le score est auto-soumis. Pas de broadcast.

**Props utilisees :** `config`, `onSubmit`, `disabled`, `timeLeft`

**Regles :**
- TOUJOURS auto-submit sur `disabled || timeLeft <= 0` (pas uniquement `disabled` !)
- Le delai de 800ms dans `useTimer` entre `timeLeft=0` et `onRoundEnd` est prevu pour ca
- Stocker le score dans une REF, pas un state (W3 : closures stale)
- `computeScore` recoit la valeur soumise et retourne les points

**Template :**
```tsx
export function MonJeu({ config, timeLeft, onSubmit, disabled }: GameProps) {
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const submittedRef = useRef(false)

  // Auto-submit a l'expiration
  useEffect(() => {
    if ((disabled || timeLeft <= 0) && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(scoreRef.current)  // REF !
    }
  }, [disabled, timeLeft])

  function handleAction() {
    if (disabled || timeLeft <= 0) return
    const newScore = scoreRef.current + 10
    scoreRef.current = newScore
    setScore(newScore)
  }
  // ...
}
```

---

### Pattern C — Temps reel competitif (broadcast bidirectionnel)

**Jeux :** Pierre-Feuille-Ciseaux, Point Rush, Territory

**Principe :** Les joueurs interagissent en temps reel via des broadcasts. Le host arbitre et diffuse l'etat. Chaque joueur voit les actions des autres.

**Props utilisees :** `config`, `onSubmit`, `disabled`, `timeLeft`, `send`, `onBroadcast`, `isHost`, `playerId`

**Architecture :**
```
Joueur clique → send('player:xxx', payload) → Host recoit via onBroadcast
                                             → Host met a jour l'etat autoritatif
                                             → Host broadcast send('host:xxx', etat) toutes les 500ms
                                             → Tous les joueurs recoivent l'etat
```

**Regles CRITIQUES :**

1. **W4 — Host self-echo :** Supabase ne renvoie PAS les broadcasts a l'emetteur. Quand le host fait une action (clic, choix), IL FAUT aussi mettre a jour l'etat autoritatif localement.
   ```tsx
   function handleClick() {
     // 1. Mise a jour optimiste locale (UI)
     setLocalState(...)
     // 2. W4: Mise a jour de l'etat autoritatif SI host
     if (isHost) {
       authoritativeRef.current = ...
     }
     // 3. Broadcast pour les autres
     send?.('player:xxx', payload)
   }
   ```

2. **Host broadcast periodique :** L'etat complet (pas un delta) est broadcast toutes les 500ms via un `setInterval`. Les joueurs remplacent leur etat local par l'etat du host.
   ```tsx
   useEffect(() => {
     if (!isHost) return
     const interval = setInterval(() => {
       send?.('host:grid_state', { grid: authoritativeRef.current })
     }, 500)
     return () => clearInterval(interval)
   }, [isHost, send])
   ```

3. **Optimisme local :** Le joueur voit sa propre action immediatement (avant la confirmation du host). L'etat est corrige au prochain `host:grid_state` si necessaire.

4. **Pas de `useChannel` dans le composant :** Utiliser `send` et `onBroadcast` passes en props. Le channel unique est cree dans la game page.

5. **Registration via `onBroadcast` :** Enregistrer un handler dans un useEffect avec cleanup :
   ```tsx
   useEffect(() => {
     if (!onBroadcast) return
     const unsubscribe = onBroadcast((event, payload) => {
       if (event === 'player:xxx' && isHost) { /* arbitrage */ }
       if (event === 'host:xxx') { /* mise a jour etat */ }
     })
     return unsubscribe
   }, [onBroadcast, isHost, ...])
   ```

**Score :** `computeScore` recoit directement le score final (deja calcule par le host ou le composant). Retourne `submission.value as number`.

---

### Pattern D — Multi-phase orchestre

**Jeux :** Draw & Guess

**Principe :** Le jeu a plusieurs phases sequentielles (dessin → attente → vote → reveal) avec des broadcasts pour chaque transition. Le host orchestre les changements de phase. Le timer global est configure tres large (180s) car le composant gere son propre timing.

**Props utilisees :** `config`, `onSubmit`, `send`, `onBroadcast`, `isHost`, `onRoundComplete`

**Architecture :**
```
Phase 1 (dessin, 60s)     : timer interne, pas de broadcast
Phase 2 (attente, 2.5s)   : host attend les dessins des joueurs
Phase 3 (vote, 8s/dessin) : host broadcast les dessins un par un
Phase 4 (reveal, 5s)      : host broadcast les resultats → appelle onRoundComplete()
```

**Regles :**

1. **Timer interne :** Le composant gere son propre timer (pas `timeLeft` de GameContainer). La `duration` dans la config est juste un plafond de securite (180s).

2. **`onRoundComplete` :** A la fin de la derniere phase, le host appelle `onRoundComplete()` pour forcer `endRound()` dans le gameEngine. C'est le SEUL pattern qui utilise cette prop.

3. **W4 s'applique aussi :** Le host qui vote doit compter son vote localement (`votesRef`).

4. **Phases internes :** Gerees par un state local `phase`, pas par le store global. Le composant est autonome.

5. **Broadcasts specifiques :** Chaque transition de phase a son propre event broadcast :
   - `player:drawing` → host recoit les dessins
   - `host:draw_vote_phase` → tout le monde passe en mode vote
   - `player:vote` → host recoit les votes
   - `host:draw_reveal` → tout le monde voit les resultats + scores

---

## Checklist pour creer un nouveau jeu

### 1. Identifier le pattern

- Les joueurs soumettent UNE reponse ? → **Pattern A**
- Les joueurs accumulent un score pendant le round ? → **Pattern B**
- Les joueurs interagissent en temps reel et voient les actions des autres ? → **Pattern C**
- Le jeu a plusieurs phases distinctes avec des transitions ? → **Pattern D**

### 2. Creer les fichiers

```
src/games/{game-id}/
├── index.ts       # GameModule (id, label, icon, duration, generateConfig, computeScore, Component)
└── MonJeu.tsx     # Composant React
```

### 3. Respecter les warnings

| Warning | Regle |
|---------|-------|
| **W1** | Pas de side effects dans un state updater React |
| **W2** | `useTimer` appelle `onEnd` 800ms APRES `timeLeft=0` → auto-submit AVANT |
| **W3** | Utiliser des REFS pour les valeurs soumises, pas des states (closures stale) |
| **W4** | Le host ne recoit pas ses propres broadcasts → mise a jour locale obligatoire |
| **W5** | Toujours `await` les ecritures DB (race conditions) |
| **W6** | Utiliser `answerEquals()` pour comparer les reponses DB |
| **W7** | Lire le state frais via `getState()`, pas les closures |

### 4. Enregistrer le jeu

1. Ajouter l'import dans `src/games/registry.ts`
2. Ajouter l'ID dans `GAME_IDS`
3. Appeler `registerGame(monModule)` dans `initRegistry()`
4. Ajouter le `game_id` dans la table `game_settings` (SQL)

### 5. Si Pattern C ou D : ajouter les events

1. Ajouter les event types dans `GameEventType` (`src/lib/supabase/types.ts`)
2. Ajouter les handlers de forwarding dans `src/app/game/[code]/page.tsx`

### 6. Si scoring custom (besoin de toutes les soumissions)

Ajouter un bloc `if (gameType === 'mon-jeu')` dans `endRound()` de `useGameEngine.ts`, avant le bonus de rang.

---

## Recapitulatif visuel

```
                    ┌─────────────────────────────┐
                    │      GameContainer          │
                    │  (timer, HUD, props relay)   │
                    └─────────┬───────────────────┘
                              │
           ┌──────────────────┼──────────────────────┐
           │                  │                      │
    Pattern A/B          Pattern C              Pattern D
    (10 jeux)           (3 jeux)               (1 jeu)
           │                  │                      │
     onSubmit()         send/onBroadcast      send/onBroadcast
     simple             + host arbitre        + phases internes
                        + W4 self-echo        + onRoundComplete
                        + broadcast 500ms     + timer propre
```
