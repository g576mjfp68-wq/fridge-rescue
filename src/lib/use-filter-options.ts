"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientApiError, fetchApi } from "./client-api";
import { recordOperations } from "./dev-mode";
import type { FilterOptions } from "./types";

const STORAGE_KEY = "fridge-rescue:filter-options:v1";
const MAX_AGE = 6 * 60 * 60 * 1000;

type State = { options: FilterOptions | null; error: string; loading: boolean };

/** Category and world-cuisine lists from TheMealDB (via our server), cached per tab. */
export function useFilterOptions() {
  const [state, setState] = useState<State>({ options: null, error: "", loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const cached = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        if (cached?.options && Date.now() - cached.savedAt < MAX_AGE) {
          setState({ options: cached.options, error: "", loading: false });
          return;
        }
      } catch {
        // Load from the server below.
      }
      try {
        const response = await fetchApi<FilterOptions>("/api/filters", controller.signal);
        recordOperations(response.operations ?? [response.operation]);
        setState({ options: response.data!, error: "", loading: false });
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ options: response.data, savedAt: Date.now() }));
        } catch {
          // Storage is optional.
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ClientApiError) recordOperations([error.operation]);
        setState({ options: null, error: "Filtrų sąrašų gauti nepavyko.", loading: false });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState((current) => ({ ...current, error: "", loading: true }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
