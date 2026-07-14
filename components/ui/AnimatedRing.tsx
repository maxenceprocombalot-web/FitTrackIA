import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Fs, Fw, Fonts } from '../../constants/theme';

interface Props {
  consumed: number;
  burned: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

// Couleur dynamique selon pourcentage de remplissage net
function ringColor(pct: number): string {
  if (pct > 1.0) return Colors.red;
  if (pct > 0.85) return Colors.orange;
  return Colors.green;
}

// Composant interne qui transforme la valeur Animated en strokeDashoffset SVG
function ArcFill({
  circumference, targetOffset, color, r, size, sw,
}: {
  circumference: number;
  targetOffset: number;
  color: string;
  r: number;
  size: number;
  sw: number;
}) {
  const anim = useRef(new Animated.Value(circumference)).current;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: targetOffset,
      duration: 1100,
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value }) => setOffset(value));
    return () => anim.removeListener(id);
  }, [targetOffset]);

  return (
    <Circle
      cx={size / 2} cy={size / 2} r={r}
      stroke={color}
      strokeWidth={sw}
      fill="transparent"
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      strokeLinecap="round"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  );
}

export default function AnimatedRing({ consumed, burned, goal, size = 160, strokeWidth = 13 }: Props) {
  const effectiveGoal = goal + burned;                    // budget ajusté avec sport
  const pct           = consumed / Math.max(effectiveGoal, 1);
  const clampedPct    = Math.min(pct, 1);
  const color         = ringColor(pct);
  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset  = circumference * (1 - clampedPct);

  const remaining = Math.max(effectiveGoal - consumed, 0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <Svg width={size} height={size}>
        {/* Piste de fond */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Arc animé */}
        <ArcFill
          circumference={circumference}
          targetOffset={targetOffset}
          color={color}
          r={radius}
          size={size}
          sw={strokeWidth}
        />
      </Svg>

      {/* Texte central */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.mainValue, { color }]}>{Math.round(consumed)}</Text>
        <Text style={styles.label}>kcal</Text>
        <Text style={styles.remaining}>
          {pct > 1 ? '⚠ dépassé' : `${Math.round(remaining)} restantes`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  mainValue: { fontSize: Fs.xxl, fontFamily: Fonts.heavy, letterSpacing: -1 },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: -2 },
  remaining: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 4 },
});
