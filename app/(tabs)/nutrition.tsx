import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { Meal, MealType, FoodItem } from '../../types';
import MacroBar from '../../components/ui/MacroBar';
import Card from '../../components/ui/Card';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';

const MEAL_META: Record<MealType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; timeHint: string }> = {
  breakfast: { label: 'Petit-déjeuner', icon: 'sunny-outline',      color: Colors.yellow,  timeHint: 'Matin' },
  lunch:     { label: 'Déjeuner',       icon: 'restaurant-outline',  color: Colors.primary, timeHint: 'Midi' },
  dinner:    { label: 'Dîner',          icon: 'moon-outline',        color: '#b983ff',      timeHint: 'Soir' },
  snack:     { label: 'Collation',      icon: 'cafe-outline',        color: Colors.green,   timeHint: 'Snack' },
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Calcul des macros pour une liste d'items
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

export default function NutritionScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const user   = store.user;

  const todayDate  = storage.today();
  const todayMeals = store.meals.filter(m => m.date === todayDate);
  const macros     = store.getTodayMacros();

  const handleDeleteItem = (mealId: string, itemId: string) => {
    const meal = store.meals.find(m => m.id === mealId);
    if (!meal) return;
    const updated = { ...meal, items: meal.items.filter(i => i.id !== itemId) };
    if (updated.items.length === 0) {
      store.deleteMeal(mealId);
    } else {
      store.updateMeal(updated);
    }
  };

  // Sauvegarde d'un repas complet comme favori
  const handleSaveFavorite = (type: MealType, meals: Meal[]) => {
    const allItems = meals.flatMap(m => m.items);
    if (allItems.length === 0) {
      Alert.alert('Repas vide', 'Ajoute des aliments avant de sauvegarder comme favori.');
      return;
    }
    const defaultName = `${MEAL_META[type].label} habituel`;
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '⭐ Sauvegarder comme favori',
        'Donne un nom à ce repas',
        (name) => {
          if (!name?.trim()) return;
          store.addFavorite({
            id: Date.now().toString(),
            name: name.trim(),
            items: allItems,
            mealType: type,
            createdAt: new Date().toISOString(),
          });
          Alert.alert('⭐ Favori sauvegardé !', `"${name}" est dans l'onglet Favoris.`);
        },
        'plain-text',
        defaultName,
      );
    } else {
      // Android : utilise le nom par défaut
      store.addFavorite({
        id: Date.now().toString(),
        name: defaultName,
        items: allItems,
        mealType: type,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('⭐ Favori sauvegardé !', `"${defaultName}" est dans l'onglet Favoris.`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Récapitulatif du jour ─────────────────────────────────────────── */}
      <Card>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.bigCal}>{Math.round(macros.calories)}</Text>
            <Text style={styles.bigCalLabel}>kcal aujourd'hui</Text>
          </View>
          {user && (
            <View style={styles.remaining}>
              <Text style={[styles.remValue, { color: macros.calories > user.targetCalories ? Colors.red : Colors.green }]}>
                {Math.abs(Math.round(user.targetCalories - macros.calories))}
              </Text>
              <Text style={styles.remLabel}>
                {macros.calories > user.targetCalories ? 'kcal dépassées' : 'kcal restantes'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.macros}>
          <MacroBar label="Protéines" current={macros.protein} goal={user?.targetProtein ?? 150} color={Colors.proteinColor} />
          <MacroBar label="Glucides"  current={macros.carbs}   goal={user?.targetCarbs   ?? 200} color={Colors.carbsColor} />
          <MacroBar label="Lipides"   current={macros.fat}     goal={user?.targetFat     ?? 65}  color={Colors.fatColor} />
        </View>
      </Card>

      {/* ── Sections par repas ───────────────────────────────────────────── */}
      {MEAL_ORDER.map(type => {
        const meals = todayMeals.filter(m => m.type === type);
        const totals = calcMacros(meals.flatMap(m => m.items));
        const meta = MEAL_META[type];
        return (
          <View key={type} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <View style={[styles.mealIcon, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={16} color={meta.color} />
              </View>
              <Text style={styles.mealLabel}>{meta.label}</Text>
              <Text style={styles.mealCal}>{Math.round(totals.cal)} kcal</Text>
              {/* Bouton sauvegarder comme favori */}
              <TouchableOpacity
                style={styles.favBtn}
                onPress={() => handleSaveFavorite(type, meals)}
              >
                <Ionicons name="star-outline" size={16} color={Colors.yellow} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: meta.color + '18' }]}
                onPress={() => router.push({ pathname: '/modals/add-food', params: { mealType: type } })}
              >
                <Ionicons name="add" size={18} color={meta.color} />
              </TouchableOpacity>
            </View>

            {meals.flatMap(meal =>
              meal.items.map(item => (
                <FoodRow
                  key={item.id}
                  item={item}
                  onDelete={() => handleDeleteItem(meal.id, item.id)}
                />
              ))
            )}

            {meals.length === 0 && (
              <Text style={styles.emptyMeal}>Aucun aliment enregistré</Text>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Ligne aliment ────────────────────────────────────────────────────────────

function FoodRow({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  const cal  = Math.round(item.caloriesPer100g * item.quantity / 100);
  const prot = Math.round(item.proteinPer100g  * item.quantity / 100);
  const carb = Math.round(item.carbsPer100g    * item.quantity / 100);
  const fat  = Math.round(item.fatPer100g      * item.quantity / 100);

  return (
    <View style={foodStyles.row}>
      <View style={foodStyles.info}>
        <Text style={foodStyles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={foodStyles.portion}>{item.quantity}g</Text>
      </View>
      <View style={foodStyles.macros}>
        <MacroPill value={`${cal}`} unit="kcal" color={Colors.caloriesColor} />
        <MacroPill value={`P:${prot}`} unit="g" color={Colors.proteinColor} />
        <MacroPill value={`G:${carb}`} unit="g" color={Colors.carbsColor} />
        <MacroPill value={`L:${fat}`}  unit="g" color={Colors.fatColor} />
      </View>
      <TouchableOpacity onPress={onDelete} style={foodStyles.del}>
        <Ionicons name="trash-outline" size={15} color={Colors.red} />
      </TouchableOpacity>
    </View>
  );
}

function MacroPill({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <View style={[foodStyles.pill, { backgroundColor: color + '18' }]}>
      <Text style={[foodStyles.pillText, { color }]}>{value}{unit}</Text>
    </View>
  );
}

const foodStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Sp.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: 6 },
  info: { flex: 1 },
  name: { fontSize: Fs.sm, color: Colors.text, fontWeight: Fw.medium },
  portion: { fontSize: Fs.xs, color: Colors.textMuted },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 1, justifyContent: 'flex-end' },
  pill: { borderRadius: 99, paddingHorizontal: 5, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: Fw.medium },
  del: { padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.sm, paddingBottom: 40 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sp.md },
  bigCal: { fontSize: Fs.xxxl, fontWeight: Fw.heavy, color: Colors.caloriesColor },
  bigCalLabel: { fontSize: Fs.xs, color: Colors.textSecondary },
  remaining: { alignItems: 'flex-end' },
  remValue: { fontSize: Fs.xl, fontWeight: Fw.bold },
  remLabel: { fontSize: Fs.xs, color: Colors.textMuted },
  macros: {},
  mealSection: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Sp.md },
  mealIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealLabel: { flex: 1, fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text },
  mealCal: { fontSize: Fs.sm, color: Colors.textSecondary },
  favBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.yellow + '15' },
  addBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyMeal: { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10 },
});
