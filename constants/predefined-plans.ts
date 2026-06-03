import { SavedPlan } from '../types';

// 5 plans prédéfinis non supprimables — texte structuré markdown-like
export const PREDEFINED_PLANS: SavedPlan[] = [
  {
    id: 'pred_full_body',
    type: 'sport',
    title: 'Full Body 3j',
    programId: 'fb_debutant',
    isPredefined: true,
    date: '2024-01-01',
    content: `PROGRAMME FULL BODY 3 JOURS / SEMAINE
Niveau : Débutant | Objectif : Hypertrophie | ~50min/séance

LUNDI — Full Body A
• Squat barre : 3×12, repos 90s
• Développé couché : 3×12, repos 90s
• Rowing haltère : 3×12, repos 90s
• Développé militaire : 3×10, repos 90s
• Curl haltères : 3×12, repos 60s
• Extension triceps : 3×12, repos 60s
• Gainage : 3×30s

MERCREDI — Full Body B
• Presse à cuisses : 3×12, repos 90s
• Pompes : 3×15, repos 75s
• Tirage poulie haute : 3×12, repos 90s
• Élévations latérales : 3×15, repos 60s
• Hammer curl : 3×12, repos 60s
• Dips triceps : 3×12, repos 60s
• Leg raise : 3×15

VENDREDI — Full Body C
• Fentes avant : 3×12, repos 90s
• Développé haltères plat : 3×12, repos 90s
• Rowing barre : 3×10, repos 90s
• Arnold press : 3×10, repos 75s
• Curl barre : 3×12, repos 60s
• Barre au front : 3×12, repos 60s
• Russian twist : 3×20

PROGRESSION : +2.5kg toutes les 2 semaines sur les composés.`,
  },
  {
    id: 'pred_ppl',
    type: 'sport',
    title: 'PPL 6j — Hypertrophie',
    programId: 'ppl_hypertrophie',
    isPredefined: true,
    date: '2024-01-01',
    content: `PROGRAMME PPL 6 JOURS / SEMAINE
Niveau : Avancé | Objectif : Hypertrophie | ~70min/séance

LUNDI — Push (Pecs/Épaules/Triceps)
• Développé couché barre : 4×8, repos 120s
• Développé incliné haltères : 4×10, repos 90s
• Écarté poulie croisée : 3×12, repos 75s
• Développé militaire : 4×8, repos 120s
• Élévations latérales : 4×15, repos 60s
• Extension triceps poulie : 3×12, repos 60s
• Barre au front : 3×12, repos 60s

MARDI — Pull (Dos/Biceps)
• Tractions pronation : 4×8, repos 120s
• Rowing barre : 4×8, repos 120s
• Tirage poulie haute : 3×10, repos 90s
• Rowing haltère : 3×10, repos 90s
• Face pull : 3×15, repos 60s
• Curl barre : 3×10, repos 60s
• Hammer curl : 3×12, repos 60s

MERCREDI — Legs (Quads/Ischios/Mollets)
• Squat barre : 4×8, repos 150s
• Leg press : 4×12, repos 90s
• Leg extension : 3×15, repos 75s
• Leg curl couché : 3×12, repos 75s
• Fentes bulgares : 3×10, repos 90s
• Mollets debout : 5×15, repos 60s

JEUDI → Push B | VENDREDI → Pull B | SAMEDI → Legs B (variations)
DIMANCHE — Repos`,
  },
  {
    id: 'pred_upper_lower',
    type: 'sport',
    title: 'Upper/Lower 4j',
    programId: 'ul_classique',
    isPredefined: true,
    date: '2024-01-01',
    content: `PROGRAMME UPPER / LOWER 4 JOURS / SEMAINE
Niveau : Intermédiaire | Objectif : Hypertrophie | ~60min/séance

LUNDI — Upper A (Horizontal push/pull)
• Développé couché barre : 4×8, repos 120s
• Rowing barre : 4×8, repos 120s
• Développé incliné haltères : 3×10, repos 90s
• Tirage poulie haute : 3×10, repos 90s
• Curl barre : 3×12, repos 60s
• Extension triceps poulie : 3×12, repos 60s
• Face pull : 3×15, repos 45s

MARDI — Lower A (Quad dominant)
• Squat barre : 4×8, repos 150s
• Leg press : 3×12, repos 90s
• Leg extension : 3×12, repos 75s
• Leg curl couché : 3×12, repos 75s
• Fentes avant haltères : 3×10, repos 75s
• Mollets debout : 4×15, repos 60s
• Gainage : 3×45s

JEUDI — Upper B (Vertical push/pull)
• Développé militaire barre : 4×8, repos 120s
• Tractions pronation : 4×6-8, repos 120s
• Arnold press : 3×10, repos 90s
• Rowing haltère : 3×10, repos 90s
• Hammer curl : 3×12, repos 60s
• Barre au front : 3×12, repos 60s
• Élévations latérales : 4×15, repos 45s

VENDREDI — Lower B (Post-chaîne)
• Soulevé de terre : 4×6, repos 180s
• Hip thrust barre : 4×12, repos 90s
• Fentes bulgares : 3×10, repos 90s
• Leg curl couché : 4×12, repos 75s
• Squat sumo haltères : 3×12, repos 75s
• Mollets debout : 4×15, repos 60s`,
  },
  {
    id: 'pred_masse',
    type: 'nutrition',
    title: 'Plan prise de masse',
    isPredefined: true,
    date: '2024-01-01',
    content: `PLAN NUTRITION — PRISE DE MASSE
Surplus calorique : +300 kcal/j au-dessus du TDEE
Macros : Protéines 2g/kg | Glucides 45% | Lipides 25%

PETIT-DÉJEUNER (700 kcal)
• Flocons d'avoine 80g + lait 200ml + banane
• 3 œufs brouillés
• 1 cuillère beurre de cacahuète
→ P: 45g | G: 75g | L: 25g

DÉJEUNER (850 kcal)
• Riz basmati 200g cuit + poulet grillé 200g
• Légumes sautés 150g + 1 c. huile d'olive
• Yaourt 0% 200g
→ P: 65g | G: 90g | L: 18g

COLLATION PRÉ-ENTRAÎNEMENT (400 kcal)
• Whey protéine 30g dans lait
• Banane + poignée d'amandes
→ P: 35g | G: 45g | L: 12g

DÎNER (700 kcal)
• Pâtes complètes 180g cuites + bœuf haché 150g
• Sauce tomate + fromage râpé 30g
• Salade verte
→ P: 55g | G: 70g | L: 20g

COLLATION SOIR (300 kcal)
• Fromage blanc 200g + miel + noix 30g
→ P: 25g | G: 20g | L: 15g

TOTAL JOURNALIER : ~2950 kcal | P: 225g | G: 300g | L: 90g

CONSEILS :
• Mangez toutes les 3-4 heures
• Protéines à chaque repas
• Glucides avant/après l'entraînement
• Hydratation : 3L d'eau/jour minimum`,
  },
  {
    id: 'pred_perte',
    type: 'nutrition',
    title: 'Plan perte de poids',
    isPredefined: true,
    date: '2024-01-01',
    content: `PLAN NUTRITION — PERTE DE POIDS
Déficit calorique : -500 kcal/j sous le TDEE
Macros : Protéines 2.2g/kg | Glucides 35% | Lipides 25%

PETIT-DÉJEUNER (400 kcal)
• Flocons d'avoine 50g + eau + cannelle
• 2 œufs + blancs d'œufs (3)
• Café noir ou thé
→ P: 35g | G: 40g | L: 12g

DÉJEUNER (450 kcal)
• Poulet grillé 180g (sans peau)
• Légumes verts à volonté (brocoli, épinards, courgette)
• Riz complet 80g cuit
• 1 c. huile d'olive
→ P: 45g | G: 40g | L: 10g

COLLATION (200 kcal)
• Fromage blanc 0% 200g
• Pomme ou fruits rouges 150g
→ P: 20g | G: 25g | L: 1g

DÎNER (400 kcal)
• Saumon 150g ou thon en boîte
• Légumes rôtis (poivrons, courgettes, tomates)
• Patate douce 100g ou lentilles 150g cuites
→ P: 40g | G: 35g | L: 12g

TOTAL JOURNALIER : ~1450 kcal | P: 140g | G: 140g | L: 35g

STRATÉGIES CLÉS :
• Commencer chaque repas par les légumes
• Protéines élevées pour préserver le muscle
• Jeûne intermittent 16:8 optionnel
• Éviter les aliments ultra-transformés
• Hydratation : boire 500ml d'eau avant chaque repas
• Limiter l'alcool et les boissons sucrées`,
  },
];
