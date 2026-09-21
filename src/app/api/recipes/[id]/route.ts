import { apiErrorResponse, expandMeal, queryMeals } from "@/lib/mealdb";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d{1,10}$/.test(id)) {
    return Response.json({ error: "Neteisingas recepto ID." }, { status: 400 });
  }
  try {
    const result = await queryMeals("lookup.php", { i: id }, (meals) => meals[0] ? expandMeal(meals[0]) : null);
    if (!result.data) {
      return Response.json({ error: "Receptas nerastas. Grįžkite į paiešką ir pasirinkite kitą.", operation: result.operation }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
