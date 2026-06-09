import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Platform, Animated, PanResponder, Dimensions,
  Modal, FlatList,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { Meal, MealType, FoodItem, Recipe } from '../../types';
import MacroBar from '../../components/ui/MacroBar';
import Card from '../../components/ui/Card';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';
import { PREDEFINED_RECIPES } from '../../constants/recipes';

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

// Formate une date YYYY-MM-DD de façon lisible
function fmtDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Aujourd'hui";
  const yesterday = new Date(todayStr);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Hier';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function NutritionScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const user   = store.user;

  const TODAY = storage.today();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const isToday = selectedDate === TODAY;
  const [showRecipes, setShowRecipes] = useState(false);

  // Navigation par date
  const goToPrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const goToNext = () => {
    if (isToday) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().split('T')[0];
    if (next <= TODAY) setSelectedDate(next);
  };

  // Repas et macros du jour sélectionné
  const selectedMeals = store.meals.filter(m => m.date === selectedDate);
  const macros = calcMacros(selectedMeals.flatMap(m => m.items));

  // Jour précédent pour le bouton "Copier"
  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  const prevMeals   = store.meals.filter(m => m.date === prevDateStr);

  // ── Supprimer un aliment ──────────────────────────────────────────────────

  const handleDeleteItem = (mealId: string, itemId: string) => {
    const meal = store.meals.find(m => m.id === mealId);
    if (!meal) return;
    const updated = { ...meal, items: meal.items.filter(i => i.id !== itemId) };
    if (updated.items.length === 0) store.deleteMeal(mealId);
    else store.updateMeal(updated);
  };

  // ── Sauvegarder un repas comme favori ─────────────────────────────────────

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
          store.addFavorite({ id: Date.now().toString(), name: name.trim(), items: allItems, mealType: type, createdAt: new Date().toISOString() });
          Alert.alert('⭐ Favori sauvegardé !', `"${name}" est dans l'onglet Favoris.`);
        },
        'plain-text',
        defaultName,
      );
    } else {
      store.addFavorite({ id: Date.now().toString(), name: defaultName, items: allItems, mealType: type, createdAt: new Date().toISOString() });
      Alert.alert('⭐ Favori sauvegardé !', `"${defaultName}" est dans l'onglet Favoris.`);
    }
  };

  // ── Copier les repas du jour précédent ────────────────────────────────────

  const handleCopyFromPrev = useCallback(() => {
    if (prevMeals.length === 0) {
      Alert.alert('Aucun repas', `Rien à copier depuis ${fmtDate(prevDateStr, TODAY)}.`);
      return;
    }

    const executeCopy = async () => {
      for (const meal of prevMeals) {
        const existing = selectedMeals.find(m => m.type === meal.type);
        const newItems  = meal.items.map(item => ({
          ...item,
          id: `copy_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        }));
        const newMeal: Meal = existing
          ? { ...existing, items: [...existing.items, ...newItems] }
          : { ...meal, id: `copy_${Date.now()}_${Math.random().toString(36).slice(2)}`, date: selectedDate, items: newItems };
        await store.addMeal(newMeal);
      }
    };

    const totalItems   = prevMeals.reduce((s, m) => s + m.items.length, 0);
    const hasExisting  = selectedMeals.length > 0;
    const confirmLabel = `Copier les ${prevMeals.length} repas (${totalItems} aliments) de ${fmtDate(prevDateStr, TODAY)} ?`;

    const showConfirm = () => Alert.alert(
      confirmLabel, '',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Copier', onPress: executeCopy },
      ],
    );

    if (hasExisting) {
      Alert.alert(
        'Des repas existent déjà',
        `${fmtDate(selectedDate, TODAY)} a déjà des repas. Ajouter quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter quand même', onPress: showConfirm },
        ],
      );
    } else {
      showConfirm();
    }
  }, [prevMeals, selectedMeals, selectedDate, prevDateStr, store]);

  return (
    <AnimatedScreen style={styles.animWrapper}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Navigateur de date ───────────────────────────────────────────── */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateArrow} onPress={goToPrev}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/modals/nutrition-detail', params: { date: selectedDate } })}
          style={styles.dateLabelWrap}
        >
          <Text style={styles.dateLabel}>{fmtDate(selectedDate, TODAY)}</Text>
          <Text style={styles.dateLabelHint}>Voir le détail →</Text>
          {!isToday && (
            <TouchableOpacity onPress={() => setSelectedDate(TODAY)} style={styles.todayLink}>
              <Text style={styles.todayLinkText}>Revenir à aujourd'hui</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          onPress={goToNext}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={22} color={isToday ? Colors.textMuted : Colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Bouton recettes ──────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.recipesBtn} onPress={() => setShowRecipes(true)}>
        <Ionicons name="restaurant-outline" size={16} color={Colors.primary} />
        <Text style={styles.recipesBtnText}>Recettes</Text>
      </TouchableOpacity>

      {/* ── Bouton copier depuis le jour précédent ───────────────────────── */}
      {prevMeals.length > 0 && (
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopyFromPrev}>
          <Ionicons name="copy-outline" size={14} color={Colors.primary} />
          <Text style={styles.copyBtnText}>
            Copier depuis {fmtDate(prevDateStr, TODAY)} ({prevMeals.length} repas)
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Récapitulatif calorique ──────────────────────────────────────── */}
      <Card>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.bigCal}>{Math.round(macros.cal)}</Text>
            <Text style={styles.bigCalLabel}>
              kcal {isToday ? "aujourd'hui" : fmtDate(selectedDate, TODAY).toLowerCase()}
            </Text>
          </View>
          {user && (
            <View style={styles.remaining}>
              <Text style={[styles.remValue, { color: macros.cal > user.targetCalories ? Colors.red : Colors.green }]}>
                {Math.abs(Math.round(user.targetCalories - macros.cal))}
              </Text>
              <Text style={styles.remLabel}>
                {macros.cal > user.targetCalories ? 'kcal dépassées' : 'kcal restantes'}
              </Text>
            </View>
          )}
        </View>
        <MacroBar label="Protéines" current={macros.prot} goal={user?.targetProtein ?? 150} color={Colors.proteinColor} />
        <MacroBar label="Glucides"  current={macros.carb} goal={user?.targetCarbs   ?? 200} color={Colors.carbsColor} />
        <MacroBar label="Lipides"   current={macros.fat}  goal={user?.targetFat     ?? 65}  color={Colors.fatColor} />
      </Card>

      {/* ── Sections par repas ───────────────────────────────────────────── */}
      {MEAL_ORDER.map(type => {
        const meals  = selectedMeals.filter(m => m.type === type);
        const totals = calcMacros(meals.flatMap(m => m.items));
        const meta   = MEAL_META[type];
        return (
          <View key={type} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <View style={[styles.mealIcon, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={16} color={meta.color} />
              </View>
              <Text style={styles.mealLabel}>{meta.label}</Text>
              <Text style={styles.mealCal}>{Math.round(totals.cal)} kcal</Text>
              <TouchableOpacity style={styles.favBtn} onPress={() => handleSaveFavorite(type, meals)}>
                <Ionicons name="star-outline" size={16} color={Colors.yellow} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: meta.color + '18' }]}
                onPress={() => router.push({
                  pathname: '/modals/add-food',
                  params: { mealType: type, targetDate: selectedDate },
                })}
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

    {/* ── Modal recettes ────────────────────────────────────────────────── */}
    {showRecipes && (
      <RecipesModal
        onClose={() => setShowRecipes(false)}
        onAddRecipe={(recipe) => {
          const totalCal  = recipe.ingredients.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
          const totalProt = recipe.ingredients.reduce((s, i) => s + i.proteinPer100g  * i.quantity / 100, 0);
          const totalCarb = recipe.ingredients.reduce((s, i) => s + i.carbsPer100g    * i.quantity / 100, 0);
          const totalFat  = recipe.ingredients.reduce((s, i) => s + i.fatPer100g      * i.quantity / 100, 0);
          const totalQty  = recipe.ingredients.reduce((s, i) => s + i.quantity, 0);
          const perPortion = recipe.servings;
          const item: FoodItem = {
            id: `recipe_${Date.now()}`,
            name: `${recipe.emoji} ${recipe.name} (1 portion)`,
            quantity: Math.round(totalQty / perPortion),
            caloriesPer100g: Math.round((totalCal / perPortion) / (totalQty / perPortion / 100)),
            proteinPer100g:  Math.round((totalProt / perPortion) / (totalQty / perPortion / 100) * 10) / 10,
            carbsPer100g:    Math.round((totalCarb / perPortion) / (totalQty / perPortion / 100) * 10) / 10,
            fatPer100g:      Math.round((totalFat  / perPortion) / (totalQty / perPortion / 100) * 10) / 10,
          };
          const existing = selectedMeals.find(m => m.type === 'lunch');
          const meal: Meal = existing
            ? { ...existing, items: [...existing.items, item] }
            : { id: Date.now().toString(), date: selectedDate, type: 'lunch', items: [item] };
          store.addMeal(meal);
          setShowRecipes(false);
        }}
      />
    )}

    </AnimatedScreen>
  );
}

// ─── Ligne aliment avec swipe gauche pour supprimer ──────────────────────────

const SCREEN_W_N = Dimensions.get('window').width;
const DELETE_W   = 85;

function FoodRow({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  const panX = useRef(new Animated.Value(0)).current;
  const cal  = Math.round(item.caloriesPer100g * item.quantity / 100);
  const prot = Math.round(item.proteinPer100g  * item.quantity / 100);
  const carb = Math.round(item.carbsPer100g    * item.quantity / 100);
  const fat  = Math.round(item.fatPer100g      * item.quantity / 100);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => { if (g.dx < 0) panX.setValue(Math.max(g.dx, -DELETE_W - 10)); },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) {
        Animated.spring(panX, { toValue: -DELETE_W, useNativeDriver: true }).start();
        Alert.alert(
          'Supprimer cet aliment ?',
          `"${item.name}" sera retiré de ce repas.`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start() },
            { text: 'Supprimer', style: 'destructive', onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Animated.timing(panX, { toValue: -SCREEN_W_N, duration: 200, useNativeDriver: true }).start(onDelete);
              },
            },
          ],
        );
      } else {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  return (
    <View style={foodStyles.swipeWrap}>
      {/* Fond rouge */}
      <View style={foodStyles.swipeBg}>
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={foodStyles.swipeBgText}>Suppr.</Text>
      </View>
      <Animated.View
        style={[foodStyles.row, { transform: [{ translateX: panX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={foodStyles.info}>
          <Text style={foodStyles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={foodStyles.portion}>{item.quantity}g</Text>
        </View>
        <View style={foodStyles.macros}>
          <MacroPill value={`${cal}`}    unit="kcal" color={Colors.caloriesColor} />
          <MacroPill value={`P:${prot}`} unit="g"    color={Colors.proteinColor} />
          <MacroPill value={`G:${carb}`} unit="g"    color={Colors.carbsColor} />
          <MacroPill value={`L:${fat}`}  unit="g"    color={Colors.fatColor} />
        </View>
      </Animated.View>
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
  swipeWrap: { position: 'relative', borderTopWidth: 1, borderTopColor: Colors.border, overflow: 'hidden' },
  swipeBg:   { position: 'absolute', right: 0, top: 0, bottom: 0, width: DELETE_W, backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center', gap: 2 },
  swipeBgText: { color: '#fff', fontSize: Fs.xs, fontWeight: Fw.semibold },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Sp.md, gap: 6, backgroundColor: Colors.surface },
  info:     { flex: 1 },
  name:     { fontSize: Fs.sm, color: Colors.text, fontWeight: Fw.medium },
  portion:  { fontSize: Fs.xs, color: Colors.textMuted },
  macros:   { flexDirection: 'row', flexWrap: 'wrap', gap: 3, flex: 1, justifyContent: 'flex-end' },
  pill:     { borderRadius: 99, paddingHorizontal: 5, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: Fw.medium },
});

const styles = StyleSheet.create({
  animWrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bg },
  content:   { padding: Sp.md, gap: Sp.sm, paddingBottom: 40 },
  // Navigateur de date
  dateNav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: R,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: Sp.sm,
  },
  dateArrow:         { paddingHorizontal: Sp.md, paddingVertical: 4 },
  dateArrowDisabled: { opacity: 0.25 },
  dateLabelWrap:     { flex: 1, alignItems: 'center', gap: 2 },
  dateLabel:         { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.text },
  dateLabelHint:     { fontSize: Fs.xs, color: Colors.primary },
  todayLink:         { marginTop: 1 },
  todayLinkText:     { fontSize: Fs.xs, color: Colors.primary },
  // Bouton copier
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '12',
    borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '30',
    paddingVertical: 8, paddingHorizontal: Sp.md,
  },
  copyBtnText: { fontSize: Fs.xs, color: Colors.primary, fontWeight: Fw.semibold, flex: 1 },
  // Résumé
  summaryTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Sp.md },
  bigCal:      { fontSize: Fs.xxxl, fontWeight: Fw.heavy, color: Colors.caloriesColor },
  bigCalLabel: { fontSize: Fs.xs, color: Colors.textSecondary },
  remaining:   { alignItems: 'flex-end' },
  remValue:    { fontSize: Fs.xl, fontWeight: Fw.bold },
  remLabel:    { fontSize: Fs.xs, color: Colors.textMuted },
  // Section repas
  mealSection: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  mealHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Sp.md },
  mealIcon:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mealLabel:   { flex: 1, fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text },
  mealCal:     { fontSize: Fs.sm, color: Colors.textSecondary },
  favBtn:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.yellow + '15' },
  addBtn:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyMeal:   { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: 10 },
  // Recettes
  recipesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '12', borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '30', paddingVertical: 8, paddingHorizontal: Sp.md },
  recipesBtnText: { fontSize: Fs.xs, color: Colors.primary, fontWeight: Fw.semibold },
});

// ─── Modal Recettes ───────────────────────────────────────────────────────────

function RecipesModal({ onClose, onAddRecipe }: {
  onClose: () => void;
  onAddRecipe: (recipe: Recipe) => void;
}) {
  const allRecipes = PREDEFINED_RECIPES;

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const totalCal  = item.ingredients.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
    const totalProt = item.ingredients.reduce((s, i) => s + i.proteinPer100g  * i.quantity / 100, 0);
    const totalCarb = item.ingredients.reduce((s, i) => s + i.carbsPer100g    * i.quantity / 100, 0);
    const totalFat  = item.ingredients.reduce((s, i) => s + i.fatPer100g      * i.quantity / 100, 0);
    const calPer = Math.round(totalCal / item.servings);
    const protPer = Math.round(totalProt / item.servings);
    const carbPer = Math.round(totalCarb / item.servings);
    const fatPer  = Math.round(totalFat  / item.servings);
    return (
      <View style={recipeStyles.card}>
        <View style={recipeStyles.row}>
          <Text style={recipeStyles.emoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={recipeStyles.name}>{item.name}</Text>
            <View style={recipeStyles.macroRow}>
              <Text style={recipeStyles.calText}>{calPer} kcal</Text>
              <Text style={recipeStyles.macroText}>P:{protPer}g  G:{carbPer}g  L:{fatPer}g</Text>
            </View>
            <Text style={recipeStyles.servings}>Pour {item.servings} portion{item.servings > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={recipeStyles.addBtn} onPress={() => onAddRecipe(item)}>
            <Text style={recipeStyles.addBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={recipeStyles.header}>
          <Text style={recipeStyles.title}>🥘 Recettes</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={allRecipes}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: Sp.md, gap: Sp.sm }}
          renderItem={renderRecipe}
        />
      </View>
    </Modal>
  );
}

const recipeStyles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  title:     { fontSize: Fs.lg, fontWeight: Fw.bold, color: Colors.text },
  card:      { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  row:       { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  emoji:     { fontSize: 32 },
  name:      { fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text, marginBottom: 3 },
  macroRow:  { flexDirection: 'row', gap: Sp.sm, alignItems: 'center', marginBottom: 2 },
  calText:   { fontSize: Fs.sm, fontWeight: Fw.bold, color: Colors.caloriesColor },
  macroText: { fontSize: Fs.xs, color: Colors.textSecondary },
  servings:  { fontSize: Fs.xs, color: Colors.textMuted },
  addBtn:    { backgroundColor: Colors.primary, borderRadius: R, paddingHorizontal: Sp.sm, paddingVertical: 6 },
  addBtnText:{ fontSize: Fs.xs, color: '#fff', fontWeight: Fw.bold },
});
