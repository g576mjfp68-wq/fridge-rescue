import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { MealSummary } from "@/lib/types";

export type SavedRecipe = {
  id: number;
  user_id: string;
  meal_id: string;
  meal_name: string;
  meal_image: string | null;
  created_at: string;
};

function getClient(): SupabaseClient {
  const client = createClient();

  if (!client) {
    throw new Error("Supabase nėra sukonfigūruotas.");
  }

  return client;
}

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
}) {
  const code = error.code ? ` [${error.code}]` : "";
  const details = error.details ? ` – ${error.details}` : "";

  return new Error(
    `${error.message || "Nežinoma Supabase klaida"}${code}${details}`,
  );
}

async function requireUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw formatSupabaseError(error);
  }

  if (!data.user) {
    throw new Error("Norėdami išsaugoti receptą, prisijunkite.");
  }

  return data.user;
}

export async function getSavedRecipes(): Promise<SavedRecipe[]> {
  const client = getClient();
  const user = await requireUser(client);

  const { data, error } = await client
    .from("saved_recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw formatSupabaseError(error);
  }

  return data ?? [];
}

export async function isRecipeSaved(
  mealId: string,
): Promise<boolean> {
  const client = getClient();

  const { data: authData, error: authError } =
    await client.auth.getUser();

  if (authError || !authData.user) {
    return false;
  }

  const { data, error } = await client
    .from("saved_recipes")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("meal_id", mealId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError(error);
  }

  return Boolean(data);
}

export async function saveRecipe(
  meal: MealSummary,
): Promise<void> {
  const client = getClient();
  const user = await requireUser(client);

  const { error } = await client.from("saved_recipes").insert({
    user_id: user.id,
    meal_id: meal.id,
    meal_name: meal.name,
    meal_image: meal.image,
  });

  if (error && error.code !== "23505") {
    throw formatSupabaseError(error);
  }
}

export async function removeSavedRecipe(
  mealId: string,
): Promise<void> {
  const client = getClient();
  const user = await requireUser(client);

  const { error } = await client
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("meal_id", mealId);

  if (error) {
    throw formatSupabaseError(error);
  }
}