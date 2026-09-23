import { test, expect } from "@playwright/test";
import type { ApiResponse, Meal, MealSummary, SearchData } from "../src/lib/types";

test("Tuščia įvestis, klaviatūra ir pradinis vaizdas", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Atrask, ką gaminti");
  await page.getByRole("button", { name: "Rasti receptų" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Įveskite bent vieną produktą");
  await expect(page.getByLabel("Kokius produktus turi?")).toBeFocused();
  await page.getByLabel("Kokius produktus turi?").fill("a, b, c, d, e, f");
  await page.getByLabel("Kokius produktus turi?").press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("iki 5 produktų");
  await page.getByLabel("Kokius produktus turi?").fill("");
  await expect(page.locator("html")).toHaveAttribute("lang", "lt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
});

// English input still goes straight to TheMealDB as before.
for (const ingredient of ["chicken", "beef", "tomato"]) {
  test(`Tikra ${ingredient} paieška per Next.js serverį`, async ({ page }, testInfo) => {
    const directApiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("themealdb.com/api/")) directApiCalls.push(request.url());
    });
    await page.goto("/");
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/recipes?") && response.url().includes(`q=${ingredient}`));
    await page.getByLabel("Kokius produktus turi?").fill(ingredient);
    await page.getByLabel("Kokius produktus turi?").press("Enter");
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const payload: ApiResponse<SearchData> = await response.json();
    const meals = payload.data!.meals;
    expect(meals.length).toBeGreaterThan(0);
    await expect(page.locator(".recipe-card")).toHaveCount(meals.length);
    await expect(page.locator(".recipe-card").first()).toContainText(meals[0].id);
    await expect(page.locator(".recipe-card").first()).toContainText(meals[0].name);
    await expect(page.getByRole("button", { name: "Rasti receptų" })).toBeEnabled();
    await expect.poll(() => page.locator(".card-photo img").first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(directApiCalls).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("switch", { name: "Developer Mode" }).click();
    await expect(page.locator(".developer-mode")).toContainText("TheMealDB");
    await expect(page.locator(".developer-mode")).toContainText("filter.php");
    await expect(page.locator(".developer-mode")).toContainText("200");
    if (ingredient === "chicken") await page.screenshot({ path: testInfo.outputPath("chicken.png"), fullPage: false });
  });
}

test("Pavadinimas, pilnas receptas ir išsaugota paieška grįžus", async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Pagal pavadinimą", { exact: true }).check();
  await page.getByLabel("Kokio patiekalo ieškai?").fill("Arrabiata");
  await page.getByLabel("Kokio patiekalo ieškai?").press("Enter");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  const count = await page.locator(".recipe-card").count();
  const title = await page.locator(".recipe-card h3").first().innerText();
  const href = await page.locator(".recipe-card").first().getAttribute("href");
  const id = href!.match(/receptai\/(\d+)/)![1];
  const expected: ApiResponse<Meal> = await (await request.get(`/api/recipes/${id}`)).json();
  const lookup = page.waitForResponse((response) => response.url().endsWith(`/api/recipes/${id}`));
  await page.locator(".recipe-card").first().click();
  expect((await lookup).status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator(".recipe-meta")).toContainText(expected.data!.category);
  await expect(page.locator(".recipe-meta")).toContainText(expected.data!.area);
  await expect(page.locator(".ingredients li")).toHaveCount(expected.data!.ingredients.length);
  await expect(page.locator(".instructions")).toContainText(expected.data!.instructions.split(/\r?\n/)[0]);
  expect(expected.data!.ingredients.every((ingredient) => ingredient.name.trim())).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("recipe.png"), fullPage: true });
  let repeatedSearches = 0;
  page.on("request", (request) => { if (request.url().includes("/api/recipes?")) repeatedSearches++; });
  await page.getByRole("link", { name: "Grįžti į paiešką" }).click();
  await expect(page.getByLabel("Kokio patiekalo ieškai?")).toHaveValue("Arrabiata");
  await expect(page.locator(".recipe-card")).toHaveCount(count);
  expect(repeatedSearches).toBe(0);
  // Native browser navigation must preserve the same search too.
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.goBack();
  await expect(page.getByLabel("Kokio patiekalo ieškai?")).toHaveValue("Arrabiata");
  await expect(page.locator(".recipe-card")).toHaveCount(count);
  expect(errors).toEqual([]);
});

