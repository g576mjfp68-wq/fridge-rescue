import {
  buildAdaptationPrompt,
  KITCHEN_RESPONSE_SCHEMA,
  kitchenResultText,
  parseKitchenResult,
  validateAiRequest,
  type AiRecipeResult,
} from "@/lib/ai-recipe";
import { adaptRecipe, GeminiError } from "@/lib/gemini";
import { expandMeal, MealApiError, queryMeals } from "@/lib/mealdb";
import { createClient } from "@/lib/supabase/server";
import type { ApiOperation } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function supabaseOperation(endpoint: string, started: number, status: number | null, success: boolean): ApiOperation {
  return {
    system: "Supabase", endpoint, method: "GET", status, success,
    durationMs: Math.round(performance.now() - started),
    path: "Naršyklė → Fridge Rescue serveris → Supabase",
  };
}

/** Verifies the signed-in user on the server and loads only their products (RLS applies too). */
async function loadKitchen(operations: ApiOperation[]): Promise<{ products: string[] } | { error: string; status: number }> {
  const supabase = await createClient();
  if (!supabase) return { error: "„Mano virtuvė“ nepasiekiama: Supabase nesukonfigūruotas.", status: 503 };

  let started = performance.now();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  operations.push(supabaseOperation("/auth/v1/user", started, authError?.status ?? 200, !authError && Boolean(auth.user)));
  if (authError || !auth.user) {
    return { error: "Norėdami naudoti „Mano virtuvę“, prisijunkite.", status: 401 };
  }

  started = performance.now();
  const { data, error, status } = await supabase.from("kitchen_items")
    .select("name").eq("user_id", auth.user.id).order("created_at").limit(40);
  operations.push(supabaseOperation("/rest/v1/kitchen_items", started, status || null, !error));
  if (error) return { error: "Nepavyko gauti „Mano virtuvė“ produktų. Bandykite dar kartą.", status: 502 };
  const products = (data ?? []).map((item) => String(item.name).trim()).filter(Boolean);
  if (!products.length) {
    return { error: "Tavo „Mano virtuvė“ tuščia. Pridėk produktų pagrindiniame puslapyje.", status: 400 };
  }
  return { products };
}

export async function POST(request: Request) {
  const operations: ApiOperation[] = [];
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

    let kitchenProducts: string[] | undefined;
    if (input.useKitchen) {
      const kitchen = await loadKitchen(operations);
      if ("error" in kitchen) return json({ error: kitchen.error, operation: operations.at(-1), operations }, kitchen.status);
      kitchenProducts = kitchen.products;
    }

    const original = await queryMeals("lookup.php", { i: input.recipeId }, (meals) => meals[0] ? expandMeal(meals[0]) : null);
    operations.push(original.operation);
    if (!original.data) {
      return json({ error: "Originalus receptas nerastas. Grįžkite į paiešką ir pasirinkite kitą.", operation: original.operation, operations }, 404);
    }

    const prompt = buildAdaptationPrompt(original.data, input, kitchenProducts);
    const result = await adaptRecipe(prompt, request.signal, kitchenProducts ? KITCHEN_RESPONSE_SCHEMA : undefined);
    operations.push(result.operation);

    let data: AiRecipeResult = result.data;
    if (kitchenProducts) {
      const kitchen = parseKitchenResult(result.data.text, kitchenProducts);
      if (!kitchen) {
        return json({ error: "Gemini grąžino netinkamo formato atsakymą. Bandykite dar kartą.", operation: result.operation, operations }, 502);
      }
      data = { text: kitchenResultText(kitchen.analysis, kitchen.recipe), kitchen: kitchen.analysis };
    }
    return json({ data, operation: result.operation, operations });
  } catch (error) {
    if (error instanceof GeminiError || error instanceof MealApiError) {
      if (error.operation) operations.push(error.operation);
      return json({ error: error.message, operation: error.operation, operations }, error.status);
    }
    return json({ error: "Įvyko netikėta klaida. Bandykite dar kartą vėliau.", operations }, 500);
  }
}
