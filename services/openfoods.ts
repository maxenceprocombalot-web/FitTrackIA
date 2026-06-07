import { FoodItem } from '../types';

// ─── Types OpenFoodFacts ───────────────────────────────────────────────────────

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

interface OFFSearchResponse {
  products?: OFFProduct[];
}

// ─── Conversion produit → FoodItem ────────────────────────────────────────────

function offProductToFoodItem(p: OFFProduct, quantity = 100): FoodItem | null {
  const n = p.nutriments;
  if (!n) return null;

  const name = p.product_name?.trim();
  if (!name) return null;

  const cal  = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0;
  if (!cal || cal <= 0) return null;

  const prot = n.proteins_100g ?? 0;
  const carb = n.carbohydrates_100g ?? 0;
  const fat  = n.fat_100g ?? 0;

  return {
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    brand: p.brands?.split(',')[0].trim(),
    quantity,
    caloriesPer100g: Math.round(cal),
    proteinPer100g:  Math.round(prot * 10) / 10,
    carbsPer100g:    Math.round(carb * 10) / 10,
    fatPer100g:      Math.round(fat  * 10) / 10,
  };
}

// ─── Recherche par texte ───────────────────────────────────────────────────────

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&lc=fr&cc=fr`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as OFFSearchResponse;
    return (data.products ?? [])
      .map(p => offProductToFoodItem(p))
      .filter((f): f is FoodItem => f !== null)
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ─── Recherche par code-barres ─────────────────────────────────────────────────

export async function searchByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json() as { product?: OFFProduct; status?: number };
    if (data.status !== 1 || !data.product) return null;
    return offProductToFoodItem(data.product);
  } catch {
    return null;
  }
}
