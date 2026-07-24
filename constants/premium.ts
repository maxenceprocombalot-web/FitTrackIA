// ─── Modèle freemium : FitTrack Premium ───────────────────────────────────────
//
// Gratuit : tout le suivi (séances, PRs, surcharge progressive, programmes,
// nutrition, scan, macros, poids, progrès de base). L'app est pleinement utile
// sans payer — c'est ce qui fait installer et rester.
//
// Premium : les fonctions IA (qui coûtent de l'argent OpenAI à chaque appel) et
// les analyses avancées. Réserver l'IA au premium aligne le coût et la valeur.

// Identifiant d'entitlement côté RevenueCat (à créer à l'identique dans le dashboard)
export const ENTITLEMENT_ID = 'premium';

// Identifiant de l'offering RevenueCat (contient les packages mensuel/annuel)
export const OFFERING_ID = 'default';

// Clés des fonctions réservées au premium (pour le gating)
export type PremiumFeature =
  | 'ai_meal_plan'      // génération de plan de repas / meal prep IA
  | 'ai_program'        // génération de programme sportif IA
  | 'ai_analysis'       // analyse nutritionnelle / bilan IA
  | 'ai_restaurant';    // estimation macros d'un plat par IA

// Coach IA en chat : gratuit mais limité par jour ; illimité en premium.
export const FREE_COACH_MESSAGES_PER_DAY = 5;

// Arguments de vente affichés dans le paywall
export const PREMIUM_BENEFITS: { icon: string; title: string; sub: string }[] = [
  { icon: 'sparkles',          title: 'Coach IA illimité',        sub: 'Discute sans limite, analyses personnalisées' },
  { icon: 'restaurant',        title: 'Plans de repas IA',        sub: 'Menus & meal prep générés selon tes macros' },
  { icon: 'barbell',           title: 'Programmes IA sur-mesure', sub: 'Un programme adapté à ton niveau et matériel' },
  { icon: 'analytics',         title: 'Bilans & analyses avancés',sub: 'Détection de carences, corrélations sport/nutrition' },
  { icon: 'heart',             title: 'Soutiens le développement',sub: 'Une app indépendante, sans pub, tes données privées' },
];
