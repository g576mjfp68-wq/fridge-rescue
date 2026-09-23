"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackSupabase } from "@/lib/dev-mode";
import { DEFAULT_AVATAR, type AvatarId } from "@/lib/avatars";
import { closeAuth, openAuth, showNotice, useUi, type AuthMode } from "@/lib/ui-store";
import { AvatarPicker } from "./avatar-picker";
import { Modal } from "./modal";

function formatAuthError(error: { message?: string; status?: number; code?: string } | null | undefined, mode: AuthMode) {
  if (!error) {
    return mode === "register" ? "Registracija nepavyko. Bandykite dar kartą." : "Prisijungti nepavyko. Bandykite dar kartą.";
  }

  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "weak_password" || (message.includes("password") && message.includes("least"))) {
    return "Slaptažodis netinkamas. Naudokite mažiausiai 6 simbolius.";
  }
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists") || message.includes("user already")) {
    return "Vartotojas jau egzistuoja. Bandykite prisijungti arba naudokite kitą el. paštą.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials") || message.includes("invalid_credentials") || message.includes("wrong") || message.includes("not found")) {
    return "Neteisingi prisijungimo duomenys. Patikrinkite el. paštą ir slaptažodį.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed") || message.includes("confirm your email") || message.includes("confirm your account")) {
    return "Patvirtinkite el. pašto adresą. Patikrinkite pašto dėžutę ir sekite instrukcijas.";
  }
  if (code === "over_email_send_rate_limit" || error.status === 429) {
    return "Per daug bandymų. Palaukite kelias minutes ir bandykite dar kartą.";
  }
  return mode === "register"
    ? "Registracija nepavyko. Patikrinkite įvestus duomenis ir bandykite dar kartą."
    : "Prisijungti nepavyko. Patikrinkite duomenis ir bandykite dar kartą.";
}

export function AuthDialog() {
  const { auth } = useUi();
  const id = useId();
  return (
    <Modal open={auth !== null} onClose={closeAuth} labelledBy={`${id}-title`} className="auth-dialog">
      {auth && <AuthForm key={auth} mode={auth} titleId={`${id}-title`} />}
    </Modal>
  );
}

function AuthForm({ mode, titleId }: { mode: AuthMode; titleId: string }) {
  const client = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>(DEFAULT_AVATAR);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!client) {
      setError("Supabase nėra sukonfigūruotas. Pridėkite NEXT_PUBLIC_SUPABASE_URL ir NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Įveskite el. paštą ir slaptažodį.");
      return;
    }
    if (password.length < 6) {
      setError("Slaptažodis netinkamas. Naudokite mažiausiai 6 simbolius.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        // The avatar goes to user_metadata, so it follows the user to other devices.
        const { data, error: signUpError } = await trackSupabase("/auth/v1/signup", "POST", () => client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { avatar } },
        }));
        if (signUpError) {
          setError(formatAuthError(signUpError, "register"));
          return;
        }
        // With email confirmation on, Supabase answers an already registered
        // address with HTTP 200, no session and an empty identities list.
        if (data.user && !data.session && data.user.identities?.length === 0) {
          setError(formatAuthError({ code: "user_already_exists" }, "register"));
          return;
        }
        if (data.user && !data.session) {
          setNotice("Registracija sėkminga. Patvirtinkite el. pašto adresą, kad galėtumėte prisijungti.");
          setPassword("");
          return;
        }
        showNotice("Registracija sėkminga. Jūs prisijungėte.");
        closeAuth();
        return;
      }

      const { error: signInError } = await trackSupabase("/auth/v1/token?grant_type=password", "POST", () => client.auth.signInWithPassword({
        email: email.trim(),
        password,
      }));
      if (signInError) {
        setError(formatAuthError(signInError, "login"));
        return;
      }
      showNotice("Sėkmingai prisijungta.");
      closeAuth();
    } finally {
      setSubmitting(false);
    }
  }

  const register = mode === "register";

  return (
    <div className="auth-card">
      <button type="button" className="modal-close" onClick={closeAuth} aria-label="Uždaryti">×</button>
      <h2 id={titleId}>{register ? "Susikurk paskyrą" : "Sveiki sugrįžę"}</h2>
      <p className="modal-sub">Išsaugok receptus, savo virtuvės produktus ir AI pritaikymus.</p>

      <div className="segmented" role="tablist" aria-label="Paskyros veiksmas">
        <button type="button" role="tab" aria-selected={!register} onClick={() => openAuth("login")}>Prisijungti</button>
        <button type="button" role="tab" aria-selected={register} onClick={() => openAuth("register")}>Registruotis</button>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        <label>
          <span>El. paštas</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="vardas@pastas.lt" required disabled={submitting} />
        </label>
        <label>
          <span>Slaptažodis</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? "new-password" : "current-password"} placeholder="Mažiausiai 6 simboliai" required disabled={submitting} />
        </label>

        {register && (
          <AvatarPicker
            value={avatar}
            onChange={setAvatar}
            disabled={submitting}
            legend={<>Pasirink avatarą <span className="optional">(nebūtina – vėliau galėsi pakeisti)</span></>}
          />
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Kraunama…" : register ? "Registruotis" : "Prisijungti"}
        </button>
      </form>

      {error && <p className="message message--error" role="alert">{error}</p>}
      {notice && <p className="message message--success" role="status">{notice}</p>}
    </div>
  );
}
