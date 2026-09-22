import { buildAdaptationPrompt, validateAiRequest } from "@/lib/ai-recipe";
import { adaptRecipe, GeminiError } from "@/lib/gemini";
import { expandMeal, MealApiError, queryMeals } from "@/lib/mealdb";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return json({ error: "Užklausą pateikite application/json formatu." }, 400);
    }
    // Read a bounded body, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Trūksta užklausos duomenų." }, 400);
    let raw = "";
    let bytes = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 16_384) {
          await reader.cancel();
          return json({ error: "Užklausa per didelė. Sutrumpinkite prašymą." }, 400);
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    let body: unknown;
    try { body = JSON.parse(raw); } catch {
      return json({ error: "Netinkamas JSON. Patikrinkite užklausos laukus." }, 400);
    }
    const parsed = validateAiRequest(body);
    if (parsed.error) return json({ error: parsed.error }, 400);
    const input = parsed.data!;
    const original = await queryMeals("lookup.php", { i: input.recipeId }, (meals) => meals[0] ? expandMeal(meals[0]) : null);
    if (!original.data) {
      return json({ error: "Originalus receptas nerastas. Grįžkite į paiešką ir pasirinkite kitą.", operation: original.operation }, 404);
    }
    const result = await adaptRecipe(buildAdaptationPrompt(original.data, input), request.signal);
    return json(result);
  } catch (error) {
    if (error instanceof GeminiError || error instanceof MealApiError) {
      return json({ error: error.message, operation: error.operation }, error.status);
    }
    return json({ error: "Įvyko netikėta klaida. Bandykite dar kartą vėliau." }, 500);
  }
}
