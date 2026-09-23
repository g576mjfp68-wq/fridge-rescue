import "server-only";
import { MealApiError, queryMeals, summarizeMeal } from "./mealdb";
import { translateProduct } from "./ingredients-lt";
import type { ApiOperation, MealSummary, ProductMatch, SearchData, SearchMeal } from "./types";

const MAX_PARTIAL_RESULTS = 60;

/**
 * TheMealDB's free key does not support filter.php?i=a,b (it returns null),
 * so each ingredient is requested separately and recipes are compared by ID.
 */
export async function searchByProducts(products: string[]): Promise<{ data: SearchData; operations: ApiOperation[] }> {
  const plans = products.map((input) => {
    const translated = translateProduct(input);
    if (translated) return { input, ingredients: translated, source: "dictionary" as const };
    // Keep English input working: TheMealDB decides whether it knows the name.
    if (/^[a-z][a-z '-]*$/i.test(input)) return { input, ingredients: [input], source: "english" as const };
    return { input, ingredients: [], source: "unknown" as const };
  });

  const operations: ApiOperation[] = [];
  const results = await Promise.all(plans.map(async (plan) => {
    const meals = new Map<string, MealSummary>();
    const lists = await Promise.all(plan.ingredients.map(async (ingredient) => {
      try {
        const result = await queryMeals("filter.php", { i: ingredient }, (raw) => raw.map(summarizeMeal));
        operations.push(result.operation);
        return result.data;
      } catch (error) {
        if (error instanceof MealApiError && error.operation) operations.push(error.operation);
        throw error;
      }
    }));
    for (const meal of lists.flat()) if (!meals.has(meal.id)) meals.set(meal.id, meal);
    return { plan, meals };
  }));

  const productMatches: ProductMatch[] = results.map(({ plan, meals }) => ({
    input: plan.input,
    ingredients: plan.ingredients,
    source: plan.source,
    recognized: plan.source === "dictionary" || meals.size > 0,
    recipeCount: meals.size,
  }));

  const recognized = results.filter((_, index) => productMatches[index].recognized);
  const byId = new Map<string, SearchMeal & { matched: string[] }>();
  for (const { plan, meals } of recognized) {
    for (const meal of meals.values()) {
      const entry = byId.get(meal.id) ?? { ...meal, matched: [] };
      entry.matched.push(plan.input);
      byId.set(meal.id, entry);
    }
  }

  const all = [...byId.values()].filter((meal) => meal.matched.length === recognized.length);
  if (recognized.length === 0) {
    return { data: { meals: [], match: "none", products: productMatches }, operations };
  }
  if (all.length > 0) {
    return { data: { meals: all, match: "all", products: productMatches }, operations };
  }
  const partial = [...byId.values()]
    .sort((a, b) => b.matched.length - a.matched.length || a.name.localeCompare(b.name))
    .slice(0, MAX_PARTIAL_RESULTS);
  return { data: { meals: partial, match: partial.length ? "partial" : "none", products: productMatches }, operations };
}
