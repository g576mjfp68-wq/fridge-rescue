"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClientApiError, fetchApi } from "@/lib/client-api";
import { searchPath, type ApiOperation, type Meal } from "@/lib/types";
import { DeveloperMode } from "./developer-mode";
import { ArrowIcon } from "./icons";
import { MealPhoto } from "./meal-photo";

export function RecipeDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const back = query ? searchPath(params.get("mode") === "name" ? "name" : "ingredient", query) : "/";
  const [meal, setMeal] = useState<Meal>();
  const [operation, setOperation] = useState<ApiOperation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      pending.current = true;
      setLoading(true);
      setMeal(undefined);
      setError("");
      setOperation(undefined);
      try {
        const response = await fetchApi<Meal>(`/api/recipes/${encodeURIComponent(id)}`, controller.signal);
        if (controller.signal.aborted) return;
        setMeal(response.data);
        setOperation(response.operation);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "Recepto gauti nepavyko.");
        setOperation(error instanceof ClientApiError ? error.operation : undefined);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          pending.current = false;
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [id, retry]);

  return <div className="detail-page">
    <Link className="back-link" href={back}><ArrowIcon /> Grįžti į paiešką</Link>
    {loading ? <div className="detail-loading" role="status"><span className="spinner" /><p>Kraunamas receptas…</p></div> : error ? <div className="state-panel error-panel" role="alert"><h1>Recepto atidaryti nepavyko</h1><p>{error}</p><button className="secondary-button" disabled={loading} onClick={() => { if (!pending.current) { pending.current = true; setLoading(true); setRetry((value) => value + 1); } }}>Bandyti dar kartą</button></div> : meal && <article>
      <div className="recipe-hero"><div className="detail-photo"><MealPhoto src={meal.image} name={meal.name} priority sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="recipe-intro"><p className="eyebrow">ATRASK. PARUOŠK. PARAGAUK.</p><h1>{meal.name}</h1><dl className="recipe-meta"><div><dt>Kategorija</dt><dd>{meal.category || "Nenurodyta"}</dd></div><div><dt>Kilmė</dt><dd>{meal.area || "Nenurodyta"}</dd></div></dl><p className="recipe-id">RECEPTO ID · {meal.id}</p><p className="original-note">Receptas iš TheMealDB.<br />Tekstas pateikiamas originalo kalba.</p></div></div>
      <div className="recipe-content"><section className="ingredients" aria-labelledby="ingredients-title"><div className="section-heading"><h2 id="ingredients-title">Ingredientai</h2><span>{meal.ingredients.length}</span></div>{meal.ingredients.length ? <ul>{meal.ingredients.map((ingredient, index) => <li key={`${index}-${ingredient.name}`}><span>{ingredient.name}</span><strong>{ingredient.measure || "Kiekis nenurodytas"}</strong></li>)}</ul> : <p>Ingredientai nenurodyti.</p>}</section><section className="instructions" aria-labelledby="instructions-title"><h2 id="instructions-title">Gaminimo instrukcija</h2>{meal.instructions ? meal.instructions.split(/\r?\n/).map((paragraph, index) => paragraph.trim() ? <p key={index}>{paragraph}</p> : null) : <p>Gaminimo instrukcija nenurodyta.</p>}</section></div>
    </article>}
    <DeveloperMode operation={operation} />
  </div>;
}
