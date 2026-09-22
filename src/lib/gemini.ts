import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { ApiOperation } from "./types";

export class GeminiError extends Error {
  constructor(message: string, public status: number, public operation?: ApiOperation) {
    super(message);
  }
}

export async function adaptRecipe(prompt: string, signal: AbortSignal) {
  const started = performance.now();
  let status: number | null = null;
  const operation = (success: boolean): ApiOperation => ({
    system: "Gemini", endpoint: "/v1beta/interactions", method: "POST",
    status, success, durationMs: Math.round(performance.now() - started),
  });
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError("AI pritaikymas dar nesukonfigūruotas: serveryje trūksta Gemini API rakto.", 503, operation(false));
  }

  try {
    const ai = new GoogleGenAI({ apiKey, vertexai: false });
    const response = await ai.interactions.create({
      model: "gemini-3.8-flash", input: prompt, store: false,
    }, { maxRetries: 0, timeout: 40_000, signal });
    status = response.sdkHttpResponse?.responseInternal.status ?? 200;
    const text = response.output_text?.trim();
    if (!text) {
      throw new GeminiError("Gemini negrąžino pritaikyto recepto. Patikslinkite prašymą ir bandykite dar kartą.", 502);
    }
    return { data: { text: text.replaceAll(apiKey, "[paslėpta]") }, operation: operation(true) };
  } catch (error) {
    if (error instanceof GeminiError) {
      error.operation = operation(false);
      throw error;
    }
    // Inspect only for classification. Never return or log raw SDK errors.
    const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const candidate = details.status ?? details.statusCode;
    status = typeof candidate === "number" && candidate >= 100 && candidate <= 599 ? candidate : null;
    const message = typeof details.message === "string" ? details.message : "";
    if (status === 429 || details.code === "RESOURCE_EXHAUSTED" || message.includes("RESOURCE_EXHAUSTED")) {
      throw new GeminiError("Pasiektas Gemini užklausų arba kvotos limitas. Palaukite ir bandykite vėliau.", 429, operation(false));
    }
    if (status === 400 || status === 401 || status === 403) {
      throw new GeminiError("Gemini atmetė užklausą. Projekto administratoriui reikia patikrinti API raktą ir prieigos nustatymus.", 503, operation(false));
    }
    if (status === 404) {
      throw new GeminiError("Pasirinktas AI modelis šiuo metu nepasiekiamas. Bandykite vėliau.", 503, operation(false));
    }
    if (details.name === "APIConnectionTimeoutError" || details.name === "TimeoutError" || details.name === "AbortError" || signal.aborted) {
      throw new GeminiError("AI neatsakė laiku arba užklausa buvo nutraukta. Bandykite dar kartą.", 504, operation(false));
    }
    throw new GeminiError("Nepavyko pritaikyti recepto. Bandykite dar kartą vėliau.", 502, operation(false));
  }
}
