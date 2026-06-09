import { Recipe } from '../types';

export const PREDEFINED_RECIPES: Recipe[] = [
  { id: 'r01', name: 'Omelette protéinée', emoji: '🍳', servings: 1, isPredefined: true, ingredients: [
    { name: 'Œuf entier', quantity: 120, caloriesPer100g: 140, proteinPer100g: 12.7, carbsPer100g: 0.3, fatPer100g: 9.8 },
    { name: 'Blanc d\'œuf', quantity: 100, caloriesPer100g: 47, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2 },
    { name: 'Emmental', quantity: 30, caloriesPer100g: 380, proteinPer100g: 28, carbsPer100g: 1, fatPer100g: 30 },
  ]},
  { id: 'r02', name: 'Riz poulet légumes', emoji: '🍚', servings: 1, isPredefined: true, ingredients: [
    { name: 'Riz blanc cuit', quantity: 200, caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
    { name: 'Poulet rôti', quantity: 150, caloriesPer100g: 190, proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 9 },
    { name: 'Brocoli', quantity: 100, caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4 },
  ]},
  { id: 'r03', name: 'Pancakes protéinés', emoji: '🥞', servings: 2, isPredefined: true, ingredients: [
    { name: 'Flocons d\'avoine', quantity: 60, caloriesPer100g: 371, proteinPer100g: 13, carbsPer100g: 67, fatPer100g: 7 },
    { name: 'Œuf entier', quantity: 120, caloriesPer100g: 140, proteinPer100g: 12.7, carbsPer100g: 0.3, fatPer100g: 9.8 },
    { name: 'Whey protéine', quantity: 30, caloriesPer100g: 380, proteinPer100g: 75, carbsPer100g: 8, fatPer100g: 5 },
    { name: 'Lait entier', quantity: 100, caloriesPer100g: 65, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.7 },
  ]},
  { id: 'r04', name: 'Bowl quinoa', emoji: '🥣', servings: 1, isPredefined: true, ingredients: [
    { name: 'Quinoa cuit', quantity: 150, caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 22, fatPer100g: 1.9 },
    { name: 'Poulet rôti', quantity: 100, caloriesPer100g: 190, proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 9 },
    { name: 'Avocat', quantity: 80, caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15 },
    { name: 'Tomate', quantity: 100, caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  ]},
  { id: 'r05', name: 'Smoothie protéiné', emoji: '🥤', servings: 1, isPredefined: true, ingredients: [
    { name: 'Lait entier', quantity: 200, caloriesPer100g: 65, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.7 },
    { name: 'Whey protéine', quantity: 30, caloriesPer100g: 380, proteinPer100g: 75, carbsPer100g: 8, fatPer100g: 5 },
    { name: 'Banane', quantity: 120, caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  ]},
  { id: 'r06', name: 'Salade thon', emoji: '🥗', servings: 1, isPredefined: true, ingredients: [
    { name: 'Thon en boîte', quantity: 150, caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1 },
    { name: 'Tomate', quantity: 150, caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
    { name: 'Oeuf, dur', quantity: 60, caloriesPer100g: 134, proteinPer100g: 13.5, carbsPer100g: 0.5, fatPer100g: 8.6 },
  ]},
  { id: 'r07', name: 'Pâtes bolognaise légère', emoji: '🍝', servings: 2, isPredefined: true, ingredients: [
    { name: 'Pâtes cuites', quantity: 200, caloriesPer100g: 158, proteinPer100g: 5.8, carbsPer100g: 30, fatPer100g: 0.9 },
    { name: 'Bœuf haché 5%', quantity: 150, caloriesPer100g: 137, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 5.7 },
    { name: 'Tomate', quantity: 150, caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  ]},
  { id: 'r08', name: 'Yaourt granola fruits', emoji: '🫙', servings: 1, isPredefined: true, ingredients: [
    { name: 'Yaourt nature', quantity: 150, caloriesPer100g: 61, proteinPer100g: 3.5, carbsPer100g: 4.7, fatPer100g: 3.3 },
    { name: 'Flocons d\'avoine', quantity: 40, caloriesPer100g: 371, proteinPer100g: 13, carbsPer100g: 67, fatPer100g: 7 },
    { name: 'Fraises', quantity: 100, caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3 },
  ]},
  { id: 'r09', name: 'Wrap poulet', emoji: '🌯', servings: 1, isPredefined: true, ingredients: [
    { name: 'Pain de mie', quantity: 60, caloriesPer100g: 270, proteinPer100g: 8.5, carbsPer100g: 49, fatPer100g: 3.5 },
    { name: 'Poulet rôti', quantity: 120, caloriesPer100g: 190, proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 9 },
    { name: 'Tomate', quantity: 60, caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  ]},
  { id: 'r10', name: 'Porridge avoine', emoji: '🌾', servings: 1, isPredefined: true, ingredients: [
    { name: 'Flocons d\'avoine', quantity: 60, caloriesPer100g: 371, proteinPer100g: 13, carbsPer100g: 67, fatPer100g: 7 },
    { name: 'Lait entier', quantity: 200, caloriesPer100g: 65, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.7 },
    { name: 'Banane', quantity: 100, caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  ]},
];
