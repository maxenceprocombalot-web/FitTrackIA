// 30 aliments courants avec valeurs nutritionnelles pour 100g

export interface FoodTemplate {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultPortion: number; // grammes par défaut
  emoji: string;
}

export const COMMON_FOODS: FoodTemplate[] = [
  // Protéines animales
  { id: 'f01', name: 'Poulet grillé',         caloriesPer100g: 165, proteinPer100g: 31,   carbsPer100g: 0,    fatPer100g: 3.6,  defaultPortion: 150, emoji: '🍗' },
  { id: 'f02', name: 'Saumon',                caloriesPer100g: 208, proteinPer100g: 20,   carbsPer100g: 0,    fatPer100g: 13,   defaultPortion: 150, emoji: '🐟' },
  { id: 'f03', name: 'Thon en boîte',         caloriesPer100g: 116, proteinPer100g: 26,   carbsPer100g: 0,    fatPer100g: 1,    defaultPortion: 100, emoji: '🐠' },
  { id: 'f04', name: 'Steak de bœuf',         caloriesPer100g: 271, proteinPer100g: 26,   carbsPer100g: 0,    fatPer100g: 18,   defaultPortion: 150, emoji: '🥩' },
  { id: 'f05', name: 'Bœuf haché 5%',         caloriesPer100g: 137, proteinPer100g: 21,   carbsPer100g: 0,    fatPer100g: 5.7,  defaultPortion: 150, emoji: '🍔' },
  { id: 'f06', name: 'Crevettes',             caloriesPer100g: 99,  proteinPer100g: 18,   carbsPer100g: 1,    fatPer100g: 2.2,  defaultPortion: 100, emoji: '🦐' },
  { id: 'f07', name: 'Œuf entier',            caloriesPer100g: 155, proteinPer100g: 13,   carbsPer100g: 1.1,  fatPer100g: 11,   defaultPortion: 60,  emoji: '🥚' },

  // Produits laitiers
  { id: 'f08', name: 'Fromage blanc 0%',      caloriesPer100g: 51,  proteinPer100g: 8,    carbsPer100g: 4,    fatPer100g: 0.3,  defaultPortion: 150, emoji: '🥛' },
  { id: 'f09', name: 'Yaourt nature',         caloriesPer100g: 61,  proteinPer100g: 3.5,  carbsPer100g: 4.7,  fatPer100g: 3.3,  defaultPortion: 125, emoji: '🫙' },
  { id: 'f10', name: 'Emmental',              caloriesPer100g: 380, proteinPer100g: 28,   carbsPer100g: 1,    fatPer100g: 30,   defaultPortion: 30,  emoji: '🧀' },
  { id: 'f11', name: 'Lait demi-écrémé',      caloriesPer100g: 46,  proteinPer100g: 3.2,  carbsPer100g: 4.7,  fatPer100g: 1.5,  defaultPortion: 200, emoji: '🥛' },

  // Féculents
  { id: 'f12', name: 'Riz blanc cuit',        caloriesPer100g: 130, proteinPer100g: 2.7,  carbsPer100g: 28,   fatPer100g: 0.3,  defaultPortion: 200, emoji: '🍚' },
  { id: 'f13', name: 'Pâtes cuites',          caloriesPer100g: 158, proteinPer100g: 5.8,  carbsPer100g: 30,   fatPer100g: 0.9,  defaultPortion: 200, emoji: '🍝' },
  { id: 'f14', name: 'Flocons d\'avoine',     caloriesPer100g: 371, proteinPer100g: 13,   carbsPer100g: 67,   fatPer100g: 7,    defaultPortion: 60,  emoji: '🌾' },
  { id: 'f15', name: 'Pain complet',          caloriesPer100g: 247, proteinPer100g: 8.5,  carbsPer100g: 46,   fatPer100g: 3,    defaultPortion: 60,  emoji: '🍞' },
  { id: 'f16', name: 'Pomme de terre cuite',  caloriesPer100g: 87,  proteinPer100g: 2,    carbsPer100g: 20,   fatPer100g: 0.1,  defaultPortion: 200, emoji: '🥔' },
  { id: 'f17', name: 'Quinoa cuit',           caloriesPer100g: 120, proteinPer100g: 4.4,  carbsPer100g: 22,   fatPer100g: 1.9,  defaultPortion: 150, emoji: '🌾' },
  { id: 'f18', name: 'Patate douce cuite',    caloriesPer100g: 90,  proteinPer100g: 2,    carbsPer100g: 21,   fatPer100g: 0.1,  defaultPortion: 200, emoji: '🍠' },

  // Légumes
  { id: 'f19', name: 'Brocoli',               caloriesPer100g: 34,  proteinPer100g: 2.8,  carbsPer100g: 7,    fatPer100g: 0.4,  defaultPortion: 150, emoji: '🥦' },
  { id: 'f20', name: 'Épinards',              caloriesPer100g: 23,  proteinPer100g: 2.9,  carbsPer100g: 3.6,  fatPer100g: 0.4,  defaultPortion: 100, emoji: '🥬' },
  { id: 'f21', name: 'Tomate',                caloriesPer100g: 18,  proteinPer100g: 0.9,  carbsPer100g: 3.9,  fatPer100g: 0.2,  defaultPortion: 150, emoji: '🍅' },

  // Fruits
  { id: 'f22', name: 'Banane',                caloriesPer100g: 89,  proteinPer100g: 1.1,  carbsPer100g: 23,   fatPer100g: 0.3,  defaultPortion: 120, emoji: '🍌' },
  { id: 'f23', name: 'Pomme',                 caloriesPer100g: 52,  proteinPer100g: 0.3,  carbsPer100g: 14,   fatPer100g: 0.2,  defaultPortion: 150, emoji: '🍎' },
  { id: 'f24', name: 'Avocat',                caloriesPer100g: 160, proteinPer100g: 2,    carbsPer100g: 9,    fatPer100g: 15,   defaultPortion: 100, emoji: '🥑' },

  // Légumineuses
  { id: 'f25', name: 'Lentilles cuites',      caloriesPer100g: 116, proteinPer100g: 9,    carbsPer100g: 20,   fatPer100g: 0.4,  defaultPortion: 150, emoji: '🫘' },
  { id: 'f26', name: 'Pois chiches cuits',    caloriesPer100g: 164, proteinPer100g: 8.9,  carbsPer100g: 27,   fatPer100g: 2.6,  defaultPortion: 150, emoji: '🫘' },

  // Graisses & divers
  { id: 'f27', name: 'Amandes',               caloriesPer100g: 579, proteinPer100g: 21,   carbsPer100g: 22,   fatPer100g: 50,   defaultPortion: 30,  emoji: '🥜' },
  { id: 'f28', name: 'Beurre de cacahuète',   caloriesPer100g: 588, proteinPer100g: 25,   carbsPer100g: 20,   fatPer100g: 50,   defaultPortion: 30,  emoji: '🥜' },
  { id: 'f29', name: 'Huile d\'olive',        caloriesPer100g: 884, proteinPer100g: 0,    carbsPer100g: 0,    fatPer100g: 100,  defaultPortion: 10,  emoji: '🫙' },
  { id: 'f30', name: 'Whey protéine',         caloriesPer100g: 380, proteinPer100g: 75,   carbsPer100g: 8,    fatPer100g: 5,    defaultPortion: 30,  emoji: '💪' },

  // Pains & viennoiseries français
  { id: 'f31', name: 'Pain de mie',           caloriesPer100g: 270, proteinPer100g: 8.5,  carbsPer100g: 49,   fatPer100g: 3.5,  defaultPortion: 50,  emoji: '🍞' },
  { id: 'f32', name: 'Baguette',              caloriesPer100g: 270, proteinPer100g: 9,    carbsPer100g: 56,   fatPer100g: 1.2,  defaultPortion: 80,  emoji: '🥖' },
  { id: 'f33', name: 'Croissant',             caloriesPer100g: 406, proteinPer100g: 8.5,  carbsPer100g: 45,   fatPer100g: 21,   defaultPortion: 60,  emoji: '🥐' },

  // Viandes françaises
  { id: 'f34', name: 'Poulet rôti',           caloriesPer100g: 190, proteinPer100g: 27,   carbsPer100g: 0,    fatPer100g: 9,    defaultPortion: 150, emoji: '🍗' },
  { id: 'f35', name: 'Steak haché 15%',       caloriesPer100g: 220, proteinPer100g: 19,   carbsPer100g: 0,    fatPer100g: 15,   defaultPortion: 150, emoji: '🥩' },
  { id: 'f36', name: 'Jambon blanc',          caloriesPer100g: 110, proteinPer100g: 17,   carbsPer100g: 1,    fatPer100g: 4,    defaultPortion: 80,  emoji: '🥩' },
  { id: 'f37', name: 'Côte de porc',          caloriesPer100g: 250, proteinPer100g: 27,   carbsPer100g: 0,    fatPer100g: 15,   defaultPortion: 150, emoji: '🍖' },
  { id: 'f38', name: 'Sardines en boîte',     caloriesPer100g: 208, proteinPer100g: 25,   carbsPer100g: 0,    fatPer100g: 12,   defaultPortion: 100, emoji: '🐟' },

  // Fromages français
  { id: 'f39', name: 'Camembert',             caloriesPer100g: 300, proteinPer100g: 20,   carbsPer100g: 0.5,  fatPer100g: 24,   defaultPortion: 50,  emoji: '🧀' },
  { id: 'f40', name: 'Mozzarella',            caloriesPer100g: 280, proteinPer100g: 18,   carbsPer100g: 2.2,  fatPer100g: 22,   defaultPortion: 125, emoji: '🧀' },

  // Produits laitiers & boissons
  { id: 'f41', name: 'Lait entier',           caloriesPer100g: 65,  proteinPer100g: 3.2,  carbsPer100g: 4.8,  fatPer100g: 3.7,  defaultPortion: 200, emoji: '🥛' },
  { id: 'f42', name: 'Jus d\'orange',         caloriesPer100g: 45,  proteinPer100g: 0.7,  carbsPer100g: 10,   fatPer100g: 0.2,  defaultPortion: 200, emoji: '🍊' },

  // Matières grasses
  { id: 'f43', name: 'Beurre',               caloriesPer100g: 717, proteinPer100g: 0.5,  carbsPer100g: 0.6,  fatPer100g: 81,   defaultPortion: 10,  emoji: '🧈' },

  // Fruits supplémentaires
  { id: 'f44', name: 'Orange',               caloriesPer100g: 47,  proteinPer100g: 0.9,  carbsPer100g: 12,   fatPer100g: 0.1,  defaultPortion: 150, emoji: '🍊' },
  { id: 'f45', name: 'Fraises',              caloriesPer100g: 32,  proteinPer100g: 0.7,  carbsPer100g: 7.7,  fatPer100g: 0.3,  defaultPortion: 150, emoji: '🍓' },
  { id: 'f46', name: 'Raisin',               caloriesPer100g: 70,  proteinPer100g: 0.6,  carbsPer100g: 18,   fatPer100g: 0.2,  defaultPortion: 150, emoji: '🍇' },
  { id: 'f47', name: 'Compote de pommes',    caloriesPer100g: 48,  proteinPer100g: 0.3,  carbsPer100g: 12,   fatPer100g: 0.1,  defaultPortion: 100, emoji: '🍎' },

  // Légumes supplémentaires
  { id: 'f48', name: 'Carottes',             caloriesPer100g: 41,  proteinPer100g: 0.9,  carbsPer100g: 10,   fatPer100g: 0.2,  defaultPortion: 150, emoji: '🥕' },
  { id: 'f49', name: 'Haricots verts cuits', caloriesPer100g: 35,  proteinPer100g: 1.9,  carbsPer100g: 7,    fatPer100g: 0.1,  defaultPortion: 150, emoji: '🥬' },
  { id: 'f50', name: 'Courgette',            caloriesPer100g: 17,  proteinPer100g: 1.2,  carbsPer100g: 3.1,  fatPer100g: 0.3,  defaultPortion: 150, emoji: '🥒' },
];
