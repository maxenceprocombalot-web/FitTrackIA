import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import { getSecure, setSecure, isDataUnreadable, resetUnreadableData } from './storage';
import { today } from './date';

// Format de fichier : FITTRACK:V1:<AES OpenSSL base64>
// Le contenu est un JSON { version, exportedAt, data: { '@fit_...': '<json>' } }
// chiffré avec la phrase secrète choisie par l'utilisateur (KDF OpenSSL de
// crypto-js, sel aléatoire inclus dans le blob).
const FILE_PREFIX = 'FITTRACK:V1:';

// Jamais sauvegardés : la clé API (secret), les photos (fichiers hors
// AsyncStorage, leurs URIs seraient cassées sur un autre appareil).
const EXCLUDED_KEYS = new Set(['@fit_openai_key', '@fit_progress_photos']);

export interface BackupInfo {
  exportedAt: string;
  entryCount: number;
}

async function collectData(): Promise<Record<string, string>> {
  const keys = (await AsyncStorage.getAllKeys()).filter(
    k => k.startsWith('@fit_') && !EXCLUDED_KEYS.has(k),
  );
  const data: Record<string, string> = {};
  for (const k of keys) {
    const v = await getSecure(k);
    if (v !== null) data[k] = v;
  }
  return data;
}

/** Crée le fichier de sauvegarde chiffré et retourne son URI locale. */
export async function createBackup(passphrase: string): Promise<{ uri: string; entryCount: number }> {
  const data = await collectData();
  const entryCount = Object.keys(data).length;
  if (entryCount === 0) throw new Error('Aucune donnée à sauvegarder.');

  const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data });
  const enc = CryptoJS.AES.encrypt(payload, passphrase).toString();

  const uri = `${FileSystem.cacheDirectory}fittrack-${today()}.fittrack`;
  await FileSystem.writeAsStringAsync(uri, FILE_PREFIX + enc);
  return { uri, entryCount };
}

/** Lit et déchiffre un fichier de sauvegarde sans rien écrire (aperçu avant restauration). */
export function decryptBackup(fileContent: string, passphrase: string): { info: BackupInfo; data: Record<string, string> } {
  const trimmed = fileContent.trim();
  if (!trimmed.startsWith(FILE_PREFIX)) {
    throw new Error("Ce fichier n'est pas une sauvegarde FitTrack IA valide.");
  }
  let plain = '';
  try {
    plain = CryptoJS.AES.decrypt(trimmed.slice(FILE_PREFIX.length), passphrase)
      .toString(CryptoJS.enc.Utf8);
  } catch {
    plain = '';
  }
  if (!plain) throw new Error('Mot de passe incorrect.');

  let parsed: any;
  try { parsed = JSON.parse(plain); } catch { throw new Error('Mot de passe incorrect.'); }
  if (parsed?.version !== 1 || typeof parsed?.data !== 'object' || parsed.data === null) {
    throw new Error('Format de sauvegarde non reconnu.');
  }
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (k.startsWith('@fit_') && !EXCLUDED_KEYS.has(k) && typeof v === 'string') data[k] = v;
  }
  return {
    info: { exportedAt: String(parsed.exportedAt ?? ''), entryCount: Object.keys(data).length },
    data,
  };
}

/**
 * Écrit les données restaurées. Écrase les valeurs existantes pour les clés
 * présentes dans la sauvegarde, ne touche pas aux autres. Fonctionne aussi
 * quand les données locales sont illisibles (restauration iCloud sans clé) :
 * c'est précisément la porte de sortie de ce scénario.
 */
export async function restoreBackup(data: Record<string, string>): Promise<number> {
  if (isDataUnreadable()) await resetUnreadableData();
  let count = 0;
  for (const [k, v] of Object.entries(data)) {
    await setSecure(k, v);
    count++;
  }
  return count;
}
