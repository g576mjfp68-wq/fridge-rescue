"use client";

import { useSyncExternalStore } from "react";
import type { ApiOperation } from "./types";

// Only metadata is stored: system, endpoint, method, status, success, duration.
// Never pass request bodies, keys, tokens or passwords here.
type DevState = { enabled: boolean; operations: ApiOperation[] };

const STORAGE_KEY = "fridge-rescue:developer-mode";
const HISTORY = 6;
const listeners = new Set<() => void>();
let state: DevState = { enabled: false, operations: [] };
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = { ...state, enabled: localStorage.getItem(STORAGE_KEY) === "on" };
  } catch {
    // The switch still works for this page view without storage.
  }
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: DevState = { enabled: false, operations: [] };

export function useDevMode(): DevState {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export function setDevModeEnabled(enabled: boolean) {
  state = { ...state, enabled };
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Ignore unavailable storage.
  }
  emit();
}

export function recordOperations(operations: (ApiOperation | undefined)[] | undefined) {
  const valid = (operations ?? []).filter((operation): operation is ApiOperation => Boolean(operation));
  if (!valid.length) return;
  state = { ...state, operations: [...state.operations, ...valid].slice(-HISTORY) };
  emit();
}

/** Times one browser → Supabase call and records its real HTTP status. */
export async function trackSupabase<T extends { error: unknown; status?: number }>(
  endpoint: string,
  method: ApiOperation["method"],
  run: () => PromiseLike<T>,
): Promise<T> {
  const started = performance.now();
  const operation = (status: number | null, success: boolean): ApiOperation => ({
    system: "Supabase", endpoint, method, status, success,
    durationMs: Math.round(performance.now() - started),
    path: "Naršyklė → Supabase",
  });
  try {
    const result = await run();
    // Postgrest responses carry status; Auth errors carry it on the error.
    const errorStatus = (result.error as { status?: number } | null)?.status;
    const status = result.status || errorStatus || (result.error ? null : 200);
    recordOperations([operation(status ?? null, !result.error)]);
    return result;
  } catch (error) {
    recordOperations([operation(null, false)]);
    throw error;
  }
}
