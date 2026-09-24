import { expect, test } from "@playwright/test";
import { splitProducts, translateProduct } from "../src/lib/ingredients-lt";
import type { ApiResponse, SearchData } from "../src/lib/types";

// Pure dictionary checks: no network.
test("Lietuviški produktai verčiami į tikslius TheMealDB ingredientus", () => {
  expect(translateProduct("vištiena")).toContain("Chicken");
  expect(translateProduct("Vištienos")).toContain("Chicken");
  expect(translateProduct("bulves")).toEqual(["Potatoes"]);
  expect(translateProduct("bulvių")).toEqual(["Potatoes"]);
  expect(translateProduct("sūris")).toContain("Cheese");
  expect(translateProduct("grietinėlė")).toContain("Double Cream");
  expect(translateProduct("grietinė")).toEqual(["Sour Cream"]);
  expect(translateProduct("malta mėsa")).toContain("Minced Beef");
  expect(translateProduct("kmynai")).toBeNull();
  expect(splitProducts("vištiena, bulvės;  sūris ,, Vištiena")).toEqual(["vištiena", "bulvės", "sūris"]);
});

// The rest call the real app server, which calls the real TheMealDB API.
async function search(request: import("@playwright/test").APIRequestContext, q: string) {
  const response = await request.get("/api/recipes", { params: { mode: "ingredient", q } });
  expect(response.status()).toBe(200);
  return (await response.json()) as ApiResponse<SearchData>;
}

test("Tikra lietuviška vieno produkto paieška", async ({ page, request }) => {
  const api = await search(request, "vištiena");
  expect(api.data!.match).toBe("all");
  expect(api.data!.products[0]).toMatchObject({ input: "vištiena", recognized: true, source: "dictionary" });
  expect(api.operations!.every((operation) => operation.system === "TheMealDB" && operation.status === 200)).toBe(true);

  await page.goto("/");
  await page.getByRole("button", { name: "vištiena", exact: true }).click();
  // The first page shows up to 12 recipes.
  await expect(page.locator(".recipe-card")).toHaveCount(Math.min(12, api.data!.meals.length));
  await expect(page.getByRole("list", { name: "Atpažinti produktai" })).toContainText("vištiena → Chicken");
});

test("Tikra kelių produktų paieška rodo receptus su visais produktais", async ({ page, request }) => {
  const api = await search(request, "jautiena, svogūnai");
  expect(api.data!.match).toBe("all");
  expect(api.data!.meals.length).toBeGreaterThan(0);
  expect(api.data!.meals.every((meal) => meal.matched!.length === 2)).toBe(true);
  // One request per TheMealDB ingredient name, compared by recipe ID on the server.
  expect(api.operations!.map((operation) => operation.endpoint)).toEqual(Array(4).fill("filter.php"));

  await page.goto("/?mode=ingredient&q=" + encodeURIComponent("jautiena, svogūnai"));
  await expect(page.locator(".recipe-card")).toHaveCount(Math.min(12, api.data!.meals.length));
  await expect(page.getByText("Visi receptai atitinka visus atpažintus produktus.")).toBeVisible();
});

test("Tikra paieška be pilnų atitikmenų rodo dalinius atitikmenis", async ({ page, request }) => {
  const api = await search(request, "vištiena, bulvės, sūris");
  expect(api.data!.match).toBe("partial");
  const counts = api.data!.meals.map((meal) => meal.matched!.length);
  expect(counts.every((count) => count >= 1 && count < 3)).toBe(true);
  expect(counts).toEqual([...counts].sort((a, b) => b - a));

  await page.goto("/?mode=ingredient&q=" + encodeURIComponent("vištiena, bulvės, sūris"));
  await expect(page.getByText("Receptų su visais produktais nerasta.")).toBeVisible();
  const first = api.data!.meals[0];
  const card = page.locator(".recipe-card").first();
  await expect(card.locator(".match-badge")).toHaveText(`Atitinka ${first.matched!.length} iš 3`);
  for (const product of first.matched!) await expect(card.getByRole("list", { name: "Atitikimas" })).toContainText(`✓ ${product}`);
  await expect(card.locator(".match-tags .is-missing")).toHaveCount(3 - first.matched!.length);
});

test("Neatpažintas produktas aiškiai parodomas", async ({ page, request }) => {
  const mixed = await search(request, "vištiena, kmynai");
  expect(mixed.data!.products.find((product) => product.input === "kmynai")).toMatchObject({ recognized: false, recipeCount: 0 });
  expect(mixed.data!.match).toBe("all");

  await page.goto("/?mode=ingredient&q=" + encodeURIComponent("vištiena, kmynai"));
  await expect(page.getByRole("note")).toContainText("Neatpažinti produktai: kmynai");
  await expect(page.locator(".recipe-card").first()).toBeVisible();

  await page.goto("/?mode=ingredient&q=kmynai");
  await expect(page.getByRole("heading", { name: "Receptų nerasta" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("kmynai");
});

test("Produktų pasiūlymai rašant ir lietuviški ingredientų pavadinimai recepte", async ({ page }) => {
  await page.goto("/");
  const field = page.getByLabel("Pagal kokius ingredientus ieškosime?");
  await field.fill("bulvės, viš");
  const suggestions = page.getByRole("group", { name: "Produktų pasiūlymai" });
  await expect(suggestions.getByRole("button")).toHaveText(["vištiena", "vištienos krūtinėlė", "vištienos sparneliai", "vištienos kepenėlės"]);
  await suggestions.getByRole("button", { name: "vištiena", exact: true }).click();
  await expect(field).toHaveValue("bulvės, vištiena, ");
  await expect(field).toBeFocused();
  await page.getByRole("button", { name: "Ieškoti receptų" }).click();
  await expect(page).toHaveURL(/q=bulv%C4%97s%2C\+vi%C5%A1tiena/);
  await expect(page.locator(".recipe-card").first()).toBeVisible();

  await page.goto("/receptai/52940");
  // Lithuanian name first, the original English name below it.
  const chicken = page.locator(".ingredients li").filter({ hasText: "Chicken" });
  await expect(chicken.locator('.ingredient-name [lang="lt"]')).toHaveText("vištiena");
  await expect(chicken.locator('.ingredient-name [lang="en"]')).toHaveText("Chicken");
  await expect(page.locator(".ingredients li").filter({ hasText: "Allspice" }).locator('[lang="lt"]')).toHaveText("kvapieji pipirai");
  // Guests are invited to sign in to see what they already have.
  await expect(page.locator(".kitchen-summary--guest")).toContainText("kad matytum, kuriuos ingredientus jau turi");
});
