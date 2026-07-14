import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import {
  PROGRAMS, ProgramSession, ProgramExercise,
  CATEGORY_META, LEVEL_COLOR, GOAL_COLOR,
} from '../../constants/programs';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';

// Jour ISO courant : 1=Lundi … 7=Dimanche
function getTodayISO(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const d = new Date().getDay(); // 0=Dimanche..6=Samedi
  return (d === 0 ? 7 : d) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

const REST_LABEL = (s: number) => s >= 60 ? `${s / 60}min` : `${s}s`;

export default function ProgramDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const store   = useAppStore();
  const program = PROGRAMS.find(p => p.id === id);

  const [expanded, setExpanded] = useState<string | null>(null);

  if (!program) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <Text style={{ color: Colors.textSecondary }}>Programme introuvable</Text>
      </View>
    );
  }

  const isActive     = store.activeProgram?.programId === program.id;
  const currentWeek  = store.getProgramWeek();
  const todayDOW     = getTodayISO();
  const todaySession = program.sessions.find(s => s.dayOfWeek === todayDOW);
  const catMeta      = CATEGORY_META[program.category];

  // Lance le programme ou le confirme si déjà actif
  const handleStart = () => {
    if (isActive) {
      Alert.alert('Programme en cours', 'Ce programme est déjà actif.', [{ text: 'Ok' }]);
      return;
    }
    if (store.activeProgram) {
      Alert.alert(
        'Changer de programme',
        'Tu as déjà un programme en cours. Le remplacer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Remplacer', style: 'destructive', onPress: () => store.startProgram(program.id) },
        ],
      );
    } else {
      store.startProgram(program.id);
      Alert.alert('🔥 Programme démarré !', `"${program.name}" est maintenant actif. Bonne chance !`, [{ text: 'Allons-y !' }]);
    }
  };

  // Navigue vers la modal add-workout pré-remplie avec la séance
  const handleStartSession = (session: ProgramSession) => {
    router.push({
      pathname: '/modals/add-workout',
      params: {
        programId: program.id,
        sessionId: session.id,
        presetName: session.name,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Bandeau héro ─────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.emoji}>{program.emoji}</Text>
        <Text style={styles.name}>{program.name}</Text>
        <Text style={styles.desc}>{program.description}</Text>

        {/* Badges caractéristiques */}
        <View style={styles.badges}>
          <Badge icon="calendar-outline" label={`${program.daysPerWeek} jours/sem`}     color={Colors.textSecondary} />
          <Badge icon="time-outline"     label={`~${program.sessionDuration}min/séance`} color={Colors.textSecondary} />
          <Badge icon="bar-chart-outline" label={program.level}   color={LEVEL_COLOR[program.level]} />
          <Badge icon="trophy-outline"   label={program.goal}     color={GOAL_COLOR[program.goal]} />
          <Badge icon="grid-outline"     label={program.category} color={catMeta.color} />
        </View>

        {/* Progression si actif */}
        {isActive && (
          <View style={styles.progressBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
            <Text style={styles.progressText}>Semaine {currentWeek} • Programme en cours</Text>
          </View>
        )}
      </View>

      {/* ── Séance du jour ───────────────────────────────────────────────── */}
      {todaySession ? (
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Ionicons name="today-outline" size={18} color={Colors.primary} />
            <Text style={styles.todayTitle}>Séance du jour — {todaySession.dayLabel}</Text>
          </View>
          <Text style={styles.todayName}>{todaySession.name}</Text>
          <Button title="Commencer cette séance" icon="play-circle-outline" onPress={() => handleStartSession(todaySession)} />

        </View>
      ) : (
        <View style={styles.restCard}>
          <Ionicons name="moon-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.restText}>Aujourd'hui est un jour de repos 💤</Text>
        </View>
      )}

      {/* ── Bouton démarrer le programme ─────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.startBtn, isActive && styles.startBtnActive]}
        onPress={handleStart}
      >
        <Ionicons name={isActive ? 'checkmark-circle' : 'rocket-outline'} size={20} color="#fff" />
        <Text style={styles.startBtnText}>
          {isActive ? 'Programme actif ✓' : 'Démarrer ce programme'}
        </Text>
      </TouchableOpacity>

      {/* ── Plan des séances ─────────────────────────────────────────────── */}
      <Text style={styles.planTitle}>Plan des séances</Text>
      {program.sessions.map(session => (
        <SessionCard
          key={session.id}
          session={session}
          expanded={expanded === session.id}
          isToday={session.dayOfWeek === todayDOW}
          onToggle={() => setExpanded(prev => prev === session.id ? null : session.id)}
          onStart={() => handleStartSession(session)}
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Carte séance dépliable ───────────────────────────────────────────────────

function SessionCard({ session, expanded, isToday, onToggle, onStart }: {
  session: ProgramSession;
  expanded: boolean;
  isToday: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  return (
    <View style={[scStyles.card, isToday && scStyles.cardToday]}>
      <TouchableOpacity style={scStyles.header} onPress={onToggle}>
        <View style={[scStyles.dayPill, isToday && scStyles.dayPillToday]}>
          <Text style={[scStyles.dayText, isToday && scStyles.dayTextToday]}>
            {session.dayLabel.slice(0, 3)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={scStyles.name}>{session.name}</Text>
          <Text style={scStyles.meta}>{session.exercises.length} exercices • {session.focus}</Text>
        </View>
        {isToday && <View style={scStyles.todayDot} />}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16} color={Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Tableau des exercices */}
          <View style={scStyles.tableHeader}>
            <Text style={[scStyles.th, { flex: 1 }]}>Exercice</Text>
            <Text style={[scStyles.th, { width: 40, textAlign: 'center' }]}>Séries</Text>
            <Text style={[scStyles.th, { width: 50, textAlign: 'center' }]}>Reps</Text>
            <Text style={[scStyles.th, { width: 44, textAlign: 'center' }]}>Repos</Text>
          </View>
          {session.exercises.map((ex, i) => (
            <ExRow key={i} ex={ex} />
          ))}
          {/* Bouton commencer */}
          <TouchableOpacity style={scStyles.startBtn} onPress={onStart}>
            <Ionicons name="play-circle-outline" size={16} color={Colors.primary} />
            <Text style={scStyles.startBtnText}>Commencer la séance</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function ExRow({ ex }: { ex: ProgramExercise }) {
  return (
    <View style={scStyles.exRow}>
      <View style={{ flex: 1 }}>
        <Text style={scStyles.exName}>{ex.name}</Text>
        {ex.notes && <Text style={scStyles.exNotes}>{ex.notes}</Text>}
      </View>
      <Text style={[scStyles.exVal, { width: 40 }]}>{ex.sets}</Text>
      <Text style={[scStyles.exVal, { width: 50 }]}>{ex.reps}</Text>
      <Text style={[scStyles.exVal, { width: 44 }]}>{REST_LABEL(ex.rest)}</Text>
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Sp.xs },
  cardToday: { borderColor: Colors.primary + '50' },
  header: { flexDirection: 'row', alignItems: 'center', padding: Sp.md, gap: Sp.sm },
  dayPill: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  dayPillToday: { backgroundColor: Colors.primary },
  dayText: { fontSize: Fs.xs, fontFamily: Fonts.bold, color: Colors.textSecondary },
  dayTextToday: { color: '#fff' },
  name: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  meta: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 1 },
  todayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  tableHeader: { flexDirection: 'row', paddingHorizontal: Sp.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  th: { fontSize: Fs.xs, color: Colors.textMuted, fontFamily: Fonts.semibold },
  exRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Sp.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  exName: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text },
  exNotes: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  exVal: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Sp.md, borderTopWidth: 1, borderTopColor: Colors.border },
  startBtnText: { fontSize: Fs.sm, color: Colors.primary, fontFamily: Fonts.semibold },
});

// ─── Sous-composants de la page ───────────────────────────────────────────────

function Badge({ icon, label, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string }) {
  return (
    <View style={bdgStyles.badge}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[bdgStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const bdgStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  text: { fontSize: Fs.xs, fontFamily: Fonts.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.sm },
  // Héro
  hero: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.lg, gap: Sp.sm },
  emoji: { fontSize: 48, fontFamily: Fonts.regular },
  name: { fontSize: Fs.xxl, fontFamily: Fonts.heavy, color: Colors.text },
  desc: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.green + '15', borderRadius: R, padding: Sp.sm },
  progressText: { fontSize: Fs.sm, color: Colors.green, fontFamily: Fonts.medium },
  // Séance du jour
  todayCard: { backgroundColor: Colors.primary + '12', borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40', padding: Sp.md, gap: 6 },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayTitle: { fontSize: Fs.sm, color: Colors.primary, fontFamily: Fonts.semibold },
  todayName: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  startSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.sm },
  startSessionBtnText: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: '#fff' },
  restCard: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  restText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  // Bouton démarrer
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md },
  startBtnActive: { backgroundColor: Colors.green },
  startBtnText: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.onPrimary },
  // Plan
  planTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text, marginTop: Sp.xs },
});
