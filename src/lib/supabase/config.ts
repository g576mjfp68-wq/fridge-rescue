/** Returns null until both public Supabase settings have been supplied. */
export function getSupabaseConfig() {
  // Keep explicit process.env references so Next.js can inline public values.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}
