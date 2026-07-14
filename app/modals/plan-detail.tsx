import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';

export default function PlanDetailModal() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router     = useRouter();
  const store      = useAppStore();

  const plan = store.savedPlans.find(p => p.id === planId);

  if (!plan) {
    return (
      <View style={styles.empty}>
        <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Plan introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 8 }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor  = plan.type === 'sport' ? Colors.primary : plan.type === 'nutrition' ? Colors.green : Colors.orange;
  const typeLabel  = plan.type === 'sport' ? '💪 Sport' : plan.type === 'nutrition' ? '🥗 Nutrition' : '✨ Personnalisé';
  const dateLabel  = new Date(plan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleApply = () => {
    if (!plan.programId) return;
    Alert.alert(
      'Appliquer ce programme',
      `Démarrer "${plan.title}" comme programme actif ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer',
          onPress: () => {
            store.startProgram(plan.programId!);
            router.back();
            Alert.alert('🔥 Programme démarré !', `"${plan.title}" est maintenant actif dans l'onglet Programmes.`);
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (plan.isPredefined) return;
    Alert.alert('Supprimer ce plan ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { store.deletePlan(plan.id); router.back(); } },
    ]);
  };

  const handleShare = async () => {
    await Share.share({ message: `${plan.title}\n\n${plan.content}\n\n— Partagé depuis FitTrackIA` });
  };

  return (
    <View style={styles.container}>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        {plan.isPredefined && (
          <View style={styles.predBadge}>
            <Text style={styles.predText}>Prédéfini</Text>
          </View>
        )}
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      {/* ── Contenu scrollable ───────────────────────────────────────────── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.planText}>{plan.content}</Text>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.shareBtnText}>Partager</Text>
        </TouchableOpacity>

        {!plan.isPredefined && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color={Colors.red} />
          </TouchableOpacity>
        )}

        {plan.programId && (
          <Button
            title="Appliquer ce programme"
            icon="rocket-outline"
            onPress={handleApply}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  empty: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textSecondary },
  header: {
    padding: Sp.lg, paddingBottom: Sp.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: Sp.md, paddingVertical: 4,
  },
  typeText: { fontSize: Fs.xs, fontFamily: Fonts.bold },
  predBadge: {
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: Sp.sm, paddingVertical: 2,
    backgroundColor: Colors.yellow + '20',
  },
  predText: { fontSize: Fs.xs, color: Colors.yellow, fontFamily: Fonts.medium },
  title: { fontSize: Fs.xl, fontFamily: Fonts.heavy, color: Colors.text },
  date: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  scroll: { flex: 1 },
  content: { padding: Sp.lg },
  planText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 22 },
  actions: {
    flexDirection: 'row', gap: Sp.sm,
    padding: Sp.md, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Sp.md, paddingVertical: Sp.sm,
    borderRadius: R, borderWidth: 1, borderColor: Colors.border,
  },
  shareBtnText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  deleteBtn: {
    padding: Sp.sm, borderRadius: R,
    borderWidth: 1, borderColor: Colors.red + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: R, paddingVertical: Sp.sm,
  },
  applyBtnText: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.onPrimary },
});
