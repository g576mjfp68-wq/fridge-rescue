"use client";

import { createClient } from "@/lib/supabase/client";
import { trackSupabase } from "./dev-mode";
import { normalizeProduct } from "./ingredients-lt";
import { addKitchenItem } from "./kitchen";

export type ShoppingItem = { id: string; name: string; recipe_name: string | null; created_at: string };

const ENDPOINT = "/rest/v1/shopping_items";
const COLUMNS = "id,name,recipe_name,created_at";

async function signedIn(expectedUserId?: string) {
  const client = createClient();
  if (!client) throw new Error("Supabase nesukonfigūruotas.");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Norėdami naudoti pirkinių sąrašą, prisijunkite.");
  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error("Prisijungusi paskyra pasikeitė. Perkraukite puslapį.");
  }
  return { client, user: data.user };
}

function shoppingError(error: { code?: string }): Error {
  if (error.code === "42501" || error.code === "PGRST301") return new Error("Neturite prieigos. Prisijunkite iš naujo.");
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("Pirkinių sąrašo saugykla dar neparuošta.");
  return new Error("Nepavyko atlikti veiksmo su pirkinių sąrašu. Bandykite dar kartą.");
}

export async function getShoppingItems(expectedUserId?: string): Promise<ShoppingItem[]> {
  const { client, user } = await signedIn(expectedUserId);
  const { data, error } = await trackSupabase(ENDPOINT, "GET", () =>
    client.from("shopping_items").select(COLUMNS).eq("user_id", user.id).order("created_at"));
  if (error) throw shoppingError(error);
  return data ?? [];
}

/**
 * Adds missing ingredients in one request; names already on the list are
 * skipped (the unique index would reject them anyway).
 */
export async function addShoppingItems(names: string[], recipeName: string, existing: ShoppingItem[], expectedUserId?: string): Promise<{ added: ShoppingItem[]; skipped: string[] }> {
  const known = new Set(existing.map((item) => normalizeProduct(item.name)));
  const fresh: string[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    const key = normalizeProduct(name);
    if (known.has(key)) skipped.push(name);
    else { known.add(key); fresh.push(name.trim().slice(0, 80)); }
  }
  if (!fresh.length) return { added: [], skipped };
  const { client, user } = await signedIn(expectedUserId);
  const { data, error } = await trackSupabase(ENDPOINT, "POST", () =>
    client.from("shopping_items").insert(fresh.map((name) => ({ user_id: user.id, name, recipe_name: recipeName.slice(0, 500) }))).select(COLUMNS));
  if (error) throw shoppingError(error);
  return { added: data ?? [], skipped };
}

export async function removeShoppingItem(id: string, expectedUserId?: string): Promise<void> {
  const { client, user } = await signedIn(expectedUserId);
  const { data, error } = await trackSupabase(ENDPOINT, "DELETE", () =>
    client.from("shopping_items").delete().eq("id", id).eq("user_id", user.id).select("id"));
  if (error) throw shoppingError(error);
  if (!data?.length) throw new Error("Prekė nerasta arba jau pašalinta.");
}

/** "Nupirkau": the product moves to "Mano virtuvė" and leaves the list. */
export async function markBought(item: ShoppingItem, expectedUserId?: string): Promise<void> {
  try {
    await addKitchenItem(item.name, expectedUserId);
  } catch (error) {
    // Already in the kitchen is fine – it still leaves the shopping list.
    if (!(error instanceof Error && error.message.includes("jau yra"))) throw error;
  }
  await removeShoppingItem(item.id, expectedUserId);
}
