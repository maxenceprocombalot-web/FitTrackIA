import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { ENTITLEMENT_ID, OFFERING_ID } from '../constants/premium';

// ─── Abonnement (RevenueCat) ──────────────────────────────────────────────────
//
// Robuste par conception : si la clé RevenueCat n'est pas fournie (ex. Expo Go,
// build de dev sans config), TOUT dégrade proprement en « gratuit » sans planter.
// Un interrupteur local (@fit_premium_dev) permet de tester le parcours premium
// et le gating sans facturation réelle.

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const API_KEY     = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

const DEV_KEY = '@fit_premium_dev'; // override de test (non lié à un vrai achat)

let _configured = false;

export function isBillingConfigured(): boolean {
  return _configured;
}

/** À appeler une fois au démarrage. Sans clé → no-op (mode gratuit). */
export async function initPurchases(): Promise<void> {
  if (_configured || !API_KEY) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    _configured = true;
  } catch {
    _configured = false;
  }
}

/** Statut premium : override de test OU entitlement RevenueCat actif. */
export async function checkPremium(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(DEV_KEY)) === 'true') return true;
    if (!_configured) return false;
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

/** Packages d'abonnement proposés (mensuel / annuel). Vide si non configuré. */
export async function getPackages(): Promise<PurchasesPackage[]> {
  try {
    if (!_configured) return [];
    const offerings = await Purchases.getOfferings();
    const current = offerings.all[OFFERING_ID] ?? offerings.current;
    return current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

/** Achat d'un package. Renvoie true si l'entitlement premium est actif après. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/** Restaurer les achats (obligatoire App Store). */
export async function restore(): Promise<boolean> {
  try {
    if (!_configured) return false;
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch {
    return false;
  }
}

// ─── Override de test (dev / démo, sans facturation) ──────────────────────────
export const setDevPremium = (on: boolean) =>
  on ? AsyncStorage.setItem(DEV_KEY, 'true') : AsyncStorage.removeItem(DEV_KEY);
export const getDevPremium = async () => (await AsyncStorage.getItem(DEV_KEY)) === 'true';
