# Proxy OpenAI — déploiement (≈ 5 minutes)

Ce worker Cloudflare protège ta clé OpenAI : elle vit uniquement dans les
secrets Cloudflare. L'app envoie un jeton applicatif (`APP_TOKEN`) que le
worker vérifie avant de relayer à OpenAI.

Testé en local : auth (401), allowlist modèle (400), route (404),
streaming refusé (400), relais réel vers api.openai.com ✅.

## 1. Déployer le worker

```bash
cd ~/Projects/FitTrackIA/proxy
npx wrangler login          # ouvre le navigateur — compte Cloudflare gratuit si besoin
```

Génère le jeton applicatif (garde-le, il servira à l'étape 2) :

```bash
openssl rand -hex 32
```

Pose les deux secrets (chaque commande demande la valeur en interactif) :

```bash
npx wrangler secret put OPENAI_API_KEY   # ta clé sk-...
```

```bash
npx wrangler secret put APP_TOKEN        # le jeton généré ci-dessus
```

Déploie :

```bash
npx wrangler deploy
```

→ Note l'URL affichée, du type `https://fittrackia-proxy.<ton-compte>.workers.dev`.

## 2. Brancher l'app

Dans `eas.json`, profil **production**, remplis les deux variables (⚠️ bien
garder le suffixe `/v1` sur l'URL) :

```json
"env": {
  "EXPO_PUBLIC_PERSO": "0",
  "EXPO_PUBLIC_PROXY_URL": "https://fittrackia-proxy.<ton-compte>.workers.dev/v1",
  "EXPO_PUBLIC_APP_TOKEN": "<le jeton généré>"
}
```

(Tu peux aussi les ajouter au profil `perso` pour avoir l'IA sans ta clé
locale.) Le jeton n'est pas un vrai secret : il finit dans le binaire de
l'app — son rôle est d'empêcher l'utilisation anonyme du worker, la vraie
clé restant côté Cloudflare.

## 3. Vérifier

```bash
curl -s -X POST "https://fittrackia-proxy.<ton-compte>.workers.dev/v1/chat/completions" -H "authorization: Bearer <le jeton>" -H "content-type: application/json" -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Dis bonjour"}],"max_tokens":20}'
```

Réponse JSON avec `choices[0].message.content` → tout fonctionne.

## 4. (Recommandé) Durcir le rate limiting

Le worker limite déjà à 60 req/min/IP (best-effort). Pour une limite ferme :
dashboard Cloudflare → ton worker → **Settings → Triggers/Security** →
ajouter une règle **Rate limiting** (ex. 100 req/10 min par IP).

## Garde-fous intégrés

| Contrôle | Effet |
|---|---|
| Jeton applicatif | 401 sans le bon `Bearer` (comparaison temps constant) |
| Allowlist modèle | seul `gpt-4o` passe |
| `max_tokens` ≤ 4000, `n` supprimé | borne le coût par requête |
| Corps ≤ 2 Mo | accepte les photos 768px, bloque l'abus |
| Streaming refusé | l'app ne l'utilise pas → surface en moins |
| 60 req/min/IP | frein à l'abus même avec le jeton extrait |

## Suivi des coûts

platform.openai.com → Usage. Pose une **limite de dépense mensuelle**
(Settings → Limits) — c'est ta vraie protection budget.
