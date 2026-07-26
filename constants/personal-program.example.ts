// Modèle. Copier en `personal-program.ts` (gitignoré) et y mettre son contenu :
//   cp constants/personal-program.example.ts constants/personal-program.ts
export interface AthleticItem { name: string; detail: string; tag?: 'plyo' | 'endurance' | 'skills' | 'prevention' | 'interdit'; }
export interface AthleticDay { day: string; muscu: string; items: AthleticItem[]; }
export interface AthleticPhase { id: string; title: string; block: string; goal: string; week: AthleticDay[]; }

export const PERSONAL_PHASES: AthleticPhase[] = [];
export const PERSONAL_RULES: string[] = [];
