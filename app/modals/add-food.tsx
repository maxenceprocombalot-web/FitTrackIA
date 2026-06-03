import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppStore } from '../../store/useAppStore';
import { Meal, MealType, FoodItem, FavoriteMeal } from '../../types';
import { COMMON_FOODS } from '../../constants/foods';
import { searchFoods, searchByBarcode } from '../../services/openfoods';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';

type Tab = 'recent' | 'favorites' | 'common' | 'search' | 'scan' | 'manual';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

const TAB_META: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'recent',    label: 'Récents',   icon: 'time-outline' },
  { key: 'favorites', label: 'Favoris',   icon: 'star-outline' },
  { key: 'common',    label: 'Courants',  icon: 'list-outline' },
  { key: 'search',    label: 'Recherche', icon: 'search-outline' },
  { key: 'scan',      label: 'Scan',      icon: 'barcode-outline' },
  { key: 'manual',    label: 'Manuel',    icon: 'create-outline' },
];

export default function AddFoodModal() {
  const router     = useRouter();
  const params     = useLocalSearchParams();
  const store      = useAppStore();
  const mealType   = (params.mealType as MealType) ?? 'lunch';
  // Date cible : aujourd'hui par défaut, ou la date transmise depuis nutrition.tsx
  const targetDate = (params.targetDate as string) ?? storage.today();

  // Onglet par défaut : récents si disponibles, sinon courants
  const defaultTab: Tab = store.recentFoods.length > 0 ? 'recent' : 'common';
  const [tab,         setTab]         = useState<Tab>(defaultTab);
  const [quantity,    setQuantity]    = useState('');
  const [pending,     setPending]     = useState<FoodItem | null>(null);
  const [searchQ,     setSearchQ]     = useState('');
  const [searchRes,   setSearchRes]   = useState<FoodItem[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [scanned,     setScanned]     = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Champs saisie manuelle
  const [manualName, setManualName] = useState('');
  const [manualCal,  setManualCal]  = useState('');
  const [manualProt, setManualProt] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat,  setManualFat]  = useState('');
  const [manualQty,  setManualQty]  = useState('100');

  // ─── Sélection d'un aliment ────────────────────────────────────────────────

  const selectItem = (item: FoodItem) => {
    setPending({ ...item, quantity: item.quantity });
    setQuantity(String(item.quantity));
  };

  const confirmAdd = async () => {
    if (!pending) return;
    const qty = parseFloat(quantity);
    if (!qty || isNaN(qty) || qty <= 0) { Alert.alert('Erreur', 'Indique une quantité valide.'); return; }

    const finalItem: FoodItem = { ...pending, id: `${Date.now()}`, quantity: qty };

    // Mémoriser dans les aliments récents
    await store.pushRecentFood({ ...finalItem });

    // Trouver ou créer le repas du jour
    const todayMeals = store.meals.filter(m => m.date === targetDate && m.type === mealType);
    const existing   = todayMeals[0];

    const meal: Meal = existing
      ? { ...existing, items: [...existing.items, finalItem] }
      : { id: Date.now().toString(), date: targetDate, type: mealType, items: [finalItem] };

    await store.addMeal(meal);
    router.back();
  };

  // ─── Ajout d'un repas favori complet ──────────────────────────────────────

  const addFavoriteToMeal = useCallback(async (fav: FavoriteMeal) => {
    const todayMeals = store.meals.filter(m => m.date === targetDate && m.type === mealType);
    const existing   = todayMeals[0];

    const newItems = fav.items.map(item => ({
      ...item,
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }));

    const meal: Meal = existing
      ? { ...existing, items: [...existing.items, ...newItems] }
      : { id: Date.now().toString(), date: targetDate, type: mealType, items: newItems };

    await store.addMeal(meal);
    // Ajouter chaque aliment dans les récents
    for (const item of fav.items) {
      await store.pushRecentFood(item);
    }
    router.back();
  }, [store, mealType]);

  // ─── Suppression d'un favori ──────────────────────────────────────────────

  const handleDeleteFavorite = (fav: FavoriteMeal) => {
    Alert.alert(
      'Supprimer ce favori ?',
      `"${fav.name}" sera supprimé définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => store.deleteFavorite(fav.id) },
      ],
    );
  };

  // ─── Recherche OpenFoodFacts ───────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchRes([]);
    const results = await searchFoods(searchQ);
    setSearchRes(results);
    setSearching(false);
  }, [searchQ]);

  // ─── Scanner code-barres ──────────────────────────────────────────────────

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const food = await searchByBarcode(data);
    if (food) {
      selectItem(food);
      setTab('common');
    } else {
      Alert.alert('Produit non trouvé', `Code-barres : ${data}\nTente une recherche manuelle.`);
      setScanned(false);
    }
  }, [scanned]);

  // ─── Saisie manuelle ──────────────────────────────────────────────────────

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualCal) { Alert.alert('Erreur', 'Nom et calories requis.'); return; }
    const item: FoodItem = {
      id: Date.now().toString(),
      name: manualName.trim(),
      quantity: parseFloat(manualQty) || 100,
      caloriesPer100g: parseFloat(manualCal) || 0,
      proteinPer100g:  parseFloat(manualProt) || 0,
      carbsPer100g:    parseFloat(manualCarb) || 0,
      fatPer100g:      parseFloat(manualFat)  || 0,
    };
    selectItem(item);
  };

  // ─── Confirmation de quantité ─────────────────────────────────────────────

  if (pending) {
    const qty  = parseFloat(quantity) || 0;
    const cal  = Math.round(pending.caloriesPer100g * qty / 100);
    const prot = (pending.proteinPer100g  * qty / 100).toFixed(1);
    const carb = (pending.carbsPer100g    * qty / 100).toFixed(1);
    const fat  = (pending.fatPer100g      * qty / 100).toFixed(1);

    return (
      <View style={styles.container}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>{pending.name}</Text>
          {pending.brand && <Text style={styles.confirmBrand}>{pending.brand}</Text>}
          <View style={styles.qtyRow}>
            <TextInput
              style={styles.qtyInput}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
            />
            <Text style={styles.qtyUnit}>grammes</Text>
          </View>
          {/* Aperçu macros calculés */}
          <View style={styles.macroPreview}>
            <MacroPill label="Kcal"  value={cal}  color={Colors.caloriesColor} />
            <MacroPill label="Prot." value={prot} color={Colors.proteinColor} />
            <MacroPill label="Gluc." value={carb} color={Colors.carbsColor} />
            <MacroPill label="Lip."  value={fat}  color={Colors.fatColor} />
          </View>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPending(null)}>
              <Text style={styles.cancelText}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={confirmAdd}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Ajouter au {MEAL_LABELS[mealType]}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <Text style={styles.mealTypeLabel}>{MEAL_LABELS[mealType]}</Text>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {TAB_META.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons
              name={t.icon}
              size={14}
              color={tab === t.key ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.label}
              {t.key === 'recent'    && store.recentFoods.length > 0 ? ` (${store.recentFoods.length})` : ''}
              {t.key === 'favorites' && store.favorites.length > 0   ? ` (${store.favorites.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Onglet Récents ───────────────────────────────────────────────── */}
      {tab === 'recent' && (
        <FlatList
          data={store.recentFoods}
          keyExtractor={(item, idx) => `${item.name}_${idx}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Aucun aliment récent</Text>
              <Text style={styles.emptySubText}>Les aliments que tu ajoutes apparaissent ici</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.foodRow} onPress={() => selectItem(item)}>
              <View style={[styles.recentDot, { backgroundColor: Colors.primary + '30' }]}>
                <Ionicons name="time-outline" size={14} color={Colors.primary} />
              </View>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodMacros}>
                  {item.caloriesPer100g}kcal • P:{item.proteinPer100g}g • G:{item.carbsPer100g}g /100g
                </Text>
              </View>
              <Text style={styles.foodDef}>{item.quantity}g</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Onglet Favoris ───────────────────────────────────────────────── */}
      {tab === 'favorites' && (
        <FlatList
          data={store.favorites}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Aucun repas favori</Text>
              <Text style={styles.emptySubText}>Sauvegarde un repas depuis l'onglet Nutrition avec ⭐</Text>
            </View>
          }
          renderItem={({ item: fav }) => {
            const totalCal = Math.round(
              fav.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0)
            );
            return (
              <TouchableOpacity style={styles.favRow} onPress={() => addFavoriteToMeal(fav)}>
                <View style={styles.favIcon}>
                  <Ionicons name="star" size={18} color={Colors.yellow} />
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{fav.name}</Text>
                  <Text style={styles.foodMacros}>
                    {fav.items.length} aliment{fav.items.length > 1 ? 's' : ''} • {totalCal} kcal
                  </Text>
                  <Text style={styles.favItems} numberOfLines={1}>
                    {fav.items.map(i => i.name).join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.favDeleteBtn}
                  onPress={() => handleDeleteFavorite(fav)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.red} />
                </TouchableOpacity>
                <Ionicons name="add-circle-outline" size={22} color={Colors.green} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Onglet Courants ──────────────────────────────────────────────── */}
      {tab === 'common' && (
        <FlatList
          data={COMMON_FOODS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.foodRow} onPress={() => selectItem({
              id: item.id, name: item.name, quantity: item.defaultPortion,
              caloriesPer100g: item.caloriesPer100g, proteinPer100g: item.proteinPer100g,
              carbsPer100g: item.carbsPer100g, fatPer100g: item.fatPer100g,
            })}>
              <Text style={styles.foodEmoji}>{item.emoji}</Text>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodMacros}>
                  {item.caloriesPer100g}kcal • P:{item.proteinPer100g}g • G:{item.carbsPer100g}g • L:{item.fatPer100g}g /100g
                </Text>
              </View>
              <Text style={styles.foodDef}>{item.defaultPortion}g</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Onglet Recherche ─────────────────────────────────────────────── */}
      {tab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQ}
              onChangeText={setSearchQ}
              placeholder="Poulet, riz, avocat…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
              {searching ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>Résultats d'OpenFoodFacts</Text>
          <FlatList
            data={searchRes}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              !searching ? <Text style={styles.emptyText}>Lance une recherche ci-dessus</Text> : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.foodRow} onPress={() => selectItem(item)}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{item.name}</Text>
                  {item.brand && <Text style={styles.foodBrand}>{item.brand}</Text>}
                  <Text style={styles.foodMacros}>
                    {item.caloriesPer100g}kcal • P:{item.proteinPer100g}g • G:{item.carbsPer100g}g • L:{item.fatPer100g}g /100g
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── Onglet Scan ──────────────────────────────────────────────────── */}
      {tab === 'scan' && (
        <View style={styles.scanContainer}>
          {!permission?.granted ? (
            <View style={styles.permContainer}>
              <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.permText}>Autorise la caméra pour scanner les codes-barres</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Autoriser</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>Place le code-barres dans le cadre</Text>
              </View>
              {scanned && (
                <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
                  <Text style={styles.rescanBtnText}>Scanner à nouveau</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* ── Onglet Manuel ────────────────────────────────────────────────── */}
      {tab === 'manual' && (
        <ScrollView contentContainerStyle={styles.manualContent} keyboardShouldPersistTaps="handled">
          <ManualField label="Nom de l'aliment*" value={manualName} onChange={setManualName} placeholder="Riz basmati cuit" />
          <View style={styles.manualRow}>
            <View style={{ flex: 1 }}><ManualField label="Calories/100g*" value={manualCal} onChange={setManualCal} placeholder="130" numeric /></View>
            <View style={{ flex: 1 }}><ManualField label="Portion (g)"    value={manualQty} onChange={setManualQty} placeholder="100" numeric decimal /></View>
          </View>
          <View style={styles.manualRow}>
            <View style={{ flex: 1 }}><ManualField label="Protéines/100g" value={manualProt} onChange={setManualProt} placeholder="2.7" numeric decimal /></View>
            <View style={{ flex: 1 }}><ManualField label="Glucides/100g"  value={manualCarb} onChange={setManualCarb} placeholder="28"  numeric decimal /></View>
            <View style={{ flex: 1 }}><ManualField label="Lipides/100g"   value={manualFat}  onChange={setManualFat}  placeholder="0.3" numeric decimal /></View>
          </View>
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualAdd}>
            <Text style={styles.manualBtnText}>Valider et choisir la portion</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function MacroPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[mpStyles.pill, { backgroundColor: color + '18' }]}>
      <Text style={[mpStyles.value, { color }]}>{value}</Text>
      <Text style={mpStyles.label}>{label}</Text>
    </View>
  );
}
const mpStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', borderRadius: R, paddingVertical: 8 },
  value: { fontSize: Fs.md, fontWeight: Fw.bold },
  label: { fontSize: Fs.xs, color: Colors.textMuted },
});

function ManualField({ label, value, onChange, placeholder, numeric, decimal }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; numeric?: boolean; decimal?: boolean;
}) {
  return (
    <View style={mfStyles.container}>
      <Text style={mfStyles.label}>{label}</Text>
      <TextInput
        style={mfStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={decimal ? 'decimal-pad' : numeric ? 'number-pad' : 'default'}
      />
    </View>
  );
}
const mfStyles = StyleSheet.create({
  container: { padding: 4 },
  label: { fontSize: Fs.xs, color: Colors.textSecondary, marginBottom: 3 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.sm, paddingVertical: 9, fontSize: Fs.sm, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  mealTypeLabel: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.textSecondary, paddingHorizontal: Sp.md, paddingTop: Sp.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Onglets
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Sp.md, paddingVertical: 8, gap: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Sp.sm, paddingVertical: 7, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  tabBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  tabBtnText: { fontSize: Fs.xs, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.primary, fontWeight: Fw.semibold },
  // Listes
  listContent: { padding: Sp.md, paddingBottom: 60 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  foodEmoji: { fontSize: 22 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: Fs.md, color: Colors.text, fontWeight: Fw.medium },
  foodBrand: { fontSize: Fs.xs, color: Colors.primary, marginTop: 1 },
  foodMacros: { fontSize: Fs.xs, color: Colors.textSecondary, marginTop: 2 },
  foodDef: { fontSize: Fs.xs, color: Colors.textMuted },
  // Récents
  recentDot: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // Favoris
  favRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  favIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.yellow + '18', alignItems: 'center', justifyContent: 'center' },
  favItems: { fontSize: Fs.xs, color: Colors.textMuted, marginTop: 2 },
  favDeleteBtn: { padding: 4 },
  // État vide
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyText: { fontSize: Fs.md, color: Colors.textSecondary, fontWeight: Fw.medium },
  emptySubText: { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Sp.lg },
  // Recherche
  searchContainer: { flex: 1, padding: Sp.md },
  searchRow: { flexDirection: 'row', gap: Sp.sm, marginBottom: 6 },
  searchInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: R, paddingHorizontal: Sp.md, alignItems: 'center', justifyContent: 'center', width: 48 },
  searchHint: { fontSize: Fs.xs, color: Colors.textMuted, marginBottom: Sp.sm },
  // Scan
  scanContainer: { flex: 1 },
  camera: { flex: 1 },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 140, borderWidth: 2, borderColor: Colors.primary, borderRadius: R },
  scanHint: { marginTop: 20, color: Colors.text, fontSize: Fs.sm, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Sp.md, paddingVertical: 6, borderRadius: R },
  rescanBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: Colors.primary, borderRadius: R, paddingHorizontal: 24, paddingVertical: 12 },
  rescanBtnText: { color: '#fff', fontWeight: Fw.semibold },
  permContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Sp.md, padding: Sp.xl },
  permText: { fontSize: Fs.sm, color: Colors.textSecondary, textAlign: 'center' },
  permBtn: { backgroundColor: Colors.primary, borderRadius: R, paddingHorizontal: Sp.xl, paddingVertical: Sp.md },
  permBtnText: { color: '#fff', fontWeight: Fw.bold },
  // Manuel
  manualContent: { padding: Sp.md, paddingBottom: 80 },
  manualRow: { flexDirection: 'row', marginHorizontal: -4 },
  manualBtn: { backgroundColor: Colors.green, borderRadius: R, padding: Sp.md, alignItems: 'center', marginTop: Sp.md },
  manualBtnText: { color: '#fff', fontWeight: Fw.bold },
  // Confirmation quantité
  confirmCard: { flex: 1, padding: Sp.lg, justifyContent: 'center', gap: Sp.md },
  confirmTitle: { fontSize: Fs.xl, fontWeight: Fw.bold, color: Colors.text },
  confirmBrand: { fontSize: Fs.sm, color: Colors.textSecondary, marginTop: -Sp.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Sp.md },
  qtyInput: { flex: 1, paddingVertical: 16, fontSize: Fs.xxxl, fontWeight: Fw.heavy, color: Colors.text, textAlign: 'center' },
  qtyUnit: { fontSize: Fs.md, color: Colors.textMuted },
  macroPreview: { flexDirection: 'row', gap: Sp.xs },
  confirmBtns: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.md },
  cancelBtn: { paddingHorizontal: Sp.lg, paddingVertical: Sp.md, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontWeight: Fw.medium },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.green, borderRadius: R, paddingVertical: Sp.md },
  addBtnText: { color: '#fff', fontWeight: Fw.bold, fontSize: Fs.md },
});
