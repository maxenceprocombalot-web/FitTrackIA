import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';

// Disques standard (kg) + couleurs code IPF.
const PLATES: { kg: number; color: string; text: string }[] = [
  { kg: 25,   color: Colors.red,    text: '#fff' },
  { kg: 20,   color: Colors.blue,   text: '#fff' },
  { kg: 15,   color: Colors.yellow, text: '#1a1d26' },
  { kg: 10,   color: Colors.green,  text: '#fff' },
  { kg: 5,    color: '#e8eaf0',     text: '#1a1d26' },
  { kg: 2.5,  color: '#8891aa',     text: '#fff' },
  { kg: 1.25, color: '#565d7a',     text: '#fff' },
];

const BARS = [20, 15, 10, 0]; // 0 = sans barre (haltères / machine)

interface PlateCount { kg: number; count: number; color: string; text: string }

function computePlates(target: number, bar: number): { perSide: PlateCount[]; remainder: number; invalid: boolean } {
  const perSideWeight = (target - bar) / 2;
  if (perSideWeight < 0) return { perSide: [], remainder: 0, invalid: true };
  const perSide: PlateCount[] = [];
  let rem = perSideWeight;
  for (const p of PLATES) {
    const count = Math.floor(rem / p.kg + 1e-9);
    if (count > 0) {
      perSide.push({ kg: p.kg, count, color: p.color, text: p.text });
      rem = Math.round((rem - count * p.kg) * 1000) / 1000;
    }
  }
  return { perSide, remainder: rem, invalid: false };
}

