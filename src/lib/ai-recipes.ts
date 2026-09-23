"use client";

import { createClient } from "@/lib/supabase/client";
import { trackSupabase } from "@/lib/dev-mode";
import { validateAiRequest, type AiRecipeRequest } from "@/lib/ai-recipe";

export type AiRecipe = {
  id: string;
  user_id: string;
  original_recipe_name: string;
  user_request: string;
  ai_result: string;
  created_at: string;
  original_recipe_id: string;
  time_minutes: AiRecipeRequest["time"];
  servings: AiRecipeRequest["servings"];
  preference: AiRecipeRequest["preference"];
};

export type NewAiRecipe = AiRecipeRequest & { originalRecipeName: string; aiResult: string };

const columns = "id,user_id,original_recipe_name,user_request,ai_result,created_at,original_recipe_id,time_minutes,servings,preference";

function databaseError(error: { code?: string }): Error {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new Error("AI receptų saugykla dar neparuošta. Kreipkitės į projekto administratorių.");
  }
  if (error.code === "42501" || error.code === "PGRST301") {
    return new Error("Neturite prieigos prie šio AI recepto. Prisijunkite iš naujo.");
  }
  return new Error("Nepavyko atlikti AI receptų operacijos. Patikrinkite ryšį ir bandykite dar kartą.");
}

async function authenticatedClient(expectedUserId?: string) {
  const client = createClient();
  if (!client) throw new Error("AI receptų saugykla nepasiekiama: Supabase nesukonfigūruotas.");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Norėdami tvarkyti AI receptus, prisijunkite.");
  // This optional ID is only a race-condition guard, never the inserted owner.
  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error("Prisijungusi paskyra pasikeitė. Bandykite dar kartą.");
  }
  return { client, user: data.user };
}

export async function getMyAiRecipes(): Promise<AiRecipe[]> {
  const { client, user } = await authenticatedClient();
  const { data, error } = await trackSupabase("/rest/v1/ai_recipes", "GET", () => client.from("ai_recipes").select(columns)
    .eq("user_id", user.id).order("created_at", { ascending: false }));
  if (error) throw databaseError(error);
  return data ?? [];
}

export async function saveAiRecipe(input: NewAiRecipe, expectedUserId?: string): Promise<AiRecipe> {
  const parsed = validateAiRequest({ recipeId: input.recipeId, userRequest: input.userRequest, time: input.time, servings: input.servings, preference: input.preference });
  if (parsed.error) throw new Error(parsed.error);
  if (!input.originalRecipeName?.trim() || input.originalRecipeName.trim().length > 500 || !input.aiResult?.trim() || input.aiResult.trim().length > 100000) {
    throw new Error("Nepavyko išsaugoti: netinkamas recepto pavadinimas arba AI rezultatas.");
  }
  const { client, user } = await authenticatedClient(expectedUserId);
  const values = parsed.data!;
  // Explicit fields: input cannot override user_id, id, or created_at.
  const { data, error } = await trackSupabase("/rest/v1/ai_recipes", "POST", () => client.from("ai_recipes").insert({
    user_id: user.id,
    original_recipe_name: input.originalRecipeName.trim(),
    user_request: values.userRequest,
    ai_result: input.aiResult.trim(),
    original_recipe_id: values.recipeId,
    time_minutes: values.time,
    servings: values.servings,
    preference: values.preference,
  }).select(columns).single());
  if (error) throw databaseError(error);
  if (!data) throw new Error("Serveris nepatvirtino AI recepto išsaugojimo. Patikrinkite savo AI receptų sąrašą.");
  return data;
}

export async function deleteAiRecipe(id: string, expectedUserId?: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Netinkamas AI recepto ID.");
  }
  const { client, user } = await authenticatedClient(expectedUserId);
  const { data, error } = await trackSupabase("/rest/v1/ai_recipes", "DELETE", () => client.from("ai_recipes").delete()
    .eq("id", id).eq("user_id", user.id).select("id"));
  if (error) throw databaseError(error);
  if (!data?.length) throw new Error("AI receptas nerastas arba neturite teisės jo pašalinti.");
}
export async function getMyAiRecipe(id: string): Promise<AiRecipe> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new Error("Netinkamas AI recepto ID.");
  }

  const { client, user } = await authenticatedClient();

  const { data, error } = await trackSupabase("/rest/v1/ai_recipes", "GET", () => client
    .from("ai_recipes")
    .select(columns)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle());

  if (error) {
    throw databaseError(error);
  }

  if (!data) {
    throw new Error(
      "AI receptas nerastas arba neturite teisės jo peržiūrėti.",
    );
  }

  return data;
}
