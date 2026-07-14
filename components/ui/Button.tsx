import React, { useCallback } from 'react';
import {
  Pressable, Text, ActivityIndicator, StyleSheet,
  StyleProp, ViewStyle, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Bouton standard du design-system : gère variantes, état pressé (scale + opacité),
// chargement, désactivation, icône, haptique et accessibilité — un seul endroit à
// maintenir au lieu du style `saveBtn` recopié dans chaque écran.
export default function Button({
  title, onPress, variant = 'primary', size = 'md',
  icon, loading = false, disabled = false, fullWidth = true,
  haptic = true, style,
}: Props) {
  const isOff = disabled || loading;
  const v = VARIANTS[variant];

  const handlePress = useCallback(() => {
    if (isOff) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [isOff, haptic, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isOff, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        pressed && !isOff && styles.pressed,
        isOff && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={v.fg} />}
          <Text style={[styles.label, size === 'lg' ? styles.labelLg : null, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary:   { bg: Colors.primary,          fg: Colors.onPrimary,    border: 'transparent' },
  secondary: { bg: Colors.surfaceElevated,  fg: Colors.text,         border: Colors.borderStrong },
  ghost:     { bg: 'transparent',           fg: Colors.primary,      border: 'transparent' },
  danger:    { bg: Colors.red,              fg: '#fff',              border: 'transparent' },
};

const styles = StyleSheet.create({
  base:      { borderRadius: R, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  md:        { paddingVertical: Sp.sm + 4, paddingHorizontal: Sp.md },
  lg:        { paddingVertical: Sp.md, paddingHorizontal: Sp.lg },
  fullWidth: { alignSelf: 'stretch' },
  row:       { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  label:     { fontSize: Fs.md, fontWeight: Fw.bold },
  labelLg:   { fontSize: Fs.lg },
  pressed:   { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled:  { opacity: 0.45 },
});
