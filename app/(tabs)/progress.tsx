import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { WeightEntry, SavedPlan } from '../../types';
import Card from '../../components/ui/Card';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

const CHART_W = Dimensions.get('window').width - Sp.md * 2 - Sp.md * 2;
const CHART_H = 160;
const PAD     = { top: 16, bottom: 24, left: 30, right: 10 };

type Period  = '30j' | '90j' | 'tout';
type ActiveTab = 'weight' | 'sport' | 'nutrition' | 'plans';

// Régression linéaire
function linearReg(ys: number[]): { slope: number; intercept: number } {
  const n  = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const xs  = Array.from({ length: n }, (_, i) => i);
  const sX  = xs.reduce((a, b) => a + b, 0);
  const sY  = ys.reduce((a, b) => a + b, 0);
  const sXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope     = (n * sXY - sX * sY) / (n * sX2 - sX * sX);
  const intercept = (sY - slope * sX) / n;
  return { slope, intercept };
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return (
    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
      <Ionicons name="analytics-outline" size={36} color={Colors.textMuted} />
      <Text style={{ color: Colors.textMuted, marginTop: 8, fontSize: Fs.sm }}>Enregistre au moins 2 pesées</Text>
    </View>
  );

  const ys   = entries.map(e => e.weight);
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;
  const w    = CHART_W - PAD.left - PAD.right;
  const h    = CHART_H - PAD.top  - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / (entries.length - 1)) * w;
  const toY = (v: number) => PAD.top  + (1 - (v - minY) / (maxY - minY)) * h;

  const realPoints = entries.map((e, i) => ({ x: toX(i), y: toY(e.weight) }));
  const reg = linearReg(ys);
  const t0  = reg.intercept;
  const t1  = reg.intercept + reg.slope * (entries.length - 1);
  const trendPoints = [
    { x: toX(0), y: toY(Math.min(Math.max(t0, minY), maxY)) },
    { x: toX(entries.length - 1), y: toY(Math.min(Math.max(t1, minY), maxY)) },
  ];
  const yLabels = [minY + 0.5, (minY + maxY) / 2, maxY - 0.5];

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {yLabels.map((v, i) => (
        <Line key={i}
          x1={PAD.left} y1={toY(v)} x2={CHART_W - PAD.right} y2={toY(v)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}
        />
      ))}
      {yLabels.map((v, i) => (
        <SvgText key={i} x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill={Colors.textMuted} textAnchor="end">
          {v.toFixed(1)}
        </SvgText>
      ))}
      <Path d={buildPath(trendPoints)} stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="4,3" fill="none" opacity={0.6} />
      <Path d={buildPath(realPoints)} stroke={Colors.green} strokeWidth={2} fill="none" />
      {realPoints.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.green} />
      ))}
      {[0, Math.floor((entries.length - 1) / 2), entries.length - 1].map(i => (
        <SvgText key={i} x={toX(i)} y={CHART_H - 4} fontSize={9} fill={Colors.textMuted} textAnchor="middle">
          {entries[i].date.slice(5).replace('-', '/')}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function ProgressScreen() {
  const store  = useAppStore();
  const router = useRouter();
  const [weightIn,      setWeightIn]      = useState('');
  const [period,        setPeriod]        = useState<Period>('30j');
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('weight');
  const [plansFilter,   setPlansFilter]   = useState<'all' | 'sport' | 'nutrition'>('all');
  const [selectedExo,   setSelectedExo]   = useState<string | null>(null);

  // ── Historique par exercice (pour le graphique) ───────────────────────────
  const exerciseHistory = useMemo(() => {
    const map: Record<string, { date: string; maxWeight: number }[]> = {};
    store.workouts.forEach(w => {
      w.exercises.forEach(ex => {
        const maxW = Math.max(0, ...ex.sets.map(s => s.weight));
        if (maxW <= 0) return;
        if (!map[ex.name]) map[ex.name] = [];
        const existing = map[ex.name].find(e => e.date === w.date);
        if (!existing)           map[ex.name].push({ date: w.date, maxWeight: maxW });
        else if (maxW > existing.maxWeight) existing.maxWeight = maxW;
      });
    });
    return map;
  }, [store.workouts]);

  const exerciseNames = Object.keys(exerciseHistory).sort();

  // Données de progression pour l'exercice sélectionné (30 derniers jours)
  const exoData = useMemo(() => {
    const name = selectedExo ?? exerciseNames[0];
    if (!name) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const since = cutoff.toISOString().split('T')[0];
    return (exerciseHistory[name] ?? [])
      .filter(e => e.date >= since)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedExo, exerciseHistory, exerciseNames]);

  const effectiveExo   = selectedExo ?? exerciseNames[0] ?? null;
  const exoSessions    = effectiveExo ? (exerciseHistory[effectiveExo]?.length ?? 0) : 0;
  const exoBestWeight  = exoData.length > 0 ? Math.max(...exoData.map(d => d.maxWeight)) : 0;
  const exoFirstWeight = exoData.length > 0 ? exoData[0].maxWeight : 0;
  const exoProgression = exoBestWeight - exoFirstWeight;

  const filteredWeights = (() => {
    const days   = period === '30j' ? 30 : period === '90j' ? 90 : 9999;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const since  = cutoff.toISOString().split('T')[0];
    return store.weights.filter(w => w.date >= since);
  })();

  const latest = store.weights[store.weights.length - 1];
  const first  = store.weights[0];

  const projection = (() => {
    if (filteredWeights.length < 2 || !store.user) return null;
    const reg  = linearReg(filteredWeights.map(w => w.weight));
    if (Math.abs(reg.slope) < 0.001) return null;
    const goal = store.user.goal === 'weight_loss'
      ? store.user.weight * 0.9
      : store.user.goal === 'muscle_gain'
        ? store.user.weight * 1.05
        : null;
    if (!goal || !latest) return null;
    const days = Math.round((goal - latest.weight) / reg.slope);
    return days > 0 && days < 1000 ? days : null;
  })();

  // Stats sport
  const totalWorkouts  = store.workouts.length;
  const totalVolume    = store.workouts.reduce((s, w) =>
    s + w.exercises.reduce((sv, e) =>
      sv + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0);
  const exerciseCount: Record<string, number> = {};
  store.workouts.forEach(w => w.exercises.forEach(e => {
    exerciseCount[e.name] = (exerciseCount[e.name] ?? 0) + 1;
  }));
  const topExercise = Object.entries(exerciseCount).sort((a, b) => b[1] - a[1])[0];

  // Bilan nutrition hebdo
  const last7 = (() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const since = cutoff.toISOString().split('T')[0];
    const dayMap: Record<string, number> = {};
    store.meals
      .filter(m => m.date >= since)
      .forEach(m => {
        const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
        dayMap[m.date] = (dayMap[m.date] ?? 0) + cal;
      });
    const vals = Object.values(dayMap);
    const avg  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const target   = store.user?.targetCalories ?? 2000;
    const inRange  = vals.filter(v => v >= target * 0.9 && v <= target * 1.1).length;
    return { avg, daysTracked: vals.length, daysInRange: inRange };
  })();

  // Plans filtrés
  const filteredPlans = plansFilter === 'all'
    ? store.savedPlans
    : store.savedPlans.filter(p => p.type === plansFilter);

  const handleSaveWeight = () => {
    const w = parseFloat(weightIn);
    if (!w || isNaN(w) || w < 20 || w > 300) return;
    store.addWeight({ date: new Date().toISOString().split('T')[0], weight: w });
    setWeightIn('');
  };

  return (
    <AnimatedScreen style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {(['weight', 'sport', 'nutrition', 'plans'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'weight' ? 'Poids' : tab === 'sport' ? 'Sport' : tab === 'nutrition' ? 'Nutrition' : 'Plans'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Onglet Poids ─────────────────────────────────────────────────── */}
      {activeTab === 'weight' && (
        <>
          <Card>
            <Text style={styles.sectionLabel}>Poids du jour</Text>
            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightInput}
                value={weightIn}
                onChangeText={setWeightIn}
                placeholder={`${latest?.weight ?? 70} kg`}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleSaveWeight}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWeight}>
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weightSummary}>
              <WBadge label="Actuel"    value={latest ? `${latest.weight} kg` : '—'} color={Colors.text} />
              <WBadge label="Départ"    value={first  ? `${first.weight} kg`  : '—'} color={Colors.textSecondary} />
              {latest && first && (
                <WBadge
                  label="Évolution"
                  value={`${latest.weight > first.weight ? '+' : ''}${(latest.weight - first.weight).toFixed(1)} kg`}
                  color={latest.weight <= first.weight ? Colors.green : Colors.orange}
                />
              )}
            </View>
          </Card>
          <View style={styles.periodRow}>
            {(['30j', '90j', 'tout'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Card style={styles.chartCard}>
            <Text style={styles.sectionLabel}>Courbe de poids ({filteredWeights.length} pesées)</Text>
            <WeightChart entries={filteredWeights} />
          </Card>
          {projection !== null && (
            <Card style={styles.projCard}>
              <Ionicons name="flag-outline" size={18} color={Colors.primary} />
              <Text style={styles.projText}>
                À ce rythme, tu atteins ton objectif dans <Text style={{ color: Colors.primary, fontWeight: Fw.bold }}>{projection} jours</Text>.
              </Text>
            </Card>
          )}
          {store.weights.length > 0 && (
            <Card>
              <Text style={styles.sectionLabel}>Historique</Text>
              {[...store.weights].reverse().slice(0, 15).map(e => (
                <View key={e.date} style={styles.histRow}>
                  <Text style={styles.histDate}>{new Date(e.date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.histVal}>{e.weight} kg</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ── Onglet Sport ─────────────────────────────────────────────────── */}
      {activeTab === 'sport' && (
        <>
          {/* Streak */}
          {(store.streak.current > 0 || store.streak.best > 0) && (
            <Card style={styles.streakCard}>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakTitle}>Streak actuel : {store.streak.current} jour{store.streak.current > 1 ? 's' : ''}</Text>
                  <Text style={styles.streakSub}>Meilleur : {store.streak.best} jour{store.streak.best > 1 ? 's' : ''}</Text>
                </View>
              </View>
            </Card>
          )}

          <View style={styles.statGrid}>
            <BigStat value={String(totalWorkouts)} label="Total séances"   color={Colors.primary} />
            <BigStat value={`${Math.round(totalVolume / 1000)} t`} label="Volume total" color={Colors.green} />
          </View>
          {topExercise && (
            <Card>
              <Text style={styles.sectionLabel}>Exercice favori</Text>
              <Text style={styles.bigExercise}>{topExercise[0]}</Text>
              <Text style={styles.bigExerciseSub}>{topExercise[1]} séries au total</Text>
            </Card>
          )}
          <Card>
            <View style={styles.prHeader}>
              <Text style={styles.sectionLabel}>Records personnels 🏆</Text>
              <Text style={styles.prCount}>{store.prs.length} record{store.prs.length > 1 ? 's' : ''}</Text>
            </View>
            {store.prs.length === 0 && (
              <Text style={styles.emptyText}>Aucun PR enregistré — commence à t'entraîner !</Text>
            )}
            {[...store.prs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(pr => {
                const gain = pr.previousWeight ? pr.weight - pr.previousWeight : null;
                return (
                  <View key={pr.exerciseId} style={styles.prRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prName}>{pr.exerciseName}</Text>
                      <Text style={styles.prDate}>{new Date(pr.date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <View style={styles.prRight}>
                      <Text style={styles.prWeight}>{pr.weight} kg × {pr.reps}</Text>
                      {gain !== null && gain > 0 && (
                        <Text style={styles.prGain}>+{gain.toFixed(1)} kg</Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </Card>
          {/* Progression par exercice */}
          {exerciseNames.length > 0 && (
            <Card>
              <Text style={styles.sectionLabel}>Progression par exercice</Text>
              {/* Sélecteur d'exercice */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exoScroll} contentContainerStyle={styles.exoScrollContent}>
                {exerciseNames.map(name => (
                  <TouchableOpacity
                    key={name}
                    style={[styles.exoChip, (effectiveExo === name) && styles.exoChipActive]}
                    onPress={() => setSelectedExo(name)}
                  >
                    <Text style={[styles.exoChipText, (effectiveExo === name) && styles.exoChipTextActive]} numberOfLines={1}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Stats résumé */}
              {effectiveExo && (
                <View style={styles.exoStats}>
                  <ExoStat label="Meilleur" value={`${exoBestWeight} kg`} color={Colors.yellow} />
                  <ExoStat
                    label="Progression"
                    value={exoProgression >= 0 ? `+${exoProgression.toFixed(1)} kg` : `${exoProgression.toFixed(1)} kg`}
                    color={exoProgression >= 0 ? Colors.green : Colors.red}
                  />
                  <ExoStat label="Séances" value={String(exoSessions)} color={Colors.primary} />
                </View>
              )}

              {/* Graphique */}
              <ExerciseChart data={exoData} />
            </Card>
          )}
        </>
      )}

      {/* ── Onglet Nutrition ─────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (
        <>
          <View style={styles.statGrid}>
            <BigStat value={`${last7.avg}`} label="Moy. kcal/j (7j)"   color={Colors.caloriesColor} />
            <BigStat value={`${last7.daysTracked}j`} label="Jours trackés"  color={Colors.primary} />
          </View>
          <Card>
            <Text style={styles.sectionLabel}>Jours dans la cible (±10%)</Text>
            <View style={styles.inRangeBar}>
              <View style={[styles.inRangeFill, { width: `${last7.daysTracked > 0 ? (last7.daysInRange / last7.daysTracked) * 100 : 0}%` }]} />
            </View>
            <Text style={styles.inRangeText}>
              {last7.daysInRange}/{last7.daysTracked} jours dans la fenêtre calorique
            </Text>
          </Card>
        </>
      )}

      {/* ── Onglet Plans ─────────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <>
          {/* Filtres type */}
          <View style={styles.plansFilterRow}>
            {(['all', 'sport', 'nutrition'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.plansFilterBtn, plansFilter === f && styles.plansFilterBtnActive]}
                onPress={() => setPlansFilter(f)}
              >
                <Text style={[styles.plansFilterText, plansFilter === f && styles.plansFilterTextActive]}>
                  {f === 'all' ? 'Tous' : f === 'sport' ? '💪 Sport' : '🥗 Nutrition'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.plansCount}>{filteredPlans.length} plan{filteredPlans.length > 1 ? 's' : ''}</Text>

          {filteredPlans.length === 0 ? (
            <View style={styles.plansEmpty}>
              <Ionicons name="document-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.plansEmptyText}>Aucun plan sauvegardé</Text>
              <Text style={styles.plansEmptySub}>Demande un plan au Coach IA et clique "Sauvegarder"</Text>
            </View>
          ) : (
            filteredPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPress={() => router.push({ pathname: '/modals/plan-detail', params: { planId: plan.id } })}
              />
            ))
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </AnimatedScreen>
  );
}

// ─── Graphique progression exercice ──────────────────────────────────────────

function ExerciseChart({ data }: { data: { date: string; maxWeight: number }[] }) {
  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ color: Colors.textMuted, fontSize: Fs.sm }}>
          {data.length === 0 ? 'Aucune donnée sur 30 jours' : 'Enregistre au moins 2 séances pour voir la courbe'}
        </Text>
      </View>
    );
  }

  const ys   = data.map(d => d.maxWeight);
  const minY = Math.min(...ys) - 2.5;
  const maxY = Math.max(...ys) + 2.5;
  const w    = CHART_W - PAD.left - PAD.right;
  const h    = CHART_H - PAD.top  - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * w;
  const toY = (v: number) => PAD.top  + (1 - (v - minY) / (maxY - minY)) * h;

  const points   = data.map((d, i) => ({ x: toX(i), y: toY(d.maxWeight) }));
  const pathStr  = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const yLabels  = [minY + 2, (minY + maxY) / 2, maxY - 2];
  const xIndices = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  return (
    <Svg width={CHART_W} height={CHART_H} style={{ marginTop: 8 }}>
      {yLabels.map((v, i) => (
        <React.Fragment key={i}>
          <Line x1={PAD.left} y1={toY(v)} x2={CHART_W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <SvgText x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill={Colors.textMuted} textAnchor="end">{v.toFixed(1)}</SvgText>
        </React.Fragment>
      ))}
      <Path d={pathStr} stroke={Colors.yellow} strokeWidth={2} fill="none" />
      {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.yellow} />)}
      {xIndices.map(i => (
        <SvgText key={i} x={toX(i)} y={CHART_H - 4} fontSize={9} fill={Colors.textMuted} textAnchor="middle">
          {data[i].date.slice(5).replace('-', '/')}
        </SvgText>
      ))}
    </Svg>
  );
}

function ExoStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={exoStyles.stat}>
      <Text style={[exoStyles.value, { color }]}>{value}</Text>
      <Text style={exoStyles.label}>{label}</Text>
    </View>
  );
}
const exoStyles = StyleSheet.create({
  stat:  { flex: 1, alignItems: 'center', paddingVertical: 6, backgroundColor: Colors.surfaceElevated, borderRadius: R },
  value: { fontSize: Fs.lg, fontWeight: Fw.bold },
  label: { fontSize: Fs.xs, color: Colors.textMuted, marginTop: 1 },
});

// ─── Carte plan ───────────────────────────────────────────────────────────────

function PlanCard({ plan, onPress }: { plan: SavedPlan; onPress: () => void }) {
  const typeColor = plan.type === 'sport' ? Colors.primary : plan.type === 'nutrition' ? Colors.green : Colors.orange;
  const typeLabel = plan.type === 'sport' ? '💪' : plan.type === 'nutrition' ? '🥗' : '✨';
  const preview   = plan.content.slice(0, 80).replace(/\n/g, ' ');

  return (
    <TouchableOpacity style={pcStyles.card} onPress={onPress}>
      <View style={pcStyles.row}>
        <View style={[pcStyles.typeIcon, { backgroundColor: typeColor + '20' }]}>
          <Text style={pcStyles.typeEmoji}>{typeLabel}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={pcStyles.titleRow}>
            <Text style={pcStyles.title} numberOfLines={1}>{plan.title}</Text>
            {plan.isPredefined && (
              <View style={pcStyles.predBadge}>
                <Text style={pcStyles.predText}>Prédéfini</Text>
              </View>
            )}
          </View>
          <Text style={pcStyles.preview} numberOfLines={2}>{preview}…</Text>
          <Text style={pcStyles.date}>{new Date(plan.date).toLocaleDateString('fr-FR')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const pcStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, marginBottom: Sp.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Sp.sm },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeEmoji: { fontSize: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  title: { flex: 1, fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text },
  predBadge: { backgroundColor: Colors.yellow + '20', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 },
  predText: { fontSize: 10, color: Colors.yellow },
  preview: { fontSize: Fs.xs, color: Colors.textMuted, lineHeight: 17, marginBottom: 4 },
  date: { fontSize: Fs.xs, color: Colors.textMuted },
});

// ─── Sous-composants ──────────────────────────────────────────────────────────

function WBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[{ fontSize: Fs.lg, fontWeight: Fw.bold, color }]}>{value}</Text>
      <Text style={{ fontSize: Fs.xs, color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

function BigStat({ value, label, color }: { value: string; label: string; color: string }) {
  const numericVal = parseFloat(value.replace(/[^\d.]/g, ''));
  const isNumeric  = !isNaN(numericVal) && numericVal > 0;

  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState<string | number>(isNumeric ? 0 : value);

  useEffect(() => {
    if (!isNumeric) return;
    Animated.timing(anim, { toValue: numericVal, duration: 900, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => {
      setDisplayed(value.includes('.') ? v.toFixed(1) : String(Math.round(v)));
    });
    return () => anim.removeListener(id);
  }, [numericVal]);

  return (
    <View style={bsStyles.card}>
      <Text style={[bsStyles.value, { color }]}>{displayed}</Text>
      <Text style={bsStyles.label}>{label}</Text>
    </View>
  );
}
const bsStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, alignItems: 'center' },
  value: { fontSize: Fs.xxl, fontWeight: Fw.heavy },
  label: { fontSize: Fs.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.sm, paddingBottom: 40 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: R, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 8, borderRadius: R - 2, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Fs.xs, color: Colors.textSecondary, fontWeight: Fw.medium },
  tabTextActive: { color: '#fff', fontWeight: Fw.semibold },
  sectionLabel: { fontSize: Fs.xs, fontWeight: Fw.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Sp.sm },
  weightInputRow: { flexDirection: 'row', gap: Sp.sm, marginBottom: Sp.md },
  weightInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: R, paddingHorizontal: Sp.md, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: Fw.semibold },
  weightSummary: { flexDirection: 'row' },
  periodRow: { flexDirection: 'row', gap: Sp.xs },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  periodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  periodText: { fontSize: Fs.sm, color: Colors.textSecondary },
  periodTextActive: { color: Colors.primary, fontWeight: Fw.semibold },
  chartCard: { overflow: 'hidden' },
  projCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projText: { flex: 1, fontSize: Fs.sm, color: Colors.textSecondary, lineHeight: 19 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  histDate: { fontSize: Fs.sm, color: Colors.textSecondary },
  histVal: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.text },
  statGrid: { flexDirection: 'row', gap: Sp.sm },
  bigExercise: { fontSize: Fs.xl, fontWeight: Fw.bold, color: Colors.text },
  bigExerciseSub: { fontSize: Fs.sm, color: Colors.textMuted, marginTop: 2 },
  prHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Sp.sm },
  prCount: { fontSize: Fs.xs, color: Colors.textMuted },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  prName: { fontSize: Fs.sm, fontWeight: Fw.medium, color: Colors.text },
  prRight: { alignItems: 'flex-end', gap: 2 },
  prWeight: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.yellow },
  prGain: { fontSize: Fs.xs, color: Colors.green, fontWeight: Fw.semibold },
  prDate: { fontSize: Fs.xs, color: Colors.textMuted },
  emptyText: { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Sp.md },
  inRangeBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  inRangeFill: { height: '100%', backgroundColor: Colors.green, borderRadius: 99 },
  inRangeText: { fontSize: Fs.sm, color: Colors.textSecondary },
  // Streak dans Sport
  streakCard: { borderColor: Colors.orange + '40', backgroundColor: Colors.orange + '08' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  streakEmoji: { fontSize: 28 },
  streakTitle: { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.text },
  streakSub: { fontSize: Fs.xs, color: Colors.textSecondary, marginTop: 2 },
  // Sélecteur exercice
  exoScroll:        { marginHorizontal: -Sp.md },
  exoScrollContent: { paddingHorizontal: Sp.md, paddingVertical: 6, gap: 6 },
  exoChip:          { paddingHorizontal: Sp.sm, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, maxWidth: 150 },
  exoChipActive:    { borderColor: Colors.yellow, backgroundColor: Colors.yellow + '18' },
  exoChipText:      { fontSize: Fs.xs, color: Colors.textSecondary },
  exoChipTextActive:{ color: Colors.yellow, fontWeight: Fw.semibold },
  exoStats:         { flexDirection: 'row', gap: Sp.xs, marginBottom: 4 },
  // Plans
  plansFilterRow: { flexDirection: 'row', gap: Sp.xs },
  plansFilterBtn: { flex: 1, paddingVertical: 8, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  plansFilterBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  plansFilterText: { fontSize: Fs.xs, color: Colors.textSecondary },
  plansFilterTextActive: { color: Colors.primary, fontWeight: Fw.semibold },
  plansCount: { fontSize: Fs.xs, color: Colors.textMuted },
  plansEmpty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  plansEmptyText: { fontSize: Fs.md, color: Colors.textSecondary, fontWeight: Fw.semibold },
  plansEmptySub: { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Sp.lg },
});
