import { expect, test, type Browser, type Page } from "@playwright/test";

// REAL integrations: two confirmed Supabase accounts, the real database with RLS,
// and (only with LIVE_GEMINI=1) one real Gemini call. The only mocked step is
// marked "MOCKED" below (a forced insert failure).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const A = { email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD };
const B = { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD };

test.skip(!url || !key || !A.email || !A.password || !B.email || !B.password, "Reikia Supabase ir dviejų testinių vartotojų kintamųjų");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "desktop", "Tikri duomenys tikrinami vieną kartą"));

type Account = { email?: string; password?: string };

async function token(account: Account): Promise<{ access: string; id: string }> {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: key!, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  expect(response.status).toBe(200);
  const session = await response.json();
  return { access: session.access_token, id: session.user.id };
}

function rest(path: string, access: string | null, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key!, ...(access ? { authorization: `Bearer ${access}` } : {}), "content-type": "application/json", prefer: "return=representation", ...init.headers },
  });
}

async function signIn(browser: Browser, account: Account): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Supabase autentifikacija" });
  const form = panel.locator("form");
  await form.getByLabel("El. paštas").fill(account.email!);
  await form.getByLabel("Slaptažodis").fill(account.password!);
  await form.getByRole("button", { name: "Prisijungti" }).click();
  await expect(panel.getByText("Prisijungta kaip:")).toBeVisible();
  return page;
}

function kitchen(page: Page) {
  return page.getByRole("region", { name: "Mano virtuvė" });
}

async function addProduct(page: Page, name: string) {
  await kitchen(page).getByLabel("Pridėk turimus produktus").fill(name);
  await kitchen(page).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(page).getByRole("list", { name: "Mano produktai" })).toContainText(name);
}

test.beforeAll(async () => {
  // Start from an empty kitchen for both test users (each can delete only their own rows).
  for (const account of [A, B]) {
    const { access, id } = await token(account);
    await rest(`kitchen_items?user_id=eq.${id}`, access, { method: "DELETE" });
  }
});

test("Mano virtuvė: išlieka perkrovus, vartotojai atskirti UI ir duomenų bazėje", async ({ browser }) => {
  const pageA = await signIn(browser, A);
  await expect(kitchen(pageA).getByText("Virtuvė tuščia.")).toBeVisible();
  await addProduct(pageA, "pomidorai");
  await addProduct(pageA, "kiaušiniai");
  await kitchen(pageA).getByLabel("Pridėk turimus produktus").fill("Pomidorai ");
  await kitchen(pageA).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(pageA).getByRole("status")).toContainText("Jau buvo sąraše: Pomidorai");

  await pageA.getByRole("switch", { name: "Developer Mode" }).click();
  await expect(pageA.locator(".developer-mode")).toContainText("Supabase");
  await expect(pageA.locator(".developer-mode")).toContainText("/rest/v1/kitchen_items");

  await pageA.reload();
  await expect(kitchen(pageA).getByRole("list", { name: "Mano produktai" }).getByRole("listitem")).toHaveCount(2);

  const pageB = await signIn(browser, B);
  await expect(kitchen(pageB).getByText("Virtuvė tuščia.")).toBeVisible();
  await addProduct(pageB, "ryžiai");
  await pageA.reload();
  await expect(kitchen(pageA).getByRole("list", { name: "Mano produktai" })).not.toContainText("ryžiai");

  await kitchen(pageB).getByRole("button", { name: "Pašalinti ryžiai" }).click();
  await expect(kitchen(pageB).getByText("Virtuvė tuščia.")).toBeVisible();

  // Direct database requests with each user's own token: RLS, not the page, decides.
  const a = await token(A);
  const b = await token(B);
  const aItems = await (await rest("kitchen_items?select=id,name,user_id", a.access)).json();
  expect(aItems.map((item: { name: string }) => item.name).sort()).toEqual(["kiaušiniai", "pomidorai"]);
  const target = aItems[0].id;

  expect(await (await rest(`kitchen_items?select=id&id=eq.${target}`, b.access)).json()).toEqual([]);
  expect(await (await rest(`kitchen_items?id=eq.${target}`, b.access, { method: "DELETE" })).json()).toEqual([]);
  const forged = await rest("kitchen_items", b.access, { method: "POST", body: JSON.stringify({ user_id: a.id, name: "svetimas" }) });
  expect(forged.status).toBe(403);
  expect([401, 403]).toContain((await rest("kitchen_items?select=id", null)).status);
  expect(await (await rest("kitchen_items?select=id", a.access)).json()).toHaveLength(2);

  // Saved recipes use the same rules.
  const saved = await rest("saved_recipes", a.access, { method: "POST", body: JSON.stringify({ user_id: a.id, meal_id: "52940", meal_name: "Brown Stew Chicken" }) });
  expect([201, 409]).toContain(saved.status);
  const aSaved = await (await rest("saved_recipes?select=id&meal_id=eq.52940", a.access)).json();
  expect(aSaved).toHaveLength(1);
  expect(await (await rest(`saved_recipes?select=id&id=eq.${aSaved[0].id}`, b.access)).json()).toEqual([]);
  expect(await (await rest(`saved_recipes?id=eq.${aSaved[0].id}`, b.access, { method: "DELETE" })).json()).toEqual([]);
  expect((await rest("saved_recipes", b.access, { method: "POST", body: JSON.stringify({ user_id: a.id, meal_id: "1", meal_name: "x" }) })).status).toBe(403);
  await rest(`saved_recipes?id=eq.${aSaved[0].id}`, a.access, { method: "DELETE" });
});

