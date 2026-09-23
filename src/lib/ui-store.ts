"use client";

import { useSyncExternalStore } from "react";

// Page-wide UI state: which overlay is open. Opening the kitchen drawer or a
// dialog never navigates, so the current search and its results stay in place.
export type AuthMode = "login" | "register";
type UiState = { kitchenOpen: boolean; auth: AuthMode | null; avatarOpen: boolean; notice: string };

const listeners = new Set<() => void>();
let state: UiState = { kitchenOpen: false, auth: null, avatarOpen: false, notice: "" };
const serverState = state;

function set(next: Partial<UiState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function useUi(): UiState {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => serverState,
  );
}

export const openKitchen = () => set({ kitchenOpen: true, auth: null, avatarOpen: false });
export const closeKitchen = () => set({ kitchenOpen: false });
export const openAuth = (mode: AuthMode) => set({ auth: mode, kitchenOpen: false, avatarOpen: false });
export const closeAuth = () => set({ auth: null });
export const openAvatarPicker = () => set({ avatarOpen: true, kitchenOpen: false, auth: null });
export const closeAvatarPicker = () => set({ avatarOpen: false });
/** Short status line shown under the header, e.g. after signing out. */
export const showNotice = (notice: string) => set({ notice });
