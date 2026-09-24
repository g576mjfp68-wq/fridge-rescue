"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getKitchenItems } from "./kitchen";
import { useAiUser } from "./supabase/use-ai-user";

// Bumped whenever "Mano virtuvė" or the shopping list changes, so recipe cards
// and the recipe page recount "turi / trūksta" without a page reload.
let version = 0;
const listeners = new Set<() => void>();

export function notifyKitchenChanged() {
  version++;
  for (const listener of listeners) listener();
}

export function useKitchenVersion(): number {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => version,
    () => 0,
  );
}

/** The signed-in user's kitchen product names; null for guests or while loading. */
export function useKitchenProducts(): string[] | null {
  const { userId } = useAiUser();
  const current = useKitchenVersion();
  const [state, setState] = useState<{ key: string; names: string[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const loadKey = `${userId}:${current}`;
    let active = true;
    getKitchenItems(userId)
      .then((items) => { if (active) setState({ key: loadKey, names: items.map((item) => item.name) }); })
      .catch(() => { if (active) setState({ key: loadKey, names: [] }); });
    return () => { active = false; };
  }, [userId, current]);

  if (!userId) return null;
  // Keep showing this user's previous list while a refresh loads, to avoid flicker.
  return state?.key.startsWith(`${userId}:`) ? state.names : null;
}