test("Mano virtuvė: keli produktai per kablelį, atskiri įrašai, pašalinamas tik vidurinis", async ({ browser }) => {
  const page = await signIn(browser, A);
  const input = kitchen(page).getByLabel("Pridėk turimus produktus");
  await expect(input).toHaveAttribute("placeholder", "Pvz., kiaušiniai, pomidorai, sūris");
  const list = kitchen(page).getByRole("list", { name: "Mano produktai" });
  await expect(input).toBeEnabled(); // the field is disabled until the saved list has loaded
  const before = await list.getByRole("listitem").count();

  await page.getByRole("switch", { name: "Developer Mode" }).click();
  await input.fill("  vistiena , suris,, kumpis ,  ");
  await kitchen(page).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(page).getByRole("status")).toContainText("Pridėta: vistiena, suris, kumpis.");
  await expect(list.getByRole("listitem")).toHaveCount(before + 3);
  await expect(input).toHaveValue("");

  // Developer Mode shows the real Supabase call: method, status and duration.
  const dev = page.locator(".developer-mode");
  await expect(dev).toContainText("Supabase");
  await expect(dev).toContainText("POST");
  await expect(dev).toContainText("/rest/v1/kitchen_items");
  await expect(dev).toContainText("201");
  await expect(dev).toContainText(/~\d+ ms/);

  // Each product is its own database row.
  const a = await token(A);
  const rows = await (await rest("kitchen_items?select=id,name&name=in.(vistiena,suris,kumpis)", a.access)).json();
  expect(rows.map((row: { name: string }) => row.name).sort()).toEqual(["kumpis", "suris", "vistiena"]);

  await kitchen(page).getByRole("button", { name: "Pašalinti suris" }).click();
  await expect(list).not.toContainText("suris");
  await page.reload();
  await expect(list).toContainText("vistiena");
  await expect(list).toContainText("kumpis");
  await expect(list).not.toContainText("suris");

  // Duplicates are skipped (case and diacritics ignored), new ones are added.
  await input.fill("Vištiena, pienas");
  await kitchen(page).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(page).getByRole("status")).toContainText("Pridėta: pienas. Jau buvo sąraše: Vištiena.");

  // MOCKED part: force one insert to fail to check the partial-failure message.
  await page.route("**/rest/v1/kitchen_items**", (route) => {
    const body = route.request().postData() ?? "";
    return route.request().method() === "POST" && body.includes("svogunai")
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "XX000", message: "test" }) })
      : route.fallback();
  });
  await input.fill("morkos, svogunai");
  await kitchen(page).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(page).getByRole("status")).toContainText("Pridėta: morkos.");
  await expect(kitchen(page).getByRole("alert")).toContainText("Nepavyko išsaugoti: svogunai");
  await expect(input).toHaveValue("svogunai");
  await page.unroute("**/rest/v1/kitchen_items**");
});

