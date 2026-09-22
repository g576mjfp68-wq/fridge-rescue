"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "./client";

type AiUser = { loading: boolean; userId: string | null };

/** Browser display state only. Every database operation separately calls getUser. */
export function useAiUser(): AiUser {
  const client = useMemo(() => createClient(), []);
  const [state, setState] = useState<AiUser>({ loading: Boolean(client), userId: null });

  useEffect(() => {
    if (!client) return;
    let active = true;
    let revision = 0;
    const initialRevision = revision;
    void client.auth.getUser().then(({ data, error }) => {
      if (active && revision === initialRevision) setState({ loading: false, userId: error ? null : data.user?.id ?? null });
    }).catch(() => {
      if (active && revision === initialRevision) setState({ loading: false, userId: null });
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // No async Supabase calls inside this callback: avoids the auth lock.
      revision++;
      if (active) setState({ loading: false, userId: session?.user.id ?? null });
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  return state;
}
