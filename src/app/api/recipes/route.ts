import { searchByProducts } from "@/lib/ingredient-search";
import { MAX_PRODUCT_LENGTH, MAX_PRODUCTS, splitProducts } from "@/lib/ingredients-lt";
import { apiErrorResponse, queryMeals, summarizeMeal } from "@/lib/mealdb";
import type { SearchData } from "@/lib/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode");
  const query = params.get("q")?.trim() ?? "";
  if (mode !== "ingredient" && mode !== "name") {
    return Response.json({ error: "Pasirinkite paieškos būdą." }, { status: 400 });
  }
  if (!query || query.length > 100) {
    return Response.json({ error: "Įveskite nuo 1 iki 100 simbolių." }, { status: 400 });
  }
  try {
    if (mode === "ingredient") {
      const products = splitProducts(query);
      if (products.length === 0) {
        return Response.json({ error: "Įveskite bent vieną produktą." }, { status: 400 });
      }
      if (products.length > MAX_PRODUCTS || products.some((product) => product.length > MAX_PRODUCT_LENGTH)) {
        return Response.json({ error: `Įveskite iki ${MAX_PRODUCTS} produktų, kiekvieną iki ${MAX_PRODUCT_LENGTH} simbolių.` }, { status: 400 });
      }
      const { data, operations } = await searchByProducts(products);
      return Response.json({ data, operation: operations.at(-1), operations });
    }
    const result = await queryMeals("search.php", { s: query }, (meals) => meals.map(summarizeMeal));
    const data: SearchData = { meals: result.data, match: "all", products: [] };
    return Response.json({ data, operation: result.operation, operations: [result.operation] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
