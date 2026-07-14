import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import {
  PROGRAMS, ProgramTemplate, ProgramCategory, ProgramLevel, ProgramGoal,
  CATEGORY_META, LEVEL_COLOR, GOAL_COLOR,
} from '../../constants/programs';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';

// ─── Filtres disponibles ──────────────────────────────────────────────────────

const DAYS_FILTERS: (number | 'all')[] = ['all', 3, 4, 5, 6];
const LEVEL_FILTERS: (ProgramLevel | 'all')[] = ['all', 'Débutant', 'Intermédiaire', 'Avancé'];
const GOAL_FILTERS: (ProgramGoal | 'all')[] = ['all', 'Force', 'Hypertrophie', 'Perte de poids', 'Endurance'];

export default function ProgramsScreen() {
  const router = useRouter();
  const store  = useAppStore();

  const [daysFilter,  setDaysFilter]  = useState<number | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<ProgramLevel | 'all'>('all');
  const [goalFilter,  setGoalFilter]  = useState<ProgramGoal  | 'all'>('all');

  // Programme actif trouvé dans la bibliothèque
  const activeProgram = store.activeProgram
    ? PROGRAMS.find(p => p.id === store.activeProgram?.programId)
    : null;
  const currentWeek = store.getProgramWeek();

  // Filtrage dynamique
  const filtered = useMemo(() => PROGRAMS.filter(p => {
    if (daysFilter  !== 'all' && p.daysPerWeek !== daysFilter)  return false;
    if (levelFilter !== 'all' && p.level       !== levelFilter) return false;
    if (goalFilter  !== 'all' && p.goal        !== goalFilter)  return false;
    return true;
  }), [daysFilter, levelFilter, goalFilter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Créer un programme IA ────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.aiProgramBtn}
        onPress={() => router.push('/modals/ai-program')}
      >
        <View style={styles.aiProgramIcon}>
          <Text style={{ fontSize: 22, fontFamily: Fonts.regular }}>🧠</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiProgramTitle}>Créer mon programme IA</Text>
          <Text style={styles.aiProgramSub}>GPT-4o génère un programme sur-mesure selon ton niveau et objectif</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* ── Programme actif ──────────────────────────────────────────────── */}
      {activeProgram && (
        <View style={styles.activeBanner}>
          <View style={styles.activeBannerTop}>
            <View style={styles.activeDot} />
            <Text style={styles.activeLabel}>Programme en cours</Text>
            <TouchableOpacity onPress={store.stopProgram} style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>Arrêter</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.activeName}>{activeProgram.emoji} {activeProgram.name}</Text>
          <Text style={styles.activeWeek}>Semaine {currentWeek}</Text>
          <TouchableOpacity
            style={styles.activeCta}
            onPress={() => router.push(`/programs/${activeProgram.id}`)}
          >
            <Ionicons name="today-outline" size={16} color={Colors.bg} />
            <Text style={styles.activeCtaText}>Voir la séance du jour</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <Text style={styles.filterLabel}>Jours / semaine</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {DAYS_FILTERS.map(d => (
          <Chip key={String(d)} label={d === 'all' ? 'Tous' : `${d}j`} active={daysFilter === d} onPress={() => setDaysFilter(d)} />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Niveau</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {LEVEL_FILTERS.map(l => (
          <Chip
            key={String(l)}
            label={l === 'all' ? 'Tous' : l}
            active={levelFilter === l}
            color={l !== 'all' ? LEVEL_COLOR[l] : undefined}
            onPress={() => setLevelFilter(l)}
          />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Objectif</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {GOAL_FILTERS.map(g => (
          <Chip
            key={String(g)}
            label={g === 'all' ? 'Tous' : g}
            active={goalFilter === g}
            color={g !== 'all' ? GOAL_COLOR[g] : undefined}
            onPress={() => setGoalFilter(g)}
          />
        ))}
      </ScrollView>

      {/* ── Résultats ────────────────────────────────────────────────────── */}
      <Text style={styles.resultCount}>{filtered.length} programme{filtered.length > 1 ? 's' : ''}</Text>

      {filtered.map(p => (
        <ProgramCard
          key={p.id}
          program={p}
          isActive={p.id === store.activeProgram?.programId}
          onPress={() => router.push(`/programs/${p.id}`)}
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Carte programme ──────────────────────────────────────────────────────────

function ProgramCard({ program: p, isActive, onPress }: {
  program: ProgramTemplate;
  isActive: boolean;
  onPress: () => void;
}) {
  const catMeta = CATEGORY_META[p.category];
  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Badge actif */}
      {isActive && (
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>● EN COURS</Text>
        </View>
      )}

      {/* En-tête */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{p.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{p.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: catMeta.color + '20' }]}>
            <Text style={[styles.catBadgeText, { color: catMeta.color }]}>{p.category}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>

      {/* Description */}
      <Text style={styles.cardDesc} numberOfLines={2}>{p.description}</Text>

      {/* Tags */}
      <View style={styles.tagsRow}>
        <Tag icon="calendar-outline" label={`${p.daysPerWeek}j/sem`} color={Colors.textSecondary} />
        <Tag icon="time-outline"     label={`~${p.sessionDuration}min`} color={Colors.textSecondary} />
        <Tag icon="bar-chart-outline" label={p.level}  color={LEVEL_COLOR[p.level]} />
        <Tag icon="trophy-outline"   label={p.goal}    color={GOAL_COLOR[p.goal]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Chip({ label, active, color = Colors.primary, onPress }: {
  label: string; active: boolean; color?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[chipStyles.chip, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
    >
      <Text style={[chipStyles.text, active && { color, fontFamily: Fonts.semibold }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: Sp.md, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, marginRight: 6 },
  text: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
});

function Tag({ icon, label, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string }) {
  return (
    <View style={tagStyles.tag}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[tagStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const tagStyles = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surfaceElevated, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  text: { fontSize: 10, fontFamily: Fonts.medium },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.sm },
  // Bouton programme IA
  aiProgramBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    backgroundColor: Colors.primary + '12',
    borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40',
    padding: Sp.md,
  },
  aiProgramIcon: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  aiProgramTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  aiProgramSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  // Banner programme actif
  activeBanner: {
    backgroundColor: Colors.primary + '18',
    borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40',
    padding: Sp.md, gap: 6,
  },
  activeBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  activeLabel: { flex: 1, fontSize: Fs.xs, color: Colors.textSecondary, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  stopBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: Colors.red + '60' },
  stopBtnText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.red },
  activeName: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  activeWeek: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.primary },
  activeCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.sm, justifyContent: 'center', marginTop: 4 },
  activeCtaText: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.bg },
  // Filtres
  filterLabel: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  filterScroll: { marginHorizontal: -Sp.md },
  filterRow: { paddingHorizontal: Sp.md, paddingVertical: 6 },
  // Résultats
  resultCount: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 4 },
  // Carte
  card: {
    backgroundColor: Colors.surface, borderRadius: R,
    borderWidth: 1, borderColor: Colors.border, padding: Sp.md, gap: Sp.sm,
  },
  cardActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '08' },
  activePill: { alignSelf: 'flex-start', backgroundColor: Colors.green + '20', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  activePillText: { fontSize: 10, color: Colors.green, fontFamily: Fonts.bold },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  cardEmoji: { fontSize: 32, fontFamily: Fonts.regular },
  cardName: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text, marginBottom: 4 },
  catBadge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { fontSize: Fs.xs, fontFamily: Fonts.semibold },
  cardDesc: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});
