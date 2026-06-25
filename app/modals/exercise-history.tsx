import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { estimate1RM } from '../../services/metrics';
import { daysAgo } from '../../services/date';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

const CW = Dimensions.get('window').width - 32;
const CH = 160;

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const { name } = useLocalSearchParams<{ name: string }>();

  // Toutes les séances contenant cet exercice
  const sessions = useMemo(() => {
    const result: { date: string; maxWeight: number; bestReps: number; sets: number; volume: number }[] = [];
    store.workouts.forEach(w => {
      const ex = w.exercises.find(e => e.name === name);
      if (!ex) return;
      const maxW = Math.max(0, ...ex.sets.map(s => s.weight));
      const bestReps = ex.sets.find(s => s.weight === maxW)?.reps ?? 0;
      const volume = ex.sets.reduce((s, set) => s + set.reps * set.weight, 0);
      result.push({ date: w.date, maxWeight: maxW, bestReps, sets: ex.sets.length, volume });
    });
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [store.workouts, name]);

  // 90 derniers jours
  const cutoff90 = daysAgo(90);
  const recentSessions = sessions.filter(s => s.date >= cutoff90);

  // Stats globales
  const bestWeight  = sessions.length ? Math.max(...sessions.map(s => s.maxWeight)) : 0;
  const totalSessions = sessions.length;
  const firstWeight = sessions[0]?.maxWeight ?? 0;
  const progressKg  = bestWeight - firstWeight;
  const firstDate   = sessions[0]?.date;
  const progressWeeks = firstDate ? Math.round((Date.now() - new Date(firstDate).getTime()) / (7 * 86400000)) : 0;

  // 1RM estimé (Brzycki) — meilleur sur l'historique
  const best1RM = sessions.reduce((best, s) => {
    const rm = estimate1RM(s.maxWeight, s.bestReps);
    return rm > best ? rm : best;
  }, 0);

  // Graphique SVG
  const chartData = recentSessions.filter(s => s.maxWeight > 0);

  const minW = chartData.length > 0 ? Math.min(...chartData.map(s => s.maxWeight)) * 0.9 : 0;
  const maxW = chartData.length > 0 ? Math.max(...chartData.map(s => s.maxWeight)) * 1.05 : 10;
  const PAD  = { top: 10, bottom: 20, left: 30, right: 8 };
  const cw   = CW - PAD.left - PAD.right;
  const ch   = CH - PAD.top - PAD.bottom;
  const toX  = (i: number) => PAD.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * cw : cw / 2);
  const toY  = (v: number) => PAD.top + (1 - (v - minW) / Math.max(maxW - minW, 1)) * ch;

  if (!name) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Stats principales */}
        <View style={{ flexDirection: 'row', gap: Sp.sm, marginBottom: Sp.sm }}>
          {[
            { label: 'Meilleur poids', value: `${bestWeight} kg`, color: Colors.yellow },
            { label: 'Séances totales', value: String(totalSessions), color: Colors.primary },
            { label: '1RM estimé',     value: best1RM > 0 ? `${Math.round(best1RM)} kg` : '—', color: Colors.orange },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.sm, alignItems: 'center' }}>
              <Text style={{ fontSize: Fs.lg, fontWeight: Fw.heavy, color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: Fs.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {progressKg > 0 && progressWeeks > 0 && (
          <View style={{ backgroundColor: Colors.green + '12', borderRadius: R, borderWidth: 1, borderColor: Colors.green + '30', padding: Sp.sm, marginBottom: Sp.sm }}>
            <Text style={{ fontSize: Fs.sm, color: Colors.green, fontWeight: Fw.semibold }}>
              📈 Progression : +{progressKg.toFixed(1)} kg en {progressWeeks} semaines
            </Text>
          </View>
        )}

        {/* Graphique */}
        {chartData.length >= 2 ? (
          <View style={{ backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, marginBottom: Sp.sm }}>
            <Text style={{ fontSize: Fs.xs, color: Colors.textMuted, marginBottom: Sp.sm, fontWeight: Fw.semibold, textTransform: 'uppercase', letterSpacing: 0.5 }}>ÉVOLUTION DU MEILLEUR POIDS — 90 JOURS</Text>
            <Svg width={CW} height={CH}>
              <Path d={chartData.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(s.maxWeight).toFixed(1)}`).join(' ')} stroke={Colors.yellow} strokeWidth={2} fill="none" />
              {chartData.map((s, i) => (
                <Circle key={i} cx={toX(i)} cy={toY(s.maxWeight)} r={3} fill={Colors.yellow} />
              ))}
              {[0, Math.floor(chartData.length / 2), chartData.length - 1].filter((v, i, a) => a.indexOf(v) === i && v < chartData.length).map(i => (
                <SvgText key={i} x={toX(i)} y={CH - 4} fontSize={9} fill={Colors.textMuted} textAnchor="middle">
                  {chartData[i].date.slice(5).replace('-', '/')}
                </SvgText>
              ))}
              <SvgText x={PAD.left - 4} y={toY(maxW) + 4} fontSize={9} fill={Colors.textMuted} textAnchor="end">{maxW.toFixed(0)}</SvgText>
              <SvgText x={PAD.left - 4} y={toY(minW)} fontSize={9} fill={Colors.textMuted} textAnchor="end">{minW.toFixed(0)}</SvgText>
            </Svg>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, marginBottom: Sp.sm }}>
            <Text style={{ color: Colors.textMuted, fontSize: Fs.sm }}>Pas assez de données pour le graphique</Text>
          </View>
        )}

        {/* Historique des séances */}
        <View style={{ backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
          <Text style={{ fontSize: Fs.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, padding: Sp.md, fontWeight: Fw.semibold }}>HISTORIQUE</Text>
          {sessions.length === 0 ? (
            <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: Sp.md }}>Aucune séance</Text>
          ) : (
            [...sessions].reverse().slice(0, 20).map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Sp.md, paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.border }}>
                <Text style={{ fontSize: Fs.sm, color: Colors.textSecondary }}>{new Date(s.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                <Text style={{ fontSize: Fs.sm, color: Colors.text, fontWeight: Fw.medium }}>{s.maxWeight > 0 ? `${s.maxWeight} kg` : '—'}</Text>
                <Text style={{ fontSize: Fs.sm, color: Colors.textMuted }}>{s.sets} séries · {s.bestReps} reps</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: Fs.lg, fontWeight: Fw.bold, color: Colors.text },
  content: { padding: Sp.md, gap: Sp.sm, paddingBottom: 60 },
});
