"use client";

import { useId, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { avatarOf, type AvatarId } from "@/lib/avatars";
import { trackSupabase } from "@/lib/dev-mode";
import { createClient } from "@/lib/supabase/client";
import { useSessionUser } from "@/lib/supabase/use-session-user";
import { closeAvatarPicker, showNotice, useUi } from "@/lib/ui-store";
import { AvatarPicker } from "./avatar-picker";
import { Modal } from "./modal";

export function AvatarDialog() {
  const { avatarOpen } = useUi();
  const { user } = useSessionUser();
  const id = useId();
  return (
    <Modal open={avatarOpen && Boolean(user)} onClose={closeAvatarPicker} labelledBy={`${id}-title`} className="auth-dialog">
      {user && <AvatarForm key={user.id} user={user} titleId={`${id}-title`} />}
    </Modal>
  );
}

function AvatarForm({ user, titleId }: { user: User; titleId: string }) {
  const [avatar, setAvatar] = useState<AvatarId>(avatarOf(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const client = createClient();
    if (!client) return;
    setSaving(true);
    setError("");
    // Stored in Supabase user_metadata, so the avatar is the same on every device.
    const { error: updateError } = await trackSupabase("/auth/v1/user", "PUT", () => client.auth.updateUser({ data: { avatar } }));
    setSaving(false);
    if (updateError) {
      setError("Avataro išsaugoti nepavyko. Bandykite dar kartą.");
      return;
    }
    showNotice("Avataras pakeistas.");
    closeAvatarPicker();
  }

  return (
    <div className="auth-card">
      <button type="button" className="modal-close" onClick={closeAvatarPicker} aria-label="Uždaryti">×</button>
      <h2 id={titleId}>Keisti avatarą</h2>
      <p className="modal-sub">Pasirinktas avataras bus rodomas viršuje dešinėje visuose tavo įrenginiuose.</p>
      <AvatarPicker value={avatar} onChange={setAvatar} disabled={saving} legend="Pasirink avatarą" />
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={closeAvatarPicker} disabled={saving}>Atšaukti</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saugoma…" : "Išsaugoti avatarą"}</button>
      </div>
      {error && <p className="message message--error" role="alert">{error}</p>}
    </div>
  );
}
