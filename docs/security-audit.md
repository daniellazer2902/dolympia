# Audit de securite -- dolympia

**Date :** 2026-04-04
**Scope :** Application complete (Next.js 14 + Supabase + Realtime)
**Objectif :** Identifier les failles avant publication GitHub et deploiement

---

## 1. [CRITIQUE] Fichier `.env` contient TOUS les secrets Supabase en clair

**Fichier :** `.env` (racine du projet)

**Description :**
Le fichier `.env` contient des secrets extremement sensibles :
- `SUPABASE_SERVICE_ROLE_KEY` (cle avec acces total, bypass RLS)
- `SUPABASE_JWT_SECRET` (permet de forger des JWT arbitraires)
- `SUPABASE_SECRET_KEY`
- `POSTGRES_PASSWORD` et toutes les URLs de connexion PostgreSQL directes (pooler inclus)

Bien que `.env` et `.env.local` soient dans `.gitignore` et ne sont PAS actuellement tracked par git, le risque principal est :
- Un `git add -A` ou `git add .` accidentel les committerait
- Toute personne ayant acces a la machine de dev a un acces complet a la base de production

**Impact :**
- Acces total a la base de donnees (lecture, ecriture, suppression de toutes les tables)
- Bypass complet des politiques RLS via la `service_role_key`
- Possibilite de forger des tokens JWT pour n'importe quel utilisateur

**Action recommandee :**
- Verifier que ces fichiers ne seront JAMAIS commites (OK actuellement)
- Apres deploiement, utiliser uniquement les variables d'environnement du provider (Vercel, etc.)
- Ne garder dans `.env.local` que les 2 cles `NEXT_PUBLIC_*` pour le dev local
- Supprimer le fichier `.env` qui contient les secrets serveur inutiles cote client
- Envisager une rotation des cles si elles ont ete partagees

---

## 2. [CRITIQUE] Aucune politique RLS restrictive -- toutes les tables sont ouvertes en ecriture

**Fichier :** `supabase/migrations/20260404000000_initial.sql`

**Description :**
Les politiques RLS sont activees mais n'appliquent aucune restriction reelle :
```sql
create policy "sessions_insert" on sessions for insert with check (true);
create policy "sessions_update" on sessions for update using (true);
create policy "players_insert" on players for insert with check (true);
create policy "players_update" on players for update using (true);
create policy "rounds_insert" on rounds for insert with check (true);
create policy "rounds_update" on rounds for update using (true);
create policy "scores_insert" on scores for insert with check (true);
```
Cela signifie que **n'importe quel client anonyme** peut :
- Modifier le statut de n'importe quelle session (la terminer, changer le mode)
- Se declarer `is_host: true` sur n'importe quelle partie
- Modifier les scores de n'importe quel joueur
- Inserer des rounds et scores arbitraires
- Modifier le pseudo ou l'equipe de n'importe quel joueur

De plus, il n'y a **aucune politique DELETE** sur `sessions` et `players`, mais le code fait des `DELETE` (`handleLeave`, `handleCancel`). Cela signifie soit :
- Les deletes echouent silencieusement (bug fonctionnel)
- Soit elles passent via un mecanisme non audite

**Impact :**
- Triche totale : un joueur peut modifier ses propres scores ou ceux des autres
- Sabotage : terminer les parties des autres, supprimer des joueurs
- Usurpation : se declarer host de n'importe quelle session

**Action recommandee :**
- Implementer des politiques RLS basees sur `host_id` pour les operations sensibles (update session, delete)
- Restreindre `scores_insert` pour n'accepter que les scores du joueur authentifie ou du host
- Ajouter des politiques DELETE explicites
- A defaut d'authentification des joueurs (V1), au minimum restreindre les updates par `session_id` et `host_id`

---

## 3. [CRITIQUE] Toute la logique de jeu est cote client -- triche triviale

**Fichiers :** `src/hooks/useGameEngine.ts`, `src/app/game/[code]/page.tsx`

**Description :**
Le game engine tourne **entierement dans le navigateur du host** :
- Le host cree les rounds (`startRound`), calcule les scores (`endRound`), et les insere en DB
- Les scores sont calcules cote client : `points: submissionsRef.current.has(p.id) ? 50 : 0`
- Les soumissions des joueurs transitent par broadcast Supabase sans validation serveur
- Le host peut modifier les scores avant insertion car tout passe par son navigateur

Un joueur malveillant peut :
1. Ouvrir la console du navigateur
2. Appeler directement `supabase.from('scores').update(...)` pour modifier ses scores
3. Envoyer des broadcasts falsifies via le channel Supabase

