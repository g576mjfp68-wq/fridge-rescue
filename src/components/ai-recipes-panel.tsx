"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteAiRecipe,
  getMyAiRecipes,
  type AiRecipe,
} from "@/lib/ai-recipes";
import { AI_PREFERENCES } from "@/lib/ai-recipe";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { ArrowIcon } from "./icons";

export function AiRecipesPanel() {
  const { loading: userLoading, userId } = useAiUser();

  // Tagged with the owner so another user's list is never shown after switching accounts.
  const [owned, setOwned] = useState<{ userId: string | null; recipes: AiRecipe[] }>({ userId: null, recipes: [] });
  const recipes = !userLoading && userId && owned.userId === userId ? owned.recipes : [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !userId) return;
    const ownerId = userId;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getMyAiRecipes();

        if (active) {
          setOwned({ userId: ownerId, recipes: data });
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "Nepavyko gauti AI receptų.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [userId, userLoading]);

  async function removeRecipe(id: string) {
    if (!userId || deletingId) return;

    setDeletingId(id);
    setError("");

    try {
      await deleteAiRecipe(id, userId);

      setOwned((current) => ({
        ...current,
        recipes: current.recipes.filter((recipe) => recipe.id !== id),
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "AI recepto pašalinti nepavyko.",
      );
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <section
      className="results-section"
      aria-labelledby="ai-recipes-heading"
    >
      <div className="section-heading">
        <h2 id="ai-recipes-heading">
          Mano AI receptai
        </h2>

        <span>
          {userId
            ? `${recipes.length} išsaugota`
            : "Tavo pritaikyti receptai"}
        </span>
      </div>

      {userLoading || loading ? (
        <div className="recipe-grid" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-card" key={item}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : !userId ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden="true">
            ✨
          </div>

          <h3>Prisijunk, kad matytum savo AI receptus</h3>

          <p>
            Pritaikyk receptą su AI ir išsisaugok jį –
            čia galėsi prie jo grįžti vėliau.
          </p>
        </div>
      ) : error ? (
        <div
          className="state-panel error-panel"
          role="alert"
        >
          <span
            className="state-symbol"
            aria-hidden="true"
          >
            !
          </span>

          <h3>Nepavyko gauti AI receptų</h3>
          <p>{error}</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden="true">
            ✨
          </div>

          <h3>Dar neturi išsaugotų AI receptų</h3>

          <p>
            Atsidaryk receptą, pritaikyk jį su AI ir
            paspausk „💾 Išsaugoti pritaikytą receptą“.
          </p>
        </div>
      ) : (
        <div className="ai-grid">
          {recipes.map((recipe) => (
            <article className="ai-card" key={recipe.id} aria-labelledby={`ai-${recipe.id}`}>
              <span className="recipe-id">
                AI RECEPTAS · {new Date(recipe.created_at).toLocaleDateString("lt-LT")}
              </span>
              <h3 id={`ai-${recipe.id}`}>{recipe.original_recipe_name}</h3>
              <p className="ai-card-meta">
                {recipe.time_minutes} min · {recipe.servings} porc. · {AI_PREFERENCES[recipe.preference]}
              </p>
              <p className="ai-card-request">„{recipe.user_request}“</p>

              <div className="ai-card-actions">
                <Link className="btn btn-primary" href={`/ai-receptai/${recipe.id}`}>
                  Peržiūrėti receptą <ArrowIcon />
                </Link>
                {confirmId !== recipe.id && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    disabled={deletingId === recipe.id}
                    onClick={() => setConfirmId(recipe.id)}
                  >
                    Pašalinti
                  </button>
                )}
              </div>

              {confirmId === recipe.id && (
                <div className="confirm-box" role="group" aria-label="Patvirtinkite šalinimą">
                  <p>Pašalinti „{recipe.original_recipe_name}“ iš Mano AI receptų? Šio veiksmo atšaukti negalėsi.</p>
                  <div>
                    <button
                      type="button"
                      className="btn btn-terra btn-small"
                      disabled={deletingId === recipe.id}
                      onClick={() => void removeRecipe(recipe.id)}
                    >
                      {deletingId === recipe.id ? "Šalinama…" : "Taip, pašalinti"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-small" autoFocus onClick={() => setConfirmId(null)} disabled={deletingId === recipe.id}>
                      Atšaukti
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}