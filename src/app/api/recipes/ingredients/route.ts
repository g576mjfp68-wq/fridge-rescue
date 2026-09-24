import { apiErrorResponse, expandMeal, queryMeals } from "@/lib/mealdb";
import type { ApiOperation } from "@/lib/types";

const MAX_IDS = 24;
const CACHE_MS = 6 * 60 * 60 * 1000;
// Recipe ingredients rarely change: cache them so paging and re-renders stay cheap.
const cache = new Map<string, { at: number; ingredients: string[] }>();

/** Ingredient names for several recipes (search results only have summaries). */
export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length || ids.length > MAX_IDS || ids.some((id) => !/^\d{1,10}$/.test(id))) {
    return Response.json({ error: `Nurodykite nuo 1 iki ${MAX_IDS} receptų ID.` }, { status: 400 });
  }
  try {
    const operations: ApiOperation[] = [];
    const data: Record<string, string[]> = {};
    await Promise.all(ids.map(async (id) => {
      const cached = cache.get(id);
      if (cached && Date.now() - cached.at < CACHE_MS) {
        data[id] = cached.ingredients;
        return;
      }
      const result = await queryMeals("lookup.php", { i: id }, (meals) => (meals[0] ? expandMeal(meals[0]).ingredients.map((item) => item.name) : null));
      operations.push(result.operation);
      if (result.data) {
        data[id] = result.data;
        if (cache.size > 500) cache.clear();
        cache.set(id, { at: Date.now(), ingredients: result.data });
      }
    }));
    return Response.json({ data, operation: operations.at(-1), operations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
