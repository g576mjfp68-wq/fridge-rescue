"use client";

import { createClient } from "@/lib/supabase/client";
import { trackSupabase } from "./dev-mode";
import { MAX_PRODUCT_LENGTH, normalizeProduct, splitProducts } from "./ingredients-lt";

export type KitchenItem = { id: string; name: string; created_at: string };

export const MAX_KITCHEN_ITEMS = 40;
const ENDPOINT = "/rest/v1/kitchen_items";

async function signedIn(expectedUserId?: string) {
  const client = createClient();
  if (!client) throw new Error("Supabase nesukonfigūruotas.");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Norėdami tvarkyti „Mano virtuvę“, prisijunkite.");
  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error("Prisijungusi paskyra pasikeitė. Perkraukite puslapį.");
  }
  return { client, user: data.user };
}

function kitchenError(error: { code?: string }): Error {
  if (error.code === "23505") return new Error("Šis produktas jau yra tavo virtuvėje.");
  if (error.code === "23514") return new Error(`Produkto pavadinimas turi būti nuo 1 iki ${MAX_PRODUCT_LENGTH} simbolių.`);
  if (error.code === "42501" || error.code === "PGRST301") return new Error("Neturite prieigos. Prisijunkite iš naujo.");
  if (error.code === "PGRST205" || error.code === "42P01") return new Error("„Mano virtuvė“ saugykla dar neparuošta.");
  return new Error("Nepavyko atlikti veiksmo su „Mano virtuve“. Bandykite dar kartą.");
}

export async function getKitchenItems(expectedUserId?: string): Promise<KitchenItem[]> {
  const { client, user } = await signedIn(expectedUserId);
  const { data, error } = await trackSupabase(ENDPOINT, "GET", () =>
    client.from("kitchen_items").select("id,name,created_at").eq("user_id", user.id).order("created_at"));
  if (error) throw kitchenError(error);
  return data ?? [];
}

export async function addKitchenItem(name: string, expectedUserId?: string): Promise<KitchenItem> {
  const value = name.trim().replace(/\s+/g, " ");
  if (!value || value.length > MAX_PRODUCT_LENGTH) {
    throw new Error(`Įveskite produktą iki ${MAX_PRODUCT_LENGTH} simbolių.`);
  }
  const { client, user } = await signedIn(expectedUserId);
  // user_id is set explicitly; RLS rejects any other value than the signed-in user.
  const { data, error } = await trackSupabase(ENDPOINT, "POST", () =>
    client.from("kitchen_items").insert({ user_id: user.id, name: value }).select("id,name,created_at").single());
  if (error) throw kitchenError(error);
  return data;
}

export async function removeKitchenItem(id: string, expectedUserId?: string): Promise<void> {
  const { client, user } = await signedIn(expectedUserId);
  const { data, error } = await trackSupabase(ENDPOINT, "DELETE", () =>
    client.from("kitchen_items").delete().eq("id", id).eq("user_id", user.id).select("id"));
  if (error) throw kitchenError(error);
  if (!data?.length) throw new Error("Produktas nerastas arba jau pašalintas.");
}

export type AddResult = {
  added: KitchenItem[];
  duplicates: string[];
  failed: { name: string; reason: string }[];
};

/**
 * "vištiena, sūris, kumpis" → three separate rows. Blank parts are dropped and
 * products already in the list (ignoring case and diacritics) are skipped.
 * Each insert is its own request, so one failure does not hide the others.
 */
export async function addKitchenItems(input: string, existing: KitchenItem[], expectedUserId?: string): Promise<AddResult> {
  const known = new Set(existing.map((item) => normalizeProduct(item.name)));
  const result: AddResult = { added: [], duplicates: [], failed: [] };
  for (const name of splitProducts(input)) {
    const key = normalizeProduct(name);
    if (known.has(key)) {
      result.duplicates.push(name);
      continue;
    }
    if (existing.length + result.added.length >= MAX_KITCHEN_ITEMS) {
      result.failed.push({ name, reason: `virtuvėje gali būti iki ${MAX_KITCHEN_ITEMS} produktų` });
      continue;
    }
    try {
      result.added.push(await addKitchenItem(name, expectedUserId));
      known.add(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "nežinoma klaida";
      if (reason.includes("jau yra")) result.duplicates.push(name);
      else result.failed.push({ name, reason });
    }
  }
  return result;
}
