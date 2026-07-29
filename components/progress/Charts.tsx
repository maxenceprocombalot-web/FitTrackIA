import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Sp, Fs, Fonts } from '../../constants/theme';
import { WeightEntry } from '../../types';

export const CHART_W = Dimensions.get('window').width - Sp.md * 2 - Sp.md * 2;
export const CHART_H = 160;
const PAD = { top: 16, bottom: 24, left: 30, right: 10 };

type ActiveTab = 'mesures' | 'sport' | 'nutrition' | 'recompenses';

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
      <Text style={{ color: Colors.textMuted, marginTop: 8, fontSize: Fs.sm, fontFamily: Fonts.regular }}>Enregistre au moins 2 pesées</Text>
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

  const first = entries[0].weight, last = entries[entries.length - 1].weight;
  const delta = Math.round((last - first) * 10) / 10;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Courbe de poids : ${entries.length} pesées, de ${first} à ${last} kilos (${delta > 0 ? '+' : ''}${delta} kilos)`}
    >
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
    </View>
  );
}

// ─── Graphique calories 30 jours ──────────────────────────────────────────────

function CaloriesChart({ entries, target }: {
  entries: { date: string; calories: number }[];
  target: number;
}) {
  if (entries.length < 2) return (
    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
      <Ionicons name="analytics-outline" size={36} color={Colors.textMuted} />
      <Text style={{ color: Colors.textMuted, marginTop: 8, fontSize: Fs.sm, fontFamily: Fonts.regular }}>
        Enregistre au moins 2 jours de repas
      </Text>
    </View>
  );

  const cals = entries.map(e => e.calories);
  const rawMin = Math.min(...cals, target * 0.7);
  const rawMax = Math.max(...cals, target * 1.3);
  const minY = Math.floor(rawMin / 100) * 100;
  const maxY = Math.ceil(rawMax  / 100) * 100;
  const w = CHART_W - PAD.left - PAD.right;
  const h = CHART_H - PAD.top  - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / (entries.length - 1)) * w;
  const toY = (v: number) => PAD.top + (1 - (v - minY) / (maxY - minY)) * h;

  const points = entries.map((e, i) => ({ x: toX(i), y: toY(e.calories), cal: e.calories }));
  const targetY = toY(target);
  const linePath = buildPath(points);
  const yLabels  = [minY, Math.round((minY + maxY) / 2), maxY];

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
          {v}
        </SvgText>
      ))}
      <Line
        x1={PAD.left} y1={targetY} x2={CHART_W - PAD.right} y2={targetY}
        stroke={Colors.primary} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.8}
      />
      <SvgText x={CHART_W - PAD.right + 2} y={targetY + 4} fontSize={8} fill={Colors.primary}>obj</SvgText>
      <Path d={linePath} stroke={Colors.green} strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={p.cal > target ? Colors.red : Colors.green} />
      ))}
      {[0, Math.floor((entries.length - 1) / 2), entries.length - 1].map(i => (
        <SvgText key={i} x={toX(i)} y={CHART_H - 4} fontSize={9} fill={Colors.textMuted} textAnchor="middle">
          {entries[i].date.slice(5).replace('-', '/')}
        </SvgText>
      ))}
    </Svg>
  );
}

function ExerciseChart({ data }: { data: { date: string; maxWeight: number }[] }) {
  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={{ color: Colors.textMuted, fontSize: Fs.sm, fontFamily: Fonts.regular }}>
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

export { WeightChart, CaloriesChart, ExerciseChart };
