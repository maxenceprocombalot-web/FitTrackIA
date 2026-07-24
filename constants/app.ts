// ─── Identité & acquisition ───────────────────────────────────────────────────

export const APP_NAME = 'FitTrack IA';

// ⚠️ À REMPLACER par le vrai lien après publication sur l'App Store
// (App Store Connect → ton app → « URL du produit »). Un lien onelink/branch
// serait encore mieux pour tracer les installs par canal.
export const APP_STORE_URL = 'https://apps.apple.com/app/fittrackia';

// Pied ajouté aux partages : transforme chaque partage en canal d'acquisition.
export function shareFooter(): string {
  return `\n\n📲 Transforme-toi avec ${APP_NAME} — coach IA, sport & nutrition :\n${APP_STORE_URL}`;
}