**Impact :**
- Scores completement falsifiables
- Impossible de garantir l'integrite d'une partie

**Action recommandee :**
- A terme, deplacer la logique de scoring dans une Edge Function ou un serveur
- En V1, ajouter au minimum une validation cote RLS (le host_id de la session est le seul autorise a inserer des scores/rounds)
- Signer les soumissions avec un timestamp serveur

---

## 4. [HAUTE] Dashboard admin sans verification de role

**Fichiers :** `middleware.ts`, `src/app/admin/dashboard/page.tsx`

**Description :**
Le middleware verifie qu'un utilisateur Supabase Auth est connecte (`getUser()`), mais ne verifie pas son role. **Tout utilisateur Supabase authentifie** (meme un joueur qui s'inscrirait) pourrait acceder au dashboard admin.

Le login admin utilise `signInWithPassword` via le client browser (anon key), ce qui est correct, mais il n'y a aucun controle de role apres authentification.

**Impact :**
- Si l'inscription est ouverte sur le projet Supabase, n'importe qui peut creer un compte et acceder au dashboard admin
- Meme si le dashboard est vide actuellement (Plan 3), c'est un vecteur d'attaque futur

**Action recommandee :**
- Ajouter une verification de role dans le middleware (ex: verifier un claim custom ou une table `admin_users`)
- Desactiver l'inscription publique dans les settings Supabase si seul l'admin doit avoir un compte
- Ajouter un guard cote page qui verifie le role

---

## 5. [HAUTE] Channels Supabase Realtime sans authentification

**Fichiers :** `src/hooks/useChannel.ts`, `src/hooks/usePresence.ts`

**Description :**
Les channels Realtime sont nommes de facon previsible : `game:{code}` et `presence:{code}`.
N'importe quel client avec la anon key (publique) peut :
- Ecouter tous les broadcasts d'une partie (espionner les reponses)
- Envoyer des broadcasts falsifies (ex: `host:game_end` pour terminer la partie de quelqu'un d'autre)
- Envoyer des `host:round_start` avec des donnees arbitraires
- Se joindre au channel de presence avec un faux `player_id`

Aucune autorisation n'est configuree sur les channels (pas de `RLS` sur Realtime, pas de token custom).

**Impact :**
- Usurpation d'identite dans les broadcasts
- Injection d'evenements de jeu (demarrer/arreter des rounds)
- Espionnage des parties en cours

**Action recommandee :**
- Configurer les Realtime policies dans Supabase pour restreindre l'acces aux channels
- Utiliser des channels prives avec autorisation basee sur le `player_id`
- Valider cote serveur les evenements critiques (`host:*`)

---

## 6. [HAUTE] Pas de politique DELETE dans les migrations SQL

**Fichier :** `supabase/migrations/20260404000000_initial.sql`

**Description :**
Le code effectue des operations DELETE dans le lobby :
- `handleLeave` : `supabase.from('players').delete().eq('id', localPlayer.id)`
- `handleCancel` : `supabase.from('players').delete()...` puis `supabase.from('sessions').delete()...`

Mais aucune politique RLS de type DELETE n'est definie. Selon la configuration par defaut de Supabase avec RLS active, les DELETE sont **refuses** si aucune politique n'existe.

**Impact :**
- Les joueurs ne peuvent pas quitter une partie (bug fonctionnel)
- Le host ne peut pas annuler une partie
- Ou pire : si une configuration permissive existe cote Supabase, n'importe qui peut supprimer des donnees

**Action recommandee :**
- Ajouter des politiques DELETE explicites et restrictives
- Pour `players` : autoriser la suppression de son propre enregistrement uniquement
- Pour `sessions` : autoriser la suppression par le `host_id` uniquement

---

## 7. [HAUTE] Identite joueur non authentifiee et basee sur UUID client

**Fichiers :** `src/app/page.tsx`, `src/store/session.store.ts`

**Description :**
L'identite des joueurs est basee sur un UUID genere cote client (`crypto.randomUUID()`). Ce UUID est stocke uniquement dans le state Zustand (memoire). Il n'y a :
- Aucune authentification des joueurs
- Aucun token de session
- Aucune verification que le `player_id` utilise dans les requetes correspond au joueur reel

Un joueur peut :
- Generer un UUID correspondant a un autre joueur
- Modifier son `localPlayer` dans le store Zustand via la console
- Effectuer des operations en tant qu'un autre joueur (ex: se declarer host)

**Impact :**
- Usurpation d'identite triviale
- Un joueur peut agir en tant que host d'une session qui n'est pas la sienne

