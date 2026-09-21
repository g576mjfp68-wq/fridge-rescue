import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

/** Request-scoped server client. Never store this client in a global variable. */
export async function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Next.js Server Components cannot write cookies. Before enabling
          // authentication, add the official session-refresh proxy. Actions
          // and Route Handlers can write cookies with this adapter already.
        }
      },
    },
  });
}
