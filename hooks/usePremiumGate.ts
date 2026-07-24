import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

// Gating premium réutilisable :
//   const { isPremium, requirePremium } = usePremiumGate();
//   if (!requirePremium()) return;   // ouvre le paywall et stoppe si non-premium
export function usePremiumGate() {
  const store  = useAppStore();
  const router = useRouter();

  const requirePremium = (): boolean => {
    if (store.isPremium) return true;
    router.push('/modals/paywall');
    return false;
  };

  return { isPremium: store.isPremium, requirePremium };
}
