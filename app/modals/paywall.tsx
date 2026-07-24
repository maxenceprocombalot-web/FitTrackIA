import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAppStore } from '../../store/useAppStore';
import { getPackages, purchase, restore, setDevPremium } from '../../services/purchases';
import { PREMIUM_BENEFITS } from '../../constants/premium';
import { Colors, R, Sp, Fs, Fonts, tapSlop } from '../../constants/theme';
import Button from '../../components/ui/Button';

function periodLabel(p: PurchasesPackage): string {
  switch (p.packageType) {
    case 'ANNUAL':  return 'Annuel';
    case 'MONTHLY': return 'Mensuel';
    case 'WEEKLY':  return 'Hebdo';
    default:        return p.product.title;
  }
}

export default function PaywallScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    getPackages().then(pkgs => {
      setPackages(pkgs);
      // Sélectionne l'annuel par défaut (meilleure valeur), sinon le premier
      setSelected(pkgs.find(p => p.packageType === 'ANNUAL') ?? pkgs[0] ?? null);
      setLoading(false);
    });
  }, []);

  const handleSubscribe = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const ok = await purchase(selected);
      await store.refreshPremium();
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('🎉 Bienvenue en Premium !', 'Toutes les fonctions IA sont débloquées.');
        router.back();
      }
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Achat impossible', e?.message ?? 'Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const ok = await restore();
    await store.refreshPremium();
    setBusy(false);
    Alert.alert(ok ? '✅ Premium restauré' : 'Aucun achat', ok ? 'Ton abonnement est réactivé.' : 'Aucun abonnement à restaurer sur ce compte.');
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={tapSlop}>
        <Ionicons name="close" size={24} color={Colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>FitTrack Premium</Text>
        <Text style={styles.subtitle}>Débloque toute la puissance de l'IA</Text>

        {/* Bénéfices */}
        <View style={styles.benefits}>
          {PREMIUM_BENEFITS.map(b => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as any} size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            </View>
          ))}
        </View>

        {/* Offres */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: Sp.lg }} />
        ) : packages.length > 0 ? (
          <View style={styles.plans}>
            {packages.map(p => {
              const sel = selected?.identifier === p.identifier;
              return (
                <TouchableOpacity
                  key={p.identifier}
                  style={[styles.plan, sel && styles.planActive]}
                  onPress={() => { Haptics.selectionAsync(); setSelected(p); }}
                  accessibilityRole="button"
                >
                  {p.packageType === 'ANNUAL' && <View style={styles.badge}><Text style={styles.badgeText}>MEILLEURE OFFRE</Text></View>}
                  <Text style={[styles.planPeriod, sel && { color: Colors.primary }]}>{periodLabel(p)}</Text>
                  <Text style={styles.planPrice}>{p.product.priceString}</Text>
                  <Ionicons
                    name={sel ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={sel ? Colors.primary : Colors.textMuted}
                    style={{ marginTop: 4 }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.notConfigured}>
            <Text style={styles.notConfiguredText}>
              Les offres d'abonnement ne sont pas encore disponibles sur cet appareil.
            </Text>
            {__DEV__ && (
              <Button
                title="🧪 Activer Premium (test)"
                variant="secondary"
                onPress={async () => { await setDevPremium(true); await store.refreshPremium(); router.back(); }}
                style={{ marginTop: Sp.md }}
              />
            )}
          </View>
        )}

        {packages.length > 0 && (
          <Button
            title={busy ? '' : 'Continuer'}
            loading={busy}
            onPress={handleSubscribe}
            size="lg"
            style={{ marginTop: Sp.md }}
          />
        )}

        <TouchableOpacity onPress={handleRestore} disabled={busy} style={styles.restore} accessibilityRole="button">
          <Text style={styles.restoreText}>Restaurer un achat</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Abonnement auto-renouvelable, résiliable à tout moment depuis les réglages de l'App Store.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/modals/terms')}><Text style={styles.legalLink}>Conditions</Text></TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/modals/privacy-policy')}><Text style={styles.legalLink}>Confidentialité</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  close: { position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 4 },
  content: { padding: Sp.lg, paddingTop: Sp.xxl, alignItems: 'center' },
  crown: { fontSize: 52 },
  title: { fontSize: Fs.xxxl, fontFamily: Fonts.heavy, color: Colors.text, marginTop: Sp.sm },
  subtitle: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 4, marginBottom: Sp.lg, textAlign: 'center' },

  benefits: { alignSelf: 'stretch', gap: Sp.sm, marginBottom: Sp.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.md, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  benefitIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  benefitSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },

  plans: { flexDirection: 'row', gap: Sp.sm, alignSelf: 'stretch' },
  plan: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: Sp.md, paddingHorizontal: Sp.sm },
  planActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  badge: { position: 'absolute', top: -10, backgroundColor: Colors.primary, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontFamily: Fonts.bold, color: Colors.onPrimary, letterSpacing: 0.3 },
  planPeriod: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  planPrice: { fontSize: Fs.lg, fontFamily: Fonts.condensedHeavy, color: Colors.text, marginTop: 2 },

  notConfigured: { alignSelf: 'stretch', backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  notConfiguredText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  restore: { marginTop: Sp.md, padding: Sp.sm },
  restoreText: { fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.textSecondary },
  legal: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', marginTop: Sp.sm, lineHeight: 16 },
  legalLinks: { flexDirection: 'row', gap: 8, marginTop: 6 },
  legalLink: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.primary },
  legalDot: { fontSize: Fs.xs, color: Colors.textMuted },
});
