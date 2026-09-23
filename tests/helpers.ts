import { expect, type Page } from "@playwright/test";

export type Account = { email?: string; password?: string };

/** Opens the sign-in dialog from the header and signs in. */
export async function signInOnPage(page: Page, account: Account) {
  await page.getByRole("banner").getByRole("button", { name: "Prisijungti" }).click();
  const dialog = page.getByRole("dialog", { name: /Sveiki sugrįžę|Susikurk paskyrą/ });
  await dialog.getByRole("tab", { name: "Prisijungti" }).click();
  await dialog.getByLabel("El. paštas").fill(account.email!);
  await dialog.getByLabel("Slaptažodis").fill(account.password!);
  await dialog.locator("form").getByRole("button", { name: "Prisijungti" }).click();
  await expect(accountButton(page)).toBeVisible();
}

export function accountButton(page: Page) {
  return page.getByRole("button", { name: /^Paskyros meniu/ });
}

export async function openKitchen(page: Page) {
  await page.getByRole("navigation", { name: "Pagrindinė navigacija" }).getByRole("button", { name: "Mano virtuvė" }).click();
  const drawer = page.getByRole("dialog", { name: "Mano virtuvė" });
  await expect(drawer).toBeVisible();
  return drawer;
}