**Action recommandee :**
- Stocker le `player_id` dans un cookie HTTP-only ou dans le localStorage avec une signature
- A terme, utiliser Supabase Auth meme pour les joueurs (anonymous auth)
- Ajouter des RLS policies qui verifient le `player_id` via un mecanisme serveur

---

## 8. [MOYENNE] `next.config.mjs` vide -- pas de security headers

**Fichier :** `next.config.mjs`

**Description :**
La configuration Next.js est completement vide. Aucun header de securite HTTP n'est configure :
- Pas de `Content-Security-Policy`
- Pas de `X-Frame-Options` (clickjacking possible)
- Pas de `X-Content-Type-Options`
- Pas de `Strict-Transport-Security`
- Pas de `Referrer-Policy`
- Pas de `Permissions-Policy`

**Impact :**
- Vulnerability au clickjacking (iframe embedding)
- Pas de protection CSP contre l'injection de scripts
- Headers de referrer qui peuvent leaker des informations

**Action recommandee :**
Ajouter des headers de securite dans `next.config.mjs` :
```js
const nextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}
```

---

## 9. [MOYENNE] Pseudo joueur non sanitize -- risque XSS indirect

**Fichiers :** `src/app/page.tsx`, `src/components/lobby/PlayerList.tsx`, `src/components/game/RoundTransition.tsx`, `src/app/results/[code]/page.tsx`

**Description :**
Le pseudo est saisi par l'utilisateur avec uniquement un `maxLength={20}` comme validation. Il est ensuite affiche dans plusieurs composants via `{p.pseudo}`.

React echappe par defaut les valeurs dans les expressions JSX, donc il n'y a **pas de XSS direct** dans le rendu actuel. Cependant :
- Le pseudo est stocke en DB sans validation cote serveur
- Il n'y a aucune validation du contenu (caracteres speciaux, emojis, HTML, etc.)
- Si un futur developpeur utilise `dangerouslySetInnerHTML` ou un tooltip non-escape, le risque apparait
- Le pseudo pourrait contenir des caracteres Unicode trompeurs (homoglyphes, RTL override)

**Impact :**
- Risque faible actuellement grace a l'echappement React
- Risque futur si le pseudo est utilise dans un contexte non-escape
- Pseudos offensants ou trompeurs possibles

**Action recommandee :**
- Ajouter une validation regex cote client ET dans une RLS policy ou trigger : `^[a-zA-Z0-9\s_-]{1,20}$`
- Sanitiser le pseudo avant insertion en DB

---

## 10. [MOYENNE] Code de session previsible (6 caracteres alphanumeriques)

**Fichier :** `src/lib/utils.ts`

**Description :**
Le code de session est genere avec `Math.random()` sur un alphabet de 31 caracteres, 6 positions.
- `Math.random()` n'est pas cryptographiquement securise
- L'espace est de 31^6 = ~887 millions de combinaisons
- Pas de rate limiting sur les tentatives de join

Un attaquant pourrait potentiellement brute-forcer des codes de sessions actives.

**Impact :**
- Un attaquant pourrait rejoindre des parties en cours sans invitation
- Impact modere car les parties sont ephemeres

**Action recommandee :**
- Utiliser `crypto.getRandomValues()` au lieu de `Math.random()`
- Ajouter un rate limiting sur l'endpoint de join (ou une RLS policy avec delay)
- Les 887M combinaisons sont suffisantes pour un jeu casual, mais le PRNG doit etre ameliore

---

## 11. [MOYENNE] Pas de nettoyage des sessions expirees

**Fichier :** `supabase/migrations/20260404000000_initial.sql`

**Description :**
Il n'y a aucun mecanisme de nettoyage des sessions terminees ou abandonnees :
- Les sessions `waiting` peuvent rester indefiniment en base
- Les joueurs deconnectes restent en base
- Pas de TTL, pas de cron, pas de trigger de nettoyage

**Impact :**
- Accumulation de donnees en base
- Les codes de session pourraient theoriquement etre reutilises (collision)
- Cout de stockage croissant

**Action recommandee :**
- Ajouter un champ `expires_at` aux sessions
- Creer une Edge Function ou un cron Supabase pour nettoyer les sessions anciennes
- Ajouter un index sur `(code, status)` pour optimiser les lookups

---

## 12. [MOYENNE] Realtime publication sur toutes les tables de jeu

**Fichier :** `supabase/migrations/20260404000001_enable_realtime.sql`

