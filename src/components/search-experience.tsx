"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ClientApiError, fetchApi } from "@/lib/client-api";
import { recordOperations } from "@/lib/dev-mode";
import { MAX_PRODUCT_LENGTH, MAX_PRODUCTS, splitProducts } from "@/lib/ingredients-lt";
import {
  searchPath,
  type ProductMatch,
  type SearchData,
  type SearchMeal,
  type SearchMode,
} from "@/lib/types";
import { getSavedRecipes, removeSavedRecipe, saveRecipe } from "@/lib/saved-recipes";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { openAuth, openKitchen } from "@/lib/ui-store";
import { ArrowIcon, HeartIcon, PotIcon, SearchIcon } from "./icons";
import { MealPhoto } from "./meal-photo";

type SearchResult = {
  meals: SearchMeal[];
  match?: SearchData["match"];
  products?: ProductMatch[];
  error?: string;
};

const CACHE_KEY = "fridge-rescue:last-search:v2";
const EXAMPLES = ["vištiena", "vištiena, bulvės, sūris", "jautiena, svogūnai"];

export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get("q")?.trim() ?? "";

  const mode: SearchMode =
    params.get("mode") === "name" ? "name" : "ingredient";

  const key = `${mode}:${query}`;

  const [draft, setDraft] = useState(query);
  const [draftMode, setDraftMode] = useState<SearchMode>(mode);
  const [result, setResult] = useState<SearchResult>({
    meals: [],
  });
  const [loading, setLoading] = useState(Boolean(query));
  const [validation, setValidation] = useState("");
  const [retry, setRetry] = useState(0);

  const { userId } = useAiUser();
  // Saved meal IDs, tagged with their owner so another account never sees them.
  const [saved, setSaved] = useState<{ owner: string | null; ids: Set<string> }>({ owner: null, ids: new Set() });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const savedIds = userId && saved.owner === userId ? saved.ids : new Set<string>();

  useEffect(() => {
    if (!userId) return;
    const owner = userId;
    let active = true;
    getSavedRecipes()
      .then((recipes) => { if (active) setSaved({ owner, ids: new Set(recipes.map((recipe) => recipe.meal_id)) }); })
      .catch(() => { /* Hearts simply start empty; saving still reports errors. */ });
    return () => { active = false; };
  }, [userId]);

  async function toggleSaved(meal: SearchMeal) {
    if (!userId) {
      openAuth("login");
      return;
    }
    setSavingId(meal.id);
    setSaveMessage("");
    const wasSaved = savedIds.has(meal.id);
    try {
      if (wasSaved) await removeSavedRecipe(meal.id);
      else await saveRecipe(meal);
      setSaved((current) => {
        const ids = new Set(current.owner === userId ? current.ids : []);
        if (wasSaved) ids.delete(meal.id);
        else ids.add(meal.id);
        return { owner: userId, ids };
      });
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Recepto išsaugoti nepavyko.");
    } finally {
      setSavingId(null);
    }
  }

  const pending = useRef(false);
  const sequence = useRef(0);
  const skipCache = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const current = ++sequence.current;

    const isCurrent = () =>
      !controller.signal.aborted &&
      current === sequence.current;

    async function load() {
      setDraft(query);
      setDraftMode(mode);
      setValidation("");

      if (!query) {
        pending.current = false;
        setLoading(false);
        setResult({ meals: [] });
        return;
      }

      if (!skipCache.current) {
        try {
          const cached = JSON.parse(
            sessionStorage.getItem(CACHE_KEY) || "null",
          );

          if (
            cached?.key === key &&
            Array.isArray(cached.meals) &&
            Date.now() - cached.savedAt < 30 * 60_000
          ) {
            setResult({
              meals: cached.meals,
              match: cached.match,
              products: cached.products,
            });

            setLoading(false);
            pending.current = false;
            return;
          }
        } catch {
          // Paieška veikia ir tada, kai browser storage neprieinamas.
        }
      }

      skipCache.current = false;
      pending.current = true;

      setLoading(true);
      setResult({ meals: [] });

      try {
        const response = await fetchApi<SearchData>(
          `/api/recipes?${new URLSearchParams({
            mode,
            q: query,
          })}`,
          controller.signal,
        );

        if (!isCurrent()) return;

        const { meals, match, products } = response.data!;
        recordOperations(response.operations ?? [response.operation]);

        setResult({ meals, match, products });

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              key,
              meals,
              match,
              products,
              savedAt: Date.now(),
            }),
          );
        } catch {
          // URL išlaiko paiešką net jei storage neveikia.
        }
      } catch (error) {
        if (!isCurrent()) return;

        if (error instanceof ClientApiError) recordOperations([error.operation]);
        setResult({
          meals: [],
          error:
            error instanceof Error
              ? error.message
              : "Paieška nepavyko.",
        });
      } finally {
        if (isCurrent()) {
          setLoading(false);
          pending.current = false;
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [query, mode, key, retry]);

  function startSearch(
    value = draft,
    selectedMode = draftMode,
  ) {
    if (pending.current) return;

    const trimmed = value.trim();

    if (!trimmed) {
      setValidation(
        selectedMode === "ingredient"
          ? "Įveskite bent vieną produktą, pavyzdžiui, vištiena."
          : "Įveskite patiekalo pavadinimą angliškai.",
      );
      input.current?.focus();
      return;
    }

    const products = splitProducts(trimmed);
    if (
      trimmed.length > 100 ||
      (selectedMode === "ingredient" &&
        (products.length === 0 ||
          products.length > MAX_PRODUCTS ||
          products.some((product) => product.length > MAX_PRODUCT_LENGTH)))
    ) {
      setValidation(
        selectedMode === "ingredient"
          ? `Įveskite iki ${MAX_PRODUCTS} produktų, atskirtų kableliais, kiekvieną iki ${MAX_PRODUCT_LENGTH} simbolių.`
          : "Pavadinimas turi būti ne ilgesnis nei 100 simbolių.",
      );
      input.current?.focus();
      return;
    }

    pending.current = true;

    setValidation("");
    setLoading(true);
    setDraft(trimmed);
    setDraftMode(selectedMode);

    if (
      trimmed === query &&
      selectedMode === mode
    ) {
      skipCache.current = true;
      setRetry((value) => value + 1);
    } else {
      router.push(
        searchPath(selectedMode, trimmed),
        { scroll: false },
      );
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startSearch();
  }

  const recognizedCount = result.products?.filter((product) => product.recognized).length ?? 0;
  const showMatch = mode === "ingredient" && recognizedCount > 1;

  return (
    <>
      <section className={`hero ${query ? "hero--searched" : ""}`} aria-labelledby="hero-heading">
        <div className="hero-main">
          <p className="eyebrow">Rudens virtuvė</p>
          <h1 id="hero-heading">
            Ką gaminsi iš to, ką <em>jau turi</em>?
          </h1>
          <p className="hero-lead">
            Įvesk kelis produktus lietuviškai – surasime receptus ir parodysime, kiek jie atitinka.
          </p>

          <section className="search-panel" aria-label="Receptų paieška">
            <form onSubmit={submit} noValidate>
              <fieldset className="segmented search-modes" disabled={loading}>
                <legend className="sr-only">Paieškos būdas</legend>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="ingredient"
                    checked={draftMode === "ingredient"}
                    onChange={() => { setDraftMode("ingredient"); setValidation(""); }}
                  />
                  <span>Pagal produktus</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    value="name"
                    checked={draftMode === "name"}
                    onChange={() => { setDraftMode("name"); setValidation(""); }}
                  />
                  <span>Pagal pavadinimą</span>
                </label>
              </fieldset>

              <label className="input-label" htmlFor="recipe-query">
                {draftMode === "ingredient" ? "Kokius produktus turi?" : "Kokio patiekalo ieškai?"}
              </label>

              <div className={`search-row ${validation ? "has-error" : ""}`}>
                <div className="input-wrap">
                  <SearchIcon />
                  <input
                    ref={input}
                    id="recipe-query"
                    name="q"
                    type="search"
                    value={draft}
                    disabled={loading}
                    onChange={(event) => { setDraft(event.target.value); setValidation(""); }}
                    maxLength={100}
                    placeholder={draftMode === "ingredient" ? "Pvz., vištiena, bulvės, sūris" : "Pvz., Arrabiata"}
                    aria-describedby={`search-hint${validation ? " search-validation" : ""}`}
                    aria-invalid={Boolean(validation)}
                    autoComplete="off"
                  />
                </div>
                <button className="btn btn-search" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner" aria-hidden="true" /> Ieškoma…</> : <>Ieškoti receptų <ArrowIcon /></>}
                </button>
              </div>

              <p className="search-hint" id="search-hint">
                {draftMode === "ingredient" ? (
                  <>
                    Rašyk <strong>lietuviškai</strong> – kelis produktus (iki {MAX_PRODUCTS}) atskirk kableliais,
                    pvz., <em>vištiena, bulvės, sūris</em>. Tinka ir angliški pavadinimai.
                  </>
                ) : (
                  <>Ieškok <strong>angliškai</strong> – visą patiekalo pavadinimą arba jo dalį.</>
                )}
              </p>

              {validation && (
                <p className="field-error" id="search-validation" role="alert">{validation}</p>
              )}

              <div className="examples">
                <span>Išbandyk:</span>
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" disabled={loading} onClick={() => startSearch(example, "ingredient")}>
                    {example}
                  </button>
                ))}
              </div>
            </form>
          </section>
        </div>

        <div className="hero-photo">
          <Image src="/hero.jpg" alt="Moliūgai ir hurmos ant medinės pjaustymo lentelės" fill priority sizes="(max-width: 900px) 100vw, 40vw" />
          <button type="button" className="kitchen-pill" onClick={openKitchen} aria-haspopup="dialog">
            <PotIcon />
            <span><strong>Mano virtuvė</strong> · produktai, kuriuos turi</span>
            <span className="kitchen-pill-action">Atidaryti</span>
          </button>
        </div>
      </section>

      {!query ? (
        <section className="how-it-works" aria-label="Kaip tai veikia">
          <ol>
            <li><b>1</b> Įvesk kelis produktus lietuviškai</li>
            <li><b>2</b> Pasirink receptą – matysi, kiek jis atitinka</li>
            <li><b>3</b> Pritaikyk su AI pagal savo virtuvę ir išsisaugok</li>
          </ol>
        </section>
      ) : (
        <section className="results-section" aria-labelledby="results-heading" aria-busy={loading}>
          <div className="section-heading">
            <h2 id="results-heading">Tavo atradimai</h2>
            <span>
              {!loading && !result.error
                ? `${result.meals.length} receptų${showMatch ? " · rūšiuota pagal atitikimą" : ""}`
                : "Įkvėpimas iš TheMealDB"}
            </span>
          </div>

          <div className="sr-only" role="status" aria-live="polite">
            {loading ? "Ieškoma receptų." : !result.error ? `Rasta receptų: ${result.meals.length}.` : ""}
          </div>

          {loading ? (
            <div className="recipe-grid" aria-hidden="true">
              {[1, 2, 3].map((item) => (
                <div className="skeleton-card" key={item}><div /><span /><span /></div>
              ))}
            </div>
          ) : result.error ? (
            <div className="state-panel error-panel" role="alert">
              <span className="state-symbol" aria-hidden="true">!</span>
              <h3>Nepavyko gauti receptų</h3>
              <p>{result.error}</p>
              <button className="btn btn-ghost" onClick={() => startSearch(query, mode)}>Bandyti dar kartą</button>
            </div>
          ) : result.meals.length === 0 ? (
            <>
              <ProductSummary products={result.products} />
              <div className="state-panel">
                <div className="state-icon"><SearchIcon /></div>
                <h3>Receptų nerasta</h3>
                <p>
                  Pagal „{query}“ nieko neradome.
                  {mode === "ingredient"
                    ? " Patikrink produktų rašybą arba išbandyk kitus produktus."
                    : " Patikrink anglišką rašybą arba išbandyk kitą pavadinimą."}
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="results-caption">
                {mode === "ingredient" ? "Produktai" : "Pavadinimas"}: <strong>{query}</strong>
              </p>

              <ProductSummary products={result.products} />

              {mode === "ingredient" && result.match === "partial" && (
                <p className="match-banner match-banner--partial" role="status">
                  Receptų su visais produktais nerasta. Rodomi daliniai atitikmenys – daugiausiai produktų atitinkantys pirmi.
                </p>
              )}
              {showMatch && result.match === "all" && (
                <p className="match-banner" role="status">Visi receptai atitinka visus atpažintus produktus.</p>
              )}
              {saveMessage && <p className="message message--error" role="alert">{saveMessage}</p>}

              <div className="recipe-grid">
                {result.meals.map((meal, index) => {
                  const missing = showMatch
                    ? (result.products ?? []).filter((product) => product.recognized && !meal.matched?.includes(product.input)).map((product) => product.input)
                    : [];
                  const isSaved = savedIds.has(meal.id);
                  return (
                    <article className="recipe-tile" key={meal.id}>
                      <Link
                        className="recipe-card"
                        href={`/receptai/${meal.id}?${new URLSearchParams({ mode, q: query })}`}
                        prefetch={false}
                      >
                        <div className="card-photo">
                          <MealPhoto
                            src={meal.image}
                            name={meal.name}
                            priority={index < 3}
                            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                          />
                          {showMatch && meal.matched && (
                            <span className={`match-badge ${missing.length ? "is-partial" : ""}`}>
                              {missing.length ? `Atitinka ${meal.matched.length} iš ${recognizedCount}` : `Atitinka visus ${recognizedCount}`}
                            </span>
                          )}
                        </div>
                        <div className="card-body">
                          <span className="recipe-id">RECEPTO ID · {meal.id}</span>
                          <h3>{meal.name}</h3>
                          {showMatch && meal.matched && (
                            <ul className="match-tags" aria-label="Atitikimas">
                              {meal.matched.map((product) => <li key={product}>✓ {product}</li>)}
                              {missing.map((product) => <li key={product} className="is-missing"><span className="sr-only">trūksta: </span>{product}</li>)}
                            </ul>
                          )}
                          <span className="card-action">Peržiūrėti receptą <ArrowIcon /></span>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={`heart-button ${isSaved ? "is-saved" : ""}`}
                        aria-pressed={isSaved}
                        aria-label={isSaved ? `Pašalinti „${meal.name}“ iš Mano receptų` : `Išsaugoti „${meal.name}“`}
                        disabled={savingId === meal.id}
                        onClick={() => void toggleSaved(meal)}
                      >
                        <HeartIcon filled={isSaved} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

function ProductSummary({ products }: { products?: ProductMatch[] }) {
  if (!products?.length) return null;
  const recognized = products.filter((product) => product.recognized);
  const unknown = products.filter((product) => !product.recognized);
  return (
    <div className="product-summary">
      {recognized.length > 0 && (
        <ul aria-label="Atpažinti produktai">
          {recognized.map((product) => (
            <li key={product.input}>
              <strong>{product.input}</strong>
              {product.source === "dictionary" && (
                <> → {product.ingredients.join(", ")}</>
              )}{" "}
              <span>({product.recipeCount} rec.)</span>
            </li>
          ))}
        </ul>
      )}
      {unknown.length > 0 && (
        <p className="unknown-products" role="note">
          Neatpažinti produktai:{" "}
          <strong>{unknown.map((product) => product.input).join(", ")}</strong>.
          Jie paieškoje nenaudojami – patikrink rašybą arba įvesk angliškai.
        </p>
      )}
    </div>
  );
}