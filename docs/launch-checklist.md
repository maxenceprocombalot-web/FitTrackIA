# Checklist de lancement — FitTrack IA

> Reprend la structure de la checklist équivalente de Streakly. Le but n'est
> pas d'annoncer une date de sortie, mais de savoir en dix secondes ce qui
> bloque encore. Coche au fur et à mesure — ne coche jamais par anticipation.

---

## ① Comptes

- [x] **Apple Developer** — compte actif.
- [ ] **Google Play Console** — à créer (25 $, paiement unique). Nécessaire
      avant toute soumission Android, y compris le test fermé (§⑦).
- [ ] **Expo / EAS** — projet déjà lié (`eas.json`, `projectId` dans
      `app.json`). Vérifier que le compte EAS qui buildera en a bien l'accès.

## ② Monétisation (RevenueCat)

Rien n'est branché aujourd'hui : sans configuration, l'app tourne en gratuit
(aucun plantage) et le paywall affiche « offres indisponibles ». Voir
`docs/revenuecat-setup.md` pour le détail des étapes.

- [ ] App Store Connect — groupe d'abonnements + 2 produits créés (Mensuel,
      Annuel).
- [ ] RevenueCat — projet créé, app iOS ajoutée (bundle `com.fittrackia.app`).
- [ ] RevenueCat — entitlement `premium` créé (doit matcher `ENTITLEMENT_ID`
      dans `constants/premium.ts`).
- [ ] RevenueCat — produits App Store importés et rattachés à `premium`.
- [ ] RevenueCat — offering `default` créé (doit matcher `OFFERING_ID`) avec
      les packages Mensuel + Annuel.
- [ ] Clé API publique iOS RevenueCat récupérée et posée dans les secrets EAS
      (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, voir §④ — pas dans un `.env` commité).
- [ ] Parcours d'achat testé sur un build réel (pas Expo Go) avec un compte
      Sandbox App Store, restauration d'achat incluse.
- [ ] Android : produits + clé RevenueCat (`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`)
      — après création du compte Google Play Console (§①).

## ③ Publicité

*(Section absente : FitTrack IA n'affiche pas de publicité, contrairement à
Streakly. Rien à faire ici.)*

## ④ Variables d'environnement

Même piège que Streakly : **EAS Build ne lit jamais `.env` / `.env.local`.**
Tout ce qui doit exister dans un build distribué (preview, production, perso,
screenshots) doit être déclaré avec `eas secret:create`, pas dans un fichier
local.

- [ ] `EXPO_PUBLIC_PROXY_URL` et `EXPO_PUBLIC_APP_TOKEN` — si le mode proxy
      (`server/README.md`) est choisi pour la distribution — déclarés en
      secrets EAS pour les profils `preview`/`production`.
- [ ] `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
      déclarées en secrets EAS.
- [ ] `EXPO_PUBLIC_OPENAI_KEY` — **laissée vide** dans tous les profils de
      build distribués (voir §⑤ : ne jamais l'embarquer dans l'app publiée).
- [ ] Vérifier avec `eas secret:list` que les secrets ci-dessus existent bien
      pour chaque profil utilisé avant de lancer un build de soumission.

## ⑤ Coach IA — décision à prendre

Deux options, à trancher avant la v1 :

- **Mode démo (recommandé pour la v1)** : `EXPO_PUBLIC_OPENAI_KEY` reste
  absente de tous les builds distribués, le coach tourne en mode démo.
- **Mode proxy** : suivre `server/README.md` (déploiement Cloudflare Workers)
  pour que la vraie clé OpenAI ne soit jamais dans l'app.

Dans les deux cas :

- [ ] Décision actée (démo vs proxy) pour la v1.
- [ ] `EXPO_PUBLIC_OPENAI_KEY` confirmée **absente** de tout build publié —
      cette clé ne doit jamais être embarquée dans l'app soumise au store.
- [ ] Si mode proxy choisi : serveur `server/` déployé et testé (§ étapes
      1 à 4 de `server/README.md`).

## ⑥ Fiches store

- [x] `docs/app-store-listing.md` — nom, sous-titre, mots-clés, description,
      légendes de captures : rédigés.
- [ ] **Captures d'écran** — spécification manquante (dimensions, gabarits,
      texte overlay par device). Reprendre la spec de Streakly
      (`docs/aso.md` §7 chez Streakly) et l'adapter aux 6 légendes déjà
      définies dans `docs/app-store-listing.md`.
- [ ] Captures générées pour chaque taille d'écran requise par App Store
      Connect (le profil `screenshots` existe déjà dans `eas.json`).
- [ ] Politique de confidentialité — déjà hébergée
      (`https://fittrackia-legal.pages.dev/privacy`), URL à recoller dans App
      Store Connect si un nouveau produit/soumission la redemande.
- [ ] Fiche Google Play — équivalent de `docs/app-store-listing.md` à écrire
      pour le Play Store (textes, captures, catégorie, classification de
      contenu) une fois le compte Google Play Console créé (§①).

## ⑦ Soumission

- [ ] iOS — build de production (`eas build --profile production --platform
      ios`) passé en revue App Store.
- [ ] **Android — test fermé obligatoire** : Google exige **12 testeurs
      actifs pendant 14 jours consécutifs** avant d'ouvrir l'accès à la
      production (même contrainte que Streakly). À planifier tôt : c'est la
      dépendance la plus longue de toute la checklist, pas quelque chose
      qu'on peut faire la veille d'une sortie.
- [ ] Testeurs Android recrutés (12 minimum) et invités sur le test fermé.
- [ ] Les 14 jours consécutifs de test fermé sont passés sans interruption
      de la liste de testeurs actifs.
- [ ] Build de production Android soumis après validation du test fermé.

---

## Ce qui bloque la sortie aujourd'hui (à tenir à jour)

1. Compte Google Play Console pas encore créé.
2. RevenueCat pas branché (aucun produit, entitlement ni offering créés).
3. Spécification des captures d'écran manquante.
4. Test fermé Android (12 testeurs / 14 jours) pas commencé — c'est le
   blocker le plus long, à démarrer dès que les points 1 à 3 sont réglés.
