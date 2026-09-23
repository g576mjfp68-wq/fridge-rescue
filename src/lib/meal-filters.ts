import "server-only";
import { queryMeals, summarizeMeal } from "./mealdb";
import type { ApiOperation, FilterOption, FilterOptions, MealSummary } from "./types";

/** Lithuanian labels; the API always receives the original TheMealDB value. */
const CATEGORY_LT: Record<string, string> = {
  Beef: "Jautiena", Breakfast: "Pusryčiai", Chicken: "Vištiena", Dessert: "Desertai", Goat: "Ožkiena",
  Lamb: "Ėriena", Miscellaneous: "Įvairūs", Pasta: "Makaronai", Pork: "Kiauliena", Seafood: "Jūros gėrybės",
  Side: "Garnyrai", Starter: "Užkandžiai", Vegan: "Veganiški", Vegetarian: "Vegetariški",
};

const AREA_LT: Record<string, string> = {
  Algerian: "Alžyro", Argentina: "Argentinos", Australian: "Australų", British: "Britų", Canadian: "Kanados",
  Chinese: "Kinų", Croatian: "Kroatų", Egyptian: "Egipto", Filipino: "Filipinų", France: "Prancūzų",
  Greek: "Graikų", India: "Indų", Irish: "Airių", Italian: "Italų", Jamaican: "Jamaikos", Japanese: "Japonų",
  Kenyan: "Kenijos", Malaysian: "Malaizijos", Mexican: "Meksikos", Moroccan: "Maroko", Netherlands: "Olandų",
  Norway: "Norvegų", Polish: "Lenkų", Portuguese: "Portugalų", Russian: "Rusų", "Saudi Arabian": "Saudo Arabijos",
  Slovakia: "Slovakų", Spanish: "Ispanų", Syrian: "Sirijos", Thai: "Tajų", Tunisian: "Tuniso", Turkish: "Turkų",
  Ukrainian: "Ukrainiečių", "United States": "JAV", Uruguayan: "Urugvajaus", Venezuela: "Venesuelos",
  Vietnamese: "Vietnamiečių", American: "Amerikiečių", French: "Prancūzų", Indian: "Indų", Dutch: "Olandų",
};

const option = (value: string, labels: Record<string, string>): FilterOption => ({ value, label: labels[value] ?? value });
const byLabel = (a: FilterOption, b: FilterOption) => a.label.localeCompare(b.label, "lt");

let cache: { at: number; options: FilterOptions } | null = null;
let loading: Promise<{ options: FilterOptions; operations: ApiOperation[] }> | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

/**
 * Categories come from list.php?c=list. Areas come from the recipes themselves:
 * list.php?a=list uses other names ("French") than filter.php?a= accepts
 * ("France"), so it would offer many filters that always return nothing.
 */
export async function getFilterOptions(): Promise<{ options: FilterOptions; operations: ApiOperation[] }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { options: cache.options, operations: [] };
  loading ??= (async () => {
    const operations: ApiOperation[] = [];
    const categoriesResult = await queryMeals("list.php", { c: "list" }, (meals) =>
      meals.map((meal) => (typeof meal.strCategory === "string" ? meal.strCategory.trim() : "")).filter(Boolean));
    operations.push(categoriesResult.operation);
    const perCategory = await Promise.all(categoriesResult.data.map((category) =>
      queryMeals("filter.php", { c: category }, (meals) =>
        meals.map((meal) => (typeof meal.strArea === "string" ? meal.strArea.trim() : "")))));
    const areas = new Set<string>();
    for (const result of perCategory) {
      operations.push(result.operation);
      for (const area of result.data) if (area && area.toLowerCase() !== "unknown") areas.add(area);
    }
    const options: FilterOptions = {
      categories: categoriesResult.data.map((value) => option(value, CATEGORY_LT)).sort(byLabel),
      areas: [...areas].map((value) => option(value, AREA_LT)).sort(byLabel),
    };
    cache = { at: Date.now(), options };
    return { options, operations };
  })().finally(() => { loading = null; });
  return loading;
}

/** Recipes in one category or area, keyed by recipe ID. */
export async function filterMeals(kind: "c" | "a", value: string) {
  return queryMeals("filter.php", { [kind]: value }, (meals) => new Map(meals.map((meal) => {
    const summary: MealSummary = summarizeMeal(meal);
    return [summary.id, summary];
  })));
}

/** Only letters and a few separators: the value is also sent to TheMealDB. */
export function isFilterValue(value: string): boolean {
  return /^[\p{L} ,.'()-]{1,40}$/u.test(value);
}
