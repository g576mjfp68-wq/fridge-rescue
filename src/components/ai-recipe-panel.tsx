"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  AI_PREFERENCES,
  validateAiRequest,
  type AiRecipeRequest,
  type AiRecipeResult,
} from "@/lib/ai-recipe";
import type { ApiOperation, ApiResponse } from "@/lib/types";
import { DeveloperMode } from "./developer-mode";
import { SaveAiRecipeButton } from "./save-ai-recipe-button";
import styles from "./ai-recipe-panel.module.css";

export function AiRecipePanel({
  recipeId,
  recipeName,
}: {
  recipeId: string;
  recipeName: string;
}) {
  const id = useId();

  const [userRequest, setUserRequest] = useState("");
  const [time, setTime] = useState<AiRecipeRequest["time"]>(30);
  const [servings, setServings] =
    useState<AiRecipeRequest["servings"]>(2);
  const [preference, setPreference] =
    useState<AiRecipeRequest["preference"]>("simpler");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [operation, setOperation] = useState<ApiOperation>();

  const pending = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  function edited() {
    setError("");
    setText("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending.current) return;

    const parsed = validateAiRequest({
      recipeId,
      userRequest,
      time,
      servings,
      preference,
    });

    if (parsed.error) {
      setError(parsed.error);
      textarea.current?.focus();
      return;
    }

    pending.current = true;

    activeRequest.current?.abort();

    const controller = new AbortController();
    activeRequest.current = controller;

    const timeout = AbortSignal.timeout(65_000);

    setLoading(true);
    setError("");
    setText("");
    setOperation(undefined);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.any([
          controller.signal,
          timeout,
        ]),
      });

      let payload: ApiResponse<AiRecipeResult> | null;

      try {
        payload = await response.json();
      } catch {
        if (!controller.signal.aborted) {
          setError(
            "Serveris grąžino netinkamą atsakymą. Bandykite vėliau.",
          );
        }
        return;
      }

      if (
        controller.signal.aborted ||
        activeRequest.current !== controller
      ) {
        return;
      }

      setOperation(payload?.operation);

      if (!response.ok || payload?.error) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "Nepavyko pritaikyti recepto. Bandykite vėliau.",
        );
        return;
      }

      if (
        typeof payload?.data?.text !== "string" ||
        !payload.data.text.trim()
      ) {
        setError(
          "AI negrąžino pritaikyto recepto. Bandykite dar kartą.",
        );
        return;
      }

      setText(payload.data.text);
    } catch {
      if (controller.signal.aborted) return;

      setError(
        timeout.aborted
          ? "AI atsakymo laukimas užtruko per ilgai. Bandykite dar kartą."
          : "Nepavyko susisiekti su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.",
      );
    } finally {
      if (
        !controller.signal.aborted &&
        activeRequest.current === controller
      ) {
        pending.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={`${id}-heading`}
    >
      <p className="eyebrow">
        RECEPTAS PAGAL TAVO DIENĄ
      </p>

      <h2 id={`${id}-heading`}>
        Pritaikyk receptą su AI
      </h2>

      <p className={styles.intro}>
        Mažiau laiko, kiti produktai ar kitokie norai?
        Papasakok savo situaciją. Originalų receptą
        perduosime automatiškai.
      </p>

      <form onSubmit={submit} noValidate>
        <fieldset
          disabled={loading}
          className={styles.fields}
        >
          <legend className="sr-only">
            Recepto pritaikymo nustatymai
          </legend>

          <label htmlFor={`${id}-request`}>
            Tavo situacija arba prašymas
          </label>

          <textarea
            ref={textarea}
            id={`${id}-request`}
            value={userRequest}
            onChange={(event) => {
              setUserRequest(event.target.value);
              edited();
            }}
            rows={4}
            maxLength={2000}
            required
            placeholder="Pavyzdžiui, neturiu grietinėlės ir norėčiau paprastesnio varianto."
            aria-describedby={`${id}-hint`}
          />

          <p
            className={styles.hint}
            id={`${id}-hint`}
          >
            Iki 2000 simbolių. Originalo ingredientų ir
            instrukcijos kopijuoti nereikia.
          </p>

          <div className={styles.options}>
            <label htmlFor={`${id}-time`}>
              Turimas laikas

              <select
                id={`${id}-time`}
                value={time}
                onChange={(event) => {
                  setTime(
                    Number(
                      event.target.value,
                    ) as AiRecipeRequest["time"],
                  );
                  edited();
                }}
              >
                {[15, 30, 60].map((value) => (
                  <option key={value} value={value}>
                    {value} min
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor={`${id}-servings`}>
              Porcijų skaičius

              <select
                id={`${id}-servings`}
                value={servings}
                onChange={(event) => {
                  setServings(
                    Number(
                      event.target.value,
                    ) as AiRecipeRequest["servings"],
                  );
                  edited();
                }}
              >
                {[1, 2, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor={`${id}-preference`}>
              Pageidavimas

              <select
                id={`${id}-preference`}
                value={preference}
                onChange={(event) => {
                  setPreference(
                    event.target
                      .value as AiRecipeRequest["preference"],
                  );
                  edited();
                }}
              >
                {Object.entries(
                  AI_PREFERENCES,
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner"
                  aria-hidden="true"
                />{" "}
                Pritaikoma…
              </>
            ) : (
              "✨ Pritaikyti receptą"
            )}
          </button>
        </fieldset>
      </form>

      <p
        className={styles.status}
        role="status"
        aria-live="polite"
      >
        {loading
          ? "AI pritaiko receptą. Tai gali užtrukti iki minutės."
          : text
            ? "AI pritaikytas receptas paruoštas – jį rasi žemiau."
            : ""}
      </p>

      {error && (
        <p
          className={styles.error}
          role="alert"
        >
          {error}
        </p>
      )}

      {text && (
        <section
          className={styles.result}
          aria-labelledby={`${id}-result`}
        >
          <p className="eyebrow">
            AI PRITAIKYTAS VARIANTAS
          </p>

          <h3 id={`${id}-result`}>
            Tavo pritaikytas receptas
          </h3>

          <div className={styles.recipeText}>
            {text}
          </div>

          <SaveAiRecipeButton
            recipe={{
              recipeId,
              originalRecipeName: recipeName,
              userRequest,
              time,
              servings,
              preference,
              aiResult: text,
            }}
          />
        </section>
      )}

      {operation && (
        <DeveloperMode operation={operation} />
      )}
    </section>
  );
}