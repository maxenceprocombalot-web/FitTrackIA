import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, FlatList, SectionList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppStore } from '../../store/useAppStore';
import { Meal, MealType, FoodItem, FavoriteMeal } from '../../types';
import { COMMON_FOODS } from '../../constants/foods';
import { CIQUAL_FOODS } from '../../constants/ciqual';
import { normSearch } from '../../constants/foods';
import { estimateMealItems } from '../../services/openai';
import { usePremiumGate } from '../../hooks/usePremiumGate';
import { searchFoods, searchByBarcode } from '../../services/openfoods';
import { Colors, R, Sp, Fs, Fw, Fonts, tapSlop } from '../../constants/theme';
import Button from '../../components/ui/Button';
import * as storage from '../../services/storage';

// Écran unifié : plus d'onglets de source — une recherche unique + scan/manuel
type Tab = 'browse' | 'scan' | 'manual';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation',
};

// Conversion module-level (COMMON_FOODS est une constante, pas besoin de recalculer)
const COMMON_AS_FOOD_ITEMS: FoodItem[] = COMMON_FOODS.map(f => ({
  id: f.id,
  name: f.name,
  quantity: f.defaultPortion,
  caloriesPer100g: f.caloriesPer100g,
  proteinPer100g: f.proteinPer100g,
  carbsPer100g: f.carbsPer100g,
  fatPer100g: f.fatPer100g,
}));


// Index de recherche pré-normalisé (construit une seule fois)
const CIQUAL_INDEX = CIQUAL_FOODS.map(f => ({ f, n: normSearch(f.name) }));

/** Recherche insensible aux accents, préfixes classés en premier. */
function searchCiqual(q: string, limit: number) {
  const hits = CIQUAL_INDEX.filter(e => e.n.includes(q));
  hits.sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)));
  return hits.slice(0, limit).map(e => e.f);
}

