import { expect, test, type Page } from "@playwright/test";

// Uses a real, already confirmed Supabase account. Credentials come only from the environment.
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

test.skip(!email || !password, "Nurodykite TEST_USER_EMAIL ir TEST_USER_PASSWORD");

function authPanel(page: Page) {
  return page.getByRole("region", { name: "Supabase autentifikacija" });
}

async function submit(page: Page, mode: "Prisijungti" | "Registruotis", userEmail: string, userPassword: string) {
  const panel = authPanel(page);
  await panel.getByRole("tablist").getByRole("button", { name: mode }).click();
  const form = panel.locator("form");
  await form.getByLabel("El. paštas").fill(userEmail);
  await form.getByLabel("Slaptažodis").fill(userPassword);
  await form.getByRole("button", { name: mode }).click();
}

async function authCookies(page: Page) {
  return (await page.context().cookies()).filter((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}

test("Registracijos ir prisijungimo klaidos rodo Supabase atsakymą", async ({ page }) => {
  await page.goto("/");
  await expect(authPanel(page)).toBeVisible();
  // A fresh visit must not claim that the guest has signed out.
  await expect(authPanel(page).getByText("Jūs atsijungėte.")).toHaveCount(0);

  await submit(page, "Prisijungti", email!, "neteisingas-slaptazodis");
  await expect(authPanel(page).getByRole("alert")).toHaveText(/Neteisingi prisijungimo duomenys/);

  // Supabase answers HTTP 200 with empty identities for an existing address.
  await submit(page, "Registruotis", email!, `Kitas-${Date.now()}`);
  await expect(authPanel(page).getByRole("alert")).toHaveText(/Vartotojas jau egzistuoja/);
  await expect(authPanel(page).getByText(/Registracija sėkminga/)).toHaveCount(0);
});

test("Prisijungimas išlieka perkrovus puslapį, atsijungimas išvalo sesiją", async ({ page }) => {
  await page.goto("/");
  await submit(page, "Prisijungti", email!, password!);

  const status = authPanel(page).getByRole("status").filter({ hasText: "Prisijungta kaip:" });
  await expect(status).toContainText(email!);
  expect(await authCookies(page)).not.toHaveLength(0);

  await page.reload();
  await expect(authPanel(page).getByRole("status").filter({ hasText: "Prisijungta kaip:" })).toContainText(email!);

  await authPanel(page).getByRole("button", { name: "Atsijungti" }).click();
  await expect(authPanel(page).getByText("Jūs atsijungėte.")).toBeVisible();
  await expect(authPanel(page).locator("form")).toBeVisible();
  expect(await authCookies(page)).toHaveLength(0);

  await page.reload();
  await expect(authPanel(page).locator("form")).toBeVisible();
  await expect(authPanel(page).getByText("Prisijungta kaip:")).toHaveCount(0);
});
