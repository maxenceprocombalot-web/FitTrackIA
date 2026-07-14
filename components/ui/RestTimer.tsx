import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Fs, Fw, Sp, R } from '../../constants/theme';

// Durées de repos proposées (en secondes)
const DURATIONS = [30, 60, 90, 120, 180] as const;
const LABEL: Record<number, string> = { 30: '30s', 60: '1min', 90: '1:30', 120: '2min', 180: '3min' };

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Composant arc SVG animé — un seul effet pour éviter les listeners dupliqués
function ArcFill({ circumference, targetOffset, color, r, size, sw }: {
  circumference: number; targetOffset: number; color: string; r: number; size: number; sw: number;
}) {
  const anim = useRef(new Animated.Value(circumference - targetOffset)).current;
  const [offset, setOffset] = useState(circumference - targetOffset);

  useEffect(() => {
    // Repart de la valeur courante et anime vers 0 sur 1s (une seconde de countdown)
    anim.setValue(circumference - targetOffset);
    const id = anim.addListener(({ value }) => setOffset(circumference - value));
    Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [targetOffset, circumference]);

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

export default function RestTimer({ visible, onClose }: Props) {
  const [selected,  setSelected]  = useState(90);
  const [remaining, setRemaining] = useState<number | null>(null); // null = pas démarré
  const [running,   setRunning]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Nettoie quand le modal se ferme
  useEffect(() => {
    if (!visible) stopTimer();
  }, [visible]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setRemaining(null);
  }, []);

  const startTimer = useCallback(async (duration: number) => {
    stopTimer();
    setRemaining(duration);
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let left = duration;
    intervalRef.current = setInterval(async () => {
      left -= 1;
      setRemaining(left);

      // Haptic toutes les 10 secondes
      if (left > 0 && left % 10 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (left <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRunning(false);
        setRemaining(0);
        // Haptic fort + notification à la fin
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Notifications.scheduleNotificationAsync({
          content: { title: '⏱ Repos terminé !', body: 'Reprends ta série 💪' },
          trigger: null, // immédiat
        });
      }
    }, 1000);
  }, [stopTimer]);

  // Formatage mm:ss
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}`;
  };

  const SIZE = 200;
  const SW   = 12;
  const rad  = (SIZE - SW) / 2;
  const circ = 2 * Math.PI * rad;
  const pct  = remaining !== null ? remaining / selected : 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>⏱ Timer de repos</Text>

          {/* Sélecteur de durée */}
          <View style={styles.durationRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.durBtn, selected === d && !running && styles.durBtnActive]}
                onPress={() => { if (!running) setSelected(d); }}
              >
                <Text style={[styles.durText, selected === d && !running && styles.durTextActive]}>
                  {LABEL[d]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Anneau SVG */}
          <View style={styles.ringWrapper}>
            <Svg width={SIZE} height={SIZE}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={rad} stroke="rgba(255,255,255,0.06)" strokeWidth={SW} fill="transparent" />
              {remaining !== null && remaining > 0 && (
                <ArcFill
                  circumference={circ}
                  targetOffset={circ * pct}
                  color={remaining <= 10 ? Colors.red : Colors.primary}
                  r={rad} size={SIZE} sw={SW}
                />
              )}
            </Svg>
            <View style={[styles.ringCenter, { width: SIZE, height: SIZE }]}>
              {remaining === null ? (
                <Text style={styles.ringIdle}>Prêt</Text>
              ) : remaining === 0 ? (
                <Text style={[styles.ringValue, { color: Colors.green }]}>GO !</Text>
              ) : (
                <>
                  <Text style={[styles.ringValue, { color: remaining <= 10 ? Colors.red : Colors.text }]}>
                    {fmt(remaining)}
                  </Text>
                  <Text style={styles.ringSub}>secondes</Text>
                </>
              )}
            </View>
          </View>

          {/* Boutons */}
          <View style={styles.btnRow}>
            {!running ? (
              <TouchableOpacity style={styles.startBtn} onPress={() => startTimer(selected)}>
                <Text style={styles.startBtnText}>
                  {remaining === 0 ? 'Recommencer' : 'Démarrer'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
                <Text style={styles.stopBtnText}>Arrêter</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Sp.lg, alignItems: 'center', paddingBottom: 40 },
  title: { fontSize: Fs.lg, fontWeight: Fw.bold, color: Colors.text, marginBottom: Sp.md },
  durationRow: { flexDirection: 'row', gap: Sp.xs, marginBottom: Sp.lg },
  durBtn: { paddingHorizontal: Sp.md, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  durBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  durText: { fontSize: Fs.sm, color: Colors.textSecondary },
  durTextActive: { color: Colors.primary, fontWeight: Fw.semibold },
  ringWrapper: { position: 'relative', marginBottom: Sp.lg },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringIdle: { fontSize: Fs.xl, color: Colors.textMuted, fontWeight: Fw.medium },
  ringValue: { fontSize: Fs.xxxl, fontWeight: Fw.heavy, letterSpacing: -2 },
  ringSub: { fontSize: Fs.xs, color: Colors.textMuted },
  btnRow: { flexDirection: 'row', gap: Sp.sm, width: '100%' },
  startBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md, alignItems: 'center' },
  startBtnText: { color: Colors.onPrimary, fontWeight: Fw.bold, fontSize: Fs.md },
  stopBtn: { flex: 1, backgroundColor: Colors.red + '20', borderRadius: R, padding: Sp.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.red },
  stopBtnText: { color: Colors.red, fontWeight: Fw.bold, fontSize: Fs.md },
  closeBtn: { borderRadius: R, padding: Sp.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Sp.lg },
  closeBtnText: { color: Colors.textSecondary, fontWeight: Fw.medium },
});
