/** Prepared autumn avatars in public/avatars. The choice lives in Supabase user_metadata.avatar. */
export const AVATARS = [
  { id: "lapas", label: "Lapas" },
  { id: "moliugas", label: "Moliūgas" },
  { id: "grybas", label: "Grybas" },
  { id: "obuolys", label: "Obuolys" },
  { id: "kava", label: "Kava" },
  { id: "gile", label: "Gilė" },
  { id: "kriause", label: "Kriaušė" },
  { id: "kastonas", label: "Kaštonas" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

export const DEFAULT_AVATAR: AvatarId = "lapas";

export function isAvatarId(value: unknown): value is AvatarId {
  return AVATARS.some((avatar) => avatar.id === value);
}

/** user_metadata can be edited by its owner, so unknown values fall back to the default. */
export function avatarOf(user: { user_metadata?: Record<string, unknown> } | null | undefined): AvatarId {
  const value = user?.user_metadata?.avatar;
  return isAvatarId(value) ? value : DEFAULT_AVATAR;
}

export function avatarSrc(id: AvatarId): string {
  return `/avatars/${id}.svg`;
}

export function avatarLabel(id: AvatarId): string {
  return AVATARS.find((avatar) => avatar.id === id)?.label ?? "Avataras";
}
