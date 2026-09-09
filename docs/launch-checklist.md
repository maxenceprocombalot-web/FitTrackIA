# Checklist de lancement — FitTrack IA

But de ce document : répondre en dix secondes à « qu'est-ce qui bloque la
sortie ? ». Sur le modèle de la checklist de lancement de Streakly. Coche au
fur et à mesure ; ne raye jamais une ligne, ça efface la preuve du travail.

---

## ① Comptes

- [x] Apple Developer — déjà actif
- [ ] Google Play Console — 25 $, compte à créer
- [ ] Compte Expo/EAS pour les builds

## ② Monétisation (RevenueCat)

L'architecture (paywall, gating, restauration) est déjà codée côté app —
voir `docs/revenuecat-setup.md` et `constants/premium.ts`. Rien n'est encore
branché côté comptes : sans ça, l'app tourne en gratuit (aucun plantage) mais
le paywall affiche « offres indisponibles ».

- [ ] App Store Connect → groupe d'abonnements « FitTrack Premium »
- [ ] Produit `fittrackia_premium_monthly`
- [ ] Produit `fittrackia_premium_yearly`
- [ ] Offre introductive (essai gratuit) sur chaque produit — à décider
- [ ] Projet RevenueCat créé, app iOS liée (bundle `com.fittrackia.app`)
- [ ] Entitlement RevenueCat `premium` (doit matcher `ENTITLEMENT_ID` dans `constants/premium.ts`)
- [ ] Offering RevenueCat `default` (doit matcher `OFFERING_ID`) avec les 2 packages
- [ ] Clé API publique iOS RevenueCat récupérée et branchée (voir ④)
- [ ] Achat + restauration testés sur un build EAS (pas Expo Go) avec un compte Sandbox App Store
- [ ] Produits + entitlement + offering équivalents côté Android (plus tard, après ①)

## ③ Publicité

Pas de pub AdMob prévue sur FitTrack IA (contrairement à Streakly) — cette
section ne s'applique pas.

## ④ Variables d'environnement

⚠️ Même piège que Streakly : **EAS Build ne voit jamais `.env`/`.env.local`**.
Les secrets de build doivent être déclarés avec `eas secret:create`, pas
seulement dans un fichier local.

- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY` déclarée en secret EAS
- [ ] `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` déclarée en secret EAS (après ①/②)
- [ ] `EXPO_PUBLIC_PROXY_URL` déclarée en secret EAS (proxy IA, voir `server/README.md`)
- [ ] `EXPO_PUBLIC_APP_TOKEN` déclarée en secret EAS
- [ ] Vérifié qu'un build `production` récent contient bien ces valeurs (pas de paywall/coach cassé une fois installé)

## ⑤ Coach IA

- [ ] Décision prise : `EXPO_PUBLIC_OPENAI_KEY` reste **absente** du build publié pour la v1 (mode démo/proxy uniquement)
- [ ] Vérifié qu'aucun profil EAS (`eas.json`) ne renseigne `EXPO_PUBLIC_OPENAI_KEY` en clair
- [ ] Proxy IA déployé et testé (`curl` sur l'URL de prod — voir `server/README.md`)

## ⑥ Fiches store

`docs/app-store-listing.md` existe déjà (nom, sous-titre, mots-clés, description,
nouveautés v1.0, champs annexes). Il manque la spécification des captures
d'écran (légendes présentes, mais pas le format/plan de prise de vue détaillé
que Streakly documente dans `docs/aso.md` §7).

- [ ] Spécification des captures d'écran (dimensions par device, plan par écran, cohérence bandeau texte) à écrire dans `docs/app-store-listing.md` ou un nouveau `docs/aso.md`
- [ ] 6 captures d'écran iOS produites (`docs/screenshots/store/` en contient déjà 6 — à valider comme définitives)
- [ ] Captures d'écran équivalentes pour Android (tailles différentes)
- [ ] Politique de confidentialité en ligne — ✅ déjà fait (`https://fittrackia-legal.pages.dev/privacy`)
- [ ] Déclaration de confidentialité (nutrition labels) rédigée : *Santé et forme* + *Autre contenu utilisateur* → collectées, non liées à l'identité, pas de suivi publicitaire — **ne pas cocher** « Données non collectées »
- [ ] Capability HealthKit cochée dans App Store Connect

## ⑦ Soumission

- [ ] Build `production` iOS soumis à App Store Connect (TestFlight)
- [ ] Test fermé Android : **12 testeurs pendant 14 jours consécutifs** (même contrainte que Streakly, exigée par Google avant publication)
- [ ] Recrutement des 12 testeurs Android planifié (délai de 14 jours à lancer tôt, c'est le chemin critique)
- [ ] Review Apple soumise
- [ ] Review Google Play soumise (après le test fermé)

---

## Pièges connus

- EAS Build ne lit jamais `.env`/`.env.local` : toujours passer par `eas secret:create` pour les valeurs de build (voir ④).
- Ne jamais embarquer `EXPO_PUBLIC_OPENAI_KEY` dans un build distribué : elle finirait extractible du bundle (voir ⑤ et `.env.example`).
- Ne jamais déployer le dossier `docs/` sur Cloudflare Pages : il contient cette checklist, la config RevenueCat et la stratégie App Store. Seul `public/` doit être déployé (voir `docs/app-store-listing.md`).
- Les identifiants RevenueCat (`premium` / `default`) doivent matcher exactement `constants/premium.ts` — une faute de frappe et le paywall reste vide silencieusement.
- Le test fermé Android dure 14 jours **consécutifs** : le lancer avant que tout le reste soit prêt ferait perdre du temps inutilement, mais le repousser après ⑥ le met sur le chemin critique de la sortie.