test("Mano virtuvė pasiekiama po paieškos, paieška ir rezultatai išlieka", async ({ browser }) => {
  const page = await signIn(browser, A);
  await page.getByLabel("Kokius produktus turi?").fill("jautiena, svogūnai");
  await page.getByLabel("Kokius produktus turi?").press("Enter");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  const cards = await page.locator(".recipe-card").count();
  const address = page.url();

  await page.getByRole("link", { name: "Mano virtuvė ↓" }).click();
  await expect(kitchen(page)).toBeInViewport();
  await kitchen(page).getByLabel("Pridėk turimus produktus").fill("citrinos");
  await kitchen(page).getByRole("button", { name: "Pridėti" }).click();
  await expect(kitchen(page).getByRole("list", { name: "Mano produktai" })).toContainText("citrinos");

  expect(page.url().split("#")[0]).toBe(address.split("#")[0]);
  await expect(page.getByLabel("Kokius produktus turi?")).toHaveValue("jautiena, svogūnai");
  await expect(page.locator(".recipe-card")).toHaveCount(cards);
});

test("Tikras Gemini: AI naudoja Mano virtuvę ir rezultatą galima išsaugoti", async ({ browser }) => {
  test.skip(process.env.LIVE_GEMINI !== "1", "Tikras Gemini kvietimas tik su LIVE_GEMINI=1");
  test.setTimeout(120_000);
  const owner = await token(A);
  await rest(`kitchen_items?user_id=eq.${owner.id}`, owner.access, { method: "DELETE" });
  for (const name of ["pomidorai", "kiaušiniai"]) {
    expect((await rest("kitchen_items", owner.access, { method: "POST", body: JSON.stringify({ user_id: owner.id, name }) })).status).toBe(201);
  }
  const pageA = await signIn(browser, A);
  await pageA.goto("/receptai/52940");
  const panel = pageA.getByRole("region", { name: "Pritaikyk receptą su AI" });
  await panel.getByLabel(/Naudoti mano „Mano virtuvė“ produktus/).check();
  await panel.getByLabel("Turimas laikas").selectOption("30");
  await panel.getByLabel("Porcijų skaičius").selectOption("2");
  await panel.getByRole("button", { name: "✨ Pritaikyti receptą" }).click();
  await expect(panel.getByRole("heading", { name: "Tavo pritaikytas receptas" })).toBeVisible({ timeout: 90_000 });
  await expect(panel.getByRole("region", { name: "Ką jau turi" })).toBeVisible();
  await expect(panel.getByRole("region", { name: "Ko trūksta ir kuo pakeisti" })).toBeVisible();
  await expect(panel).toContainText("Tavo produktai: pomidorai, kiaušiniai");

  await pageA.getByRole("switch", { name: "Developer Mode" }).click();
  await expect(pageA.locator(".developer-mode")).toContainText("Gemini");
  await expect(pageA.locator(".developer-mode")).toContainText("200");

  await panel.getByRole("button", { name: "💾 Išsaugoti pritaikytą receptą" }).click();
  await expect(panel.getByText("Receptas išsaugotas.")).toBeVisible();

  const a = await token(A);
  const b = await token(B);
  const aiA = await (await rest("ai_recipes?select=id,ai_result&original_recipe_id=eq.52940", a.access)).json();
  expect(aiA.length).toBeGreaterThan(0);
  expect(aiA.at(-1).ai_result).toContain("Ko trūksta ir kuo pakeisti:");
  expect(await (await rest(`ai_recipes?select=id&id=eq.${aiA[0].id}`, b.access)).json()).toEqual([]);

  const pageB = await signIn(browser, B);
  await expect(pageB.getByRole("region", { name: "Mano AI receptai" })).not.toContainText("Brown Stew Chicken");
});
