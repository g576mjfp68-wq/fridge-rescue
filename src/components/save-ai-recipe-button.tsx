"use client";

import { useEffect, useRef, useState } from "react";
import { saveAiRecipe, type NewAiRecipe } from "@/lib/ai-recipes";
import { useAiUser } from "@/lib/supabase/use-ai-user";

export function SaveAiRecipeButton({ recipe }: { recipe: NewAiRecipe }) {
  const { loading, userId } = useAiUser();
  if (loading) return <p role="status">Tikrinama prisijungimo būsena…</p>;
  if (!userId) return <p>Norėdami išsaugoti pritaikytą receptą, prisijunkite pagrindiniame puslapyje.</p>;
  return <SaveAction key={userId} recipe={recipe} userId={userId} />;
}

function SaveAction({ recipe, userId }: { recipe: NewAiRecipe; userId: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  async function save() {
    if (pending.current || saved) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await saveAiRecipe(recipe, userId);
      if (active.current) setSaved(true);
    } catch (error) {
      if (active.current) setError(error instanceof Error ? error.message : "AI recepto išsaugoti nepavyko.");
    } finally {
      pending.current = false;
      if (active.current) setSaving(false);
    }
  }

  return <div>
    <button type="button" className="secondary-button" disabled={saving || saved} onClick={save}>
      {saving ? "Saugoma…" : saved ? "✓ Receptas išsaugotas" : "💾 Išsaugoti pritaikytą receptą"}
    </button>
    {saved && <p className="auth-message auth-message--success" role="status">Receptas išsaugotas. Jį rasite pagrindinio puslapio skiltyje „Mano AI receptai“.</p>}
    {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
  </div>;
}
