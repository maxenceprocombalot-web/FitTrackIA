import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
// AES-CBC + padding PKCS7 sont les modes par défaut de crypto-js
import CryptoJS from 'crypto-js';

const { AES, enc, lib } = CryptoJS;
const { Utf8, Hex, Base64 } = enc;

// ─── Chiffrement par enveloppe des données locales ────────────────────────────
//
// Pourquoi : SecureStore (Keychain) est limité à ~2 Ko par valeur — impossible d'y
// stocker séances/repas. On applique donc le schéma standard « envelope » :
//
//   1. une clé de données aléatoire (256 bits) vit dans le Keychain,
//      avec WHEN_UNLOCKED_THIS_DEVICE_ONLY → elle N'EST PAS incluse dans les
//      sauvegardes iCloud/iTunes et ne quitte jamais cet appareil ;
//   2. les données sont chiffrées AES-256-CBC avec cette clé, puis stockées
//      dans AsyncStorage.
//
// Conséquence : même si le fichier AsyncStorage part dans une sauvegarde iCloud
// ou est extrait d'un appareil jailbreaké, il ne contient que du chiffré
// indéchiffrable sans le Keychain de CE téléphone.

const KEY_ID     = 'fit_data_key_v1';
export const ENC_PREFIX = 'enc:v1:';   // marqueur de format (permet la migration)

let _cachedKey: string | null = null;

/** Récupère (ou crée au premier lancement) la clé de chiffrement, en hex. */
async function getDataKey(): Promise<string | null> {
  if (_cachedKey) return _cachedKey;
  // Web : pas de Keychain → pas de chiffrement (données en clair, cf. README sécurité)
  if (Platform.OS === 'web') return null;

  try {
    let key = await SecureStore.getItemAsync(KEY_ID);
    if (!key) {
      const bytes = await Crypto.getRandomBytesAsync(32);        // CSPRNG 256 bits
      key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(KEY_ID, key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    _cachedKey = key;
    return key;
  } catch {
    return null;   // jamais bloquant : on dégrade en clair plutôt que perdre l'app
  }
}

/** Chiffre une chaîne. Renvoie la chaîne telle quelle si le chiffrement est indisponible. */
export async function encryptString(plain: string): Promise<string> {
  const keyHex = await getDataKey();
  if (!keyHex) return plain;
  try {
    const key = Hex.parse(keyHex);
    const iv  = lib.WordArray.random(16);                            // IV unique par écriture
    const out = AES.encrypt(plain, key, { iv });
    // format : enc:v1:<iv hex>:<ciphertext base64>
    return `${ENC_PREFIX}${iv.toString(Hex)}:${out.ciphertext.toString(Base64)}`;
  } catch {
    return plain;
  }
}

/** Déchiffre une valeur produite par encryptString. Renvoie null si illisible. */
export async function decryptString(payload: string): Promise<string | null> {
  if (!payload.startsWith(ENC_PREFIX)) return payload;           // legacy en clair
  const keyHex = await getDataKey();
  if (!keyHex) return null;
  try {
    const body = payload.slice(ENC_PREFIX.length);
    const sep  = body.indexOf(':');
    if (sep < 0) return null;
    const iv   = Hex.parse(body.slice(0, sep));
    const key  = Hex.parse(keyHex);
    const dec  = AES.decrypt(
      { ciphertext: Base64.parse(body.slice(sep + 1)) } as any,
      key,
      { iv },
    );
    const text = dec.toString(Utf8);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export const isEncrypted = (raw: string): boolean => raw.startsWith(ENC_PREFIX);
