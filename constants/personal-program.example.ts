// Modèle. Copier en `personal-program.ts` (gitignoré) et y mettre son contenu :
//   cp constants/personal-program.example.ts constants/personal-program.ts
export interface Exo { name: string; series: string; reps: string; rest: string; loads?: string[]; load?: string; note?: string; }
export interface AthleticItem { name: string; detail: string; tag?: 'plyo' | 'endurance' | 'skills' | 'prevention' | 'interdit'; }
export interface Journee { day: string; seance: string | null; exos: Exo[]; athletic: AthleticItem[]; }
export interface Bloc { id: string; title: string; weeks: number; weekLabels: string[]; focus: string; athleticGoal: string; semaine: Journee[]; }
export interface HomeDrill { name: string; detail: string; minutes: number }

export const PERSONAL_BLOCS: Bloc[] = [];
export const PERSONAL_HOME_ROUTINE: HomeDrill[] = [];
export const PERSONAL_RIM_WORK: HomeDrill[] = [];
export const PERSONAL_HR_MAX = 190;
export const PERSONAL_PACES: { zone: string; pace: string; hr?: string; usage: string }[] = [];
export const PERSONAL_RULES: string[] = [];
