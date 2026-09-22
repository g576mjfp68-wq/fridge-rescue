"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ClientApiError, fetchApi } from "@/lib/client-api";
import {
  searchPath,
  type ApiOperation,
  type MealSummary,
  type SearchMode,
} from "@/lib/types";
import { ArrowIcon, LeafIcon, SearchIcon } from "./icons";
import { MealPhoto } from "./meal-photo";
import { DeveloperMode } from "./developer-mode";
import { AuthPanel } from "./auth-panel";
import { SavedRecipesPanel } from "./saved-recipes-panel";

type SearchResult = {
  meals: MealSummary[];
  operation?: ApiOperation;
  error?: string;
};

const CACHE_KEY = "fridge-rescue:last-search:v1";

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
              operation: cached.operation,
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
        const response = await fetchApi<MealSummary[]>(
          `/api/recipes?${new URLSearchParams({
            mode,
            q: query,
          })}`,
          controller.signal,
        );

        if (!isCurrent()) return;

        const meals = response.data!;

        setResult({
          meals,
          operation: response.operation,
        });

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              key,
              meals,
              operation: response.operation,
              savedAt: Date.now(),
            }),
          );
        } catch {
          // URL išlaiko paiešką net jei storage neveikia.
        }
      } catch (error) {
        if (!isCurrent()) return;

        setResult({
          meals: [],
          error:
            error instanceof Error
              ? error.message
              : "Paieška nepavyko.",
          operation:
            error instanceof ClientApiError
              ? error.operation
              : undefined,
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
        "Įveskite ingredientą arba patiekalo pavadinimą anglų kalba.",
      );
      input.current?.focus();
      return;
    }

    if (
      trimmed.length > 100 ||
      (selectedMode === "ingredient" &&
        /[,;\n]/.test(trimmed))
    ) {
      setValidation(
        "Įveskite vieną ingredientą arba pavadinimą, ne ilgesnį nei 100 simbolių.",
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

  return (
    <>
      <section
        className="hero"
        aria-labelledby="hero-heading"
      >
        <div>
          <p className="eyebrow">
            <span className="small-line" /> GERIEMS PRODUKTAMS
            – DAR VIENA PROGA
          </p>

          <h1 id="hero-heading">
            Atrask, ką gaminti
            <br className="desktop-break" /> iš{" "}
            <em>turimų produktų</em>
          </h1>

          <p className="hero-description">
            Vakarienės idėja jau tavo šaldytuve.
            <br />
            Pradėk nuo vieno ingrediento – atrask naują
            mėgstamą receptą.
          </p>
        </div>

        <aside className="hero-note">
          <LeafIcon />

          <p>
            Mažas žingsnis.
            <br />
            <em>Gardus pokytis.</em>
          </p>

          <span>
            Sunaudok, ką turi.
            <br />
            Atrask, ko dar neragavai.
          </span>
        </aside>
      </section>

      <AuthPanel />

      <section
        className="search-panel"
        aria-label="Receptų paieška"
      >
        <form onSubmit={submit} noValidate>
          <fieldset
            className="search-modes"
            disabled={loading}
          >
            <legend className="sr-only">
              Paieškos būdas
            </legend>

            <label>
              <input
                type="radio"
                name="mode"
                value="ingredient"
                checked={
                  draftMode === "ingredient"
                }
                onChange={() => {
                  setDraftMode("ingredient");
                  setValidation("");
                }}
              />

              <span>Pagal ingredientą</span>
            </label>

            <label>
              <input
                type="radio"
                name="mode"
                value="name"
                checked={draftMode === "name"}
                onChange={() => {
                  setDraftMode("name");
                  setValidation("");
                }}
              />

              <span>Pagal pavadinimą</span>
            </label>
          </fieldset>

          <label
            className="input-label"
            htmlFor="recipe-query"
          >
            {draftMode === "ingredient"
              ? "Kokį produktą turi?"
              : "Kokio patiekalo ieškai?"}
          </label>

          <div
            className={`search-row ${
              validation ? "has-error" : ""
            }`}
          >
            <div className="input-wrap">
              <SearchIcon />

              <input
                ref={input}
                id="recipe-query"
                name="q"
                type="search"
                value={draft}
                disabled={loading}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setValidation("");
                }}
                maxLength={100}
                placeholder={
                  draftMode === "ingredient"
                    ? "Pavyzdžiui, chicken"
                    : "Pavyzdžiui, Arrabiata"
                }
                aria-describedby={`search-hint${
                  validation
                    ? " search-validation"
                    : ""
                }`}
                aria-invalid={Boolean(validation)}
                autoComplete="off"
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Ieškoma…
                </>
              ) : (
                <>
                  Rasti receptų <ArrowIcon />
                </>
              )}
            </button>
          </div>

          <p
            className="search-hint"
            id="search-hint"
          >
            Ieškok <strong>angliškai</strong>.{" "}
            {draftMode === "ingredient"
              ? "Vienu metu įvesk vieną ingredientą."
              : "Įvesk visą patiekalo pavadinimą arba jo dalį."}{" "}
            Receptų tekstai pateikiami originalo kalba.
          </p>

          {validation && (
            <p
              className="field-error"
              id="search-validation"
              role="alert"
            >
              {validation}
            </p>
          )}

          <div className="examples">
            <span>Išbandyk:</span>

            {["chicken", "beef", "tomato"].map(
              (example) => (
                <button
                  key={example}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    startSearch(
                      example,
                      "ingredient",
                    )
                  }
                >
                  {example}
                  <span aria-hidden="true"> ↗</span>
                </button>
              ),
            )}
          </div>
        </form>
      </section>

      {!query ? (
        <SavedRecipesPanel />
      ) : (
        <section
          className="results-section"
          aria-labelledby="results-heading"
          aria-busy={loading}
        >
          <div className="section-heading">
            <h2 id="results-heading">
              Tavo atradimai
            </h2>

            <span>
              {!loading && !result.error
                ? `${result.meals.length} receptų`
                : "Įkvėpimas iš TheMealDB"}
            </span>
          </div>

          <div
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {loading
              ? "Ieškoma receptų."
              : !result.error
                ? `Rasta receptų: ${result.meals.length}.`
                : ""}
          </div>

          {loading ? (
            <div
              className="recipe-grid"
              aria-hidden="true"
            >
              {[1, 2, 3].map((item) => (
                <div
                  className="skeleton-card"
                  key={item}
                >
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : result.error ? (
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

              <h3>Nepavyko gauti receptų</h3>

              <p>{result.error}</p>

              <button
                className="secondary-button"
                onClick={() =>
                  startSearch(query, mode)
                }
              >
                Bandyti dar kartą
              </button>
            </div>
          ) : result.meals.length === 0 ? (
            <div className="state-panel">
              <div className="state-icon">
                <SearchIcon />
              </div>

              <h3>Receptų nerasta</h3>

              <p>
                Pagal „{query}“ nieko neradome.
                Patikrink anglišką rašybą
                <br />
                arba išbandyk kitą ingredientą ar
                patiekalo pavadinimą.
              </p>
            </div>
          ) : (
            <>
              <p className="results-caption">
                {mode === "ingredient"
                  ? "Ingredientas"
                  : "Pavadinimas"}
                : <strong>{query}</strong>

                <span>
                  Pasirink receptą ir sužinok, kaip jį
                  paruošti.
                </span>
              </p>

              <div className="recipe-grid">
                {result.meals.map(
                  (meal, index) => (
                    <Link
                      className="recipe-card"
                      key={meal.id}
                      href={`/receptai/${meal.id}?${new URLSearchParams(
                        {
                          mode,
                          q: query,
                        },
                      )}`}
                      prefetch={false}
                    >
                      <div className="card-photo">
                        <MealPhoto
                          src={meal.image}
                          name={meal.name}
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
                          RECEPTO ID · {meal.id}
                        </span>

                        <h3>{meal.name}</h3>

                        <span className="card-action">
                          Peržiūrėti receptą{" "}
                          <ArrowIcon />
                        </span>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      )}

      {query && (
        <DeveloperMode
          operation={result.operation}
        />
      )}
    </>
  );
}