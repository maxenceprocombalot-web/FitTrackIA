# Proxy IA — déploiement (≈ 5 minutes)

Ce worker Cloudflare protège ta clé IA : elle vit uniquement dans les secrets
Cloudflare. L'app envoie un jeton applicatif (`APP_TOKEN`) que le worker
vérifie avant de relayer.

**Deux fournisseurs pris en charge**, choisis par le secret que tu poses :

| Secret posé | Fournisseur | Modèle par défaut |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini (API compatible OpenAI) | `gemini-2.5-flash` |
| `OPENAI_API_KEY` | OpenAI | `gpt-4o` |

Le **modèle est imposé côté serveur** : changer de modèle ou de fournisseur
ne demande **aucun rebuild de l'app**, juste un `wrangler deploy`.

---

## ⚠️ À lire avant de choisir Gemini gratuit

- **Tier gratuit = tes données servent à entraîner Google.** Leur grille
  tarifaire l'indique explicitement (« Content used to improve our
  products »). Le tier payant dit l'inverse.
- **Quota gratuit très bas** (de l'ordre de quelques dizaines de requêtes par
  jour ; le chiffre exact est dans ton dashboard AI Studio).

→ **Gratuit : parfait pour ton usage perso.**
→ **Version App Store : active la facturation Gemini** (Tier 1). Flash reste
  bien moins cher que GPT-4o, et les données ne servent plus à l'entraînement.
  Sinon la politique de confidentialité doit le déclarer.

---

## 1. Récupérer une clé Gemini (gratuit)

<https://aistudio.google.com/apikey> → **Create API key**. Copie-la.

## 2. Se connecter à Cloudflare

```bash
cd ~/Projects/FitTrackIA/proxy && npx wrangler login
```

## 3. Générer le jeton de l'app (garde-le, il sert à l'étape 6)

```bash
openssl rand -hex 32
```

## 4. Poser les secrets

```bash
npx wrangler secret put GEMINI_API_KEY
```

```bash
npx wrangler secret put APP_TOKEN
```

*(Pour OpenAI à la place : `npx wrangler secret put OPENAI_API_KEY`. Si les
deux clés sont posées, Gemini gagne — force avec un secret `PROVIDER`.)*

## 5. Déployer

```bash
npx wrangler deploy
```

→ Note l'URL affichée : `https://fittrackia-proxy.<compte>.workers.dev`

## 6. Vérifier que ça répond vraiment

```bash
curl -s -X POST "https://fittrackia-proxy.<compte>.workers.dev/v1/chat/completions" -H "authorization: Bearer <ton-jeton>" -H "content-type: application/json" -d '{"messages":[{"role":"user","content":"Dis bonjour"}],"max_tokens":20}'
```

Tu dois voir une vraie réponse dans `choices[0].message.content`.

**Si tu vois une erreur de modèle introuvable** : le nom du modèle a changé.
Liste ceux disponibles avec ta clé —

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/openai/models" -H "authorization: Bearer <ta-clé-gemini>" | grep -o '"id":"[^"]*"' | head -20
```

— puis fixe le bon nom sans toucher à l'app :

```bash
npx wrangler secret put AI_MODEL
```

```bash
npx wrangler deploy
```

## 7. Brancher l'app

Dans `eas.json`, profils `production` **et** `perso` (⚠️ garder le `/v1` final) :

```json
"env": {
  "EXPO_PUBLIC_PROXY_URL": "https://fittrackia-proxy.<compte>.workers.dev/v1",
  "EXPO_PUBLIC_APP_TOKEN": "<ton-jeton>"
}
```

Le jeton n'est pas un secret absolu (il finit dans le binaire) : son rôle est
d'empêcher l'usage anonyme du worker. La vraie clé, elle, reste chez Cloudflare.

---

## Garde-fous intégrés (testés en local)

| Contrôle | Vérifié |
|---|---|
| Jeton applicatif, comparaison temps constant | 401 sans / mauvais jeton ✅ |
| Route unique `/v1/chat/completions` | 404 ailleurs ✅ |
| Modèle imposé par le serveur | ✅ |
| `max_tokens` ≤ 4000, `n` supprimé | borne le coût ✅ |
| Corps ≤ 2 Mo | photos 768px OK ✅ |
| Streaming refusé | 400 ✅ |
| 60 req/min/IP | best-effort ✅ |
| Relais réel Gemini **et** OpenAI | vérifié jusqu'aux deux API ✅ |

Pour une limite ferme : dashboard Cloudflare → worker → **Security → Rate
limiting**.

## Suivi des coûts

- Gemini : <https://aistudio.google.com> → Usage
- OpenAI : <https://platform.openai.com/usage> — **pose une limite de dépense
  mensuelle** (Settings → Limits), c'est la vraie protection budget.
