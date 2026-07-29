import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, R, Sp, Fs, Fonts } from '../../constants/theme';

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
  value: { fontSize: Fs.lg, fontFamily: Fonts.bold },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
});

// ─── Carte plan ───────────────────────────────────────────────────────────────

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ScoreRow({ label, pts, max, color }: { label: string; pts: number; max: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, width: 52 }}>{label}</Text>
      <View style={{ width: 60, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${(pts/max)*100}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: Fs.xs, color, fontFamily: Fonts.semibold }}>{pts}/{max}</Text>
    </View>
  );
}

function WBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[{ fontSize: Fs.lg, fontFamily: Fonts.bold, color }]}>{value}</Text>
      <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted }}>{label}</Text>
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
  value: { fontSize: Fs.xxl, fontFamily: Fonts.heavy },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
});

export { ExoStat, ScoreRow, WBadge, BigStat };
