export type SearchMode = "ingredient" | "name";

export type MealSummary = {
  id: string;
  name: string;
  image: string | null;
};

export type Meal = MealSummary & {
  category: string;
  area: string;
  ingredients: { name: string; measure: string }[];
  instructions: string;
};

export type ApiOperation = {
  system: "TheMealDB" | "Gemini" | "Supabase";
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  status: number | null;
  success: boolean;
  durationMs: number;
  /** Where the call was made, e.g. "Fridge Rescue serveris → TheMealDB". */
  path?: string;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  operation?: ApiOperation;
  /** Every external call made for this response, in order. */
  operations?: ApiOperation[];
};

/** A product the user typed and how it was matched to TheMealDB ingredients. */
export type ProductMatch = {
  input: string;
  ingredients: string[];
  source: "dictionary" | "english" | "unknown";
  recognized: boolean;
  recipeCount: number;
};

export type SearchMeal = MealSummary & { matched?: string[] };

export type SearchData = {
  meals: SearchMeal[];
  /** "all": every recognized product matches; "partial": best partial matches. */
  match: "all" | "partial" | "none";
  products: ProductMatch[];
};

/** Strict filters: original TheMealDB values (category "Seafood", area "Italian"). */
export type SearchFilters = { category?: string; area?: string };

export type FilterOption = { value: string; label: string };
export type FilterOptions = { categories: FilterOption[]; areas: FilterOption[] };

export function searchPath(mode: SearchMode, query: string, filters: SearchFilters = {}) {
  const params = new URLSearchParams({ mode, q: query });
  if (filters.category) params.set("c", filters.category);
  if (filters.area) params.set("a", filters.area);
  return `/?${params}`;
}
