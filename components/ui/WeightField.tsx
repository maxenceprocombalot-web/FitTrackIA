import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Colors, R, Sp, Fs, Fonts } from '../../constants/theme';
import Button from './Button';

interface Props {
  initial?: number;
  onSave: (w: number) => void;
  /** hero : gros chiffre centré + bouton pleine largeur (modal accueil).
      Par défaut : rangée compacte input + bouton (écran Progrès). */
  hero?: boolean;
  autoFocus?: boolean;
}

// Saisie de poids partagée — même validation et même geste partout (20–300 kg).
export default function WeightField({ initial, onSave, hero = false, autoFocus = false }: Props) {
  const [value, setValue] = useState(initial ? String(initial) : '');

  const handleSave = () => {
    const w = parseFloat(value.replace(',', '.'));
    if (!w || isNaN(w) || w < 20 || w > 300) return;
    onSave(w);
    setValue('');
  };

  if (hero) {
    return (
      <View style={styles.heroWrap}>
        <TextInput
          style={styles.heroInput}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder={initial ? String(initial) : '75.0'}
          placeholderTextColor={Colors.textMuted}
          autoFocus={autoFocus}
          selectTextOnFocus
          accessibilityLabel="Poids en kilogrammes"
        />
        <Button title="Enregistrer" onPress={handleSave} />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={initial ? `${initial} kg` : '75.0'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={handleSave}
        accessibilityLabel="Poids en kilogrammes"
      />
      <Button title="Enregistrer" onPress={handleSave} fullWidth={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Sp.sm, marginBottom: Sp.md },
  input: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  heroWrap: { width: '100%', gap: Sp.md },
  heroInput: { fontSize: 40, fontFamily: Fonts.condensedHeavy, color: Colors.text, textAlign: 'center', width: '100%', backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingVertical: Sp.md, borderWidth: 1, borderColor: Colors.border },
});
