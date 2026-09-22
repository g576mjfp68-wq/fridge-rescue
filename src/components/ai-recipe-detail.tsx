"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyAiRecipe, type AiRecipe } from "@/lib/ai-recipes";
import { AI_PREFERENCES } from "@/lib/ai-recipe";
import { ArrowIcon } from "./icons";

export function AiRecipeDetail({ id }: { id: string }) {
  const [recipe, setRecipe] = useState<AiRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getMyAiRecipe(id);

        if (active) {
          setRecipe(data);
        }
      } catch (error) {
        if (active) {
          setError(
            error instanceof Error
              ? error.message
              : "AI recepto atidaryti nepavyko.",
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
  }, [id]);

  if (loading) {
    return (
      <div className="detail-page">
        <Link className="back-link" href="/">
          <ArrowIcon /> Grįžti į pradžią
        </Link>

        <div className="detail-loading" role="status">
          <span className="spinner" />
          <p>Kraunamas AI receptas…</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="detail-page">
        <Link className="back-link" href="/">
          <ArrowIcon /> Grįžti į pradžią
        </Link>

        <div className="state-panel error-panel" role="alert">
          <h1>AI recepto atidaryti nepavyko</h1>
          <p>{error || "AI receptas nerastas."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Link className="back-link" href="/">
        <ArrowIcon /> Grįžti į mano receptus
      </Link>

      <article>
        <section className="recipe-hero">
          <div className="recipe-intro">
            <p className="eyebrow">
              AI PRITAIKYTAS RECEPTAS
            </p>

            <h1>{recipe.original_recipe_name}</h1>

            <dl className="recipe-meta">
              <div>
                <dt>Laikas</dt>
                <dd>{recipe.time_minutes} min.</dd>
              </div>

              <div>
                <dt>Porcijos</dt>
                <dd>{recipe.servings}</dd>
              </div>

              <div>
                <dt>Pageidavimas</dt>
                <dd>
                  {AI_PREFERENCES[recipe.preference]}
                </dd>
              </div>
            </dl>

            <p className="recipe-id">
              SUKURTA ·{" "}
              {new Date(recipe.created_at).toLocaleDateString(
                "lt-LT",
              )}
            </p>
          </div>
        </section>

        <div className="recipe-content">
          <section className="ingredients">
            <div className="section-heading">
              <h2>Tavo prašymas</h2>
            </div>

            <p>{recipe.user_request}</p>
          </section>

          <section className="instructions">
            <h2>Pritaikytas receptas</h2>

            <div style={{ whiteSpace: "pre-wrap" }}>
              {recipe.ai_result}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}