export default function AddFoodModal() {
  const router     = useRouter();
  const params     = useLocalSearchParams();
  const store      = useAppStore();
  const mealType   = (params.mealType as MealType) ?? 'lunch';
  // Date cible : aujourd'hui par défaut, ou la date transmise depuis nutrition.tsx
  const targetDate = (params.targetDate as string) ?? storage.today();

  // Mode par défaut : browse (recherche + récents + favoris + courants).
  // Compat anciens liens : startTab scan/manual respectés, le reste → browse.
  const startTabParam = params.startTab as string | undefined;
  const defaultTab: Tab = startTabParam === 'scan' || startTabParam === 'manual' ? startTabParam : 'browse';
  const [tab,         setTab]         = useState<Tab>(defaultTab);
  const [quantity,    setQuantity]    = useState('');
  const [pending,     setPending]     = useState<FoodItem | null>(null);
  const [searchQ,     setSearchQ]     = useState('');
  const [searchRes,   setSearchRes]   = useState<FoodItem[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [hasSearched,   setHasSearched]   = useState(false);
  const [localResults,  setLocalResults]  = useState<FoodItem[]>([]);
  const [resultSource,  setResultSource]  = useState<'ciqual' | 'off' | 'local' | 'ai' | ''>('');
  const [scanned,     setScanned]     = useState(false);
  const { requirePremium } = usePremiumGate();

  // Fallback IA quand ni CIQUAL ni OpenFoodFacts ne trouvent rien
  const handleAiEstimate = useCallback(async () => {
    if (!searchQ.trim() || !requirePremium()) return;
    setSearching(true);
    try {
      const est = await estimateMealItems(searchQ.trim());
      setSearchRes(est.map((it, i) => ({
        id: `ai_${Date.now()}_${i}`, name: `🍽️ ${it.name}`, quantity: it.portionG,
        caloriesPer100g: Math.round(it.caloriesPer100g), proteinPer100g: it.proteinPer100g,
        carbsPer100g: it.carbsPer100g, fatPer100g: it.fatPer100g,
      })));
      setResultSource('ai');
    } catch (e: any) {
      Alert.alert('Estimation impossible', e?.message ?? 'Réessaie plus tard.');
    }
    setSearching(false);
  }, [searchQ, requirePremium]);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending({ ...item, quantity: item.quantity });
    setQuantity(String(item.quantity));
  };

  const confirmAdd = async () => {
    if (!pending) return;
    const qty = parseFloat(quantity);
    if (!qty || isNaN(qty) || qty <= 0) { Alert.alert('Erreur', 'Indique une quantité valide.'); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Résultats instantanés pendant la frappe (CIQUAL + courants, local)
  const instantResults = React.useMemo<FoodItem[]>(() => {
    const q = normSearch(searchQ.trim());
    if (q.length < 2) return [];
    const ciqual = searchCiqual(q, 15)
      .map<FoodItem>(f => ({ id: f.id, name: f.name, quantity: f.defaultPortion, caloriesPer100g: f.caloriesPer100g, proteinPer100g: f.proteinPer100g, carbsPer100g: f.carbsPer100g, fatPer100g: f.fatPer100g }));
    const commons = COMMON_AS_FOOD_ITEMS.filter(f => normSearch(f.name).includes(q) && !ciqual.some(c => c.name === f.name));
    return [...ciqual, ...commons].slice(0, 20);
  }, [searchQ]);

  const handleSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    setSearchRes([]);
    setLocalResults([]);
    setHasSearched(false);
    setResultSource('');

    const q = normSearch(searchQ.trim());

    // 1. Chercher dans CIQUAL (instantané, local)
    const ciqualHits = searchCiqual(q, 20)
      .map<FoodItem>(f => ({
        id: f.id,
        name: f.name,
        quantity: f.defaultPortion,
        caloriesPer100g: f.caloriesPer100g,
        proteinPer100g: f.proteinPer100g,
        carbsPer100g: f.carbsPer100g,
        fatPer100g: f.fatPer100g,
      }));

    if (ciqualHits.length > 0) {
      setSearchRes(ciqualHits);
      setResultSource('ciqual');
      setSearching(false);
      setHasSearched(true);
      return;
    }

    // 2. Pas de résultat CIQUAL → OpenFoodFacts
    const offResults = await searchFoods(searchQ);
    if (offResults.length > 0) {
      setSearchRes(offResults);
      setResultSource('off');
    } else {
      // 3. Fallback : aliments courants correspondants
      const fallback = COMMON_AS_FOOD_ITEMS.filter(f => normSearch(f.name).includes(q));
      setLocalResults(fallback);
      setResultSource('local');
    }

    setSearching(false);
    setHasSearched(true);
  }, [searchQ]);

  // ─── Scanner code-barres ──────────────────────────────────────────────────

  const handleBarcode = useCallback(async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const food = await searchByBarcode(data);
    if (food) {
      selectItem(food);
      setTab('browse');
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
            <TouchableOpacity accessibilityRole="button" style={styles.cancelBtn} onPress={() => setPending(null)}>
              <Text style={styles.cancelText}>Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.addBtn} onPress={confirmAdd}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.onPrimary} />
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

      {/* ── Recherche unique + accès scan/manuel ─────────────────────────── */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQ}
          onChangeText={t => { setSearchQ(t); if (tab !== 'browse') setTab('browse'); setHasSearched(false); setSearchRes([]); setLocalResults([]); }}
          placeholder="Rechercher un aliment…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Rechercher un aliment"
        />
        <TouchableOpacity
          style={[styles.modeBtn, tab === 'scan' && styles.modeBtnActive]}
          onPress={() => setTab(tab === 'scan' ? 'browse' : 'scan')}
          accessibilityRole="button" accessibilityLabel="Scanner un code-barres" hitSlop={tapSlop}
        >
          <Ionicons name="barcode-outline" size={20} color={tab === 'scan' ? Colors.onPrimary : Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, tab === 'manual' && styles.modeBtnActive]}
          onPress={() => setTab(tab === 'manual' ? 'browse' : 'manual')}
          accessibilityRole="button" accessibilityLabel="Saisie manuelle" hitSlop={tapSlop}
        >
          <Ionicons name="create-outline" size={20} color={tab === 'manual' ? Colors.onPrimary : Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Vue unifiée : résultats de recherche OU récents/favoris/courants ── */}
      {tab === 'browse' && (
        searchQ.trim().length >= 2 ? (
          /* Résultats : instantanés (local) puis OpenFoodFacts après ↵ */
          searching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Recherche en cours…</Text>
            </View>
          ) : (
            <FlatList
              data={hasSearched ? (searchRes.length > 0 ? searchRes : localResults) : instantResults}
              keyExtractor={(item, idx) => `${item.id}_${idx}`}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                hasSearched && resultSource === 'off'
                  ? <Text style={styles.searchHint}>Résultats OpenFoodFacts</Text>
                  : hasSearched && resultSource === 'ai'
                    ? <Text style={styles.searchHint}>✨ Estimation IA — vérifie les portions et valeurs</Text>
                    : !hasSearched && instantResults.length > 0
                      ? <Text style={styles.searchHint}>Appuie sur ↵ pour chercher aussi en ligne</Text>
                      : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>{hasSearched ? 'Aucun résultat' : 'Continue à taper ou appuie sur ↵'}</Text>
                  {hasSearched ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.aiEstimateBtn}
                      onPress={handleAiEstimate}
                    >
                      <Ionicons name="sparkles" size={16} color={Colors.primary} />
                      <Text style={styles.aiEstimateBtnText}>Estimer « {searchQ.trim().slice(0, 24)} » avec l'IA</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={styles.emptySubText}>Sinon, ajoute l'aliment manuellement (✏️ en haut)</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity accessibilityRole="button" style={styles.foodRow} onPress={() => selectItem(item)}>
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
          )
        ) : (
          /* Sans recherche : tout au même endroit — récents, favoris, courants */
          <SectionList
            sections={[
              ...(store.recentFoods.length > 0 ? [{ key: 'recent', title: '🕐 Récents', data: store.recentFoods as unknown[] }] : []),
              ...(store.favorites.length > 0 ? [{ key: 'fav', title: '⭐ Repas favoris', data: store.favorites as unknown[] }] : []),
              { key: 'common', title: '🍽 Aliments courants', data: COMMON_FOODS as unknown[] },
            ]}
            keyExtractor={(_, idx) => String(idx)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionTitle}>{(section as { title: string }).title}</Text>
            )}
            renderItem={({ item, section }) => {
              if ((section as { key: string }).key === 'fav') {
                const fav = item as FavoriteMeal;
                const totalCal = Math.round(fav.items.reduce((sum, i) => sum + i.caloriesPer100g * i.quantity / 100, 0));
                return (
                  <TouchableOpacity accessibilityRole="button" style={styles.favRow} onPress={() => addFavoriteToMeal(fav)}>
                    <View style={styles.favIcon}>
                      <Ionicons name="star" size={18} color={Colors.yellow} />
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{fav.name}</Text>
                      <Text style={styles.foodMacros}>{fav.items.length} aliment{fav.items.length > 1 ? 's' : ''} • {totalCal} kcal</Text>
                      <Text style={styles.favItems} numberOfLines={1}>{fav.items.map(i => i.name).join(', ')}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.favDeleteBtn}
                      onPress={() => handleDeleteFavorite(fav)}
                      accessibilityRole="button" accessibilityLabel="Supprimer ce favori"
                      hitSlop={tapSlop}
                    >
                      <Ionicons name="trash-outline" size={15} color={Colors.red} />
                    </TouchableOpacity>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.green} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                );
              }
              if ((section as { key: string }).key === 'recent') {
                const food = item as FoodItem;
                return (
                  <TouchableOpacity accessibilityRole="button" style={styles.foodRow} onPress={() => selectItem(food)}>
                    <View style={[styles.recentDot, { backgroundColor: Colors.primary + '30' }]}>
                      <Ionicons name="time-outline" size={14} color={Colors.primary} />
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodMacros}>{food.caloriesPer100g}kcal • P:{food.proteinPer100g}g • G:{food.carbsPer100g}g /100g</Text>
                    </View>
                    <Text style={styles.foodDef}>{food.quantity}g</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              }
              const cf = item as typeof COMMON_FOODS[number];
              return (
                <TouchableOpacity accessibilityRole="button" style={styles.foodRow} onPress={() => selectItem({
                  id: cf.id, name: cf.name, quantity: cf.defaultPortion,
                  caloriesPer100g: cf.caloriesPer100g, proteinPer100g: cf.proteinPer100g,
                  carbsPer100g: cf.carbsPer100g, fatPer100g: cf.fatPer100g,
                })}>
                  <Text style={styles.foodEmoji}>{cf.emoji}</Text>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{cf.name}</Text>
                    <Text style={styles.foodMacros}>{cf.caloriesPer100g}kcal • P:{cf.proteinPer100g}g • G:{cf.carbsPer100g}g • L:{cf.fatPer100g}g /100g</Text>
                  </View>
                  <Text style={styles.foodDef}>{cf.defaultPortion}g</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )
      )}

      {/* ── Onglet Scan ──────────────────────────────────────────────────── */}
      {tab === 'scan' && (
        <View style={styles.scanContainer}>
          {!permission?.granted ? (
            <View style={styles.permContainer}>
              <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.permText}>Autorise la caméra pour scanner les codes-barres</Text>
              <Button title="Autoriser" onPress={requestPermission} fullWidth={false} />
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
              />
              {/* Cadre de visée de la maquette 1e : quatre équerres dorées et
                  une ligne de balayage, plutôt qu'un rectangle plein. */}
              <View style={styles.scanOverlay} pointerEvents="none">
                <View style={styles.scanFrame}>
                  <View style={[styles.scanCorner, styles.scanCornerTL]} />
                  <View style={[styles.scanCorner, styles.scanCornerTR]} />
                  <View style={[styles.scanCorner, styles.scanCornerBL]} />
                  <View style={[styles.scanCorner, styles.scanCornerBR]} />
                  <View style={styles.scanLine} />
                </View>
                <Text style={styles.scanHint}>Alignez le code-barres dans le cadre</Text>
              </View>
              {scanned && (
                <Button
                  title="Scanner à nouveau"
                  onPress={() => setScanned(false)}
                  fullWidth={false}
                  style={{ position: 'absolute', bottom: 40, alignSelf: 'center' }}
                />
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
          <TouchableOpacity accessibilityRole="button" style={styles.manualBtn} onPress={handleManualAdd}>
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
  value: { fontSize: Fs.md, fontFamily: Fonts.bold },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
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
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginBottom: 3 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.sm, paddingVertical: 9, fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  mealTypeLabel: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.textSecondary, paddingHorizontal: Sp.md, paddingTop: Sp.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Onglets
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { paddingHorizontal: Sp.md, paddingVertical: 8, gap: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Sp.sm, paddingVertical: 7, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  tabBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  tabBtnText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.primary, fontFamily: Fonts.semibold },
  // Listes
  listContent: { padding: Sp.md, paddingBottom: 60 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  foodEmoji: { fontSize: 22 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: Fs.md, color: Colors.text, fontFamily: Fonts.medium },
  foodBrand: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.primary, marginTop: 1 },
  foodMacros: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  foodDef: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  // Récents
  recentDot: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // Favoris
  favRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  favIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.yellow + '18', alignItems: 'center', justifyContent: 'center' },
  favItems: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  favDeleteBtn: { padding: 4 },
  // État vide
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyText: { fontSize: Fs.md, color: Colors.textSecondary, fontFamily: Fonts.medium },
  aiEstimateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.primary + '50', backgroundColor: Colors.primary + '14', borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, marginTop: Sp.sm },
  aiEstimateBtnText: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.primary },
  emptySubText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Sp.lg },
  // Recherche
  searchContainer: { flex: 1, padding: Sp.md },
  searchRow: { flexDirection: 'row', gap: Sp.sm, marginBottom: 6, marginHorizontal: Sp.md },
  modeBtn: { width: 44, height: 44, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sectionTitle: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Sp.md, marginBottom: 6 },
  searchInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  searchHint: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.sm },
  searchHintFallback: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.yellow, marginBottom: Sp.sm },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: Sp.sm },
  loadingText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  // Scan
  scanContainer: { flex: 1 },
  camera: { flex: 1 },
  scanOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame:  { width: 250, height: 170 },
  scanCorner: { position: 'absolute', width: 34, height: 34, borderColor: Colors.primary },
  scanCornerTL: { top: 0, left: 0,  borderTopWidth: 3, borderLeftWidth: 3,  borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0,  borderBottomWidth: 3, borderLeftWidth: 3,  borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanLine: {
    position: 'absolute', top: '50%', left: 14, right: 14, height: 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
  scanHint: { marginTop: 20, color: 'rgba(255,255,255,0.75)', fontSize: Fs.sm, fontFamily: Fonts.regular, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Sp.md, paddingVertical: 6, borderRadius: R },
  permContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Sp.md, padding: Sp.xl },
  permText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center' },
  // Manuel
  manualContent: { padding: Sp.md, paddingBottom: 80 },
  manualRow: { flexDirection: 'row', marginHorizontal: -4 },
  manualBtn: { backgroundColor: Colors.green, borderRadius: R, padding: Sp.md, alignItems: 'center', marginTop: Sp.md },
  manualBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bold },
  // Confirmation quantité
  confirmCard: { flex: 1, padding: Sp.lg, justifyContent: 'center', gap: Sp.md },
  confirmTitle: { fontSize: Fs.xl, fontFamily: Fonts.bold, color: Colors.text },
  confirmBrand: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: -Sp.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Sp.md },
  qtyInput: { flex: 1, paddingVertical: 16, fontSize: Fs.xxxl, fontFamily: Fonts.condensedHeavy, color: Colors.text, textAlign: 'center' },
  qtyUnit: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textMuted },
  macroPreview: { flexDirection: 'row', gap: Sp.xs },
  confirmBtns: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.md },
  cancelBtn: { paddingHorizontal: Sp.lg, paddingVertical: Sp.md, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.textSecondary, fontFamily: Fonts.medium },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.green, borderRadius: R, paddingVertical: Sp.md },
  addBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bold, fontSize: Fs.md },
});
