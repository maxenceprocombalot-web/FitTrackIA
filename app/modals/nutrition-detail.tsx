import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { FoodItem, Meal, MealType } from '../../types';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';

const MEAL_META: Record<MealType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  breakfast: { label: 'Petit-déjeuner', icon: 'sunny-outline',     color: Colors.yellow },
  lunch:     { label: 'Déjeuner',       icon: 'restaurant-outline', color: Colors.primary },
  dinner:    { label: 'Dîner',          icon: 'moon-outline',       color: '#b983ff' },
  snack:     { label: 'Collation',      icon: 'cafe-outline',       color: Colors.green },
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function calcMacros(items: FoodItem[]) {
  return items.reduce(
    (acc, item) => {
      const r = item.quantity / 100;
      return {
        cal:  acc.cal  + item.caloriesPer100g * r,
        prot: acc.prot + item.proteinPer100g  * r,
        carb: acc.carb + item.carbsPer100g    * r,
        fat:  acc.fat  + item.fatPer100g      * r,
      };
    },
    { cal: 0, prot: 0, carb: 0, fat: 0 },
  );
}

function fmtLongDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ─── Camembert SVG ────────────────────────────────────────────────────────────

function PieChart({ prot, carb, fat }: { prot: number; carb: number; fat: number }) {
  const total = prot + carb + fat;
  if (total === 0) return null;
  const SIZE = 160; const R_PIE = 68; const CX = 80; const CY = 80;

  function slice(startAngle: number, value: number): string {
    const angle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = CX + R_PIE * Math.cos(startAngle - Math.PI / 2);
    const y1 = CY + R_PIE * Math.sin(startAngle - Math.PI / 2);
    const x2 = CX + R_PIE * Math.cos(endAngle - Math.PI / 2);
    const y2 = CY + R_PIE * Math.sin(endAngle - Math.PI / 2);
    const largeArc = angle > Math.PI ? 1 : 0;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R_PIE} ${R_PIE} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  const a0 = 0;
  const a1 = (prot / total) * 2 * Math.PI;
  const a2 = a1 + (carb / total) * 2 * Math.PI;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <Path d={slice(a0, prot)} fill={Colors.proteinColor} opacity={0.9} />
        <Path d={slice(a1, carb)} fill={Colors.carbsColor}   opacity={0.9} />
        <Path d={slice(a2, fat)}  fill={Colors.fatColor}     opacity={0.9} />
        <Circle cx={CX} cy={CY} r={32} fill={Colors.surface} />
        <SvgText x={CX} y={CY - 6}  fontSize={13} fontWeight="700" fill={Colors.text} textAnchor="middle">{Math.round(total)}g</SvgText>
        <SvgText x={CX} y={CY + 10} fontSize={9}  fill={Colors.textMuted} textAnchor="middle">macros</SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', gap: Sp.md, marginTop: 4 }}>
        {[
          { label: `P ${Math.round(prot)}g`, color: Colors.proteinColor },
          { label: `G ${Math.round(carb)}g`, color: Colors.carbsColor },
          { label: `L ${Math.round(fat)}g`,  color: Colors.fatColor },
        ].map(({ label, color }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontSize: Fs.xs, color: Colors.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NutritionDetailModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const store  = useAppStore();
  const user   = store.user;

  const date  = (params.date as string) ?? storage.today();
  const TODAY = storage.today();
  const isToday = date === TODAY;

  const dayMeals = useMemo(() => store.meals.filter(m => m.date === date), [store.meals, date]);
  const allItems = useMemo(() => dayMeals.flatMap(m => m.items), [dayMeals]);
  const totals   = useMemo(() => calcMacros(allItems), [allItems]);

  const diff        = user ? Math.round(totals.cal - user.targetCalories) : 0;
  const diffColor   = diff > 0 ? Colors.red : Colors.green;
  const diffLabel   = diff > 0 ? `+${diff} kcal au-dessus` : `${Math.abs(diff)} kcal en dessous`;

  const handleCopyToToday = () => {
    if (isToday) return;
    if (dayMeals.length === 0) {
      Alert.alert('Aucun repas', 'Rien à copier depuis ce jour.');
      return;
    }
    Alert.alert(
      'Copier ce jour vers aujourd\'hui ?',
      `Les ${dayMeals.length} repas de ce jour seront copiés vers aujourd'hui.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Copier',
          onPress: async () => {
            for (const meal of dayMeals) {
              const newItems = meal.items.map(item => ({
                ...item,
                id: `copy_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              }));
              const existing = store.meals.find(m => m.date === TODAY && m.type === meal.type);
              const newMeal: Meal = existing
                ? { ...existing, items: [...existing.items, ...newItems] }
                : { ...meal, id: `copy_${Date.now()}_${Math.random().toString(36).slice(2)}`, date: TODAY, items: newItems };
              await store.addMeal(newMeal);
            }
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{fmtLongDate(date)}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card résumé */}
        <View style={styles.card}>
          <View style={styles.calRow}>
            <View>
              <Text style={styles.bigCal}>{Math.round(totals.cal)}</Text>
              <Text style={styles.bigCalLabel}>kcal consommées</Text>
              {user && (
                <Text style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</Text>
              )}
            </View>
            <PieChart prot={totals.prot} carb={totals.carb} fat={totals.fat} />
          </View>
        </View>

        {/* Sections par repas */}
        {MEAL_ORDER.map(type => {
          const meals  = dayMeals.filter(m => m.type === type);
          const items  = meals.flatMap(m => m.items);
          const totM   = calcMacros(items);
          const meta   = MEAL_META[type];
          return (
            <View key={type} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: meta.color + '18' }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <Text style={styles.mealLabel}>{meta.label}</Text>
                <Text style={styles.mealCal}>{Math.round(totM.cal)} kcal</Text>
              </View>
              {items.length === 0 ? (
                <Text style={styles.emptyMeal}>Aucun aliment</Text>
              ) : (
                items.map(item => {
                  const cal  = Math.round(item.caloriesPer100g * item.quantity / 100);
                  const prot = (item.proteinPer100g  * item.quantity / 100).toFixed(1);
                  const carb = (item.carbsPer100g    * item.quantity / 100).toFixed(1);
                  const fat  = (item.fatPer100g      * item.quantity / 100).toFixed(1);
                  return (
                    <View key={item.id} style={styles.foodRow}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.foodPortion}>{item.quantity}g</Text>
                      </View>
                      <View style={styles.foodMacros}>
                        <MacroPill value={`${cal}`}    unit="kcal" color={Colors.caloriesColor} />
                        <MacroPill value={`P:${prot}`} unit="g"    color={Colors.proteinColor} />
                        <MacroPill value={`G:${carb}`} unit="g"    color={Colors.carbsColor} />
                        <MacroPill value={`L:${fat}`}  unit="g"    color={Colors.fatColor} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}

        {/* Bouton copier vers aujourd'hui */}
        {!isToday && dayMeals.length > 0 && (
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyToToday}>
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.copyBtnText}>Copier ce jour vers aujourd'hui</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MacroPill({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + '18' }]}>
      <Text style={[pillStyles.text, { color }]}>{value}{unit}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { borderRadius: 99, paddingHorizontal: 5, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: Fw.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    paddingHorizontal: Sp.md, paddingTop: 56, paddingBottom: Sp.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  title: { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.text, textTransform: 'capitalize' },
  scroll: { flex: 1 },
  content: { padding: Sp.md, gap: Sp.sm },
  // Card résumé
  card: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  calRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigCal: { fontSize: Fs.xxxl, fontWeight: Fw.heavy, color: Colors.caloriesColor },
  bigCalLabel: { fontSize: Fs.xs, color: Colors.textSecondary, marginTop: 2 },
  diffLabel: { fontSize: Fs.sm, fontWeight: Fw.semibold, marginTop: 4 },
  // Sections repas
  mealSection: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  mealHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Sp.md },
  mealIcon:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealLabel:   { flex: 1, fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text },
  mealCal:     { fontSize: Fs.sm, color: Colors.textSecondary },
  emptyMeal:   { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10, paddingBottom: 12 },
  // Aliments
  foodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: Sp.md, gap: 6,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  foodInfo:    { flex: 1 },
  foodName:    { fontSize: Fs.sm, color: Colors.text, fontWeight: Fw.medium },
  foodPortion: { fontSize: Fs.xs, color: Colors.textMuted },
  foodMacros:  { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 1, justifyContent: 'flex-end' },
  // Bouton copier
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary + '15', borderRadius: R,
    borderWidth: 1, borderColor: Colors.primary + '40',
    paddingVertical: Sp.md, marginTop: Sp.sm,
  },
  copyBtnText: { fontSize: Fs.sm, color: Colors.primary, fontWeight: Fw.semibold },
});
