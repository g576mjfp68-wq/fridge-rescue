import "server-only";
import type { ApiOperation, Meal, MealSummary } from "./types";

const API_BASE = "https://www.themealdb.com/api/json/v1/1/";
type RawMeal = Record<string, unknown>;

export class MealApiError extends Error {
  constructor(message: string, public status: number, public operation?: ApiOperation) {
    super(message);
  }
}

function field(meal: RawMeal, key: string): string {
  return typeof meal[key] === "string" ? meal[key].trim() : "";
}

export function summarizeMeal(meal: RawMeal): MealSummary {
  const id = field(meal, "idMeal");
  const name = field(meal, "strMeal");
  if (!/^\d+$/.test(id) || !name) throw new Error("Invalid meal data");
  const image = field(meal, "strMealThumb");
  return {
    id,
    name,
    image: /^https:\/\/www\.themealdb\.com\/images\//.test(image) ? image : null,
  };
}

export function expandMeal(meal: RawMeal): Meal {
  const ingredients: Meal["ingredients"] = [];
  for (let i = 1; i <= 20; i++) {
    const name = field(meal, `strIngredient${i}`);
    if (name) ingredients.push({ name, measure: field(meal, `strMeasure${i}`) });
  }
  return {
    ...summarizeMeal(meal),
    category: field(meal, "strCategory"),
    area: field(meal, "strArea"),
    ingredients,
    instructions: field(meal, "strInstructions"),
  };
}

export async function queryMeals<T>(
  endpoint: "filter.php" | "search.php" | "lookup.php",
  params: Record<string, string>,
  transform: (meals: RawMeal[]) => T,
): Promise<{ data: T; operation: ApiOperation }> {
  const url = new URL(endpoint, API_BASE);
  url.search = new URLSearchParams(params).toString();
  const started = performance.now();
  let status: number | null = null;
  const operation = (success: boolean): ApiOperation => ({
    system: "TheMealDB", endpoint, method: "GET", status, success,
    durationMs: Math.round(performance.now() - started),
    path: "Naršyklė → Fridge Rescue serveris → TheMealDB",
  });

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    status = response.status;
    if (!response.ok) {
      throw new MealApiError(
        status === 429
          ? "Pasiektas receptų API užklausų limitas. Šiek tiek palaukite ir bandykite dar kartą."
          : `Receptų API grąžino klaidą (HTTP ${status}). Bandykite dar kartą vėliau.`,
        status === 429 ? 429 : 502,
      );
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("meals" in payload)) {
      throw new Error("Invalid API response");
    }
    // TheMealDB can return null or an empty string when there are no matches.
    const rawMeals = payload.meals;
    const meals = rawMeals === null || rawMeals === "" ? [] : rawMeals;
    if (!Array.isArray(meals) || meals.some((meal) => !meal || typeof meal !== "object")) {
      throw new Error("Invalid meals array");
    }
    return { data: transform(meals), operation: operation(true) };
  } catch (error) {
    if (error instanceof MealApiError) {
      error.operation = operation(false);
      throw error;
    }
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new MealApiError(
      timeout
        ? "Receptų API neatsakė laiku. Bandykite dar kartą."
        : status !== null
          ? "Receptų API grąžino netinkamus duomenis. Bandykite dar kartą vėliau."
          : "Nepavyko pasiekti receptų API. Bandykite dar kartą vėliau.",
      timeout ? 504 : 502,
      operation(false),
    );
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof MealApiError) {
    return Response.json({ error: error.message, operation: error.operation }, { status: error.status });
  }
  return Response.json({ error: "Įvyko serverio klaida. Bandykite dar kartą." }, { status: 500 });
}
