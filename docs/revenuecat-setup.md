# Activer les abonnements (RevenueCat) — FitTrack Premium

L'architecture est **déjà codée** (paywall, gating, restauration). Il ne reste
qu'à connecter RevenueCat + les produits App Store. Sans ça, l'app tourne en
**gratuit** (aucun plantage) et le paywall affiche « offres indisponibles ».

> ⚠️ Les achats ne fonctionnent PAS dans Expo Go — il faut un **build de dev/EAS**.
> Pour tester le parcours premium sans facturation : le paywall a un bouton
> **« 🧪 Activer Premium (test) »** en mode dev (`setDevPremium`).

## 1. App Store Connect — créer les produits
- Ton app → **Abonnements** → créer un groupe (ex. « FitTrack Premium »).
- Créer 2 abonnements auto-renouvelables : **Mensuel** et **Annuel**.
- Noter les **identifiants produit** (ex. `fittrackia_premium_monthly`, `fittrackia_premium_yearly`).

## 2. RevenueCat (dashboard gratuit)
- Crée un projet → ajoute l'app iOS (bundle `com.fittrackia.app`).
- **Entitlements** → crée un entitlement d'ID **`premium`** (doit matcher `ENTITLEMENT_ID` dans `constants/premium.ts`).
- **Products** → importe les 2 produits App Store, rattache-les à l'entitlement `premium`.
- **Offerings** → crée un offering **`default`** (matche `OFFERING_ID`) avec les packages Mensuel + Annuel.
- Récupère la **clé API publique iOS** (RevenueCat → API keys → Apple).

## 3. Brancher la clé dans l'app
Dans `.env.local` :
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx
# (Android plus tard)
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=
```

## 4. Builder et tester
```bash
eas build --profile preview --platform ios
```
Puis, sur l'appareil, avec un **compte Sandbox App Store** (App Store Connect →
Utilisateurs → Testeurs Sandbox) : ouvre le paywall, achète, vérifie que le
premium se débloque et que « Restaurer un achat » fonctionne.

## Ce qui est gratuit vs premium (déjà codé)
- **Gratuit** : tout le suivi (séances, PRs, surcharge progressive, programmes,
  nutrition, scan, macros, poids, progrès) + coach IA **5 messages/jour**.
- **Premium** : coach IA **illimité**, plans de repas IA, meal prep IA,
  programmes IA, analyses de carences, estimation resto IA.

Réglable dans `constants/premium.ts` (`FREE_COACH_MESSAGES_PER_DAY`, features).
