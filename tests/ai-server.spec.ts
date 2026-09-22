import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const valid = { recipeId: "52940", userRequest: "Be pieno produktų", time: 30, servings: 2, preference: "simpler" };

// Execute the real route and its helpers, replacing only external services.
// No real keys, Supabase writes, Gemini quota, or live model calls are involved.
function server(options: { key?: string; geminiError?: unknown; text?: string; mealStatus?: number; noMeal?: boolean } = {}) {
  const lookups: string[] = [];
  const generations: { input: string; model: string; store: boolean }[] = [];
  const retryOptions: { maxRetries: number }[] = [];
  const modules = new Map<string, { exports: Record<string, unknown> }>();
  function load(filename: string): Record<string, unknown> {
    const full = path.resolve(filename);
    if (modules.has(full)) return modules.get(full)!.exports;
    const loadedModule = { exports: {} as Record<string, unknown> };
    modules.set(full, loadedModule);
    const compiled = ts.transpileModule(readFileSync(full, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = (specifier: string): unknown => {
      if (specifier === "server-only") return {};
      if (specifier === "@google/genai") return { GoogleGenAI: class {
        interactions = { create: async (params: typeof generations[number], config: typeof retryOptions[number]) => {
          generations.push(params);
          retryOptions.push(config);
          if (options.geminiError) throw options.geminiError;
          return { output_text: options.text ?? "Pritaikytas variantas", sdkHttpResponse: { responseInternal: new Response() } };
        } };
      } };
      const target = specifier.startsWith("@/") ? path.join(process.cwd(), "src", specifier.slice(2)) : path.resolve(path.dirname(full), specifier);
      return load(`${target}.ts`);
    };
    vm.runInNewContext(compiled, {
      module: loadedModule, exports: loadedModule.exports, require,
      Request, Response, URL, URLSearchParams, TextDecoder, AbortSignal, performance,
      process: { env: { GEMINI_API_KEY: options.key ?? "TEST_SECRET_NOT_REAL" } },
      fetch: async (url: URL) => {
        lookups.push(String(url));
        return Response.json({ meals: options.noMeal ? null : [{
          idMeal: "52940", strMeal: "Originalas iš API", strInstructions: "Originali instrukcija iš API.",
          strIngredient1: "Tomato", strMeasure1: "2", strIngredient2: " ", strMeasure2: " ",
        }] }, { status: options.mealStatus ?? 200 });
      },
    }, { filename: full });
    return loadedModule.exports;
  }
  const route = load("src/app/api/ai/route.ts") as { POST: (request: Request) => Promise<Response> };
  return {
    lookups, generations, retryOptions,
    post: (body: unknown) => route.POST(new Request("http://localhost/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })),
    raw: (body: string) => route.POST(new Request("http://localhost/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body })),
  };
}

test("AI serveris gauna originalą pagal ID ir perduoda visus pritaikymo duomenis", async () => {
  const app = server();
  const response = await app.post(valid);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const result = await response.json();
  expect(result.data.text).toBe("Pritaikytas variantas");
  expect(result.operation).toMatchObject({ system: "Gemini", endpoint: "/v1beta/interactions", method: "POST", status: 200, success: true });
  expect(result.operation.durationMs).toBeGreaterThanOrEqual(0);
  expect(app.lookups).toEqual(["https://www.themealdb.com/api/json/v1/1/lookup.php?i=52940"]);
  expect(app.generations).toHaveLength(1);
  const call = app.generations[0];
  expect(call.model).toBe("gemini-3.8-flash");
  expect(call.store).toBe(false);
  const data = JSON.parse(call.input.split("RECEPTO IR VARTOTOJO DUOMENYS:\n")[1]);
  expect(data).toEqual({ originalRecipeName: "Originalas iš API", ingredients: [{ name: "Tomato", measure: "2" }], originalInstructions: "Originali instrukcija iš API.", userRequest: valid.userRequest, timeMinutes: 30, servings: 2, preference: "Paprasčiau" });
  expect(app.retryOptions[0].maxRetries).toBe(0);
  expect(call.input).not.toContain("TEST_SECRET_NOT_REAL");
});

test("AI validacija atmeta blogus laukus ir naršyklės pateiktą originalą prieš išorines užklausas", async () => {
  const app = server();
  for (const body of [null, [], {}, { ...valid, recipeId: 52940 }, { ...valid, recipeId: "../52940" }, { ...valid, userRequest: "  " }, { ...valid, userRequest: "x".repeat(2001) }, { ...valid, time: "30" }, { ...valid, time: 45 }, { ...valid, servings: 3 }, { ...valid, preference: "toString" }, { ...valid, originalRecipe: "Suklastotas originalas" }]) {
    const response = await app.post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBeTruthy();
  }
  expect((await app.raw("{")).status).toBe(400);
  expect((await app.raw('"' + "x".repeat(17000) + '"')).status).toBe(400);
  expect(app.lookups).toHaveLength(0);
  expect(app.generations).toHaveLength(0);
});

const scenarios: { name: string; options: NonNullable<Parameters<typeof server>[0]>; status: number; text: string }[] = [
  { name: "trūkstamas raktas", options: { key: "" }, status: 503, text: "trūksta Gemini API rakto" },
  { name: "neteisingas raktas", options: { geminiError: { status: 400, message: "TEST_SECRET_NOT_REAL" } }, status: 503, text: "API raktą" },
  { name: "429 limitas", options: { geminiError: { status: 429 } }, status: 429, text: "kvotos limitas" },
  { name: "RESOURCE_EXHAUSTED", options: { geminiError: { code: "RESOURCE_EXHAUSTED" } }, status: 429, text: "kvotos limitas" },
  { name: "tuščias tekstas", options: { text: "  " }, status: 502, text: "negrąžino" },
  { name: "nežinoma SDK klaida", options: { geminiError: { message: "TEST_SECRET_NOT_REAL" } }, status: 502, text: "Nepavyko pritaikyti" },
  { name: "laukimo pabaiga", options: { geminiError: { name: "APIConnectionTimeoutError" } }, status: 504, text: "neatsakė laiku" },
  { name: "nerastas originalas", options: { noMeal: true }, status: 404, text: "receptas nerastas" },
  { name: "TheMealDB klaida", options: { mealStatus: 503 }, status: 502, text: "Receptų API" },
];
for (const scenario of scenarios) {
  test(`AI serverio klaida: ${scenario.name}`, async () => {
    const app = server(scenario.options);
    const response = await app.post(valid);
    expect(response.status).toBe(scenario.status);
    const result = await response.json();
    expect(result.error).toContain(scenario.text);
    expect(JSON.stringify(result)).not.toContain("TEST_SECRET_NOT_REAL");
    if (scenario.options.noMeal || scenario.options.mealStatus || scenario.options.key === "") expect(app.generations).toHaveLength(0);
  });
}

test("AI atsakyme atsitiktinai esantis rakto tekstas pašalinamas", async () => {
  const app = server({ text: "Atsakymas TEST_SECRET_NOT_REAL" });
  const response = await app.post(valid);
  expect(await response.text()).not.toContain("TEST_SECRET_NOT_REAL");
});
