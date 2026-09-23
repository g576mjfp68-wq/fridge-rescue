import { apiErrorResponse, queryMeals, summarizeMeal } from "@/lib/mealdb";

// A new random recipe on every request: never cache.
export const dynamic = "force-dynamic";

/** One random recipe from the whole TheMealDB collection; search filters do not apply. */
export async function GET() {
  try {
    const result = await queryMeals("random.php", {}, (meals) => (meals[0] ? summarizeMeal(meals[0]) : null));
    if (!result.data) {
      return Response.json({ error: "Atsitiktinio recepto gauti nepavyko. Bandykite dar kartą.", operation: result.operation }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ data: result.data, operation: result.operation, operations: [result.operation] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
