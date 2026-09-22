"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClientApiError, fetchApi } from "@/lib/client-api";
import {
  isRecipeSaved,
  removeSavedRecipe,
  saveRecipe,
} from "@/lib/saved-recipes";
import { searchPath, type ApiOperation, type Meal } from "@/lib/types";
import { DeveloperMode } from "./developer-mode";
import { ArrowIcon } from "./icons";
import { MealPhoto } from "./meal-photo";
import { AiRecipePanel } from "./ai-recipe-panel";

export function RecipeDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const back = query
    ? searchPath(
        params.get("mode") === "name" ? "name" : "ingredient",
        query,
      )
    : "/";

  const [meal, setMeal] = useState<Meal>();
  const [operation, setOperation] = useState<ApiOperation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const pending = useRef(false);

  const [saved, setSaved] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      pending.current = true;
      setLoading(true);
      setMeal(undefined);
      setError("");
      setOperation(undefined);

      try {
        const response = await fetchApi<Meal>(
          `/api/recipes/${encodeURIComponent(id)}`,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setMeal(response.data);
        setOperation(response.operation);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Recepto gauti nepavyko.",
        );

        setOperation(
          error instanceof ClientApiError
            ? error.operation
            : undefined,
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          pending.current = false;
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [id, retry]);

  useEffect(() => {
    if (!meal) {
      setSaved(false);
      return;
    }

    let active = true;

    async function checkSavedState(mealId: string) {
      setCheckingSaved(true);
      setSaveError("");
      setSaveNotice("");

      try {
        const value = await isRecipeSaved(mealId);

        if (active) {
          setSaved(value);
        }
      } catch (error) {
        if (active) {
          setSaved(false);
          setSaveError(
            error instanceof Error
              ? error.message
              : "Nepavyko patikrinti, ar receptas išsaugotas.",
          );
        }
      } finally {
        if (active) {
          setCheckingSaved(false);
        }
      }
    }

    void checkSavedState(meal.id);

    return () => {
      active = false;
    };
  }, [meal]);

  async function handleSavedToggle() {
    if (!meal || saving) return;

    setSaving(true);
    setSaveError("");
    setSaveNotice("");

    try {
      if (saved) {
        await removeSavedRecipe(meal.id);
        setSaved(false);
        setSaveNotice("Receptas pašalintas iš išsaugotų.");
      } else {
        await saveRecipe(meal);
        setSaved(true);
        setSaveNotice("Receptas išsaugotas.");
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Nepavyko pakeisti recepto išsaugojimo būsenos.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-page">
      <Link className="back-link" href={back}>
        <ArrowIcon /> Grįžti į paiešką
      </Link>

      {loading ? (
        <div className="detail-loading" role="status">
          <span className="spinner" />
          <p>Kraunamas receptas…</p>
        </div>
      ) : error ? (
        <div className="state-panel error-panel" role="alert">
          <h1>Recepto atidaryti nepavyko</h1>
          <p>{error}</p>

          <button
            className="secondary-button"
            disabled={loading}
            onClick={() => {
              if (!pending.current) {
                pending.current = true;
                setLoading(true);
                setRetry((value) => value + 1);
              }
            }}
          >
            Bandyti dar kartą
          </button>
        </div>
      ) : (
        meal && (
          <article>
            <div className="recipe-hero">
              <div className="detail-photo">
                <MealPhoto
                  src={meal.image}
                  name={meal.name}
                  priority
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
              </div>

              <div className="recipe-intro">
                <p className="eyebrow">ATRASK. PARUOŠK. PARAGAUK.</p>
                <h1>{meal.name}</h1>

                <dl className="recipe-meta">
                  <div>
                    <dt>Kategorija</dt>
                    <dd>{meal.category || "Nenurodyta"}</dd>
                  </div>

                  <div>
                    <dt>Kilmė</dt>
                    <dd>{meal.area || "Nenurodyta"}</dd>
                  </div>
                </dl>

                <p className="recipe-id">
                  RECEPTO ID · {meal.id}
                </p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSavedToggle}
                  disabled={saving || checkingSaved}
                >
                  {checkingSaved
                    ? "Tikrinama…"
                    : saving
                      ? "Saugoma…"
                      : saved
                        ? "♥ Išsaugota – pašalinti"
                        : "♡ Išsaugoti receptą"}
                </button>

                {saveError && (
                  <p
                    className="auth-message auth-message--error"
                    role="alert"
                  >
                    {saveError}
                  </p>
                )}

                {saveNotice && (
                  <p
                    className="auth-message auth-message--success"
                    role="status"
                  >
                    {saveNotice}
                  </p>
                )}

                <p className="original-note">
                  Receptas iš TheMealDB.
                  <br />
                  Tekstas pateikiamas originalo kalba.
                </p>
              </div>
            </div>

            <div className="recipe-content">
              <section
                className="ingredients"
                aria-labelledby="ingredients-title"
              >
                <div className="section-heading">
                  <h2 id="ingredients-title">Ingredientai</h2>
                  <span>{meal.ingredients.length}</span>
                </div>

                {meal.ingredients.length ? (
                  <ul>
                    {meal.ingredients.map((ingredient, index) => (
                      <li key={`${index}-${ingredient.name}`}>
                        <span>{ingredient.name}</span>
                        <strong>
                          {ingredient.measure || "Kiekis nenurodytas"}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Ingredientai nenurodyti.</p>
                )}
              </section>

              <section
                className="instructions"
                aria-labelledby="instructions-title"
              >
                <h2 id="instructions-title">
                  Gaminimo instrukcija
                </h2>

                {meal.instructions ? (
                  meal.instructions
                    .split(/\r?\n/)
                    .map((paragraph, index) =>
                      paragraph.trim() ? (
                        <p key={index}>{paragraph}</p>
                      ) : null,
                    )
                ) : (
                  <p>Gaminimo instrukcija nenurodyta.</p>
                )}
              </section>
            </div>
            <AiRecipePanel key={meal.id} recipeId={meal.id} />
          </article>
        )
      )}

      <DeveloperMode operation={operation} />
    </div>
  );
}
