"use client";

import { useRef, useState } from "react";
import { lithuanianName } from "@/lib/ingredients-lt";
import { notifyKitchenChanged, useKitchenProducts } from "@/lib/kitchen-store";
import { isStaple, matchKitchen } from "@/lib/kitchen-match";
import { addShoppingItems, getShoppingItems } from "@/lib/shopping";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { openAuth, openKitchen } from "@/lib/ui-store";
import type { Meal } from "@/lib/types";

/** Ingredient list with Lithuanian names and, for signed-in users, what "Mano virtuvė" already has. */
export function IngredientsSection({ meal }: { meal: Meal }) {
  const { userId, loading: userLoading } = useAiUser();
  const products = useKitchenProducts();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const pending = useRef(false);

  const names = meal.ingredients.map((ingredient) => ingredient.name);
  const match = products ? matchKitchen(names, products) : null;
  const status = (name: string) => (!match || isStaple(name) ? null : match.have.includes(name) ? "have" : "missing");

  async function addMissing() {
    if (!userId || !match?.missing.length || pending.current) return;
    pending.current = true;
    setAdding(true);
    setMessage(null);
    try {
      // Lithuanian names where the dictionary knows them, e.g. "Carrots" → "morkos".
      const wanted = match.missing.map((name) => lithuanianName(name) ?? name);
      const existing = await getShoppingItems(userId);
      const { added, skipped } = await addShoppingItems(wanted, meal.name, existing, userId);
      notifyKitchenChanged();
      setMessage({
        kind: "success",
        text: [
          added.length ? `Į pirkinių sąrašą įdėta: ${added.length}.` : "",
          skipped.length ? `Jau buvo sąraše: ${skipped.join(", ")}.` : "",
        ].filter(Boolean).join(" "),
      });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Į pirkinių sąrašą įdėti nepavyko." });
    } finally {
      pending.current = false;
      setAdding(false);
    }
  }

  return (
    <section className="ingredients" aria-labelledby="ingredients-title">
      <div className="section-heading">
        <h2 id="ingredients-title">Ingredientai</h2>
        <span>{meal.ingredients.length}</span>
      </div>

      {match && match.total > 0 ? (
        <div className="kitchen-summary" role="status">
          <p>
            <strong>Turi {match.have.length} iš {match.total}</strong> ingredientų pagal „Mano virtuvę“
            {match.missing.length === 0 && " – gali gaminti iškart!"}
          </p>
          {match.missing.length > 0 && (
            <button type="button" className="btn btn-terra btn-small" onClick={addMissing} disabled={adding}>
              {adding ? "Dedama…" : `Įdėti trūkstamus (${match.missing.length}) į pirkinių sąrašą`}
            </button>
          )}
          {message && (
            <p className={`message message--${message.kind}`}>
              {message.text}{" "}
              {message.kind === "success" && <button type="button" className="link-button" onClick={openKitchen}>Atidaryti sąrašą</button>}
            </p>
          )}
        </div>
      ) : !userLoading && !userId ? (
        <p className="kitchen-summary kitchen-summary--guest">
          <button type="button" className="link-button" onClick={() => openAuth("login")}>Prisijunk</button>, kad matytum, kuriuos ingredientus jau turi.
        </p>
      ) : null}

      {meal.ingredients.length ? (
        <ul>
          {meal.ingredients.map((ingredient, index) => {
            const lt = lithuanianName(ingredient.name);
            const state = status(ingredient.name);
            return (
              <li key={`${index}-${ingredient.name}`} className={state ? `is-${state}` : undefined}>
                <span>
                  {state && (
                    <>
                      <b className="ingredient-status" aria-hidden="true">{state === "have" ? "✓" : "✗"}</b>
                      <span className="sr-only">{state === "have" ? "Turi: " : "Trūksta: "}</span>
                    </>
                  )}
                  {/* Lithuanian first where the dictionary knows it; the original name stays below. */}
                  <span className="ingredient-name">
                    {lt ? <><span lang="lt">{lt}</span><small lang="en">{ingredient.name}</small></> : ingredient.name}
                  </span>
                </span>
                <strong>{ingredient.measure || "Kiekis nenurodytas"}</strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Ingredientai nenurodyti.</p>
      )}
    </section>
  );
}
