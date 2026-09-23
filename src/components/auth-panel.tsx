"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { trackSupabase } from "@/lib/dev-mode";

type AuthMode = "login" | "register";

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

  if (mode === "register") {
    return "Registracija nepavyko. Patikrinkite įvestus duomenis ir bandykite dar kartą.";
  }

  return "Prisijungti nepavyko. Patikrinkite duomenis ir bandykite dar kartą.";
}

export function AuthPanel() {
  const client = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!client) return;

    let active = true;

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setError(formatAuthError(error, "login"));
      }
      setUser(data.session?.user ?? null);
      setSessionLoaded(true);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") {
        setNotice("Jūs atsijungėte.");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const submitLabel = useMemo(() => mode === "login" ? "Prisijungti" : "Registruotis", [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        const { data, error: signUpError } = await trackSupabase("/auth/v1/signup", "POST", () => client.auth.signUp({
          email: email.trim(),
          password,
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
          setEmail("");
          setPassword("");
          return;
        }

        setUser(data.user ?? null);
        setNotice("Registracija sėkminga. Jūs prisijungėte.");
        setEmail("");
        setPassword("");
        return;
      }

      const { data, error: signInError } = await trackSupabase("/auth/v1/token?grant_type=password", "POST", () => client.auth.signInWithPassword({
        email: email.trim(),
        password,
      }));

      if (signInError) {
        setError(formatAuthError(signInError, "login"));
        return;
      }

      setUser(data.user ?? null);
      setNotice("Sėkmingai prisijungta.");
      setEmail("");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!client) return;

    setSubmitting(true);
    const { error } = await trackSupabase("/auth/v1/logout", "POST", () => client.auth.signOut());
    setSubmitting(false);

    if (error) {
      setError(formatAuthError(error, "login"));
      return;
    }

    setUser(null);
    setError("");
    setNotice("Jūs atsijungėte.");
  }

  if (!client) {
    return <section className="auth-panel auth-panel--offline"><h2>Supabase konfigūracija</h2><p>Pridėkite `NEXT_PUBLIC_SUPABASE_URL` ir `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.</p></section>;
  }

  if (!sessionLoaded) {
    return <section className="auth-panel" aria-live="polite"><p>Tikrinama prisijungimo būsena…</p></section>;
  }

  return (
    <section className="auth-panel" aria-label="Supabase autentifikacija">
      <div className="auth-header">
        <div>
          <p className="auth-label">Paskyra</p>
          <h2>{user ? "Prisijungta" : "Prisijunkite arba susikurkite paskyrą"}</h2>
        </div>
        {user && <button type="button" className="secondary-button auth-signout" onClick={handleSignOut} disabled={submitting}>Atsijungti</button>}
      </div>

      {user ? (
        <div className="auth-status auth-status--success" role="status" aria-live="polite">
          <strong>Prisijungta kaip:</strong>
          <span>{user.email ?? "Vartotojas"}</span>
        </div>
      ) : (
        <div className="auth-toggle" role="tablist" aria-label="Autentifikacijos režimai">
          <button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>
            Prisijungti
          </button>
          <button type="button" className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(""); setNotice(""); }}>
            Registruotis
          </button>
        </div>
      )}

      {!user && (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>El. paštas</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="vardas@example.com" required disabled={submitting} />
          </label>

          <label>
            <span>Slaptažodis</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mažiausiai 6 simboliai" required disabled={submitting} />
          </label>

          <button type="submit" className="primary-button auth-submit" disabled={submitting}>
            {submitting ? "Kraunama…" : submitLabel}
          </button>
        </form>
      )}

      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      {notice && <p className="auth-message auth-message--success" role="status">{notice}</p>}
    </section>
  );
}
