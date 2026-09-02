# Captures App Store — 1320 × 2868 (6,9")

Format exact exigé par Apple pour la fiche iPhone. Prises sur simulateur
iPhone 17 Pro Max (iOS 26.4) avec des données de démonstration.

| Fichier | Écran | Légende suggérée |
|---|---|---|
| `1-accueil.png` | Aujourd'hui | **Ton tableau de bord quotidien** |
| `2-sport.png` | Sport | **Chaque séance, chaque record** |
| `3-programmes.png` | Programmes (filtre Course) | **29 programmes, 19 sports** |
| `4-nutrition.png` | Nutrition | **Scanne, mange, progresse** |
| `5-progres.png` | Progrès | **Vois ta transformation** |
| `6-coach.png` | Coach IA | **Un coach qui lit tes vraies données** |

## Avant de les envoyer

Ajoute un bandeau de texte lisible en haut de chaque capture (fond noir,
texte or) : les gens font défiler vite, une capture sans accroche est
perdue. Canva ou Figma suffisent.

## Régénérer

1. `eas build --profile screenshots --platform ios`
2. Installer le `.app` sur un simulateur **iOS 26.4 ou plus** — le runtime
   26.3 a un défaut de rendu qui affiche les emojis en carrés
3. Réglages → Développeur → **Générer des données de démo**
4. Capturer avec `xcrun simctl io <udid> screenshot`
