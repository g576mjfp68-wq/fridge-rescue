import { searchByProducts } from "@/lib/ingredient-search";
import { MAX_PRODUCT_LENGTH, MAX_PRODUCTS, splitProducts } from "@/lib/ingredients-lt";
import { filterMeals, isFilterValue } from "@/lib/meal-filters";
import { apiErrorResponse, MealApiError, queryMeals, summarizeMeal } from "@/lib/mealdb";
import type { ApiOperation, MealSummary, SearchData } from "@/lib/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode");
  const query = params.get("q")?.trim() ?? "";
  const category = params.get("c")?.trim() ?? "";
  const area = params.get("a")?.trim() ?? "";
  if (mode !== "ingredient" && mode !== "name") {
    return Response.json({ error: "Pasirinkite paieškos būdą." }, { status: 400 });
  }
  if (query.length > 100) {
    return Response.json({ error: "Įveskite iki 100 simbolių." }, { status: 400 });
  }
  if ((category && !isFilterValue(category)) || (area && !isFilterValue(area))) {
    return Response.json({ error: "Netinkamas kategorijos arba pasaulio virtuvės filtras." }, { status: 400 });
  }
  if (!query && !category && !area) {
    return Response.json({ error: "Įveskite ingredientus ar pavadinimą arba pasirinkite kategoriją ar pasaulio virtuvę." }, { status: 400 });
  }

  const operations: ApiOperation[] = [];
  try {
    // TheMealDB ignores filter.php?c=…&a=… together, so each filter is its own
    // request and the recipe IDs are intersected here.
    const filterResults = await Promise.all([
      category ? filterMeals("c", category) : null,
      area ? filterMeals("a", area) : null,
    ].map(async (pending) => {
      try {
        return await pending;
      } catch (error) {
        if (error instanceof MealApiError && error.operation) operations.push(error.operation);
        throw error;
      }
    }));
    const filterMaps = filterResults.filter((result) => result !== null).map((result) => {
      operations.push(result.operation);
      return result.data;
    });
    const allowed: Set<string> | null = filterMaps.length
      ? new Set([...filterMaps[0].keys()].filter((id) => filterMaps.every((map) => map.has(id))))
      : null;

    let data: SearchData;
    if (!query) {
      // Filters only: recipes that are in every selected filter.
      const [first] = filterMaps;
      const meals: MealSummary[] = [...first.values()].filter((meal) => allowed!.has(meal.id));
      data = { meals, match: "all", products: [] };
    } else if (mode === "ingredient") {
      const products = splitProducts(query);
      if (products.length === 0) {
        return Response.json({ error: "Įveskite bent vieną produktą." }, { status: 400 });
      }
      if (products.length > MAX_PRODUCTS || products.some((product) => product.length > MAX_PRODUCT_LENGTH)) {
        return Response.json({ error: `Įveskite iki ${MAX_PRODUCTS} produktų, kiekvieną iki ${MAX_PRODUCT_LENGTH} simbolių.` }, { status: 400 });
      }
      const result = await searchByProducts(products, allowed);
      operations.push(...result.operations);
      data = result.data;
    } else {
      const result = await queryMeals("search.php", { s: query }, (meals) => meals.map(summarizeMeal));
      operations.push(result.operation);
      data = { meals: allowed ? result.data.filter((meal) => allowed.has(meal.id)) : result.data, match: "all", products: [] };
    }
    return Response.json({ data, operation: operations.at(-1), operations });
  } catch (error) {
    if (error instanceof MealApiError) {
      return Response.json({ error: error.message, operation: error.operation, operations }, { status: error.status });
    }
    return apiErrorResponse(error);
  }
}
