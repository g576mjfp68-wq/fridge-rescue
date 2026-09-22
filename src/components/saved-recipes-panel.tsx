"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getSavedRecipes,
  type SavedRecipe,
} from "@/lib/saved-recipes";
import { ArrowIcon } from "./icons";
import { MealPhoto } from "./meal-photo";

type PanelState =
  | "loading"
  | "guest"
  | "ready"
  | "error";

export function SavedRecipesPanel() {
  const client = useMemo(() => createClient(), []);

  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [state, setState] = useState<PanelState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) {
      setState("error");
      setError("Supabase nėra sukonfigūruotas.");
      return;
    }

    const supabase = client;
    let active = true;

    async function loadSavedRecipes() {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setRecipes([]);
        setState("guest");
        return;
      }

      setState("loading");

      try {
        const data = await getSavedRecipes();

        if (!active) return;

        setRecipes(data);
        setState("ready");
      } catch (error) {
        if (!active) return;

        setRecipes([]);
        setState("error");
        setError(
          error instanceof Error
            ? error.message
            : "Nepavyko gauti išsaugotų receptų.",
        );
      }
    }

    void loadSavedRecipes();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadSavedRecipes();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  return (
    <section
      className="results-section saved-recipes-section"
      aria-labelledby="saved-recipes-heading"
    >
      <div className="section-heading">
        <h2 id="saved-recipes-heading">
          Mano išsaugoti receptai
        </h2>

        <span>
          {state === "ready"
            ? `${recipes.length} išsaugota`
            : "Tavo mėgstamiausi vienoje vietoje"}
        </span>
      </div>

      {state === "loading" ? (
        <div className="recipe-grid" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-card" key={item}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : state === "guest" ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden="true">
            ♡
          </div>

          <h3>
            Prisijunk ir išsisaugok mėgstamus receptus
          </h3>

          <p>
            Recepto puslapyje paspausk „♡ Išsaugoti receptą“,
            o čia visada rasi savo išsaugotas idėjas.
          </p>
        </div>
      ) : state === "error" ? (
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

          <h3>Nepavyko gauti išsaugotų receptų</h3>

          <p>{error}</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="state-panel">
          <div className="state-icon" aria-hidden="true">
            ♡
          </div>

          <h3>Dar neturi išsaugotų receptų</h3>

          <p>
            Atrask patinkantį receptą ir paspausk
            „♡ Išsaugoti receptą“.
          </p>
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe, index) => (
            <Link
              className="recipe-card"
              key={recipe.id}
              href={`/receptai/${recipe.meal_id}`}
              prefetch={false}
            >
              <div className="card-photo">
                <MealPhoto
                  src={recipe.meal_image}
                  name={recipe.meal_name}
                  priority={index < 3}
                  sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                />

                <span
                  className="card-view"
                  aria-hidden="true"
                >
                  <ArrowIcon />
                </span>
              </div>

              <div className="card-body">
                <span className="recipe-id">
                  IŠSAUGOTAS · {recipe.meal_id}
                </span>

                <h3>{recipe.meal_name}</h3>

                <span className="card-action">
                  Peržiūrėti receptą <ArrowIcon />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}