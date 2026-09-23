import { expect, test, type Page } from "@playwright/test";
import { accountButton, signInOnPage } from "./helpers";

// Uses a real, already confirmed Supabase account. Credentials come only from the environment.
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function authCookies(page: Page) {
  return (await page.context().cookies()).filter((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}

async function openDialog(page: Page, tab: "Prisijungti" | "Registruotis") {
  await page.getByRole("banner").getByRole("button", { name: "Prisijungti" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: tab }).click();
  return dialog;
}

test.describe("Tikras Supabase", () => {
  test.skip(!email || !password, "Nurodykite TEST_USER_EMAIL ir TEST_USER_PASSWORD");

  test("Registracijos ir prisijungimo klaidos rodo Supabase atsakymą", async ({ page }) => {
    await page.goto("/");
    // A fresh visit must not claim that the guest has signed out.
    await expect(page.getByText("Jūs atsijungėte.")).toHaveCount(0);

    let dialog = await openDialog(page, "Prisijungti");
    await dialog.getByLabel("El. paštas").fill(email!);
    await dialog.getByLabel("Slaptažodis").fill("neteisingas-slaptazodis");
    await dialog.locator("form").getByRole("button", { name: "Prisijungti" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/Neteisingi prisijungimo duomenys/);

    // Supabase answers HTTP 200 with empty identities for an existing address.
    await dialog.getByRole("tab", { name: "Registruotis" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("El. paštas").fill(email!);
    await dialog.getByLabel("Slaptažodis").fill(`Kitas-${Date.now()}`);
    await dialog.locator("form").getByRole("button", { name: "Registruotis" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(/Vartotojas jau egzistuoja/);
    await expect(dialog.getByText(/Registracija sėkminga/)).toHaveCount(0);
  });

  test("Prisijungimas išlieka perkrovus puslapį, atsijungimas išvalo sesiją", async ({ page }) => {
    await page.goto("/");
    await signInOnPage(page, { email, password });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await authCookies(page)).not.toHaveLength(0);

    await page.reload();
    await accountButton(page).click();
    await expect(page.getByRole("menu", { name: "Paskyra" })).toContainText(email!);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(accountButton(page)).toBeFocused();

    await accountButton(page).click();
    await page.getByRole("menuitem", { name: "Atsijungti" }).click();
    await expect(page.getByText("Jūs atsijungėte.")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Prisijungti" })).toBeVisible();
    expect(await authCookies(page)).toHaveLength(0);

    await page.reload();
    await expect(accountButton(page)).toHaveCount(0);
  });

  test("Avataras keičiamas, išlieka perkrovus ir kitame įrenginyje", async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Tikri duomenys keičiami vieną kartą");
    await page.goto("/");
    await signInOnPage(page, { email, password });
    const avatarImage = accountButton(page).locator("img");
    const before = await avatarImage.getAttribute("data-avatar");
    const target = before === "grybas" ? "kastonas" : "grybas";
    const label = target === "grybas" ? "Grybas" : "Kaštonas";

    await page.getByRole("switch", { name: "Developer Mode" }).click();
    await accountButton(page).click();
    await page.getByRole("menuitem", { name: "Keisti avatarą" }).click();
    const dialog = page.getByRole("dialog", { name: "Keisti avatarą" });
    await dialog.getByRole("radio", { name: label }).check();
    await dialog.getByRole("button", { name: "Išsaugoti avatarą" }).click();
    await expect(page.getByText("Avataras pakeistas.")).toBeVisible();
    await expect(avatarImage).toHaveAttribute("data-avatar", target);
    // Real Supabase call: PUT /auth/v1/user with HTTP 200.
    await expect(page.locator(".developer-mode")).toContainText("PUT");
    await expect(page.locator(".developer-mode")).toContainText("/auth/v1/user");
    await expect(page.locator(".developer-mode")).toContainText("200");

    await page.reload();
    await expect(accountButton(page).locator("img")).toHaveAttribute("data-avatar", target);

    // Another browser = another device: the avatar comes from Supabase user_metadata.
    const other = await (await browser.newContext()).newPage();
    await other.goto("/");
    await signInOnPage(other, { email, password });
    await expect(accountButton(other).locator("img")).toHaveAttribute("data-avatar", target);
  });
});

// MOCKED: the Supabase sign-up endpoint is intercepted, so no account or email is created.
test("Registracija siunčia pasirinktą avatarą į Supabase metaduomenis (imituota)", async ({ page }) => {
  let body: { email?: string; data?: { avatar?: string } } | null = null;
  let redirectTo: string | null = null;
  await page.route("**/auth/v1/signup**", async (route) => {
    body = route.request().postDataJSON();
    redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      id: "00000000-0000-4000-8000-000000000009", aud: "authenticated", role: "authenticated", email: body?.email,
      identities: [{ id: "x", provider: "email" }], user_metadata: body?.data ?? {}, app_metadata: {}, created_at: new Date().toISOString(),
    }) });
  });
  await page.goto("/");
  const dialog = await openDialog(page, "Registruotis");
  // Default avatar is preselected; picking one is optional.
  await expect(dialog.getByRole("radio", { name: "Lapas" })).toBeChecked();
  await dialog.getByRole("radio", { name: "Moliūgas" }).check();
  await dialog.getByLabel("El. paštas").fill("naujas@example.com");
  await dialog.getByLabel("Slaptažodis").fill("Slaptas-123");
  await dialog.locator("form").getByRole("button", { name: "Registruotis" }).click();
  await expect(dialog.getByRole("status")).toContainText("Patvirtinkite el. pašto adresą");
  expect(body).toMatchObject({ email: "naujas@example.com", data: { avatar: "moliugas" } });
  // The confirmation email leads back to the site where the user signed up.
  expect(redirectTo).toBe(new URL("/", page.url()).toString());
});