test("Nerasti receptai, neteisinga įvestis ir ID 52940", async ({ page, request }) => {
  for (const path of ["/api/recipes?mode=ingredient&q=", "/api/recipes?mode=other&q=chicken", "/api/recipes?mode=ingredient&q=a%2Cb%2Cc%2Cd%2Ce%2Cf", "/api/recipes/not-an-id"]) {
    expect((await request.get(path)).status()).toBe(400);
  }
  const lookup = await request.get("/api/recipes/52940");
  expect(lookup.status()).toBe(200);
  const payload: ApiResponse<Meal> = await lookup.json();
  expect(payload.data!.id).toBe("52940");
  expect(payload.data!.ingredients.length).toBeGreaterThan(0);
  expect(payload.data!.instructions.length).toBeGreaterThan(0);
  expect(payload.operation!.endpoint).toBe("lookup.php");
  const encoded = await request.get("/api/recipes", { params: { mode: "name", q: "Chicken & chorizo rice pot" } });
  expect(encoded.status()).toBe(200);
  // The upstream name search may return no matches for '&'. Compare against
  // the correctly encoded upstream request rather than inventing a result.
  const upstream = await request.get("https://www.themealdb.com/api/json/v1/1/search.php", { params: { s: "Chicken & chorizo rice pot" } });
  expect(upstream.status()).toBe(200);
  const original = await upstream.json();
  const originalIds = Array.isArray(original.meals) ? original.meals.map((meal: { idMeal: string }) => meal.idMeal) : [];
  expect((await encoded.json()).data.meals.map((meal: MealSummary) => meal.id)).toEqual(originalIds);
  await page.goto("/?mode=ingredient&q=zzzznonexistentingredientzzzz");
  await expect(page.getByRole("heading", { name: "Receptų nerasta" })).toBeVisible();
  await page.goto("/receptai/0");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Receptas nerastas");
});

test("HTTP klaida, limitas ir tinklo klaida turi suprantamus pranešimus", async ({ page }) => {
  for (const status of [429, 502, 504]) {
    await page.route("**/api/recipes?**", (route) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error: status === 429 ? "Pasiektas receptų API užklausų limitas." : status === 504 ? "Receptų API neatsakė laiku." : "Receptų API grąžino klaidą (HTTP 503)." }),
    }));
    await page.goto(`/?mode=ingredient&q=error${status}`);
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bandyti dar kartą" })).toBeEnabled();
    await page.unroute("**/api/recipes?**");
  }
  await page.route("**/api/recipes?**", (route) => route.abort("internetdisconnected"));
  await page.goto("/?mode=ingredient&q=networkfailure");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Patikrinkite interneto ryšį");
  await page.unroute("**/api/recipes?**");
  await page.getByRole("button", { name: "vištiena", exact: true }).click();
  await expect(page.locator(".recipe-card").first()).toBeVisible();
});

test("Krovimas blokuoja pakartojimus; senas atsakymas neperrašo naujo", async ({ page, request }) => {
  // Replay only real API data. Ignore AbortSignal here to prove the stale-response guard.
  const chicken = await (await request.get("/api/recipes?mode=ingredient&q=chicken")).json();
  const beef = await (await request.get("/api/recipes?mode=ingredient&q=beef")).json();
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => original(input, String(input).includes("/api/recipes?") ? { ...init, signal: undefined } : init);
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let chickenRequests = 0;
  await page.route("**/api/recipes?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "chicken") {
      chickenRequests++;
      await held;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(query === "chicken" ? chicken : beef) });
  });
  await page.goto("/");
  await page.getByLabel("Kokius produktus turi?").fill("chicken");
  await page.getByRole("region", { name: "Receptų paieška" }).locator("form").evaluate((form) => { (form as HTMLFormElement).requestSubmit(); (form as HTMLFormElement).requestSubmit(); });
  await expect(page.getByRole("button", { name: "Ieškoma…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "vištiena", exact: true })).toBeDisabled();
  await expect.poll(() => chickenRequests).toBe(1);
  await page.evaluate(() => window.history.pushState(null, "", "/?mode=ingredient&q=beef"));
  await expect(page.locator(".recipe-card").first()).toContainText(beef.data.meals[0].name);
  const oldResponse = page.waitForResponse((response) => response.url().includes("q=chicken"));
  release();
  await oldResponse;
  await page.waitForTimeout(150);
  await expect(page.getByLabel("Kokius produktus turi?")).toHaveValue("beef");
  await expect(page.locator(".recipe-card")).toHaveCount(beef.data.meals.length);
  await expect(page.locator(".recipe-card").first()).toContainText(beef.data.meals[0].name);
});