**Description :**
```sql
alter publication supabase_realtime add table sessions, players, rounds, scores;
```
Toutes les colonnes de toutes les tables de jeu sont publiees en Realtime. Cela signifie qu'un client peut observer toutes les modifications en temps reel via `postgres_changes`, y compris :
- Les scores de tous les joueurs
- Les configurations des rounds (potentiellement les reponses)
- Les changements de statut des sessions

**Impact :**
- Fuite d'informations en temps reel (reponses aux quiz, scores)
- Charge serveur supplementaire si beaucoup de clients ecoutent

**Action recommandee :**
- Limiter la publication aux colonnes necessaires
- Configurer les Realtime policies pour filtrer par `session_id`
- Envisager de ne publier que `sessions` et `players` (le reste passe par broadcast)

---

## 13. [BASSE] Pas de validation `is_host` cote serveur

**Fichiers :** `src/app/page.tsx`, `src/hooks/useGameEngine.ts`

**Description :**
Le flag `is_host` est defini cote client lors de la creation de la partie :
```ts
.insert({ id: playerId, session_id: session.id, pseudo: pseudo.trim(), is_host: true })
```
N'importe quel joueur qui insere un record avec `is_host: true` est considere comme host. Il n'y a aucune validation serveur que seul le createur de la session peut etre host.

De plus, la verification `isHost` dans le code est uniquement cote client :
```ts
const isHost = localPlayer?.is_host ?? false
```

**Impact :**
- Un joueur malveillant peut se declarer host de n'importe quelle session
- Cela permet de lancer des rounds, modifier la configuration, terminer la partie

**Action recommandee :**
- Ajouter un trigger ou une RLS policy qui verifie que `is_host = true` n'est autorise que si `player.id = session.host_id`
- Valider cette coherence dans la DB

---

## 14. [BASSE] Client Supabase singleton potentiellement stale

**Fichier :** `src/lib/supabase/client.ts`

**Description :**
Le client Supabase browser est cree en singleton. Si les variables d'environnement changent (peu probable) ou si le token expire, le client ne sera pas recree.

**Impact :** Faible -- le anon key ne change pas en runtime normalement.

**Action recommandee :** Aucune action urgente. Surveiller si des problemes de token expire apparaissent en production.

---

## 15. [BASSE] Polling DB toutes les 2 secondes dans le lobby

**Fichier :** `src/app/lobby/[code]/page.tsx`

**Description :**
Le lobby fait un polling de la DB toutes les 2 secondes pour synchroniser les joueurs et la session. Avec beaucoup de parties simultanees, cela peut generer une charge significative sur Supabase.

**Impact :**
- Surconsommation de quota Supabase (requetes DB)
- Potentiel DDoS involontaire avec beaucoup de joueurs

**Action recommandee :**
- Utiliser les `postgres_changes` Realtime au lieu du polling pour les mises a jour
- Garder le polling comme fallback avec un intervalle plus long (5-10s)

---

## Resume par criticite

| Criticite | # | Titre |
|-----------|---|-------|
| CRITIQUE  | 1 | Secrets Supabase dans `.env` |
| CRITIQUE  | 2 | RLS policies completement ouvertes |
| CRITIQUE  | 3 | Logique de jeu 100% cote client |
| HAUTE     | 4 | Dashboard admin sans verification de role |
| HAUTE     | 5 | Channels Realtime sans authentification |
| HAUTE     | 6 | Pas de politique DELETE dans les migrations |
| HAUTE     | 7 | Identite joueur non authentifiee |
| MOYENNE   | 8 | Pas de security headers HTTP |
| MOYENNE   | 9 | Pseudo non sanitize |
| MOYENNE   | 10 | Code de session avec PRNG faible |
| MOYENNE   | 11 | Pas de nettoyage des sessions expirees |
| MOYENNE   | 12 | Realtime trop permissif |
| BASSE     | 13 | Pas de validation `is_host` cote serveur |
| BASSE     | 14 | Client Supabase singleton |
| BASSE     | 15 | Polling DB dans le lobby |

---

## Recommandations prioritaires pour deploiement

**Avant de publier sur GitHub :**
1. S'assurer que `.env` n'est pas commite (OK actuellement)
2. Envisager de faire tourner les secrets (rotation) par precaution

**Avant de deployer en production :**
1. Corriger les RLS policies (faille #2) -- c'est le plus critique
2. Ajouter les security headers (#8)
3. Restreindre l'acces admin (#4)
4. Ajouter des politiques DELETE (#6)

**A moyen terme :**
5. Deplacer la logique de scoring cote serveur (#3)
6. Securiser les channels Realtime (#5)
7. Implementer une authentification joueur minimale (#7)
