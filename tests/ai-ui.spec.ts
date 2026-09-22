import { test, expect } from "@playwright/test";

test("AI forma siunčia tik ID ir pasirinkimus, blokuoja pakartojimus ir palieka originalą", async ({ page }, testInfo) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const requests: unknown[] = [];
  await page.route("**/api/ai", async (route) => {
    requests.push(route.request().postDataJSON());
    await held;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { text: "AI bandymo atsakymas\n1. Gaminimo žingsnis." }, operation: { system: "Gemini", endpoint: "/v1beta/interactions", method: "POST", status: 200, success: true, durationMs: 123 } }) });
  });
  await page.goto("/receptai/52940");
  const panel = page.getByRole("region", { name: "Pritaikyk receptą su AI" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "✨ Pritaikyti receptą" }).click();
  await expect(panel.getByRole("alert")).toContainText("Aprašykite savo situaciją");
  expect(requests).toHaveLength(0);
  await panel.getByLabel("Tavo situacija arba prašymas").fill("Noriu paprasčiau ir be pieno.");
  await panel.getByLabel("Turimas laikas").selectOption("15");
  await panel.getByLabel("Porcijų skaičius").selectOption("4");
  await panel.getByLabel("Pageidavimas").selectOption("cheaper");
  await panel.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  await expect(panel.getByRole("button", { name: "Pritaikoma…" })).toBeDisabled();
  await expect(panel.getByLabel("Tavo situacija arba prašymas")).toBeDisabled();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({ recipeId: "52940", userRequest: "Noriu paprasčiau ir be pieno.", time: 15, servings: 4, preference: "cheaper" });
  release();
  await expect(panel.getByRole("heading", { name: "Tavo pritaikytas receptas" })).toBeVisible();
  await expect(panel).toContainText("AI bandymo atsakymas");
  await expect(page.locator(".instructions")).toBeVisible();
  await expect(page.locator(".ingredients li").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await panel.locator("summary").click();
  await expect(panel.locator(".developer-mode")).toContainText("Gemini");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.screenshot({ path: testInfo.outputPath("ai-panel.png") });
});

test("AI forma rodo 429 ir tinklo klaidas; galima bandyti iš naujo", async ({ page }) => {
  await page.route("**/api/ai", (route) => route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Pasiektas Gemini užklausų arba kvotos limitas. Palaukite ir bandykite vėliau." }) }));
  await page.goto("/receptai/52940");
  const panel = page.getByRole("region", { name: "Pritaikyk receptą su AI" });
  await panel.getByLabel("Tavo situacija arba prašymas").fill("Padaryk paprasčiau.");
  await panel.getByRole("button", { name: "✨ Pritaikyti receptą" }).click();
  await expect(panel.getByRole("alert")).toContainText("kvotos limitas");
  await expect(panel.getByRole("button", { name: "✨ Pritaikyti receptą" })).toBeEnabled();
  await page.unroute("**/api/ai");
  await page.route("**/api/ai", (route) => route.abort("internetdisconnected"));
  await panel.getByRole("button", { name: "✨ Pritaikyti receptą" }).click();
  await expect(panel.getByRole("alert")).toContainText("Patikrinkite interneto ryšį");
  await expect(page.locator(".instructions")).toBeVisible();
});

test("Tikras /api/ai atmeta netinkamą JSON be Gemini užklausos", async ({ request }) => {
  const response = await request.post("/api/ai", { data: { recipeId: "52940" } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("Aprašykite savo situaciją");
  const malformed = await request.post("/api/ai", { headers: { "Content-Type": "application/json" }, data: "{" });
  expect(malformed.status()).toBe(400);
});
