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
  type FilterOption,
  type MealSummary,
  type ProductMatch,
  type SearchData,
  type SearchFilters,
  type SearchMeal,
  type SearchMode,
} from "@/lib/types";
import { useFilterOptions } from "@/lib/use-filter-options";
import { getSavedRecipes, removeSavedRecipe, saveRecipe } from "@/lib/saved-recipes";
import { useAiUser } from "@/lib/supabase/use-ai-user";
import { openAuth } from "@/lib/ui-store";
import { ArrowIcon, DiceIcon, HeartIcon, SearchIcon } from "./icons";
import { MealPhoto } from "./meal-photo";

type SearchResult = {
  meals: SearchMeal[];
  match?: SearchData["match"];
  products?: ProductMatch[];
  error?: string;
};

const CACHE_KEY = "fridge-rescue:last-search:v2";
// How many cards are open, per search, so "back" from a recipe keeps the place.
const SHOWN_KEY = "fridge-rescue:shown:v1";
/** 12 fills whole rows at 3, 2 and 1 columns. */
const PAGE_SIZE = 12;
const EXAMPLES = ["vištiena", "vištiena, bulvės, sūris", "jautiena, svogūnai"];

export function SearchExperience() {
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get("q")?.trim() ?? "";

  const mode: SearchMode =
    params.get("mode") === "name" ? "name" : "ingredient";

  // Strict filters in the URL, so they survive going to a recipe and back.
  const category = params.get("c")?.trim() ?? "";
  const area = params.get("a")?.trim() ?? "";
  const hasSearch = Boolean(query || category || area);
  const key = `${mode}:${query}|${category}|${area}`;

  const [draft, setDraft] = useState(query);
  const [draftMode, setDraftMode] = useState<SearchMode>(mode);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftArea, setDraftArea] = useState(area);
  const filterOptions = useFilterOptions();
  const [surprising, setSurprising] = useState(false);
  const [surpriseError, setSurpriseError] = useState("");
  const surprisePending = useRef(false);
  const [result, setResult] = useState<SearchResult>({
    meals: [],
  });
  const [loading, setLoading] = useState(Boolean(query));
  const [validation, setValidation] = useState("");
  const [retry, setRetry] = useState(0);
  const [shown, setShown] = useState<{ key: string; count: number }>({ key: "", count: PAGE_SIZE });
  const visibleCount = shown.key === key ? shown.count : PAGE_SIZE;

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
      setDraftCategory(category);
      setDraftArea(area);
      setValidation("");

      try {
        const stored = JSON.parse(sessionStorage.getItem(SHOWN_KEY) || "null");
        if (stored?.key === key && Number.isInteger(stored.count)) setShown(stored);
      } catch {
        // Without storage the list simply starts with the first page.
      }

      if (!hasSearch) {
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
            ...(category ? { c: category } : {}),
            ...(area ? { a: area } : {}),
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
              // The header's "Paieška" link returns to this exact search.
              path: searchPath(mode, query, { category, area }),
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
  }, [query, mode, key, retry, hasSearch, category, area]);

  function startSearch(
    value = draft,
    selectedMode = draftMode,
    filters: SearchFilters = { category: draftCategory, area: draftArea },
  ) {
    if (pending.current) return;

    const trimmed = value.trim();
    const hasFilter = Boolean(filters.category || filters.area);

    if (!trimmed && !hasFilter) {
      setValidation(
        selectedMode === "ingredient"
          ? "Įvesk bent vieną ingredientą, pvz., vištiena, arba pasirink kategoriją ar pasaulio virtuvę."
          : "Įvesk patiekalo pavadinimą angliškai arba pasirink kategoriją ar pasaulio virtuvę.",
      );
      input.current?.focus();
      return;
    }

    const products = splitProducts(trimmed);
    if (
      trimmed.length > 100 ||
      (selectedMode === "ingredient" && trimmed &&
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
    setDraftCategory(filters.category ?? "");
    setDraftArea(filters.area ?? "");

    if (
      trimmed === query &&
      selectedMode === mode &&
      (filters.category ?? "") === category &&
      (filters.area ?? "") === area
    ) {
      skipCache.current = true;
      setRetry((value) => value + 1);
    } else {
      router.push(
        searchPath(selectedMode, trimmed, filters),
        { scroll: false },
      );
    }
  }

  /** Clears text, filters, results and the remembered search in one step. */
  function clearSearch() {
    setDraft("");
    setDraftMode("ingredient");
    setDraftCategory("");
    setDraftArea("");
    setValidation("");
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SHOWN_KEY);
    } catch {
      // Nothing to forget without storage.
    }
    router.push("/", { scroll: false });
    input.current?.focus();
  }

  function showMore() {
    const next = { key, count: visibleCount + PAGE_SIZE };
    setShown(next);
    try {
      sessionStorage.setItem(SHOWN_KEY, JSON.stringify(next));
    } catch {
      // Storage is optional.
    }
    // Keyboard users continue from the first newly shown recipe.
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>(".recipe-grid .recipe-card")[visibleCount]?.focus();
    });
  }

  const canClear = Boolean(hasSearch || draft.trim() || draftCategory || draftArea);

  /** One random recipe from the whole collection; filters do not apply. */
  async function surprise() {
    if (surprisePending.current) return;
    surprisePending.current = true;
    setSurprising(true);
    setSurpriseError("");
    try {
      const response = await fetchApi<MealSummary>("/api/recipes/random", new AbortController().signal);
      recordOperations([response.operation]);
      router.push(`/receptai/${response.data!.id}`);
    } catch (error) {
      if (error instanceof ClientApiError) recordOperations([error.operation]);
      setSurpriseError(error instanceof Error ? error.message : "Atsitiktinio recepto gauti nepavyko.");
      surprisePending.current = false;
      setSurprising(false);
    }
  }

  const labelOf = (list: FilterOption[] | undefined, value: string) => list?.find((item) => item.value === value)?.label ?? value;
  const activeFilters = [
    category && labelOf(filterOptions.options?.categories, category),
    area && `${labelOf(filterOptions.options?.areas, area)} virtuvė`,
  ].filter(Boolean).join(" · ");

  function submit(event: FormEvent) {
    event.preventDefault();
    startSearch();
  }

  const recognizedCount = result.products?.filter((product) => product.recognized).length ?? 0;
  const showMatch = mode === "ingredient" && recognizedCount > 1;

  return (
    <>
      <section className={`hero ${hasSearch ? "hero--searched" : ""}`} aria-labelledby="hero-heading">
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
                  <span>Pagal ingredientus</span>
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
                {draftMode === "ingredient" ? "Pagal kokius ingredientus ieškosime?" : "Kokio patiekalo ieškai?"}
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

              <fieldset className="filters" disabled={loading}>
                <legend className="sr-only">Filtrai</legend>
                <label>
                  <span className="sr-only">Kategorija</span>
                  <select value={draftCategory} onChange={(event) => { setDraftCategory(event.target.value); setValidation(""); }} disabled={!filterOptions.options}>
                    <option value="">Visos kategorijos</option>
                    {filterOptions.options?.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Pasaulio virtuvė</span>
                  <select value={draftArea} onChange={(event) => { setDraftArea(event.target.value); setValidation(""); }} disabled={!filterOptions.options}>
                    <option value="">Visos pasaulio virtuvės</option>
                    {filterOptions.options?.areas.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                {canClear && (
                  <button type="button" className="link-button" onClick={clearSearch}>Išvalyti paiešką</button>
                )}
                {filterOptions.loading && <span className="filters-note" role="status">Kraunami filtrai…</span>}
                {filterOptions.error && (
                  <span className="filters-note" role="status">
                    {filterOptions.error} <button type="button" className="link-button" onClick={filterOptions.retry}>Bandyti dar kartą</button>
                  </span>
                )}
              </fieldset>

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
                  <button key={example} type="button" disabled={loading} onClick={() => startSearch(example, "ingredient", {})}>
                    {example}
                  </button>
                ))}
              </div>
            </form>
          </section>

        </div>

        <div className="hero-side">
          <div className="hero-photo">
            <Image src="/hero.jpg" alt="Moliūgai ir hurmos ant medinės pjaustymo lentelės" fill priority sizes="(max-width: 900px) 100vw, 40vw" />
          </div>

            <div className="surprise-row">
              <button type="button" className="btn btn-ghost" onClick={surprise} disabled={surprising} aria-describedby="surprise-note">
                {surprising ? <span className="spinner" aria-hidden="true" /> : <DiceIcon />}
                {surprising ? "Ieškoma atsitiktinio recepto…" : "Nustebink mane"}
              </button>
              <p id="surprise-note">Atsitiktinis receptas iš visos TheMealDB kolekcijos – filtrai jam netaikomi.</p>
            </div>
            {surpriseError && <p className="message message--error" role="alert">{surpriseError}</p>}
        </div>
      </section>

      {!hasSearch ? (
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
                ? `${recipesLabel(result.meals.length)}${showMatch ? " · rūšiuota pagal atitikimą" : ""}`
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
                  {query ? <>Pagal „{query}“</> : "Pagal pasirinktus filtrus"}
                  {activeFilters && query ? <> su filtrais „{activeFilters}“</> : activeFilters ? <> „{activeFilters}“</> : null} nieko neradome.
                  {category || area
                    ? " Kategorija ir pasaulio virtuvė yra griežti filtrai – pabandyk kitus filtrus arba išvalyk paiešką."
                    : mode === "ingredient"
                      ? " Patikrink produktų rašybą arba išbandyk kitus produktus."
                      : " Patikrink anglišką rašybą arba išbandyk kitą pavadinimą."}
                </p>
                <button type="button" className="btn btn-ghost" onClick={clearSearch}>Išvalyti paiešką</button>
              </div>
            </>
          ) : (
            <>
              <p className="results-caption">
                {query && <>{mode === "ingredient" ? "Ingredientai" : "Pavadinimas"}: <strong>{query}</strong></>}
                {activeFilters && <>{query && " · "}Filtrai: <strong>{activeFilters}</strong></>}
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
                {result.meals.slice(0, visibleCount).map((meal, index) => {
                  const missing = showMatch
                    ? (result.products ?? []).filter((product) => product.recognized && !meal.matched?.includes(product.input)).map((product) => product.input)
                    : [];
                  const isSaved = savedIds.has(meal.id);
                  return (
                    <article className="recipe-tile" key={meal.id}>
                      <Link
                        className="recipe-card"
                        href={`/receptai/${meal.id}?${new URLSearchParams({ mode, q: query, ...(category ? { c: category } : {}), ...(area ? { a: area } : {}) })}`}
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

              {result.meals.length > PAGE_SIZE && (
                <div className="show-more">
                  <p role="status">Rodoma {Math.min(visibleCount, result.meals.length)} iš {result.meals.length}</p>
                  {visibleCount < result.meals.length && (
                    <button type="button" className="btn btn-ghost" onClick={showMore}>
                      Rodyti daugiau ({Math.min(PAGE_SIZE, result.meals.length - visibleCount)})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

/** Lithuanian plural: 1 receptas, 2 receptai, 10 receptų, 21 receptas. */
function recipesLabel(count: number) {
  const last = count % 10;
  const lastTwo = count % 100;
  if (last === 1 && lastTwo !== 11) return `${count} receptas`;
  if (last >= 2 && (lastTwo < 12 || lastTwo > 19)) return `${count} receptai`;
  return `${count} receptų`;
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