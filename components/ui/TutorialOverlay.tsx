import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const TAB_H    = 90;
const TAB_W    = W / 5;
const ICON_CENTER_Y = H - TAB_H + 22;
const SPOT_R   = 40;

const STEPS: { tabIdx: number; title: string; desc: string }[] = [
  { tabIdx: 1, title: 'Sport', desc: 'Enregistre tes séances, suis tes performances et bats tes records personnels.' },
  { tabIdx: 2, title: 'Nutrition', desc: 'Trace tes repas jour par jour et surveille tes macros en temps réel.' },
  { tabIdx: 3, title: 'Coach IA', desc: 'Pose toutes tes questions à ton coach alimenté par l\'IA — conseils, plans, analyses.' },
];

interface Props {
  onDone: () => void;
}

export default function TutorialOverlay({ onDone }: Props) {
  const [stepIdx, setStepIdx] = useState(0);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide      = useRef(new Animated.Value(30)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const pulseScale     = useRef(new Animated.Value(1)).current;
  const pulseLoop      = useRef<Animated.CompositeAnimation | null>(null);

  // Fade-in de l'overlay au montage
  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(cardSlide,      { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(cardOpacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animation pulsante de l'anneau
  useEffect(() => {
    pulseLoop.current?.stop();
    pulseScale.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current = loop;
    loop.start();
    return () => loop.stop();
  }, [stepIdx]);

  // Animation de la carte sur changement de step
  const animateCardIn = () => {
    cardOpacity.setValue(0);
    cardSlide.setValue(20);
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(cardSlide,   { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1);
      animateCardIn();
    } else {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => onDone());
    }
  };

  const skip = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => onDone());
  };

  const step = STEPS[stepIdx];
  const cx   = TAB_W * step.tabIdx + TAB_W / 2;
  const cy   = ICON_CENTER_Y;

  const spotPath = `M 0,0 H ${W} V ${H} H 0 Z M ${cx},${cy} m ${-SPOT_R},0 a ${SPOT_R},${SPOT_R} 0 1,0 ${SPOT_R * 2},0 a ${SPOT_R},${SPOT_R} 0 1,0 ${-SPOT_R * 2},0`;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]} pointerEvents="box-none">
      {/* SVG overlay avec trou evenodd */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path fillRule="evenodd" d={spotPath} fill="rgba(0,0,0,0.80)" />
      </Svg>

      {/* Anneau pulsant */}
      <Animated.View
        style={[
          styles.pulse,
          {
            left:  cx - SPOT_R,
            top:   cy - SPOT_R,
            width:  SPOT_R * 2,
            height: SPOT_R * 2,
            borderRadius: SPOT_R,
            transform: [{ scale: pulseScale }],
          },
        ]}
        pointerEvents="none"
      />

      {/* Carte tooltip */}
      <Animated.View
        style={[
          styles.card,
          { bottom: TAB_H + 16, opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
        ]}
      >
        <Text style={styles.cardTitle}>{step.title}</Text>
        <Text style={styles.cardDesc}>{step.desc}</Text>

        {/* Points de progression */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === stepIdx && styles.dotActive]}
            />
          ))}
        </View>

        {/* Boutons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextText}>
              {stepIdx < STEPS.length - 1 ? 'Suivant' : 'C\'est parti 🚀'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    left: Sp.md,
    right: Sp.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: R,
    padding: Sp.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    gap: Sp.sm,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  cardTitle: { fontSize: Fs.lg, fontWeight: Fw.heavy, color: Colors.text },
  cardDesc:  { fontSize: Fs.sm, color: Colors.textSecondary, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: Sp.xs, justifyContent: 'center', marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { width: 18, borderRadius: 3, backgroundColor: Colors.primary },
  btnRow: { flexDirection: 'row', gap: Sp.sm, marginTop: 4 },
  skipBtn: {
    paddingVertical: 11, paddingHorizontal: Sp.md,
    borderRadius: R, borderWidth: 1, borderColor: Colors.border,
  },
  skipText: { fontSize: Fs.sm, color: Colors.textSecondary },
  nextBtn: {
    flex: 1, paddingVertical: 11,
    borderRadius: R, backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  nextText: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: '#fff' },
});
