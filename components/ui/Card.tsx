import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, R, Sp } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

// Carte standard — fond surface, bordure subtile, radius 14
export default function Card({ children, style, padding = Sp.md }: Props) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: R,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
