"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./client";

type SessionUser = { loading: boolean; user: User | null; configured: boolean };

/** Display state for the header: the signed-in user including user_metadata (avatar). */
export function useSessionUser(): SessionUser {
  const client = useMemo(() => createClient(), []);
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({ loading: Boolean(client), user: null });

  useEffect(() => {
    if (!client) return;
    let active = true;
    let revision = 0;
    const initial = revision;
    void client.auth.getUser().then(({ data, error }) => {
      if (active && revision === initial) setState({ loading: false, user: error ? null : data.user });
    }).catch(() => {
      if (active && revision === initial) setState({ loading: false, user: null });
    });
    // USER_UPDATED arrives after an avatar change, so the header updates at once.
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (active) setState({ loading: false, user: session?.user ?? null });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  return { ...state, configured: Boolean(client) };
}
