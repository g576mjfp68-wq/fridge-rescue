import { expect, test, type APIRequestContext } from "@playwright/test";
import type { ApiResponse, FilterOptions, SearchData } from "../src/lib/types";

// Real integrations: our server and the real TheMealDB API. Only the random
// recipe error case below is mocked (marked MOCKED).
const MEALDB = "https://www.themealdb.com/api/json/v1/1";

async function upstreamIds(request: APIRequestContext, kind: "c" | "a" | "i", value: string) {
  const response = await request.get(`${MEALDB}/filter.php`, { params: { [kind]: value } });
  const meals = (await response.json()).meals;
  return new Set<string>(Array.isArray(meals) ? meals.map((meal: { idMeal: string }) => meal.idMeal) : []);
}

async function search(request: APIRequestContext, params: Record<string, string>) {
  const response = await request.get("/api/recipes", { params });
  expect(response.status()).toBe(200);
  return (await response.json()) as ApiResponse<SearchData>;
}

test("Filtrų sąrašai iš TheMealDB: lietuviški pavadinimai, originalios reikšmės", async ({ request }) => {
  const body: ApiResponse<FilterOptions> = await (await request.get("/api/filters")).json();
  const { categories, areas } = body.data!;
  expect(categories).toContainEqual({ value: "Seafood", label: "Jūros gėrybės" });
  expect(areas).toContainEqual({ value: "Italian", label: "Italų" });
  // Every offered area really returns recipes (list.php?a=list would offer many that don't).
  expect(areas.length).toBeGreaterThan(20);
  expect((await upstreamIds(request, "a", "France")).size).toBeGreaterThan(0);
});

test("Filtrai be teksto: kategorija, virtuvė ir abu kartu sutampa su TheMealDB", async ({ request }) => {
  const seafood = await upstreamIds(request, "c", "Seafood");
  const italian = await upstreamIds(request, "a", "Italian");
  const onlyCategory = await search(request, { mode: "ingredient", q: "", c: "Seafood" });
  expect(new Set(onlyCategory.data!.meals.map((meal) => meal.id))).toEqual(seafood);
  const both = await search(request, { mode: "name", q: "", c: "Seafood", a: "Italian" });
  const expected = [...seafood].filter((id) => italian.has(id));
  expect(both.data!.meals.map((meal) => meal.id).sort()).toEqual(expected.sort());
  expect(both.operations!.map((operation) => operation.endpoint)).toEqual(["filter.php", "filter.php"]);
});

test("Filtrai griežti ir su ingredientais (net daliniams atitikmenims) bei su pavadinimu", async ({ request }) => {
  const british = await upstreamIds(request, "a", "British");
  const partial = await search(request, { mode: "ingredient", q: "vištiena, bulvės, sūris", a: "British" });
  expect(partial.data!.meals.length).toBeGreaterThan(0);
  expect(partial.data!.meals.every((meal) => british.has(meal.id))).toBe(true);

  const dessert = await upstreamIds(request, "c", "Dessert");
  const byName = await search(request, { mode: "name", q: "pie", c: "Dessert" });
  expect(byName.data!.meals.length).toBeGreaterThan(0);
  expect(byName.data!.meals.every((meal) => dessert.has(meal.id) && /pie/i.test(meal.name))).toBe(true);

  const none = await search(request, { mode: "ingredient", q: "jautiena", c: "Vegan" });
  expect(none.data!.meals).toEqual([]);
});

test("Paieška tik su filtru, būsena išlieka grįžus iš recepto", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox").first()).toBeEnabled();
  await page.getByRole("combobox", { name: "Kategorija" }).selectOption("Seafood");
  await page.getByRole("combobox", { name: "Pasaulio virtuvė" }).selectOption("Italian");
  await page.getByRole("button", { name: "Ieškoti receptų" }).click();
  await expect(page).toHaveURL(/c=Seafood/);
  await expect(page).toHaveURL(/a=Italian/);
  await expect(page.locator(".results-caption")).toContainText("Filtrai: Jūros gėrybės · Italų virtuvė");
  const count = await page.locator(".recipe-card").count();
  expect(count).toBeGreaterThan(0);

  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Grįžti į paiešką" }).click();
  await expect(page.getByRole("combobox", { name: "Kategorija" })).toHaveValue("Seafood");
  await expect(page.getByRole("combobox", { name: "Pasaulio virtuvė" })).toHaveValue("Italian");
  await expect(page.locator(".recipe-card")).toHaveCount(count);

  // "Paieška" in the header also returns to this exact search.
  await page.goto("/mano-receptai");
  // Desktop header or the phone tab bar – whichever is visible.
  await page.getByRole("link", { name: "Paieška", exact: true }).click();
  await expect(page).toHaveURL(/c=Seafood/);
});