export default function PlateCalculatorScreen() {
  const router = useRouter();
  const [target, setTarget] = useState(60);
  const [bar, setBar]       = useState(20);

  const bump = useCallback((delta: number) => {
    Haptics.selectionAsync();
    setTarget(t => Math.max(0, Math.round((t + delta) * 4) / 4));
  }, []);

  const { perSide, remainder, invalid } = useMemo(() => computePlates(target, bar), [target, bar]);

  // Suite ordonnée de disques (du plus lourd au plus léger) pour le visuel.
  const visualPlates = perSide.flatMap(p => Array.from({ length: p.count }, () => p));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calculateur de charge</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Poids cible + steppers */}
        <Text style={styles.label}>Poids total visé</Text>
        <View style={styles.stepperRow}>
          <StepBtn icon="remove" onPress={() => bump(-2.5)} label="Moins 2,5 kilos" />
          <View style={styles.weightBox}>
            <Text style={styles.weightValue}>{target % 1 === 0 ? target : target.toFixed(2)}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>
          <StepBtn icon="add" onPress={() => bump(2.5)} label="Plus 2,5 kilos" />
        </View>
        <View style={styles.fineRow}>
          <TouchableOpacity style={styles.fineBtn} onPress={() => bump(-1.25)}><Text style={styles.fineText}>−1,25</Text></TouchableOpacity>
          <TouchableOpacity style={styles.fineBtn} onPress={() => bump(1.25)}><Text style={styles.fineText}>+1,25</Text></TouchableOpacity>
          <TouchableOpacity style={styles.fineBtn} onPress={() => bump(5)}><Text style={styles.fineText}>+5</Text></TouchableOpacity>
          <TouchableOpacity style={styles.fineBtn} onPress={() => bump(20)}><Text style={styles.fineText}>+20</Text></TouchableOpacity>
        </View>

        {/* Choix de la barre */}
        <Text style={styles.label}>Barre</Text>
        <View style={styles.barsRow}>
          {BARS.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.barChip, bar === b && styles.barChipActive]}
              onPress={() => { Haptics.selectionAsync(); setBar(b); }}
              accessibilityRole="button"
              accessibilityLabel={b === 0 ? 'Sans barre' : `Barre ${b} kilos`}
            >
              <Text style={[styles.barChipText, bar === b && styles.barChipTextActive]}>{b === 0 ? 'Sans barre' : `${b} kg`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Résultat */}
        <View style={styles.resultCard}>
          {invalid ? (
            <Text style={styles.invalidText}>La barre ({bar} kg) est plus lourde que le poids visé.</Text>
          ) : perSide.length === 0 ? (
            <Text style={styles.invalidText}>Juste la barre — aucun disque à charger.</Text>
          ) : (
            <>
              <Text style={styles.resultTitle}>À charger de chaque côté</Text>

              {/* Visuel barre + disques */}
              <View style={styles.barbell}>
                <View style={styles.sleeve} />
                {visualPlates.map((p, i) => (
                  <View
                    key={i}
                    style={[styles.plateVisual, {
                      backgroundColor: p.color,
                      height: 44 + (p.kg / 25) * 60,
                    }]}
                  >
                    <Text style={[styles.plateVisualText, { color: p.text }]}>{p.kg % 1 === 0 ? p.kg : p.kg.toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.barEnd} />
              </View>

              {/* Détail compté */}
              <View style={styles.chipsRow}>
                {perSide.map(p => (
                  <View key={p.kg} style={[styles.plateChip, { backgroundColor: p.color }]}>
                    <Text style={[styles.plateChipText, { color: p.text }]}>{p.count} × {p.kg % 1 === 0 ? p.kg : p.kg.toFixed(2)} kg</Text>
                  </View>
                ))}
              </View>

              {remainder > 0.01 && (
                <Text style={styles.remainderNote}>
                  ⚠️ {remainder.toFixed(2)} kg/côté non atteignables avec des disques standard (poids réel ≈ {(target - remainder * 2).toFixed(2)} kg).
                </Text>
              )}
            </>
          )}
        </View>

        <Text style={styles.hint}>Couleurs = code international (IPF). Disques disponibles : 25 · 20 · 15 · 10 · 5 · 2,5 · 1,25 kg.</Text>
      </ScrollView>
    </View>
  );
}

function StepBtn({ icon, onPress, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity style={styles.stepBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={26} color={Colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:    { padding: 4 },
  headerTitle:{ fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  content:    { padding: Sp.md, paddingBottom: Sp.xxl },
  label:      { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Sp.md, marginBottom: Sp.sm },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  stepBtn:    { width: 56, height: 56, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  weightBox:  { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: R, paddingVertical: Sp.sm },
  weightValue:{ fontSize: Fs.xxxl, fontFamily: Fonts.condensedHeavy, color: Colors.text },
  weightUnit: { fontSize: Fs.lg, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  fineRow:    { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.sm },
  fineBtn:    { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  fineText:   { fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.medium },

  barsRow:    { flexDirection: 'row', gap: Sp.sm },
  barChip:    { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  barChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  barChipText:{ fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  barChipTextActive: { color: Colors.primary, fontFamily: Fonts.semibold },

  resultCard: { marginTop: Sp.lg, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, alignItems: 'center' },
  resultTitle:{ fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.semibold, marginBottom: Sp.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  invalidText:{ fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: Sp.md },

  barbell:    { flexDirection: 'row', alignItems: 'center', minHeight: 110, marginBottom: Sp.md },
  sleeve:     { width: 30, height: 10, backgroundColor: Colors.textMuted, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  plateVisual:{ width: 20, marginHorizontal: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  plateVisualText: { fontSize: 8, fontFamily: Fonts.bold, transform: [{ rotate: '-90deg' }], width: 40, textAlign: 'center' },
  barEnd:     { width: 14, height: 10, backgroundColor: Colors.textMuted, borderTopRightRadius: 4, borderBottomRightRadius: 4 },

  chipsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.sm, justifyContent: 'center' },
  plateChip:  { borderRadius: 99, paddingHorizontal: Sp.md, paddingVertical: 8 },
  plateChipText: { fontSize: Fs.sm, fontFamily: Fonts.bold },
  remainderNote: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.orange, marginTop: Sp.md, textAlign: 'center', lineHeight: 17 },

  hint:       { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: Sp.lg, textAlign: 'center', lineHeight: 17 },
});
