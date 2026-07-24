import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import { shareFooter } from '../../constants/app';
import Button from '../../components/ui/Button';

export default function MonthlySummaryModal() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const router    = useRouter();
  const store     = useAppStore();

  const summary = store.monthlySummaries.find(s => s.month === month);

  // Label lisible du mois
  const monthLabel = month
    ? new Date(month + '-02').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  const handleShare = async () => {
    if (!summary) return;
    const lines = [
      `📊 Bilan ${monthLabel} — FitTrackIA`,
      '',
      `🏋️ ${summary.totalWorkouts} séances réalisées`,
      `🔥 ${Math.round(summary.avgCalories)} kcal/j en moyenne`,
      summary.weightChange !== undefined
        ? `⚖️ Poids : ${summary.weightChange > 0 ? '+' : ''}${summary.weightChange.toFixed(1)}kg ce mois`
        : '',
      summary.bestPR
        ? `🏆 Meilleur PR : ${summary.bestPR.exerciseName} ${summary.bestPR.weight}kg × ${summary.bestPR.reps}`
        : '',
      '',
      summary.coachMessage,
    ].filter(Boolean);
    await Share.share({ message: lines.join('\n') + shareFooter() });
  };

  if (!summary) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bar-chart-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Bilan en cours de génération</Text>
        <Text style={styles.emptySub}>Reviens dans un instant…</Text>
        <TouchableOpacity style={styles.closeLink} onPress={() => router.back()}>
          <Text style={{ color: Colors.primary }}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const weightColor = summary.weightChange === undefined
    ? Colors.textSecondary
    : summary.weightChange <= 0 ? Colors.green : Colors.red;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>📊</Text>
        <Text style={styles.heroTitle}>Bilan {monthLabel}</Text>
        <Text style={styles.heroSub}>Récapitulatif de ton mois</Text>
      </View>

      {/* ── Grille de stats ──────────────────────────────────────────────── */}
      <View style={styles.grid}>
        <StatCard
          value={String(summary.totalWorkouts)}
          label="Séances"
          icon="barbell-outline"
          color={Colors.primary}
        />
        <StatCard
          value={`${Math.round(summary.avgCalories)}`}
          label="kcal/j moy."
          icon="flame-outline"
          color={Colors.orange}
        />
        {summary.weightChange !== undefined && (
          <StatCard
            value={`${summary.weightChange > 0 ? '+' : ''}${summary.weightChange.toFixed(1)}kg`}
            label="Évolution poids"
            icon="trending-up-outline"
            color={weightColor}
          />
        )}
        {summary.totalVolume > 0 && (
          <StatCard
            value={`${Math.round(summary.totalVolume / 1000)}t`}
            label="Volume total"
            icon="fitness-outline"
            color={Colors.green}
          />
        )}
      </View>

      {/* ── Meilleur PR du mois ──────────────────────────────────────────── */}
      {summary.bestPR && (
        <View style={styles.prCard}>
          <Text style={styles.prEmoji}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.prLabel}>Meilleur PR du mois</Text>
            <Text style={styles.prExercise}>{summary.bestPR.exerciseName}</Text>
            <Text style={styles.prValue}>{summary.bestPR.weight}kg × {summary.bestPR.reps} reps</Text>
          </View>
        </View>
      )}

      {/* ── Message du coach ─────────────────────────────────────────────── */}
      <View style={styles.coachCard}>
        <View style={styles.coachHeader}>
          <View style={styles.coachDot} />
          <Text style={styles.coachLabel}>FitCoach IA</Text>
        </View>
        <Text style={styles.coachMsg}>{summary.coachMessage}</Text>
      </View>

      {/* ── Bouton partager ──────────────────────────────────────────────── */}
      <Button title="Partager mon bilan" icon="share-social-outline" onPress={handleShare} />

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>Fermer</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Carte statistique ────────────────────────────────────────────────────────

function StatCard({ value, label, icon, color }: {
  value: string; label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View style={[scStyles.card, { borderColor: color + '30' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[scStyles.value, { color }]}>{value}</Text>
      <Text style={scStyles.label}>{label}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: '45%',
    backgroundColor: Colors.surface, borderRadius: R,
    borderWidth: 1, padding: Sp.md,
    alignItems: 'center', gap: 4,
  },
  value: { fontSize: Fs.xxl, fontFamily: Fonts.heavy },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.md },
  // État vide
  empty: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Sp.xl },
  emptyTitle: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  emptySub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  closeLink: { marginTop: Sp.md },
  // Hero
  hero: { alignItems: 'center', paddingVertical: Sp.xl, gap: 6 },
  heroEmoji: { fontSize: 56, fontFamily: Fonts.regular },
  heroTitle: { fontSize: Fs.xxl, fontFamily: Fonts.heavy, color: Colors.text, textTransform: 'capitalize' },
  heroSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.sm },
  // PR
  prCard: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: Colors.yellow + '10',
    borderRadius: R, borderWidth: 1, borderColor: Colors.yellow + '30',
    padding: Sp.md,
  },
  prEmoji: { fontSize: 32, fontFamily: Fonts.regular },
  prLabel: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  prExercise: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text, marginTop: 2 },
  prValue: { fontSize: Fs.sm, color: Colors.yellow, fontFamily: Fonts.semibold, marginTop: 2 },
  // Coach
  coachCard: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  coachDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  coachLabel: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.primary },
  coachMsg: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 20 },
  // Actions
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md,
  },
  shareBtnText: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.onPrimary },
  closeBtn: { alignItems: 'center', padding: Sp.sm },
  closeBtnText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted },
});
