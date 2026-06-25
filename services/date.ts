// ─── Dates en heure LOCALE ────────────────────────────────────────────────────
//
// ⚠️ Ne jamais utiliser `new Date().toISOString().split('T')[0]` pour obtenir
// « aujourd'hui » : toISOString() renvoie la date en UTC. Pour un utilisateur en
// France le soir (UTC+1/+2) ou aux Amériques (UTC−5 à −8), la date UTC peut être
// le mauvais jour calendaire → repas/séances mal attribués, streak cassé.
// Ces helpers travaillent sur le fuseau local de l'appareil.

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Date locale au format YYYY-MM-DD (par défaut : maintenant). */
export function localISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Aujourd'hui (heure locale), YYYY-MM-DD. */
export const today = (): string => localISO();

/** Mois courant (heure locale), YYYY-MM. */
export const thisMonth = (): string => localISO().slice(0, 7);

/**
 * Date d'il y a `n` jours (heure locale), YYYY-MM-DD.
 * Utilise setDate plutôt qu'une soustraction de millisecondes pour rester
 * correct lors des changements d'heure (DST).
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}

/** Hier (heure locale), YYYY-MM-DD. */
export const yesterday = (): string => daysAgo(1);