test("Tuščia paieška be filtrų rodo patarimą; nieko neradus galima išvalyti paiešką", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ieškoti receptų" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("arba pasirink kategoriją ar pasaulio virtuvę");

  await page.goto("/?mode=ingredient&q=jautiena&c=Vegan");
  await expect(page.getByRole("heading", { name: "Receptų nerasta" })).toBeVisible();
  await expect(page.locator(".state-panel")).toContainText("griežti filtrai");
  await page.locator(".state-panel").getByRole("button", { name: "Išvalyti paiešką" }).click();
  // Everything is cleared: address, text, filters and results.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Pagal kokius ingredientus ieškosime?")).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Kategorija" })).toHaveValue("");
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tavo atradimai" })).toHaveCount(0);
});

test("„Nustebink mane“ atidaro atsitiktinį receptą ir registruoja operaciją", async ({ page }) => {
  // Chosen filters stay in the form but do not limit the random recipe.
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Kategorija" })).toBeEnabled();
  await page.getByRole("combobox", { name: "Kategorija" }).selectOption("Seafood");
  await expect(page.getByText("filtrai jam netaikomi")).toBeVisible();
  let calls = 0;
  page.on("request", (request) => { if (request.url().includes("/api/recipes/random")) calls++; });
  const button = page.getByRole("button", { name: "Nustebink mane" });
  await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect(page).toHaveURL(/\/receptai\/\d+$/);
  expect(calls).toBe(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("switch", { name: "Developer Mode" }).click();
  await expect(page.locator(".developer-mode")).toContainText("random.php");
});

test("„Nustebink mane“ klaida parodoma, galima bandyti dar kartą (imituota)", async ({ page }) => {
  // MOCKED: our random endpoint answers 502 once.
  let first = true;
  await page.route("**/api/recipes/random", async (route) => {
    if (first) {
      first = false;
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Receptų API grąžino klaidą (HTTP 503). Bandykite dar kartą vėliau." }) });
    } else {
      await route.fallback();
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Nustebink mane" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Receptų API grąžino klaidą");
  await expect(page.getByRole("button", { name: "Nustebink mane" })).toBeEnabled();
  await page.getByRole("button", { name: "Nustebink mane" }).click();
  await expect(page).toHaveURL(/\/receptai\/\d+$/);
});

test("Filtrai telefone telpa be horizontalaus slinkimo", async ({ page }) => {
  await page.goto("/?mode=ingredient&q=vi%C5%A1tiena&a=British");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("Rodoma 12 receptų, „Rodyti daugiau“ prideda kitus; grįžus iš recepto vieta išlieka", async ({ page, request }) => {
  const total = (await search(request, { mode: "ingredient", q: "vištiena" })).data!.meals.length;
  expect(total).toBeGreaterThan(24);
  await page.goto("/?mode=ingredient&q=" + encodeURIComponent("vištiena"));
  await expect(page.locator(".recipe-card")).toHaveCount(12);
  await expect(page.locator(".show-more")).toContainText(`Rodoma 12 iš ${total}`);

  await page.getByRole("button", { name: "Rodyti daugiau (12)" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(24);
  await expect(page.locator(".recipe-card").nth(12)).toBeFocused();

  await page.locator(".recipe-card").nth(20).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Grįžti į paiešką" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(24);

  while (await page.getByRole("button", { name: /Rodyti daugiau/ }).count()) {
    await page.getByRole("button", { name: /Rodyti daugiau/ }).click();
  }
  await expect(page.locator(".recipe-card")).toHaveCount(total);
  await expect(page.locator(".show-more")).toContainText(`Rodoma ${total} iš ${total}`);

  // A new search starts from the first page again.
  await page.getByRole("button", { name: "jautiena, svogūnai", exact: true }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(12);
});

test("„Išvalyti paiešką“ išvalo tekstą, filtrus, rezultatus ir įsimintą paiešką", async ({ page }) => {
  await page.goto("/?mode=name&q=pie&c=Dessert");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Išvalyti paiešką" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Pagal kokius ingredientus ieškosime?")).toHaveValue("");
  await expect(page.getByLabel("Pagal kokius ingredientus ieškosime?")).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Kategorija" })).toHaveValue("");
  await expect(page.locator(".recipe-card")).toHaveCount(0);
  // The header "Paieška" link no longer brings the old search back.
  await page.goto("/mano-receptai");
  await page.getByRole("link", { name: "Paieška", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".recipe-card")).toHaveCount(0);
});
