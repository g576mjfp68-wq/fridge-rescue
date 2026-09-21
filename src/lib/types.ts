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
  system: "TheMealDB";
  endpoint: string;
  method: "GET";
  status: number | null;
  success: boolean;
  durationMs: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  operation?: ApiOperation;
};

export function searchPath(mode: SearchMode, query: string) {
  return `/?${new URLSearchParams({ mode, q: query })}`;
}
