"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

/** Browser client; callers must handle null while Supabase is not configured. */
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  return createBrowserClient(config.url, config.publishableKey);
}
