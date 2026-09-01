# Fiche App Store — FitTrack IA (copy optimisée ASO)

> À coller dans App Store Connect. Le titre + sous-titre + mots-clés pèsent le
> plus dans la découverte. Vise le marché **FR** en priorité, décline en EN ensuite.

---

## Nom de l'app (≤ 30 caractères)
```
FitTrack IA : Coach Sport
```
*(alt. : `FitTrack IA — Sport & Nutrition`)*

## Sous-titre (≤ 30 caractères)
```
Muscu, calories & coach IA
```

## Mots-clés (≤ 100 caractères, séparés par virgules, SANS espaces)
```
musculation,marathon,triathlon,course,running,trail,basket,natation,hyrox,coach,ia,calories,macros,nutrition,seance
```
*Ne répète PAS les mots déjà dans le nom/sous-titre (Apple les indexe déjà). Teste des variantes tous les 15 j.*

## Texte promotionnel (≤ 170 caractères, modifiable sans review)
```
Marathon, triathlon, basket ou muscu : 21 programmes et un coach IA qui analyse tes séances ET ton assiette. Scan des aliments, records, plans de repas. Essaie gratuitement.
```

---

## Description

**Ton coach sportif et nutritionnel, propulsé par l'IA.**

FitTrack IA réunit ton sport ET ta nutrition dans une seule app — et un coach IA qui analyse la corrélation entre les deux pour te dire exactement quoi ajuster.

Marathon, triathlon, basket, muscu, Hyrox : 21 programmes couvrant 11 disciplines. Que tu prépares un Ironman ou que tu cherches à prendre de la masse, tout est au même endroit.

**🏃 TOUS LES SPORTS, PAS QUE LA MUSCU**
• 21 programmes prêts : marathon, semi, 10 km, trail, triathlon, Ironman 70.3
• Prépa basket, prépa foot, natation, Hyrox
• Programmes de musculation : Full Body, PPL, Upper/Lower, Brosplit
• Le coach IA génère un programme sur mesure dans n'importe quelle discipline

**💪 SPORT**
• 100+ exercices, séries/reps/poids, minuteur de repos
• Suggestions de surcharge progressive à chaque séance
• Records personnels (PR) automatiques et historique
• Programmes prêts à l'emploi (Full Body, PPL, Upper/Lower…)
• Calculateur de charge (disques par côté)

**🥗 NUTRITION**
• Scan de code-barres + recherche instantanée (2 265 aliments CIQUAL/ANSES + OpenFoodFacts)
• 📸 Prends ton assiette en photo — l'IA identifie les aliments et estime les portions
• Mode Restaurant : décris ton repas, l'IA le découpe en aliments
• Suivi calories et macros en un geste
• Plans de repas et meal-prep générés par l'IA
• Jeûne intermittent, recettes, favoris

**🤖 COACH IA**
• Analyse tes vraies données (sport + nutrition) pour des conseils sur-mesure
• 4 personnalités : Motivateur, Scientifique, Bienveillant, Militaire
• Bilans hebdo et mensuels automatiques

**📈 PROGRÈS**
• Courbe de poids + projection d'objectif
• Mensurations, photos avant/après, badges
• Score de forme hebdomadaire

**🍎 APPLE SANTÉ**
Tes séances et ton poids se synchronisent avec Santé (balance connectée comprise).

**🔒 TES DONNÉES T'APPARTIENNENT**
Tout est stocké sur ton téléphone, chiffré (AES-256). Sauvegarde chiffrée exportable à tout moment. Pas de compte, pas de pub, pas de trackers. Conforme RGPD.

Télécharge FitTrack IA et transforme-toi — un jour à la fois.

*FitTrack IA est un outil de suivi et de motivation ; il ne remplace pas l'avis d'un professionnel de santé.*

---

## Nouveautés (What's New — v1.0)
```
🎉 Première version de FitTrack IA !
• 21 programmes : marathon, triathlon, basket, muscu, Hyrox…
• Coach IA sport + nutrition
• Photo de repas → calories estimées par l'IA
• Scan de code-barres et 2 265 aliments français (CIQUAL)
• Synchronisation Apple Santé
• Surcharge progressive et records automatiques
• Thème or & noir, 100 % en français
Dis-nous ce que tu en penses ⭐
```

---

## Légendes des captures d'écran (6 recommandées, la 1re est décisive)
1. **« Tous tes sports, un seul coach »** — écran Programmes, filtre Discipline visible
2. **« Suis tes macros en un scan »** — écran Nutrition (scan)
3. **« Progresse à chaque séance »** — suggestion de surcharge progressive
4. **« Tes records, automatiquement »** — écran séance avec PR
5. **« Vois ta transformation »** — écran Progrès (courbe + projection)
6. **« Reste motivé »** — badges / défis / streak

*Astuce : mets un bandeau de texte lisible en haut de chaque capture (les gens
scrollent vite). Fond noir + accent or = cohérent avec l'icône.*

---

## Champs annexes
- **Catégorie** : Forme et santé (primaire) · Style de vie (secondaire)
- **Âge** : 4+ (aucun contenu sensible)
- **Politique de confidentialité** : ⚠️ URL publique obligatoire — la page est
  prête dans `docs/privacy.html`. À héberger (2 options gratuites) :
  1. **Cloudflare Pages** (tu as déjà un compte pour le proxy) : dashboard →
     Workers & Pages → Create → Pages → upload du fichier. URL en
     `*.pages.dev` obtenue en 2 minutes.
  2. **GitHub Pages** : nécessite un repo public — ne PAS utiliser le repo de
     l'app (privé) ; créer un petit repo public dédié avec ce seul fichier.
- **Confidentialité (nutrition labels App Store Connect)** — déclaration honnête :
  - « Santé et forme » + « Autre contenu utilisateur » (messages coach, photos
    de repas) → **collectées, NON liées à l'identité, PAS de tracking** :
    elles transitent par OpenAI quand la fonction IA est utilisée.
  - Ne PAS cocher « Données non collectées » : le coach IA envoie des données
    hors de l'appareil, Apple vérifie ce point à la review.
- **Autorisation HealthKit** : cocher la capability HealthKit dans App Store
  Connect si demandé (l'entitlement est déjà dans le build).
