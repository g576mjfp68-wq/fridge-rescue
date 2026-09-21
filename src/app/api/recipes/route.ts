import { apiErrorResponse, queryMeals, summarizeMeal } from "@/lib/mealdb";

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
  if (mode === "ingredient" && /[,;\n]/.test(query)) {
    return Response.json({ error: "Ieškokite pagal vieną ingredientą, pavyzdžiui, chicken." }, { status: 400 });
  }
  try {
    const result = await queryMeals(
      mode === "ingredient" ? "filter.php" : "search.php",
      mode === "ingredient" ? { i: query } : { s: query },
      (meals) => meals.map(summarizeMeal),
    );
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
