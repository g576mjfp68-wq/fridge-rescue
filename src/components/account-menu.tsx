"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { avatarLabel, avatarOf, avatarSrc } from "@/lib/avatars";
import { trackSupabase } from "@/lib/dev-mode";
import { createClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/use-session-user";
import { openAuth, openAvatarPicker, showNotice } from "@/lib/ui-store";
import { BookIcon, ChevronIcon, FaceIcon, LogoutIcon, SparkIcon } from "./icons";

/** Top-right account area: sign-in buttons for guests, avatar menu for users. */
export function AccountMenu() {
  const { loading, user, configured } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    wrapper.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!configured) return null;
  if (loading) return <span className="account-placeholder" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="account-guest">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => openAuth("login")}>Prisijungti</button>
        <button type="button" className="btn btn-terra btn-small" onClick={() => openAuth("register")}>Registruotis</button>
      </div>
    );
  }

  const avatar = avatarOf(user);

  async function signOut() {
    const client = createClient();
    if (!client) return;
    setSigningOut(true);
    const { error } = await trackSupabase("/auth/v1/logout", "POST", () => client.auth.signOut());
    setSigningOut(false);
    setOpen(false);
    showNotice(error ? "Atsijungti nepavyko. Bandykite dar kartą." : "Jūs atsijungėte.");
  }

  function onMenuKey(event: React.KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(wrapper.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div className="account" ref={wrapper}>
      <button
        ref={button}
        type="button"
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Paskyros meniu (${user.email ?? "vartotojas"})`}
        onClick={() => setOpen((value) => !value)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
        <img src={avatarSrc(avatar)} alt="" width={36} height={36} data-avatar={avatar} />
        <ChevronIcon />
      </button>

      {open && (
        <div className="account-menu" role="menu" aria-label="Paskyra" onKeyDown={onMenuKey}>
          <div className="account-who">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
            <img src={avatarSrc(avatar)} alt={avatarLabel(avatar)} width={46} height={46} />
            <div><small>Prisijungta kaip</small><strong>{user.email}</strong></div>
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); openAvatarPicker(); }}><FaceIcon /> Keisti avatarą</button>
          <Link role="menuitem" href="/mano-receptai" onClick={() => setOpen(false)}><BookIcon /> Mano receptai</Link>
          <Link role="menuitem" href="/mano-ai-receptai" onClick={() => setOpen(false)}><SparkIcon /> Mano AI receptai</Link>
          <button type="button" role="menuitem" className="account-logout" onClick={signOut} disabled={signingOut}><LogoutIcon /> {signingOut ? "Atsijungiama…" : "Atsijungti"}</button>
        </div>
      )}
    </div>
  );
}
