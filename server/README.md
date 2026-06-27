# Proxy OpenAI — FitTrackIA

Ce petit serveur fait l'intermédiaire entre l'app et OpenAI pour que **ta clé
OpenAI ne soit jamais dans l'app**. Hébergement gratuit sur Cloudflare Workers.

Tu n'as rien à coder — juste suivre ces étapes une fois (~15 min).

---

## Étape 1 — Créer un compte Cloudflare (gratuit)

👉 https://dash.cloudflare.com/sign-up

## Étape 2 — Choisir ton « mot de passe d'app » (APP_TOKEN)

C'est une longue chaîne au hasard que seule ton app connaîtra. Génère-la avec :

```bash
openssl rand -hex 24
```

Copie le résultat quelque part (tu en auras besoin 2 fois). Exemple :
`9f3c1e7a8b...` (le tien sera différent).

## Étape 3 — Déployer le serveur

Dans un terminal, depuis le dossier du projet :

```bash
cd server
npx wrangler login          # ouvre le navigateur → autorise
npx wrangler secret put OPENAI_API_KEY    # colle ta vraie clé OpenAI (sk-...)
npx wrangler secret put APP_TOKEN         # colle le mot de passe de l'étape 2
npx wrangler deploy
```

À la fin, `wrangler` affiche une URL du type :

```
https://fittrackia-proxy.TON-COMPTE.workers.dev
```

📋 **Copie cette URL.**

## Étape 4 — Brancher l'app sur le proxy

Ouvre le fichier `.env.local` à la racine du projet et mets :

```bash
# On utilise le proxy → on NE met PAS la vraie clé OpenAI dans l'app
EXPO_PUBLIC_OPENAI_KEY=

# URL du proxy (⚠️ ajoute « /v1 » à la fin de l'URL de l'étape 3)
EXPO_PUBLIC_PROXY_URL=https://fittrackia-proxy.TON-COMPTE.workers.dev/v1

# Le même mot de passe qu'à l'étape 2
EXPO_PUBLIC_APP_TOKEN=9f3c1e7a8b...
```

Puis relance l'app :

```bash
npx expo start -c
```

C'est fini ✅ — le coach IA marche, et ta clé OpenAI n'est plus dans l'app.

---

## Ce que ça protège (et ce que ça ne protège pas)

- ✅ **Ta clé OpenAI n'est plus dans l'app** → impossible à voler depuis un téléphone.
- ⚠️ `APP_TOKEN` est, lui, embarqué dans l'app (il faut bien que l'app prouve qui
  elle est). Il est donc théoriquement extractible. Ce n'est pas grave : il ne
  donne accès qu'à *ton proxy*, pas à ta clé, et tu peux le changer à tout moment
  (refais l'étape 2-3-4). Pour bloquer un éventuel abus du proxy, active la
  **limite de requêtes** gratuite de Cloudflare :
  *dashboard → ton Worker → Settings → ajoute une règle de rate limiting.*
- Pour une protection « entreprise » totale (comptes utilisateurs, App Check),
  il faudrait un vrai backend avec authentification — un autre niveau de projet.

## Changer / révoquer

- Nouvelle clé OpenAI : `npx wrangler secret put OPENAI_API_KEY`
- Nouveau mot de passe d'app : refais l'étape 2, mets-le dans le proxy
  (`wrangler secret put APP_TOKEN`) **et** dans `.env.local`.
