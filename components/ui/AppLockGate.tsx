import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isLockEnabled, authenticate, biometricLabel } from '../../services/applock';
import { Colors, Sp, Fs, Fonts } from '../../constants/theme';
import Button from './Button';

// Délai avant re-verrouillage au retour d'arrière-plan : évite de redemander
// Face ID si l'utilisateur bascule 2 secondes vers une autre app.
const RELOCK_AFTER_MS = 30_000;

/**
 * Enveloppe l'app : si le verrou est activé, masque le contenu tant que
 * l'utilisateur ne s'est pas authentifié (Face ID / Touch ID / code).
 */
export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const [locked,  setLocked]  = useState(false);
  const [ready,   setReady]   = useState(false);
  const [label,   setLabel]   = useState('Face ID');
  const backgroundAt = useRef<number | null>(null);

  const tryUnlock = useCallback(async () => {
    const ok = await authenticate();
    if (ok) setLocked(false);
  }, []);

  // Au démarrage : verrouiller si l'option est active
  useEffect(() => {
    (async () => {
      const enabled = await isLockEnabled();
      setLabel(await biometricLabel());
      if (enabled) {
        setLocked(true);
        setReady(true);
        const ok = await authenticate();
        if (ok) setLocked(false);
      } else {
        setReady(true);
      }
    })();
  }, []);

  // Re-verrouiller au retour d'arrière-plan (après le délai)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundAt.current = Date.now();
        return;
      }
      if (state === 'active' && backgroundAt.current) {
        const away = Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (away >= RELOCK_AFTER_MS && (await isLockEnabled())) {
          setLocked(true);
          const ok = await authenticate();
          if (ok) setLocked(false);
        }
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View style={styles.overlay}>
          <Ionicons name="lock-closed" size={54} color={Colors.primary} />
          <Text style={styles.title}>FitTrack IA verrouillé</Text>
          <Text style={styles.sub}>Tes données sont protégées</Text>
          <Button
            title={`Déverrouiller avec ${label}`}
            icon="finger-print"
            onPress={tryUnlock}
            fullWidth={false}
            style={{ marginTop: Sp.lg, paddingHorizontal: Sp.lg }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Opaque : masque totalement le contenu (y compris dans le sélecteur d'apps)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  title: { fontSize: Fs.xl, fontFamily: Fonts.bold, color: Colors.text, marginTop: Sp.md },
  sub:   { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 4 },
});
