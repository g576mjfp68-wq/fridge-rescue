import { normalizeProduct, translateProduct } from "./ingredients-lt";

/** Basics almost every kitchen has; they are not counted as "missing". */
const STAPLES = new Set(["water", "salt", "pepper", "black pepper", "sea salt", "ground black pepper", "ice", "boiling water", "cold water", "hot water"]);

export function isStaple(ingredient: string): boolean {
  return STAPLES.has(ingredient.trim().toLowerCase());
}

const singular = (word: string) => word.replace(/(oes|ies|es|s)$/, (end) => (end === "ies" ? "y" : end === "oes" ? "o" : ""));
const words = (value: string) => normalizeProduct(value).split(/[^a-z]+/).filter(Boolean).map(singular);

/**
 * TheMealDB names for the user's kitchen products. Lithuanian names go through
 * the dictionary; English names ("chicken") are used as they are.
 */
export function kitchenIngredientNames(products: string[]): string[][] {
  return products.flatMap((product) => {
    const translated = translateProduct(product);
    if (translated) return translated.map(words);
    return /^[a-z][a-z '-]*$/i.test(product.trim()) ? [words(product)] : [];
  });
}

/** "Chicken Breasts" is covered by "chicken"; "Garlic Clove" by "garlic". */
export function hasIngredient(ingredient: string, kitchen: string[][]): boolean {
  const recipeWords = words(ingredient);
  return kitchen.some((variant) => variant.length > 0 && variant.every((word) => recipeWords.includes(word)));
}

export type KitchenMatch = { have: string[]; missing: string[]; total: number };

/** Which recipe ingredients the user has, ignoring water, salt and pepper. */
export function matchKitchen(ingredients: string[], products: string[]): KitchenMatch {
  const kitchen = kitchenIngredientNames(products);
  const counted = ingredients.filter((ingredient) => !isStaple(ingredient));
  const have = counted.filter((ingredient) => hasIngredient(ingredient, kitchen));
  const missing = counted.filter((ingredient) => !have.includes(ingredient));
  return { have, missing, total: counted.length };
}
