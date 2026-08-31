# Checklist de lancement — 4 points

Trois de ces points passent par **tes** comptes (navigateur, mot de passe Apple,
clé API) : je ne peux pas les faire à ta place. Les commandes ci-dessous sont
prêtes à copier-coller, dans l'ordre.

---

## 01 · Déployer le proxy IA — ≈ 5 min

**Pourquoi d'abord** : sans lui, le coach IA ne répond à personne, alors que
c'est ce que vend le paywall.

Récupère une clé Gemini (gratuite) : <https://aistudio.google.com/apikey>

```bash
cd ~/Projects/FitTrackIA/proxy && npx wrangler login
```

```bash
openssl rand -hex 32
```
Garde cette valeur, elle sert deux fois.

```bash
npx wrangler secret put GEMINI_API_KEY
```

```bash
npx wrangler secret put APP_TOKEN
```

```bash
npx wrangler deploy
```

Note l'URL affichée, puis vérifie qu'elle répond vraiment :

```bash
curl -s -X POST "https://<ton-url>.workers.dev/v1/chat/completions" -H "authorization: Bearer <ton-jeton>" -H "content-type: application/json" -d '{"messages":[{"role":"user","content":"Dis bonjour"}],"max_tokens":20}'
```

Puis donne-moi l'URL et le jeton : je branche `eas.json`.
⚠️ Ne me donne jamais la clé Gemini elle-même.

---

## 02 · Héberger la politique de confidentialité — ≈ 5 min

Apple refuse la soumission sans URL publique. Le fichier est prêt.

```bash
cd ~/Projects/FitTrackIA && npx wrangler pages deploy docs --project-name fittrackia-legal
```

L'URL obtenue se termine par `/privacy.html` — c'est elle à coller dans
App Store Connect.

---

## 03 · Abonnements + essai gratuit — ≈ 30 min

Interface web uniquement, avec ton compte Apple.

1. **App Store Connect** → ton app → Abonnements → créer un groupe
   « FitTrack Premium »
2. Deux abonnements auto-renouvelables :
   - `fittrackia_premium_monthly`
   - `fittrackia_premium_yearly`
3. Sur chacun : **Offre introductive → Essai gratuit 7 jours**
4. **RevenueCat** (<https://app.revenuecat.com>) → projet → app iOS
   (bundle `com.fittrackia.app`)
   - Entitlement d'identifiant exact : **`premium`**
   - Offering d'identifiant exact : **`default`**, avec les deux produits
5. Copie la clé API publique iOS (commence par `appl_`) et donne-la-moi :
   je la branche dans `eas.json`.

Détail complet : `docs/revenuecat-setup.md`

---

## 04 · Captures d'écran — en cours de mon côté

Je les produis sur simulateur avec des données de démonstration.
Légendes prévues dans `docs/app-store-listing.md`.

---

## Déclarations de confidentialité — à la soumission

⚠️ **Ne coche pas « Données non collectées ».** Le coach IA envoie des données
hors de l'appareil ; Apple le vérifie.

À déclarer : *Santé et forme* et *Autre contenu utilisateur* →
**collectées, non liées à l'identité, pas de suivi publicitaire**.
